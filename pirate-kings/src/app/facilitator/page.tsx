"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer } from "@/components/map/MapContainer";
import { getSocket } from "@/lib/socket";
import type { ShipPosition } from "@/types/game";

type TeamInfo = {
  id: string;
  name: string;
  color: string;
  joinCode: string;
  connected: boolean;
  position: { x: number; y: number } | null;
};

type SessionInfo = {
  id: string;
  status: string;
  currentDay: number;
};

export default function FacilitatorPage() {
  const [phase, setPhase] = useState<"create" | "lobby" | "active">("create");
  const [teamCount, setTeamCount] = useState(8);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start");
    }
  };

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
              <p className="text-2xl font-bold text-primary">{joinUrl}</p>
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
                  <p className="font-bold text-sm">{team.name}</p>
                  <p className="font-mono text-lg">{team.joinCode}</p>
                  <p
                    className={`text-xs ${
                      team.connected ? "text-green-500" : "text-orange-400"
                    }`}
                  >
                    {team.connected ? "● Connected" : "○ Waiting..."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
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

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Day {session?.currentDay}</h1>
            <p className="text-muted-foreground text-sm">Game Active</p>
          </div>
        </div>
        <MapContainer mode="facilitator" ships={ships} />
      </div>
    </div>
  );
}
