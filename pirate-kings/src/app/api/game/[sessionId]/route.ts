import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const session = await prisma.gameSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        teams: {
          include: {
            currentLocation: true,
            inventory: true,
          },
        },
        weatherSchedule: true,
      },
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
