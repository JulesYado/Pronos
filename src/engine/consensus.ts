export interface ConsensusRow {
  teamId: string;
  avg: number;
  sd: number;
  /** position (1-based) donnée par chaque joueur, null si non classée */
  positions: (number | null)[];
}

/** Classement moyen à partir des classements de chaque joueur. */
export function consensus(rankings: (string | null)[][]): ConsensusRow[] {
  const teams = new Set<string>();
  rankings.forEach((r) => r.forEach((t) => t && teams.add(t)));
  const rows: ConsensusRow[] = [...teams].map((teamId) => {
    const positions = rankings.map((r) => {
      const i = r.indexOf(teamId);
      return i === -1 ? null : i + 1;
    });
    const vals = positions.filter((v): v is number => v !== null);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length);
    return { teamId, avg, sd, positions };
  });
  return rows.sort((a, b) => a.avg - b.avg || a.sd - b.sd || a.teamId.localeCompare(b.teamId));
}
