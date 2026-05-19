import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createGame, joinGame, startGame } from "@/lib/game-actions";
import { prisma } from "@/lib/prisma";

beforeEach(async () => {
  await prisma.transaction.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.team.deleteMany();
  await prisma.weatherSchedule.deleteMany();
  await prisma.mapLocation.deleteMany();
  await prisma.gameSession.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createGame", () => {
  it("creates a session with correct number of teams", async () => {
    const session = await createGame(4);
    expect(session.status).toBe("LOBBY");
    expect(session.currentDay).toBe(0);

    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    expect(teams).toHaveLength(4);
  });

  it("generates unique join codes per team", async () => {
    const session = await createGame(8);
    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    const codes = teams.map((t) => t.joinCode);
    expect(new Set(codes).size).toBe(8);
    codes.forEach((code) => {
      expect(code).toMatch(/^[A-Z0-9]{6}-[A-Z]\d+$/);
    });
  });

  it("seeds 64 map locations", async () => {
    const session = await createGame(2);
    const locations = await prisma.mapLocation.findMany({ where: { sessionId: session.id } });
    expect(locations).toHaveLength(64);
  });

  it("seeds weather schedule with 25 days", async () => {
    const session = await createGame(2);
    const weather = await prisma.weatherSchedule.findUnique({ where: { sessionId: session.id } });
    expect(weather).not.toBeNull();
    const data = weather!.dayData as Array<unknown>;
    expect(data).toHaveLength(25);
  });

  it("assigns teams to Home Port", async () => {
    const session = await createGame(3);
    const teams = await prisma.team.findMany({
      where: { sessionId: session.id },
      include: { currentLocation: true },
    });
    teams.forEach((team) => {
      expect(team.currentLocation?.type).toBe("HOME_PORT");
    });
  });
});

describe("joinGame", () => {
  it("returns team data for valid code", async () => {
    const session = await createGame(2);
    const teams = await prisma.team.findMany({ where: { sessionId: session.id } });
    const result = await joinGame(teams[0].joinCode);
    expect(result.team.id).toBe(teams[0].id);
    expect(result.session.id).toBe(session.id);
  });

  it("throws for invalid code", async () => {
    await expect(joinGame("INVALID-X1")).rejects.toThrow("Invalid join code");
  });
});

describe("startGame", () => {
  it("transitions session to ACTIVE and sets day 1", async () => {
    const session = await createGame(2);
    const updated = await startGame(session.id);
    expect(updated.status).toBe("ACTIVE");
    expect(updated.currentDay).toBe(1);
  });

  it("throws if session is not in LOBBY", async () => {
    const session = await createGame(2);
    await startGame(session.id);
    await expect(startGame(session.id)).rejects.toThrow("not in LOBBY");
  });
});
