import { NextResponse } from "next/server";
import { purchaseResources } from "@/lib/game-actions";
import { getIO } from "@/lib/io";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, teamId, items } = body;

    if (!sessionId || !teamId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "sessionId, teamId, and items[] are required" },
        { status: 400 }
      );
    }

    const team = await purchaseResources(sessionId, teamId, items);

    try {
      const io = getIO();
      io.to("team:" + teamId).emit("purchase-confirmed", { team });
      io.to("session:" + sessionId).emit("team-purchased", { teamId, team });
    } catch {}

    return NextResponse.json({ team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed";
    const status = message.includes("Not enough") || message.includes("Over cargo")
      || message.includes("not available") || message.includes("Cannot buy")
      ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
