import { NextResponse } from "next/server";
import { extendTimer } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const result = await extendTimer(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
