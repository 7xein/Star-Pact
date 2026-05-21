"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScoreEntry = {
  rank: number;
  teamId: string;
  teamName: string;
  color: string;
  treasure: number;
  status: string;
  returnDay: number;
};

type ScoreboardProps = {
  scores: ScoreEntry[];
  sessionId: string;
  highlightTeamId?: string;
  mode: "team" | "facilitator";
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    FINISHED: "bg-green-500/15 text-green-600",
    SHIPWRECKED: "bg-red-500/15 text-red-600",
    STRANDED: "bg-orange-500/15 text-orange-600",
  };

  if (!styles[status]) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 xl:px-3 py-0.5 xl:py-1 text-xs xl:text-sm font-medium",
        styles[status]
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function Scoreboard({
  scores,
  sessionId,
  highlightTeamId,
  mode,
}: ScoreboardProps) {
  async function handleDownloadCsv() {
    const res = await fetch("/api/game/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, format: "csv" }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scoreboard.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {scores.map((entry) => {
          const isHighlighted = entry.teamId === highlightTeamId;
          return (
            <div
              key={entry.teamId}
              className={cn(
                "flex items-center gap-2 xl:gap-3 rounded-lg px-2 xl:px-3 py-1.5 xl:py-2.5 text-sm xl:text-lg",
                isHighlighted && "bg-muted ring-1 ring-foreground/10"
              )}
            >
              <span className="w-5 xl:w-8 text-center font-bold text-muted-foreground">
                {entry.rank}
              </span>
              <span
                className="h-3 w-3 xl:h-5 xl:w-5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex-1 font-medium truncate">
                {entry.teamName}
              </span>
              <span className="font-mono text-amber-500 font-bold">
                {entry.treasure}
              </span>
              <StatusBadge status={entry.status} />
            </div>
          );
        })}

        {scores.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No scores yet
          </p>
        )}

        {mode === "facilitator" && (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={handleDownloadCsv}
          >
            Download CSV
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
