import type { League } from '../leagues/types';
import type { RoundId, SeriesDef } from '../engine/bracket';
import { groupShort } from '../leagues';
import { tr } from '../i18n/current';

/** Libellé d'un tour (« Premier tour », « Finales NBA »…). */
export function roundName(league: League, round: RoundId): string {
  const t = tr();
  return round === 'f' ? t.finals[league.id] ?? t.rounds.f : t.rounds[round];
}

export function roundLabel(league: League, def: SeriesDef): string {
  return roundName(league, def.round);
}

/** Petit libellé de la série dans son tour. */
export function seriesSub(league: League, def: SeriesDef): string {
  const t = tr();
  const group = def.groupId ? groupShort(league, def.groupId) : '';
  const tail = def.id.split('-').pop()!;
  const R1: Record<string, [number, number]> = { '1': [1, 8], '4': [4, 5], '3': [3, 6], '2': [2, 7] };
  const PI: Record<string, string> = { a: t.piA, b: t.piB, c: t.piC };
  if (def.round === 'pi') return `${group} · ${PI[tail]}`;
  if (def.round === 'r1') return `${group} · ${t.versus(...R1[tail])}`;
  if (def.round === 'r2') return `${group} · ${tail === 'a' ? t.topHalf : t.bottomHalf}`;
  if (def.round === 'cf') return group;
  return t.westVsEast;
}

export const scoreLabel = (lost?: number | null) => (lost === undefined || lost === null ? '' : `4-${lost}`);
