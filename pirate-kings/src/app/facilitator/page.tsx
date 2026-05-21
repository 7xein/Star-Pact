"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer } from "@/components/map/MapContainer";
import { DayControls } from "@/components/game/DayControls";
import { DayTimer } from "@/components/game/DayTimer";
import { WeatherDisplay } from "@/components/game/WeatherDisplay";
import { Scoreboard, type ScoreEntry } from "@/components/game/Scoreboard";
import { getSocket } from "@/lib/socket";
import type { ShipPosition, DayWeather } from "@/types/game";

type TeamInfo = {
  id: string;
  name: string;
  color: string;
  joinCode: string;
  connected: boolean;
  status: string;
  position: { x: number; y: number } | null;
};

type SessionInfo = {
  id: string;
  status: string;
  currentDay: number;
};

export default function FacilitatorPage() {
  const [phase, setPhase] = useState<"create" | "lobby" | "active" | "scoreboard">("create");
  const [teamCount, setTeamCount] = useState(8);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [timerEnd, setTimerEnd] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession({ id: data.id, status: data.status, currentDay: data.currentDay });
      setTeams(
        data.teams.map((t: Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          joinCode: t.joinCode,
          connected: false,
          status: "ACTIVE",
          position: { x: 7, y: 7 },
        }))
      );
      setPhase("lobby");

      const socket = getSocket();
      socket.connect();
      socket.emit("join-facilitator", { sessionId: data.id });

      socket.on("team-connected", ({ teamId }: { teamId: string }) => {
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, connected: true } : t))
        );
      });

      socket.on("team-disconnected", ({ teamId }: { teamId: string }) => {
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, connected: false } : t))
        );
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession({ ...session, status: "ACTIVE", currentDay: 1 });
      setPhase("active");

      const socket = getSocket();
      socket.emit("game-started", { sessionId: session.id });

      socket.on("day-advanced", (data: { day: number; weather: DayWeather; timerEnd: string }) => {
        setSession((prev) => prev ? { ...prev, currentDay: data.day } : prev);
        setWeather(data.weather);
        setTimerEnd(data.timerEnd);
        setTimerRunning(true);
      });

      socket.on("day-ended", (data: { day: number; gameEnded: boolean }) => {
        setTimerEnd(null);
        setTimerRunning(false);
        if (data.gameEnded) {
          handleEndVoyage();
        }
      });

      socket.on("team-moved", (data: { teamId: string; gridX: number; gridY: number }) => {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === data.teamId ? { ...t, position: { x: data.gridX, y: data.gridY } } : t
          )
        );
      });

      socket.on("team-status-changed", (data: { teamId: string; status: string }) => {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === data.teamId ? { ...t, status: data.status } : t
          )
        );
      });

      socket.on("game-ended", (data: { scores?: ScoreEntry[] }) => {
        if (data.scores) {
          setScores(data.scores);
          setPhase("scoreboard");
        }
      });

      socket.on("timer-paused", () => {
        setTimerRunning(false);
      });

      socket.on("timer-resumed", (data: { timerEnd: string }) => {
        setTimerEnd(data.timerEnd);
        setTimerRunning(true);
      });

      socket.on("timer-updated", (data: { timerEnd: string }) => {
        setTimerEnd(data.timerEnd);
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start");
    }
  };

  async function handleEndVoyage() {
    if (!session) return;
    try {
      const res = await fetch("/api/game/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScores(data.scores);
      setPhase("scoreboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end game");
    }
  }

  const connectedCount = teams.filter((t) => t.connected).length;
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join`
    : "/join";

  if (phase === "create") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6">
            <h1 className="text-2xl font-bold text-center">
              Create New Voyage
            </h1>
            <div className="space-y-2">
              <Label htmlFor="teamCount">Number of Teams (2–40)</Label>
              <Input
                id="teamCount"
                type="number"
                min={2}
                max={40}
                value={teamCount}
                onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Game"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Treasure of the Pirate Kings</h1>
              <p className="text-muted-foreground text-sm">
                Session: {session?.id.slice(0, 8)} • {teams.length} teams
              </p>
            </div>
            <Button size="lg" onClick={handleStart}>
              Start Voyage ▸
            </Button>
          </div>

          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Join at
              </p>
              <p className="text-2xl xl:text-5xl 2xl:text-6xl font-bold text-primary">{joinUrl}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {teams.map((team) => (
              <Card
                key={team.id}
                className={`border-2 ${
                  team.connected ? "border-green-500" : "border-orange-400"
                }`}
              >
                <CardContent className="py-4 text-center space-y-2">
                  <div
                    className="w-6 h-6 rounded-full mx-auto"
                    style={{ backgroundColor: team.color }}
                  />
                  <p className="font-bold text-sm xl:text-lg">{team.name}</p>
                  <p className="font-mono text-lg xl:text-2xl">{team.joinCode}</p>
                  <p
                    className={`text-xs xl:text-base ${
                      team.connected ? "text-green-500" : "text-orange-400"
                    }`}
                  >
                    {team.connected ? "● Connected" : "○ Waiting..."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm xl:text-lg text-muted-foreground">
            {connectedCount} of {teams.length} teams connected
          </p>
        </div>
      </div>
    );
  }

  const ships: ShipPosition[] = teams
    .filter((t) => t.position)
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      color: t.color,
      gridX: t.position!.x,
      gridY: t.position!.y,
    }));

  if (phase === "scoreboard") {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl xl:text-5xl 2xl:text-6xl font-bold text-center">Voyage Complete</h1>
          <Scoreboard scores={scores} sessionId={session?.id ?? ""} mode="facilitator" />
        </div>
      </div>
    );
  }

  const STATUS_INDICATORS: Record<string, string> = {
    ACTIVE: "text-green-500",
    LOST: "text-yellow-500",
    STRANDED: "text-red-500",
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl xl:text-5xl 2xl:text-6xl font-bold">Day {session?.currentDay ?? 0}</h1>
            <DayTimer timerEnd={timerEnd} paused={!timerRunning} />
          </div>
          <Button variant="destructive" onClick={handleEndVoyage} className="xl:text-lg xl:px-6 xl:py-3">
            End Voyage
          </Button>
        </div>

        <DayControls
          sessionId={session?.id ?? ""}
          currentDay={session?.currentDay ?? 0}
          timerRunning={timerRunning}
          onDayAdvanced={(day) => {
            setSession((prev) => prev ? { ...prev, currentDay: day } : prev);
          }}
          onDayEnded={() => {
            setTimerEnd(null);
            setTimerRunning(false);
          }}
          onTimerUpdate={(paused) => setTimerRunning(!paused)}
        />

        {weather && (
          <WeatherDisplay weather={weather} mode="facilitator" teamZone="OPEN_SEA" />
        )}

        <MapContainer mode="facilitator" ships={ships} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {teams.map((team) => (
            <Card key={team.id} className="border">
              <CardContent className="py-2 xl:py-3 px-3 xl:px-4 flex items-center gap-2 xl:gap-3">
                <span
                  className="h-3 w-3 xl:h-5 xl:w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-sm xl:text-lg font-medium truncate flex-1">{team.name}</span>
                <span className={`text-xs xl:text-base font-medium ${STATUS_INDICATORS[team.status] ?? "text-muted-foreground"}`}>
                  {team.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
