import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCATIONS, DEFAULT_WEATHER, TEAM_COLORS } from "@/lib/map-data";
import { getLocationAt } from "@/lib/map-data";
import { getPrice, getWeight } from "@/lib/resource-prices";
import type { LocationType, WeatherZone, ResourceType } from "@/generated/prisma/client";

function generateSessionPrefix(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateJoinCode(prefix: string, index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  const number = index + 1;
  return `${prefix}-${letter}${number}`;
}

export async function createGame(teamCount: number, teamNames?: string[]) {
  if (teamCount < 2 || teamCount > 40) {
    throw new Error("Team count must be between 2 and 40");
  }

  const prefix = generateSessionPrefix();

  const session = await prisma.gameSession.create({ data: {} });

  const mapLocations = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const loc = getLocationAt(x, y);
      mapLocations.push({
        sessionId: session.id,
        name: loc.name,
        type: loc.type as LocationType,
        gridX: x,
        gridY: y,
        weatherZone: loc.weatherZone as WeatherZone,
      });
    }
  }
  await prisma.mapLocation.createMany({ data: mapLocations });

  const homePort = await prisma.mapLocation.findFirst({
    where: { sessionId: session.id, type: "HOME_PORT" },
  });

  for (let i = 0; i < teamCount; i++) {
    await prisma.team.create({
      data: {
        sessionId: session.id,
        name: teamNames?.[i] || `Team ${i + 1}`,
        joinCode: generateJoinCode(prefix, i),
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        currentLocationId: homePort!.id,
      },
    });
  }

  await prisma.weatherSchedule.create({
    data: {
      sessionId: session.id,
      dayData: DEFAULT_WEATHER,
    },
  });

  return prisma.gameSession.findUniqueOrThrow({
    where: { id: session.id },
    include: { teams: true },
  });
}

export async function joinGame(joinCode: string) {
  const team = await prisma.team.findUnique({
    where: { joinCode },
    include: {
      session: true,
      currentLocation: true,
      inventory: true,
    },
  });

  if (!team) {
    throw new Error("Invalid join code");
  }

  return { team, session: team.session };
}

export async function startGame(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (session.status !== "LOBBY") {
    throw new Error("Session is not in LOBBY status");
  }

  return prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "ACTIVE", currentDay: 1 },
  });
}

export async function purchaseResources(
  sessionId: string,
  teamId: string,
  items: { resourceType: string; quantity: number }[]
) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (session.status !== "ACTIVE") {
    throw new Error("Game is not active");
  }

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { currentLocation: true, inventory: true },
  });

  if (team.status !== "ACTIVE") {
    throw new Error("Team is not active");
  }

  if (!team.currentLocation) {
    throw new Error("Team has no location");
  }

  const locType = team.currentLocation.type;
  if (locType !== "HOME_PORT" && locType !== "TRADING_POST") {
    throw new Error("Cannot buy at this location");
  }

  let totalCost = 0;
  let totalWeight = 0;
  const validated: { resourceType: string; quantity: number; cost: number; weight: number }[] = [];

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.resourceType}`);
    }

    const price = getPrice(item.resourceType, locType);
    if (price === null) {
      throw new Error(`${item.resourceType} is not available at ${locType}`);
    }

    const weight = getWeight(item.resourceType);
    const itemCost = price * item.quantity;
    const itemWeight = weight * item.quantity;

    totalCost += itemCost;
    totalWeight += itemWeight;

    validated.push({
      resourceType: item.resourceType,
      quantity: item.quantity,
      cost: itemCost,
      weight: itemWeight,
    });
  }

  if (totalCost > team.doubloons) {
    throw new Error("Not enough doubloons");
  }

  if (totalWeight > team.cargoCapacity) {
    throw new Error("Over cargo capacity");
  }

  return prisma.$transaction(async (tx) => {
    await tx.team.update({
      where: { id: teamId },
      data: {
        doubloons: { decrement: totalCost },
        cargoCapacity: { decrement: totalWeight },
      },
    });

    for (const item of validated) {
      await tx.inventory.upsert({
        where: {
          teamId_resourceType: {
            teamId,
            resourceType: item.resourceType as ResourceType,
          },
        },
        create: {
          teamId,
          resourceType: item.resourceType as ResourceType,
          quantity: item.quantity,
          totalWeight: item.weight,
        },
        update: {
          quantity: { increment: item.quantity },
          totalWeight: { increment: item.weight },
        },
      });

      await tx.transaction.create({
        data: {
          teamId,
          dayNumber: session.currentDay,
          type: "PURCHASE",
          resourceType: item.resourceType,
          quantity: item.quantity,
          cost: item.cost,
          locationId: team.currentLocationId,
        },
      });
    }

    return tx.team.findUniqueOrThrow({
      where: { id: teamId },
      include: { inventory: true, currentLocation: true },
    });
  });
}
