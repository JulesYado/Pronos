import type { League } from '../leagues/types';
import { ROUND_LABELS, type SeriesDef } from '../engine/bracket';

const R1: Record<string, string> = { '1': '1 contre 8', '4': '4 contre 5', '3': '3 contre 6', '2': '2 contre 7' };
const PI: Record<string, string> = { a: '7e contre 8e', b: '9e contre 10e', c: 'Pour la 8e place' };

/** Libellé du tour (« Premier tour », « Finales NBA »…). */
export function roundLabel(league: League, def: SeriesDef): string {
  return def.round === 'f' ? league.playoffs?.finalsLabel ?? ROUND_LABELS.f : ROUND_LABELS[def.round];
}

/** Petit libellé de la série dans son tour. */
export function seriesSub(league: League, def: SeriesDef): string {
  const group = league.groups.find((g) => g.id === def.groupId)?.short ?? '';
  const tail = def.id.split('-').pop()!;
  if (def.round === 'pi') return `${group} · ${PI[tail]}`;
  if (def.round === 'r1') return `${group} · ${R1[tail]}`;
  if (def.round === 'r2') return `${group} · ${tail === 'a' ? 'haut de tableau' : 'bas de tableau'}`;
  if (def.round === 'cf') return group;
  return 'Ouest contre Est';
}

export const scoreLabel = (lost?: number | null) => (lost === undefined || lost === null ? '' : `4-${lost}`);
