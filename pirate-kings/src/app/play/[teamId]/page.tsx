"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer } from "@/components/map/MapContainer";
import { getSocket } from "@/lib/socket";
import type { ShipPosition } from "@/types/game";

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
    }) => {
      setTeam(data.team);
      setInventory(data.inventory);
      setSession(data.session);
    });

    socket.on("game-started", (data: { currentDay: number }) => {
      setSession((prev) =>
        prev ? { ...prev, status: "ACTIVE", currentDay: data.currentDay } : prev
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("team-state");
      socket.off("game-started");
      socket.disconnect();
    };
  }, [teamId]);

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

  return (
    <div className="min-h-screen bg-background p-3 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="font-bold text-sm">{team.name}</span>
        </div>
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

      {isWaiting && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Waiting for voyage to begin...
            </p>
          </CardContent>
        </Card>
      )}

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

      <MapContainer
        mode="team"
        currentPosition={team.position || undefined}
        ships={ships}
        isMovementPhase={!isWaiting}
      />

      <p className="text-center text-xs text-muted-foreground">
        {team.position
          ? `Position: (${team.position.x}, ${team.position.y})`
          : "Docked at Home Port"}
      </p>
    </div>
  );
}
