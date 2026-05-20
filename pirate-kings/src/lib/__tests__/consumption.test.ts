import { describe, it, expect } from "vitest";
import {
  calculateConsumption,
  checkProtection,
  resolveLost,
  canAfford,
  isStorm,
} from "@/lib/consumption";

describe("checkProtection", () => {
  it("returns RIGGING when rigging available", () => {
    expect(checkProtection({ water: 5, provisions: 5, rigging: 2, spyglass: 1 })).toBe("RIGGING");
  });

  it("returns SPYGLASS when no rigging but spyglass available", () => {
    expect(checkProtection({ water: 5, provisions: 5, rigging: 0, spyglass: 1 })).toBe("SPYGLASS");
  });

  it("returns NONE when nothing available", () => {
    expect(checkProtection({ water: 5, provisions: 5, rigging: 0, spyglass: 0 })).toBe("NONE");
  });
});

describe("calculateConsumption", () => {
  it("clear seas: 1 provisions, 1 water", () => {
    const r = calculateConsumption("CLEAR", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 1, water: 1, riggingUsed: false, spyglassUsed: false });
  });

  it("tempest unprotected: 5 provisions, 2 water", () => {
    const r = calculateConsumption("TEMPEST", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 5, water: 2, riggingUsed: false, spyglassUsed: false });
  });

  it("doldrums: 1 provisions, 3 water", () => {
    const r = calculateConsumption("DOLDRUMS", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 1, water: 3, riggingUsed: false, spyglassUsed: false });
  });

  it("maelstrom unprotected: 5 provisions, 4 water", () => {
    const r = calculateConsumption("MAELSTROM", "OPEN_SEA", "NONE");
    expect(r).toEqual({ provisions: 5, water: 4, riggingUsed: false, spyglassUsed: false });
  });

  it("tempest with rigging: 1+1", () => {
    const r = calculateConsumption("TEMPEST", "OPEN_SEA", "RIGGING");
    expect(r).toEqual({ provisions: 1, water: 1, riggingUsed: true, spyglassUsed: false });
  });

  it("maelstrom with rigging: 1+1", () => {
    const r = calculateConsumption("MAELSTROM", "OPEN_SEA", "RIGGING");
    expect(r).toEqual({ provisions: 1, water: 1, riggingUsed: true, spyglassUsed: false });
  });

  it("tempest with spyglass: full consumption, spyglassUsed", () => {
    const r = calculateConsumption("TEMPEST", "OPEN_SEA", "SPYGLASS");
    expect(r).toEqual({ provisions: 5, water: 2, riggingUsed: false, spyglassUsed: true });
  });

  it("home port: zero consumption regardless of weather", () => {
    const r = calculateConsumption("TEMPEST", "HOME_PORT", "NONE");
    expect(r).toEqual({ provisions: 0, water: 0, riggingUsed: false, spyglassUsed: false });
  });

  it("friendly cove: zero water, normal provisions", () => {
    const r = calculateConsumption("CLEAR", "FRIENDLY_COVE", "NONE");
    expect(r).toEqual({ provisions: 1, water: 0, riggingUsed: false, spyglassUsed: false });
  });

  it("friendly cove in doldrums: zero water, 1 provision", () => {
    const r = calculateConsumption("DOLDRUMS", "FRIENDLY_COVE", "NONE");
    expect(r).toEqual({ provisions: 1, water: 0, riggingUsed: false, spyglassUsed: false });
  });
});

describe("resolveLost", () => {
  it("tempest: 30 provisions, 12 water", () => {
    expect(resolveLost("TEMPEST")).toEqual({ provisions: 30, water: 12 });
  });

  it("maelstrom: 30 provisions, 24 water", () => {
    expect(resolveLost("MAELSTROM")).toEqual({ provisions: 30, water: 24 });
  });
});

describe("canAfford", () => {
  it("returns true when sufficient", () => {
    expect(canAfford({ water: 10, provisions: 10, rigging: 0, spyglass: 0 }, 5, 5)).toBe(true);
  });

  it("returns false when provisions insufficient", () => {
    expect(canAfford({ water: 10, provisions: 2, rigging: 0, spyglass: 0 }, 5, 5)).toBe(false);
  });

  it("returns false when water insufficient", () => {
    expect(canAfford({ water: 2, provisions: 10, rigging: 0, spyglass: 0 }, 5, 5)).toBe(false);
  });
});

describe("isStorm", () => {
  it("tempest is a storm", () => expect(isStorm("TEMPEST")).toBe(true));
  it("maelstrom is a storm", () => expect(isStorm("MAELSTROM")).toBe(true));
  it("clear is not a storm", () => expect(isStorm("CLEAR")).toBe(false));
  it("doldrums is not a storm", () => expect(isStorm("DOLDRUMS")).toBe(false));
});
