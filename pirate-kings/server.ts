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

    socket.on("disconnect", () => {
      if (socket.data.teamId && socket.data.sessionId) {
        io.to(`session:${socket.data.sessionId}`).emit("team-disconnected", {
          teamId: socket.data.teamId,
        });
      }
    });
  });

  (globalThis as Record<string, unknown>).__io = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
