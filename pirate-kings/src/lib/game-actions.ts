import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCATIONS, DEFAULT_WEATHER, TEAM_COLORS } from "@/lib/map-data";
import { getLocationAt } from "@/lib/map-data";
import { getPrice, getWeight } from "@/lib/resource-prices";
import {
  calculateConsumption,
  checkProtection,
  isStorm,
  resolveLost,
  canAfford,
} from "@/lib/consumption";
import type { InventorySnapshot } from "@/lib/consumption";
import type { DayWeather, WeatherType } from "@/types/game";
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

// --- Helpers ---

function getInventorySnapshot(inventory: { resourceType: string; quantity: number }[]): InventorySnapshot {
  const snap: InventorySnapshot = { water: 0, provisions: 0, rigging: 0, spyglass: 0 };
  for (const item of inventory) {
    if (item.resourceType === "WATER") snap.water = item.quantity;
    if (item.resourceType === "PROVISIONS") snap.provisions = item.quantity;
    if (item.resourceType === "RIGGING") snap.rigging = item.quantity;
    if (item.resourceType === "SPYGLASS") snap.spyglass = item.quantity;
  }
  return snap;
}

function getWeatherForZone(dayWeather: DayWeather, zone: string): WeatherType {
  if (zone === "SAFE") return dayWeather.safe;
  if (zone === "KRAKEN") return dayWeather.kraken;
  return dayWeather.openSea;
}

async function deductResources(teamId: string, provisions: number, water: number) {
  if (provisions > 0) {
    await prisma.inventory.updateMany({
      where: { teamId, resourceType: "PROVISIONS" },
      data: { quantity: { decrement: provisions }, totalWeight: { decrement: provisions * 10 } },
    });
    await prisma.team.update({
      where: { id: teamId },
      data: { cargoCapacity: { increment: provisions * 10 } },
    });
  }
  if (water > 0) {
    await prisma.inventory.updateMany({
      where: { teamId, resourceType: "WATER" },
      data: { quantity: { decrement: water }, totalWeight: { decrement: water * 50 } },
    });
    await prisma.team.update({
      where: { id: teamId },
      data: { cargoCapacity: { increment: water * 50 } },
    });
  }
}

async function awardTreasure(teamId: string) {
  await prisma.inventory.upsert({
    where: { teamId_resourceType: { teamId, resourceType: "TREASURE" } },
    create: { teamId, resourceType: "TREASURE", quantity: 1, totalWeight: 50 },
    update: { quantity: { increment: 1 }, totalWeight: { increment: 50 } },
  });
  await prisma.team.update({
    where: { id: teamId },
    data: { cargoCapacity: { decrement: 50 } },
  });
}

async function strandTeam(teamId: string) {
  await prisma.inventory.updateMany({
    where: { teamId, resourceType: { in: ["WATER", "PROVISIONS"] } },
    data: { quantity: 0, totalWeight: 0 },
  });
  await prisma.team.update({
    where: { id: teamId },
    data: { status: "STRANDED" },
  });
}

// --- Day Progression ---

export async function advanceDay(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { weatherSchedule: true },
  });

  if (session.status !== "ACTIVE") {
    throw new Error("Game is not active");
  }

  const nextDay = session.currentDay + 1;
  if (nextDay > 25) {
    throw new Error("Game has ended — cannot advance past day 25");
  }

  const weatherData = session.weatherSchedule?.dayData as DayWeather[];
  const dayWeather = weatherData[nextDay - 1];

  const timerEnd = new Date(Date.now() + 180_000);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      currentDay: nextDay,
      timerEnd,
      timerRunning: true,
    },
  });

  return { day: nextDay, weather: dayWeather, timerEnd };
}

export async function pauseTimer(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (!session.timerRunning || !session.timerEnd) {
    throw new Error("Timer is not running");
  }

  const remainingMs = Math.max(0, session.timerEnd.getTime() - Date.now());

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerRunning: false, timerEnd: new Date(Date.now() + remainingMs) },
  });

  return { remainingMs };
}

export async function resumeTimer(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (session.timerRunning) {
    throw new Error("Timer is already running");
  }

  const remainingMs = Math.max(0, session.timerEnd!.getTime() - Date.now());
  const newTimerEnd = new Date(Date.now() + remainingMs);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerEnd: newTimerEnd, timerRunning: true },
  });

  return { timerEnd: newTimerEnd };
}

export async function extendTimer(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (!session.timerEnd) {
    throw new Error("No active timer");
  }

  const newTimerEnd = new Date(session.timerEnd.getTime() + 60_000);

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerEnd: newTimerEnd },
  });

  return { timerEnd: newTimerEnd };
}

