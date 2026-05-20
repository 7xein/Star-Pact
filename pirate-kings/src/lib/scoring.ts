type TeamForScoring = {
  id: string;
  name: string;
  color: string;
  status: string;
  currentLocation: { type: string } | null;
  inventory: { resourceType: string; quantity: number }[];
  logEntries: { dayNumber: number; toLocationId: string | null }[];
};

export type ScoreEntry = {
  rank: number;
  teamId: string;
  teamName: string;
  color: string;
  treasure: number;
  status: string;
  returnDay: number | null;
};

export function calculateScores(
  teams: TeamForScoring[],
  homePortLocationId: string
): ScoreEntry[] {
  const entries: Omit<ScoreEntry, "rank">[] = teams.map((team) => {
    if (team.status === "STRANDED") {
      return {
        teamId: team.id, teamName: team.name, color: team.color,
        treasure: 0, status: "STRANDED", returnDay: null,
      };
    }

    const atHome = team.currentLocation?.type === "HOME_PORT";
    if (!atHome) {
      return {
        teamId: team.id, teamName: team.name, color: team.color,
        treasure: 0, status: "SHIPWRECKED", returnDay: null,
      };
    }

    const treasure = team.inventory
      .filter((i) => i.resourceType === "TREASURE")
      .reduce((sum, i) => sum + i.quantity, 0);

    const homeEntries = team.logEntries
      .filter((l) => l.toLocationId === homePortLocationId)
      .map((l) => l.dayNumber);
    const returnDay = homeEntries.length > 0 ? Math.max(...homeEntries) : null;

    return {
      teamId: team.id, teamName: team.name, color: team.color,
      treasure, status: "FINISHED", returnDay,
    };
  });

  entries.sort((a, b) => {
    if (b.treasure !== a.treasure) return b.treasure - a.treasure;
    if (a.returnDay === null) return 1;
    if (b.returnDay === null) return -1;
    return a.returnDay - b.returnDay;
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function generateCSV(scores: ScoreEntry[]): string {
  const header = "rank,team_name,color,treasure,status,return_day";
  const rows = scores.map((s) =>
    `${s.rank},"${s.teamName}",${s.color},${s.treasure},${s.status},${s.returnDay ?? ""}`
  );
  return [header, ...rows].join("\n");
}
