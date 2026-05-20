import { NextResponse } from "next/server";
import { extendTimer } from "@/lib/game-actions";
import { getIO } from "@/lib/io";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const result = await extendTimer(sessionId);

    try { const io = getIO(); io.to("game:" + sessionId).emit("timer-updated", result); } catch {}

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
