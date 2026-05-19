import { NextResponse } from "next/server";
import { joinGame } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { joinCode } = body;

    if (!joinCode || typeof joinCode !== "string") {
      return NextResponse.json({ error: "joinCode is required" }, { status: 400 });
    }

    const result = await joinGame(joinCode.toUpperCase().trim());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid join code") {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to join game" },
      { status: 500 }
    );
  }
}
