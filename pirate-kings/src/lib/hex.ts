import type { HexCoord } from "@/types/game";

const GRID_SIZE = 8;
const HEX_WIDTH = 80;
const HEX_HEIGHT = 80;

export function isValidHex(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getHexNeighbors(x: number, y: number): HexCoord[] {
  const isOddRow = y % 2 === 1;

  const offsets: [number, number][] = isOddRow
    ? [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];

  return offsets
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter((c) => isValidHex(c.x, c.y));
}

export function hexToPixel(gridX: number, gridY: number): { x: number; y: number } {
  const xOffset = gridY % 2 === 1 ? HEX_WIDTH * 0.5 : 0;
  return {
    x: gridX * HEX_WIDTH + xOffset,
    y: gridY * (HEX_HEIGHT * 0.75),
  };
}

function offsetToCube(x: number, y: number): { q: number; r: number; s: number } {
  const q = x - (y - (y & 1)) / 2;
  const r = y;
  return { q, r, s: -q - r };
}

export function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const a = offsetToCube(x1, y1);
  const b = offsetToCube(x2, y2);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}