export async function endDay(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { weatherSchedule: true },
  });

  if (session.status !== "ACTIVE") {
    throw new Error("Game is not active");
  }

  const weatherData = session.weatherSchedule?.dayData as DayWeather[];
  const dayWeather = weatherData[session.currentDay - 1];

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { timerRunning: false, timerEnd: null },
  });

  const teams = await prisma.team.findMany({
    where: { sessionId, status: "ACTIVE" },
    include: { currentLocation: true, inventory: true, logEntries: true },
  });

  const results: { teamId: string; status: string; stranded?: boolean; treasure?: number }[] = [];

  for (const team of teams) {
    const hasMovedToday = team.logEntries.some((l) => l.dayNumber === session.currentDay);

    if (hasMovedToday) {
      if (team.currentLocation?.type === "TREASURE_ISLAND") {
        await awardTreasure(team.id);
      }
      results.push({ teamId: team.id, status: "moved" });
      continue;
    }

    if (team.lostUntilDay && team.lostUntilDay > session.currentDay) {
      await prisma.logEntry.create({
        data: {
          teamId: team.id,
          dayNumber: session.currentDay,
          fromLocationId: team.currentLocationId,
          toLocationId: team.currentLocationId,
          weather: getWeatherForZone(dayWeather, team.currentLocation?.weatherZone || "OPEN_SEA"),
          wasLost: true,
        },
      });
      results.push({ teamId: team.id, status: "lost" });
      continue;
    }

    if (!team.currentLocation) continue;

    const weather = getWeatherForZone(dayWeather, team.currentLocation.weatherZone);
    const inv = getInventorySnapshot(team.inventory);
    const protection = checkProtection(inv);

    if (isStorm(weather) && protection === "NONE") {
      const lostCost = resolveLost(weather);
      if (!canAfford(inv, lostCost.provisions, lostCost.water)) {
        await strandTeam(team.id);
        results.push({ teamId: team.id, status: "stranded", stranded: true });
        continue;
      }
      await deductResources(team.id, lostCost.provisions, lostCost.water);
      await prisma.team.update({
        where: { id: team.id },
        data: { lostUntilDay: session.currentDay + 3 },
      });
      await prisma.logEntry.create({
        data: {
          teamId: team.id,
          dayNumber: session.currentDay,
          fromLocationId: team.currentLocationId,
          toLocationId: team.currentLocationId,
          weather,
          provisionsConsumed: lostCost.provisions,
          waterConsumed: lostCost.water,
          wasLost: true,
        },
      });
      results.push({ teamId: team.id, status: "lost" });
      continue;
    }

    const consumption = calculateConsumption(weather, team.currentLocation.type, protection);

    if (!canAfford(inv, consumption.provisions, consumption.water)) {
      await strandTeam(team.id);
      results.push({ teamId: team.id, status: "stranded", stranded: true });
      continue;
    }

    await deductResources(team.id, consumption.provisions, consumption.water);

    if (consumption.riggingUsed) {
      await prisma.inventory.update({
        where: { teamId_resourceType: { teamId: team.id, resourceType: "RIGGING" } },
        data: { quantity: { decrement: 1 } },
      });
    }
    if (consumption.spyglassUsed) {
      await prisma.inventory.update({
        where: { teamId_resourceType: { teamId: team.id, resourceType: "SPYGLASS" } },
        data: { quantity: { decrement: 1 }, totalWeight: { decrement: 10 } },
      });
      await prisma.team.update({
        where: { id: team.id },
        data: { cargoCapacity: { increment: 10 } },
      });
    }

    let treasureEarned = 0;
    if (team.currentLocation.type === "TREASURE_ISLAND") {
      treasureEarned = 1;
      await awardTreasure(team.id);
    }

    await prisma.logEntry.create({
      data: {
        teamId: team.id,
        dayNumber: session.currentDay,
        fromLocationId: team.currentLocationId,
        toLocationId: team.currentLocationId,
        weather,
        provisionsConsumed: consumption.provisions,
        waterConsumed: consumption.water,
        riggingUsed: consumption.riggingUsed,
        spyglassUsed: consumption.spyglassUsed,
        treasureEarned,
      },
    });

    results.push({ teamId: team.id, status: "stayed", treasure: treasureEarned });
  }

  if (session.currentDay >= 25) {
    await endGameInternal(sessionId);
    return { day: session.currentDay, results, gameEnded: true };
  }

  return { day: session.currentDay, results, gameEnded: false };
}

// --- End Game (stub — replaced by Task 4: Scoring) ---

async function endGameInternal(sessionId: string) {
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "ENDED", timerRunning: false, timerEnd: null },
  });
}

export async function endGame(sessionId: string) {
  const session = await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.status !== "ACTIVE") throw new Error("Game is not active");
  return endGameInternal(sessionId);
}
