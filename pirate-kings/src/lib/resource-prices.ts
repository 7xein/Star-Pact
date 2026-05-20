import type { LocationType } from "@/generated/prisma/client";

type PriceEntry = {
  homePort: number;
  tradingPost: number | null;
  weight: number;
};

export const RESOURCE_PRICES: Record<string, PriceEntry> = {
  WATER:      { homePort: 25,  tradingPost: 50,   weight: 50 },
  PROVISIONS: { homePort: 10,  tradingPost: 20,   weight: 10 },
  RIGGING:    { homePort: 400, tradingPost: null,  weight: 60 },
  SPYGLASS:   { homePort: 100, tradingPost: null,  weight: 10 },
};

export function getPrice(
  resourceType: string,
  locationType: LocationType
): number | null {
  const entry = RESOURCE_PRICES[resourceType];
  if (!entry) return null;
  if (locationType === "HOME_PORT") return entry.homePort;
  if (locationType === "TRADING_POST") return entry.tradingPost;
  return null;
}

export function getWeight(resourceType: string): number {
  return RESOURCE_PRICES[resourceType]?.weight ?? 0;
}
