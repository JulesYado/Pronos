import { nba } from './nba';
import type { League, Team } from './types';

export const leagues: Record<string, League> = { nba };

export interface UpcomingLeague {
  id: string;
  name: string;
  sport: string;
  emoji: string;
}

/** Sports prévus pour plus tard, affichés comme « bientôt ». */
export const upcoming: UpcomingLeague[] = [
  { id: 'nfl', name: 'NFL', sport: 'Football US', emoji: '🏈' },
  { id: 'nhl', name: 'NHL', sport: 'Hockey', emoji: '🏒' },
  { id: 'l1', name: 'Ligue 1', sport: 'Football', emoji: '⚽' },
];

const teamCache = new Map<string, Map<string, Team>>();

export function getLeague(id: string): League {
  const l = leagues[id];
  if (!l) throw new Error(`Ligue inconnue : ${id}`);
  return l;
}

export function teamMap(league: League): Map<string, Team> {
  let m = teamCache.get(league.id);
  if (!m) {
    m = new Map(league.teams.map((t) => [t.id, t]));
    teamCache.set(league.id, m);
  }
  return m;
}

export function groupLabel(league: League, groupId: string): string {
  return league.groups.find((g) => g.id === groupId)?.label ?? groupId;
}

export function divisionLabel(league: League, divisionId: string): string {
  return league.divisions.find((d) => d.id === divisionId)?.label ?? divisionId;
}
