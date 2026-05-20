import { NextResponse } from "next/server";
import { advanceDay } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const result = await advanceDay(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
