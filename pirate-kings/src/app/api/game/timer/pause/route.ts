import { NextResponse } from "next/server";
import { pauseTimer } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const result = await pauseTimer(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
