import { createServer } from "http";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { prisma } from "./src/lib/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join-team", async (data: { teamId: string; joinCode: string }) => {
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
        include: { session: true, currentLocation: true, inventory: true },
      });

      if (!team) {
        socket.emit("error", { message: "Team not found" });
        return;
      }

      socket.join(`team:${team.id}`);
      socket.join(`game:${team.sessionId}`);

      socket.data.teamId = team.id;
      socket.data.sessionId = team.sessionId;
      socket.data.role = "captain";

      socket.emit("team-state", {
        team: {
          id: team.id,
          name: team.name,
          color: team.color,
          doubloons: team.doubloons,
          cargoCapacity: team.cargoCapacity,
          status: team.status,
          position: team.currentLocation
            ? { x: team.currentLocation.gridX, y: team.currentLocation.gridY }
            : null,
        },
        inventory: team.inventory,
        session: {
          id: team.session.id,
          status: team.session.status,
          currentDay: team.session.currentDay,
        },
      });

      io.to(`session:${team.sessionId}`).emit("team-connected", {
        teamId: team.id,
        teamName: team.name,
      });
    });

    socket.on("join-facilitator", async (data: { sessionId: string }) => {
      const session = await prisma.gameSession.findUnique({
        where: { id: data.sessionId },
        include: {
          teams: { include: { currentLocation: true } },
        },
      });

      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      socket.join(`session:${session.id}`);
      socket.join(`game:${session.id}`);

      socket.data.sessionId = session.id;
      socket.data.role = "facilitator";

      const connectedTeamIds = new Set<string>();
      const sockets = await io.in(`game:${session.id}`).fetchSockets();
      sockets.forEach((s) => {
        if (s.data.teamId) connectedTeamIds.add(s.data.teamId);
      });

      socket.emit("session-state", {
        session: {
          id: session.id,
          status: session.status,
          currentDay: session.currentDay,
        },
        teams: session.teams.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          joinCode: t.joinCode,
          connected: connectedTeamIds.has(t.id),
          position: t.currentLocation
            ? { x: t.currentLocation.gridX, y: t.currentLocation.gridY }
            : null,
        })),
      });
    });

    socket.on("submit-move", async (data: { teamId: string; targetX: number; targetY: number }) => {
      try {
        const { submitMove } = await import("./src/lib/game-actions");
        const result = await submitMove(data.teamId, data.targetX, data.targetY);

        io.to(`team:${data.teamId}`).emit("move-confirmed", result);

        if (socket.data.sessionId) {
          io.to(`session:${socket.data.sessionId}`).emit("team-moved", {
            teamId: data.teamId,
            gridX: result.position.x,
            gridY: result.position.y,
          });

          if (result.stranded) {
            io.to(`team:${data.teamId}`).emit("team-stranded", { message: "Your crew is stranded!" });
            io.to(`session:${socket.data.sessionId}`).emit("team-status-changed", {
              teamId: data.teamId,
              status: "STRANDED",
            });
          }

          if (result.wasLost) {
            io.to(`team:${data.teamId}`).emit("team-lost", {
              lostUntilDay: result.lostUntilDay,
              consumed: result.consumption,
            });
            io.to(`session:${socket.data.sessionId}`).emit("team-status-changed", {
              teamId: data.teamId,
              status: "LOST",
            });
          }
        }
      } catch (error) {
        socket.emit("move-error", { message: error instanceof Error ? error.message : "Move failed" });
      }
    });

    socket.on("disconnect", () => {
      if (socket.data.teamId && socket.data.sessionId) {
        io.to(`session:${socket.data.sessionId}`).emit("team-disconnected", {
          teamId: socket.data.teamId,
        });
      }
    });
  });

  (globalThis as Record<string, unknown>).__io = io;

  setInterval(async () => {
    try {
      const activeSessions = await prisma.gameSession.findMany({
        where: { status: "ACTIVE", timerRunning: true },
      });

      for (const session of activeSessions) {
        if (session.timerEnd && session.timerEnd.getTime() <= Date.now()) {
          const { endDay } = await import("./src/lib/game-actions");
          const result = await endDay(session.id);

          io.to(`game:${session.id}`).emit("day-ended", {
            day: result.day,
            results: result.results,
            gameEnded: result.gameEnded,
          });

          if (result.gameEnded) {
            io.to(`game:${session.id}`).emit("game-ended", {});
          }
        }
      }
    } catch (err) {
      console.error("Timer check error:", err);
    }
  }, 1000);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
