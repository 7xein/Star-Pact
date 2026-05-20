import type { Server as SocketServer } from "socket.io";

export function getIO(): SocketServer {
  const io = (globalThis as Record<string, unknown>).__io as SocketServer;
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
