import type { LocationInfo, DayWeather, HexCoord } from "@/types/game";

export const DEFAULT_LOCATIONS: (HexCoord & LocationInfo)[] = [
  { x: 0, y: 0, name: "Treasure Island", type: "TREASURE_ISLAND", weatherZone: "SAFE" },
  { x: 3, y: 0, name: "Trading Post 1", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 1, y: 1, name: "Friendly Cove 1", type: "FRIENDLY_COVE", weatherZone: "OPEN_SEA" },
  { x: 4, y: 1, name: "Trading Post 2", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 2, y: 2, name: "Trading Post 3", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 4, y: 2, name: "Kraken's Lair", type: "KRAKEN_LAIR", weatherZone: "KRAKEN" },
  { x: 6, y: 2, name: "Trading Post 4", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 3, y: 3, name: "Trading Post 5", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 5, y: 4, name: "Friendly Cove 2", type: "FRIENDLY_COVE", weatherZone: "OPEN_SEA" },
  { x: 1, y: 5, name: "Trading Post 6", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 4, y: 6, name: "Trading Post 7", type: "TRADING_POST", weatherZone: "SAFE" },
  { x: 7, y: 7, name: "Home Port", type: "HOME_PORT", weatherZone: "SAFE" },
];

export const DEFAULT_WEATHER: DayWeather[] = [
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "DOLDRUMS", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "MAELSTROM", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "TEMPEST", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "MAELSTROM", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "TEMPEST", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
  { openSea: "DOLDRUMS", kraken: "MAELSTROM", safe: "CLEAR" },
  { openSea: "CLEAR", kraken: "CLEAR", safe: "CLEAR" },
];

export const TEAM_COLORS = [
  "#e53e3e", "#3182ce", "#38a169", "#805ad5",
  "#dd6b20", "#d69e2e", "#319795", "#d53f8c",
  "#2b6cb0", "#c05621", "#276749", "#6b46c1",
  "#9c4221", "#975a16", "#285e61", "#97266d",
  "#2c5282", "#c53030", "#22543d", "#553c9a",
  "#7b341e", "#744210", "#234e52", "#702459",
  "#2a4365", "#9b2c2c", "#1c4532", "#44337a",
  "#652b19", "#5f370e", "#1d4044", "#521b41",
  "#1a365d", "#822727", "#174032", "#362c75",
  "#4a2511", "#49310c", "#163836", "#42214d",
  "#153e75", "#7a2424", "#14392d", "#312a65",
];

export function getLocationAt(x: number, y: number): LocationInfo {
  const loc = DEFAULT_LOCATIONS.find((l) => l.x === x && l.y === y);
  if (loc) return { name: loc.name, type: loc.type, weatherZone: loc.weatherZone };
  return { name: `Open Sea (${x},${y})`, type: "OPEN_SEA", weatherZone: "OPEN_SEA" };
}
