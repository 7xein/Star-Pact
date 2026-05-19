export type HexCoord = { x: number; y: number };

export type LocationInfo = {
  name: string;
  type: "HOME_PORT" | "TREASURE_ISLAND" | "TRADING_POST" | "FRIENDLY_COVE" | "KRAKEN_LAIR" | "OPEN_SEA";
  weatherZone: "SAFE" | "KRAKEN" | "OPEN_SEA";
};

export type WeatherType = "CLEAR" | "TEMPEST" | "DOLDRUMS" | "MAELSTROM";

export type DayWeather = {
  openSea: WeatherType;
  kraken: WeatherType;
  safe: WeatherType;
};

export type ShipPosition = {
  teamId: string;
  teamName: string;
  color: string;
  gridX: number;
  gridY: number;
};
