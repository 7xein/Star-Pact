import { describe, it, expect } from "vitest";
import { calculateScores, generateCSV } from "@/lib/scoring";

const HOME_PORT_ID = "home-port-123";

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: "team-1", name: "Red Skulls", color: "#e53e3e", status: "ACTIVE",
    currentLocation: { type: "HOME_PORT" },
    inventory: [{ resourceType: "TREASURE", quantity: 5 }],
    logEntries: [{ dayNumber: 20, toLocationId: HOME_PORT_ID }],
    ...overrides,
  };
}

describe("calculateScores", () => {
  it("scores team at home port with treasure", () => {
    const scores = calculateScores([makeTeam() as never], HOME_PORT_ID);
    expect(scores[0].treasure).toBe(5);
    expect(scores[0].status).toBe("FINISHED");
    expect(scores[0].rank).toBe(1);
  });

  it("shipwrecks team not at home port", () => {
    const team = makeTeam({ currentLocation: { type: "OPEN_SEA" } });
    const scores = calculateScores([team as never], HOME_PORT_ID);
    expect(scores[0].treasure).toBe(0);
    expect(scores[0].status).toBe("SHIPWRECKED");
  });

  it("stranded teams score zero", () => {
    const team = makeTeam({ status: "STRANDED" });
    const scores = calculateScores([team as never], HOME_PORT_ID);
    expect(scores[0].treasure).toBe(0);
    expect(scores[0].status).toBe("STRANDED");
  });

  it("ranks by treasure descending then return day ascending", () => {
    const t1 = makeTeam({ id: "t1", name: "A", inventory: [{ resourceType: "TREASURE", quantity: 8 }], logEntries: [{ dayNumber: 22, toLocationId: HOME_PORT_ID }] });
    const t2 = makeTeam({ id: "t2", name: "B", inventory: [{ resourceType: "TREASURE", quantity: 8 }], logEntries: [{ dayNumber: 20, toLocationId: HOME_PORT_ID }] });
    const t3 = makeTeam({ id: "t3", name: "C", inventory: [{ resourceType: "TREASURE", quantity: 3 }], logEntries: [{ dayNumber: 18, toLocationId: HOME_PORT_ID }] });
    const scores = calculateScores([t1, t2, t3] as never[], HOME_PORT_ID);
    expect(scores[0].teamId).toBe("t2");
    expect(scores[1].teamId).toBe("t1");
    expect(scores[2].teamId).toBe("t3");
  });
});

describe("generateCSV", () => {
  it("produces valid CSV", () => {
    const scores = calculateScores([makeTeam() as never], HOME_PORT_ID);
    const csv = generateCSV(scores);
    expect(csv).toContain("rank,team_name");
    expect(csv).toContain("Red Skulls");
  });
});
