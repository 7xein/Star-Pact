"use client";

import type { LocationInfo } from "@/types/game";

const HEX_POINTS = "40,0 80,20 80,60 40,80 0,60 0,20";

const TYPE_COLORS: Record<LocationInfo["type"], { fill: string; stroke: string }> = {
  HOME_PORT: { fill: "#1a2a1a", stroke: "#68d391" },
  TREASURE_ISLAND: { fill: "#2d1810", stroke: "#f6ad55" },
  TRADING_POST: { fill: "#1a2740", stroke: "#63b3ed" },
  FRIENDLY_COVE: { fill: "#0f3a2a", stroke: "#48bb78" },
  KRAKEN_LAIR: { fill: "#2a0a2a", stroke: "#fc8181" },
  OPEN_SEA: { fill: "#0f2942", stroke: "#1a3a5c" },
};

type HexTileProps = {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  location: LocationInfo;
  isCurrentPosition?: boolean;
  isAdjacent?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
};

export function HexTile({
  pixelX,
  pixelY,
  location,
  isCurrentPosition,
  isAdjacent,
  isSelectable,
  onClick,
}: HexTileProps) {
  const colors = TYPE_COLORS[location.type];
  const strokeWidth = location.type === "OPEN_SEA" ? 1 : 2;

  return (
    <g
      transform={`translate(${pixelX}, ${pixelY})`}
      onClick={isSelectable ? onClick : undefined}
      style={{ cursor: isSelectable ? "pointer" : "default" }}
    >
      <polygon
        points={HEX_POINTS}
        fill={isCurrentPosition ? "#2d3748" : colors.fill}
        stroke={isAdjacent ? "#f6ad55" : colors.stroke}
        strokeWidth={isAdjacent ? 3 : strokeWidth}
        opacity={isSelectable ? 1 : isAdjacent ? 0.8 : 1}
      />
      {location.type !== "OPEN_SEA" && (
        <text
          x={40}
          y={44}
          textAnchor="middle"
          fill={colors.stroke}
          fontSize={9}
          fontWeight="bold"
        >
          {location.name.length > 12
            ? location.name.split(" ").slice(0, 2).join("\n")
            : location.name}
        </text>
      )}
    </g>
  );
}
