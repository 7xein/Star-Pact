import { describe, it, expect } from "vitest";
import { getHexNeighbors, hexToPixel, isValidHex, hexDistance } from "@/lib/hex";

describe("getHexNeighbors", () => {
  it("returns 6 neighbors for a center hex on even row", () => {
    const neighbors = getHexNeighbors(3, 2);
    expect(neighbors).toHaveLength(6);
    expect(neighbors).toContainEqual({ x: 2, y: 2 });
    expect(neighbors).toContainEqual({ x: 4, y: 2 });
    expect(neighbors).toContainEqual({ x: 2, y: 1 });
    expect(neighbors).toContainEqual({ x: 3, y: 1 });
    expect(neighbors).toContainEqual({ x: 2, y: 3 });
    expect(neighbors).toContainEqual({ x: 3, y: 3 });
  });

  it("returns 6 neighbors for a center hex on odd row", () => {
    const neighbors = getHexNeighbors(3, 3);
    expect(neighbors).toHaveLength(6);
    expect(neighbors).toContainEqual({ x: 2, y: 3 });
    expect(neighbors).toContainEqual({ x: 4, y: 3 });
    expect(neighbors).toContainEqual({ x: 3, y: 2 });
    expect(neighbors).toContainEqual({ x: 4, y: 2 });
    expect(neighbors).toContainEqual({ x: 3, y: 4 });
    expect(neighbors).toContainEqual({ x: 4, y: 4 });
  });

  it("filters out-of-bounds neighbors for corner (0,0)", () => {
    const neighbors = getHexNeighbors(0, 0);
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual({ x: 1, y: 0 });
    expect(neighbors).toContainEqual({ x: 0, y: 1 });
  });

  it("filters out-of-bounds neighbors for corner (7,7)", () => {
    const neighbors = getHexNeighbors(7, 7);
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual({ x: 6, y: 7 });
    expect(neighbors).toContainEqual({ x: 7, y: 6 });
  });
});

describe("isValidHex", () => {
  it("returns true for valid coordinates", () => {
    expect(isValidHex(0, 0)).toBe(true);
    expect(isValidHex(7, 7)).toBe(true);
    expect(isValidHex(3, 4)).toBe(true);
  });

  it("returns false for out-of-bounds coordinates", () => {
    expect(isValidHex(-1, 0)).toBe(false);
    expect(isValidHex(8, 0)).toBe(false);
    expect(isValidHex(0, -1)).toBe(false);
    expect(isValidHex(0, 8)).toBe(false);
  });
});

describe("hexToPixel", () => {
  it("returns pixel position for (0,0)", () => {
    const pos = hexToPixel(0, 0);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it("odd rows are offset horizontally", () => {
    const even = hexToPixel(0, 0);
    const odd = hexToPixel(0, 1);
    expect(odd.x).toBeGreaterThan(even.x);
  });
});

describe("hexDistance", () => {
  it("adjacent hexes have distance 1", () => {
    expect(hexDistance(0, 0, 1, 0)).toBe(1);
    expect(hexDistance(0, 0, 0, 1)).toBe(1);
  });

  it("Home Port to Treasure Island distance", () => {
    expect(hexDistance(7, 7, 0, 0)).toBe(11);
  });
});
