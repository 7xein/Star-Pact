import { NextResponse } from "next/server";
import { advanceDay } from "@/lib/game-actions";
import { getIO } from "@/lib/io";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const result = await advanceDay(sessionId);

    try { const io = getIO(); io.to("game:" + sessionId).emit("day-advanced", result); } catch {}

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
