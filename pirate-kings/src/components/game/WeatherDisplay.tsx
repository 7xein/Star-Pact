"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherType, DayWeather } from "@/types/game";

const WEATHER_ICONS: Record<WeatherType, string> = {
  CLEAR: "☀️",
  TEMPEST: "⛈️",
  DOLDRUMS: "🌫️",
  MAELSTROM: "🌀",
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  CLEAR: "Clear",
  TEMPEST: "Tempest",
  DOLDRUMS: "Doldrums",
  MAELSTROM: "Maelstrom",
};

type WeatherDisplayProps = {
  weather: DayWeather;
  mode: "team" | "facilitator";
  teamZone: string;
};

function WeatherBadge({ type }: { type: WeatherType }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xl">{WEATHER_ICONS[type]}</span>
      <span className="text-sm font-medium">{WEATHER_LABELS[type]}</span>
    </div>
  );
}

function getWeatherForZone(weather: DayWeather, zone: string): WeatherType {
  switch (zone) {
    case "OPEN_SEA":
      return weather.openSea;
    case "KRAKEN":
      return weather.kraken;
    case "SAFE":
    default:
      return weather.safe;
  }
}

export function WeatherDisplay({
  weather,
  mode,
  teamZone,
}: WeatherDisplayProps) {
  if (mode === "team") {
    const current = getWeatherForZone(weather, teamZone);
    return (
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Weather</p>
          <WeatherBadge type={current} />
        </CardContent>
      </Card>
    );
  }

  const zones: { label: string; key: keyof DayWeather }[] = [
    { label: "Open Sea", key: "openSea" },
    { label: "Kraken’s Lair", key: "kraken" },
    { label: "Safe Zones", key: "safe" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {zones.map((zone) => (
            <div key={zone.key} className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">{zone.label}</p>
              <WeatherBadge type={weather[zone.key]} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
