"use client";

import { useRef, useState, useCallback } from "react";
import { HexGrid } from "./HexGrid";
import type { ShipPosition } from "@/types/game";

type MapContainerProps = {
  mode: "team" | "facilitator";
  currentPosition?: { x: number; y: number };
  ships?: ShipPosition[];
  onHexClick?: (x: number, y: number) => void;
  isMovementPhase?: boolean;
};

export function MapContainer(props: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const lastDistance = useRef<number | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastDistance.current !== null) {
        const delta = dist / lastDistance.current;
        setScale((s) => Math.min(3, Math.max(0.5, s * delta)));
      }
      lastDistance.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDistance.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden touch-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center top",
          transition: "transform 0.1s ease-out",
        }}
      >
        <HexGrid {...props} />
      </div>
    </div>
  );
}
