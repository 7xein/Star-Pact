import type { WeatherType } from "@/types/game";

export type Protection = "RIGGING" | "SPYGLASS" | "NONE";

export type ConsumptionResult = {
  provisions: number;
  water: number;
  riggingUsed: boolean;
  spyglassUsed: boolean;
};

export type InventorySnapshot = {
  water: number;
  provisions: number;
  rigging: number;
  spyglass: number;
};

export function checkProtection(inv: InventorySnapshot): Protection {
  if (inv.rigging > 0) return "RIGGING";
  if (inv.spyglass > 0) return "SPYGLASS";
  return "NONE";
}

export function isStorm(weather: WeatherType): boolean {
  return weather === "TEMPEST" || weather === "MAELSTROM";
}

export function calculateConsumption(
  weather: WeatherType,
  locationType: string,
  protection: Protection
): ConsumptionResult {
  if (locationType === "HOME_PORT") {
    return { provisions: 0, water: 0, riggingUsed: false, spyglassUsed: false };
  }

  const isCove = locationType === "FRIENDLY_COVE";

  if (isStorm(weather) && protection === "RIGGING") {
    return {
      provisions: 1,
      water: isCove ? 0 : 1,
      riggingUsed: true,
      spyglassUsed: false,
    };
  }

  let provisions: number;
  let water: number;

  switch (weather) {
    case "CLEAR":
      provisions = 1;
      water = 1;
      break;
    case "TEMPEST":
      provisions = 5;
      water = 2;
      break;
    case "DOLDRUMS":
      provisions = 1;
      water = 3;
      break;
    case "MAELSTROM":
      provisions = 5;
      water = 4;
      break;
    default:
      provisions = 1;
      water = 1;
  }

  const spyglassUsed = isStorm(weather) && protection === "SPYGLASS";

  return {
    provisions,
    water: isCove ? 0 : water,
    riggingUsed: false,
    spyglassUsed,
  };
}

export function resolveLost(weather: WeatherType): { provisions: number; water: number } {
  const base = weather === "MAELSTROM"
    ? { provisions: 5, water: 4 }
    : { provisions: 5, water: 2 };

  return {
    provisions: base.provisions * 2 * 3,
    water: base.water * 2 * 3,
  };
}

export function canAfford(
  inv: InventorySnapshot,
  provisions: number,
  water: number
): boolean {
  return inv.provisions >= provisions && inv.water >= water;
}
