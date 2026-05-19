import { NextResponse } from "next/server";
import { startGame } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await startGame(sessionId);
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not in LOBBY")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
