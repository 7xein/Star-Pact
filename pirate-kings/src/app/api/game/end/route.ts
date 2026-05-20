import { NextResponse } from "next/server";
import { endGame } from "@/lib/game-actions";
import { generateCSV } from "@/lib/scoring";
import { getIO } from "@/lib/io";

export async function POST(request: Request) {
  try {
    const { sessionId, format } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const scores = await endGame(sessionId);

    if (format === "csv") {
      const csv = generateCSV(scores);
      return new Response(csv, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=results.csv" },
      });
    }

    try { const io = getIO(); io.to("game:" + sessionId).emit("game-ended", { scores }); } catch {}

    return NextResponse.json({ scores });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
