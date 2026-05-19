import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCATIONS, DEFAULT_WEATHER, TEAM_COLORS } from "@/lib/map-data";
import { getLocationAt } from "@/lib/map-data";
import type { LocationType, WeatherZone } from "@/generated/prisma/client";

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
