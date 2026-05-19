import { NextResponse } from "next/server";
import { createGame } from "@/lib/game-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamCount, teamNames } = body;

    if (!teamCount || teamCount < 2 || teamCount > 40) {
      return NextResponse.json(
        { error: "teamCount must be between 2 and 40" },
        { status: 400 }
      );
    }

    const session = await createGame(teamCount, teamNames);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create game" },
      { status: 500 }
    );
  }
}
