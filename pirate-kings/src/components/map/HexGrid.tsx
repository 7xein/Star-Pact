"use client";

import { HexTile } from "./HexTile";
import { ShipMarker } from "./ShipMarker";
import { hexToPixel, getHexNeighbors } from "@/lib/hex";
import { getLocationAt } from "@/lib/map-data";
import type { ShipPosition } from "@/types/game";

const GRID_SIZE = 8;

type HexGridProps = {
  mode: "team" | "facilitator";
  currentPosition?: { x: number; y: number };
  ships?: ShipPosition[];
  onHexClick?: (x: number, y: number) => void;
  isMovementPhase?: boolean;
};

export function HexGrid({
  mode,
  currentPosition,
  ships = [],
  onHexClick,
  isMovementPhase = false,
}: HexGridProps) {
  const adjacentHexes =
    mode === "team" && currentPosition && isMovementPhase
      ? getHexNeighbors(currentPosition.x, currentPosition.y)
      : [];

  const isAdjacent = (x: number, y: number) =>
    adjacentHexes.some((h) => h.x === x && h.y === y);

  const hexes: React.ReactNode[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const pixel = hexToPixel(x, y);
      const location = getLocationAt(x, y);
      const adj = isAdjacent(x, y);
      const isCurrent =
        currentPosition?.x === x && currentPosition?.y === y;

      hexes.push(
        <HexTile
          key={`${x}-${y}`}
          x={x}
          y={y}
          pixelX={pixel.x}
          pixelY={pixel.y}
          location={location}
          isCurrentPosition={isCurrent}
          isAdjacent={adj}
          isSelectable={adj && isMovementPhase}
          onClick={() => onHexClick?.(x, y)}
        />
      );
    }
  }

  const shipMarkers = ships.map((ship) => {
    const pixel = hexToPixel(ship.gridX, ship.gridY);
    return (
      <ShipMarker
        key={ship.teamId}
        pixelX={pixel.x}
        pixelY={pixel.y}
        color={ship.color}
        label={ship.teamName}
        showLabel={mode === "facilitator"}
      />
    );
  });

  const svgWidth = GRID_SIZE * 80 + 40;
  const svgHeight = GRID_SIZE * 60 + 30;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto"
    >
      <rect width={svgWidth} height={svgHeight} fill="#0a1628" />
      {hexes}
      {shipMarkers}
    </svg>
  );
}
