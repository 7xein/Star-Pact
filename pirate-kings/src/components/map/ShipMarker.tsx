"use client";

type ShipMarkerProps = {
  pixelX: number;
  pixelY: number;
  color: string;
  label?: string;
  showLabel?: boolean;
};

export function ShipMarker({ pixelX, pixelY, color, label, showLabel }: ShipMarkerProps) {
  return (
    <g transform={`translate(${pixelX + 28}, ${pixelY + 20})`}>
      <circle r={12} fill={color} stroke="#fff" strokeWidth={2} />
      <text x={0} y={4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">
        ⛵
      </text>
      {showLabel && label && (
        <text x={0} y={28} textAnchor="middle" fill="#c9d1d9" fontSize={10}>
          {label}
        </text>
      )}
    </g>
  );
}
