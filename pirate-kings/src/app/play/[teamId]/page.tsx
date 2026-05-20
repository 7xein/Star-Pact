"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer } from "@/components/map/MapContainer";
import { BuyPanel } from "@/components/game/BuyPanel";
import { DayTimer } from "@/components/game/DayTimer";
import { WeatherDisplay } from "@/components/game/WeatherDisplay";
import { StrandedOverlay } from "@/components/game/StrandedOverlay";
import { Scoreboard, type ScoreEntry } from "@/components/game/Scoreboard";
import { getSocket } from "@/lib/socket";
import type { ShipPosition, DayWeather } from "@/types/game";

type TeamState = {
  id: string;
  name: string;
  color: string;
  doubloons: number;
  cargoCapacity: number;
  status: string;
  position: { x: number; y: number } | null;
};

type InventoryItem = {
  resourceType: string;
  quantity: number;
  totalWeight: number;
};

type SessionState = {
  id: string;
  status: string;
  currentDay: number;
};

export default function PlayPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const [team, setTeam] = useState<TeamState | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [connected, setConnected] = useState(false);

  // New state
  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [timerEnd, setTimerEnd] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [moveError, setMoveError] = useState("");
  const [isLost, setIsLost] = useState(false);
  const [locationType, setLocationType] = useState("HOME_PORT");

  useEffect(() => {
    const socket = getSocket();
    const joinCode = sessionStorage.getItem("joinCode") || "";

    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-team", { teamId, joinCode });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("team-state", (data: {
      team: TeamState;
      inventory: InventoryItem[];
      session: SessionState;
      locationType?: string;
    }) => {
      setTeam(data.team);
      setInventory(data.inventory);
      setSession(data.session);
      if (data.locationType) {
        setLocationType(data.locationType);
      }
    });

    socket.on("game-started", (data: { currentDay: number }) => {
      setSession((prev) =>
        prev ? { ...prev, status: "ACTIVE", currentDay: data.currentDay } : prev
      );
    });

    socket.on("day-advanced", (data: {
      weather: DayWeather;
      timerEnd: string;
      currentDay: number;
    }) => {
      setWeather(data.weather);
      setTimerEnd(data.timerEnd);
      setSession((prev) =>
        prev ? { ...prev, currentDay: data.currentDay } : prev
      );
      setMoveError("");
    });

    socket.on("day-ended", (data: {
      inventory: InventoryItem[];
      team: Partial<TeamState>;
    }) => {
      setInventory(data.inventory);
      setTeam((prev) => (prev ? { ...prev, ...data.team } : prev));
    });

    socket.on("move-confirmed", (data: {
      success: boolean;
      message?: string;
      position: { x: number; y: number };
      doubloons: number;
      cargoCapacity: number;
      inventory: InventoryItem[];
      locationType?: string;
    }) => {
      if (data.success) {
        setTeam((prev) =>
          prev
            ? {
                ...prev,
                position: data.position,
                doubloons: data.doubloons,
                cargoCapacity: data.cargoCapacity,
              }
            : prev
        );
        setInventory(data.inventory);
        if (data.locationType) {
          setLocationType(data.locationType);
        }
        setMoveError("");
      } else {
        setMoveError(data.message || "Move failed");
      }
    });

    socket.on("move-error", (data: { message: string }) => {
      setMoveError(data.message);
    });

    socket.on("team-lost", (data: { lostUntilDay: number }) => {
      alert(`Your crew is lost at sea! You will drift until day ${data.lostUntilDay}.`);
      setIsLost(true);
    });

    socket.on("team-stranded", (data: { status: string }) => {
      setTeam((prev) => (prev ? { ...prev, status: data.status } : prev));
    });

    socket.on("purchase-confirmed", (data: {
      doubloons: number;
      cargoCapacity: number;
      inventory: InventoryItem[];
    }) => {
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              doubloons: data.doubloons,
              cargoCapacity: data.cargoCapacity,
            }
          : prev
      );
      setInventory(data.inventory);
    });

    socket.on("game-ended", (data: { scores?: ScoreEntry[] }) => {
      if (data.scores) {
        setScores(data.scores);
      }
      setSession((prev) =>
        prev ? { ...prev, status: "COMPLETED" } : prev
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("team-state");
      socket.off("game-started");
      socket.off("day-advanced");
      socket.off("day-ended");
      socket.off("move-confirmed");
      socket.off("move-error");
      socket.off("team-lost");
      socket.off("team-stranded");
      socket.off("purchase-confirmed");
      socket.off("game-ended");
      socket.disconnect();
    };
  }, [teamId]);

  const handleHexClick = useCallback(
    (x: number, y: number) => {
      if (!team || team.status !== "ACTIVE") return;
      const socket = getSocket();
      socket.emit("submit-move", { teamId: team.id, targetX: x, targetY: y });
    },
    [team]
  );

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Connecting...</p>
      </div>
    );
  }

  const ships: ShipPosition[] = team.position
    ? [{ teamId: team.id, teamName: team.name, color: team.color, gridX: team.position.x, gridY: team.position.y }]
    : [];

  const isWaiting = session?.status === "LOBBY";
  const isActive = session?.status === "ACTIVE";
  const canBuy =
    isActive &&
    (locationType === "HOME_PORT" || locationType === "TRADING_POST");

  return (
    <div className="min-h-screen bg-background p-3 space-y-3">
      {/* Stranded / shipwrecked overlay */}
      {(team.status === "STRANDED" || team.status === "SHIPWRECKED") && (
        <StrandedOverlay status={team.status} />
      )}

      {/* Scoreboard overlay when game ends */}
      {scores && session && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md">
            <Scoreboard
              scores={scores}
              sessionId={session.id}
              highlightTeamId={teamId}
              mode="team"
            />
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="font-bold text-sm">{team.name}</span>
          {session && (
            <span className="text-xs text-muted-foreground">
              Day {session.currentDay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timerEnd && <DayTimer timerEnd={timerEnd} paused={!isActive} />}
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {connected ? "Connected" : "Reconnecting..."}
            </span>
          </div>
        </div>
      </div>

      {isWaiting && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Waiting for voyage to begin...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Weather display */}
      {weather && (
        <WeatherDisplay
          weather={weather}
          mode="team"
          teamZone={locationType === "OPEN_SEA" ? "OPEN_SEA" : locationType === "KRAKEN_LAIR" ? "KRAKEN" : "SAFE"}
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-amber-500">
              {team.doubloons}
            </p>
            <p className="text-xs text-muted-foreground">Doubloons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-blue-400">
              {team.cargoCapacity}
            </p>
            <p className="text-xs text-muted-foreground">Cargo (tons)</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {inventory.map((item) => (
            <Card key={item.resourceType}>
              <CardContent className="py-2 text-center">
                <p className="text-lg font-bold">{item.quantity}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {item.resourceType.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Move error banner */}
      {moveError && (
        <div className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-600">
          {moveError}
        </div>
      )}

      {/* Buy panel */}
      {canBuy && session && (
        <BuyPanel
          teamId={team.id}
          sessionId={session.id}
          doubloons={team.doubloons}
          cargoCapacity={team.cargoCapacity}
          locationType={locationType}
          onPurchase={() => {
            // purchase-confirmed socket event will update state
          }}
        />
      )}

      {/* Map */}
      <MapContainer
        mode="team"
        currentPosition={team.position || undefined}
        ships={ships}
        onHexClick={handleHexClick}
        isMovementPhase={isActive && !isLost}
      />

      <p className="text-center text-xs text-muted-foreground">
        {team.position
          ? `Position: (${team.position.x}, ${team.position.y})`
          : "Docked at Home Port"}
      </p>
    </div>
  );
}
