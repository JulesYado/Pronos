import type { League } from '../leagues/types';
import type { GameConfig, GameProgress, SeriesPick, Step } from './types';

/** Tableau final (format NBA) : play-in optionnel, 1er tour 1-8 / 4-5 / 3-6 / 2-7, puis demies, finale de conf., Finales. */

export type RoundId = 'pi' | 'r1' | 'r2' | 'cf' | 'f';

export type Source = { seed: number; group: string } | { winnerOf: string } | { loserOf: string };

export interface SeriesDef {
  id: string;
  round: RoundId;
  /** Conférence (null pour les Finales). */
  groupId: string | null;
  home: Source;
  away: Source;
  /** Match unique (play-in) : pas de score. */
  single: boolean;
}

export type PicksMap = Record<string, SeriesPick>;

export const ROUND_ORDER: RoundId[] = ['pi', 'r1', 'r2', 'cf', 'f'];

export const MVP_STEP = 'mvp';

export const seriesKey = (playerId: string, seriesId: string) => `${playerId}|${seriesId}`;

export const seedCount = (playIn: boolean) => (playIn ? 10 : 8);

const tplCache = new Map<string, SeriesDef[]>();

export function bracketTemplate(league: League, playIn: boolean): SeriesDef[] {
  const cacheKey = `${league.id}|${playIn}`;
  const hit = tplCache.get(cacheKey);
  if (hit) return hit;
  const groups = league.groups.map((g) => g.id);
  const out: SeriesDef[] = [];
  const seed = (group: string, n: number): Source => {
    if (playIn && n === 7) return { winnerOf: `${group}-pi-a` };
    if (playIn && n === 8) return { winnerOf: `${group}-pi-c` };
    return { seed: n, group };
  };
  if (playIn) {
    for (const g of groups) {
      out.push({ id: `${g}-pi-a`, round: 'pi', groupId: g, home: { seed: 7, group: g }, away: { seed: 8, group: g }, single: true });
      out.push({ id: `${g}-pi-b`, round: 'pi', groupId: g, home: { seed: 9, group: g }, away: { seed: 10, group: g }, single: true });
    }
    for (const g of groups) {
      out.push({ id: `${g}-pi-c`, round: 'pi', groupId: g, home: { loserOf: `${g}-pi-a` }, away: { winnerOf: `${g}-pi-b` }, single: true });
    }
  }
  for (const g of groups) {
    for (const [a, b] of [[1, 8], [4, 5], [3, 6], [2, 7]]) {
      out.push({ id: `${g}-r1-${a}`, round: 'r1', groupId: g, home: seed(g, a), away: seed(g, b), single: false });
    }
  }
  for (const g of groups) {
    out.push({ id: `${g}-r2-a`, round: 'r2', groupId: g, home: { winnerOf: `${g}-r1-1` }, away: { winnerOf: `${g}-r1-4` }, single: false });
    out.push({ id: `${g}-r2-b`, round: 'r2', groupId: g, home: { winnerOf: `${g}-r1-3` }, away: { winnerOf: `${g}-r1-2` }, single: false });
  }
  for (const g of groups) {
    out.push({ id: `${g}-cf`, round: 'cf', groupId: g, home: { winnerOf: `${g}-r2-a` }, away: { winnerOf: `${g}-r2-b` }, single: false });
  }
  // Finales : Ouest (2e groupe) contre Est (1er groupe) si deux conférences.
  const [first, second] = groups;
  out.push({ id: 'finals', round: 'f', groupId: null, home: { winnerOf: `${second ?? first}-cf` }, away: { winnerOf: `${first}-cf` }, single: false });
  tplCache.set(cacheKey, out);
  return out;
}

export function templateFor(config: GameConfig, league: League): SeriesDef[] {
  return bracketTemplate(league, !!config.playoffs?.playIn);
}

export function seriesById(config: GameConfig, league: League, id: string): SeriesDef | undefined {
  return templateFor(config, league).find((s) => s.id === id);
}

/** Les deux équipes d'une série, selon les pronos (picks) d'un joueur. null = pas encore connue. */
export function seriesTeams(
  config: GameConfig,
  league: League,
  picks: PicksMap,
  def: SeriesDef,
): [string | null, string | null] {
  const tpl = templateFor(config, league);
  const resolve = (src: Source): string | null => {
    if ('seed' in src) return config.playoffs?.seeds[src.group]?.[src.seed - 1] ?? null;
    const ref = 'winnerOf' in src ? src.winnerOf : src.loserOf;
    const pick = picks[ref];
    if (!pick) return null;
    if ('winnerOf' in src) return pick.winner;
    const refDef = tpl.find((s) => s.id === ref)!;
    const [h, a] = seriesTeams(config, league, picks, refDef);
    return pick.winner === h ? a : h;
  };
  return [resolve(def.home), resolve(def.away)];
}

/** Tête de série (1-based) d'une équipe dans sa conférence. */
export function seedOf(config: GameConfig, teamId: string): number | null {
  for (const seeds of Object.values(config.playoffs?.seeds ?? {})) {
    const i = seeds.indexOf(teamId);
    if (i >= 0) return i + 1;
  }
  return null;
}

export function playerPicks(config: GameConfig, league: League, progress: GameProgress, playerId: string): PicksMap {
  const out: PicksMap = {};
  for (const s of templateFor(config, league)) {
    const p = progress.series?.[seriesKey(playerId, s.id)];
    if (p) out[s.id] = p;
  }
  return out;
}

export function champion(picks: PicksMap): string | null {
  return picks.finals?.winner ?? null;
}

const stepCache = new WeakMap<GameConfig, Step[]>();

/** Étapes : `groupId` = id de la série (ou « mvp »), `item` = index de la série. */
export function getPlayoffSteps(config: GameConfig, league: League): Step[] {
  const cached = stepCache.get(config);
  if (cached) return cached;
  const tpl = templateFor(config, league);
  const steps: Step[] = [];
  const mk = (seriesId: string, item: number, playerIndex: number): Step => ({
    groupId: seriesId,
    playerId: config.players[playerIndex].id,
    playerIndex,
    item,
  });
  if (config.turnMode === 'sequential') {
    config.players.forEach((_, pi) => {
      tpl.forEach((s, i) => steps.push(mk(s.id, i, pi)));
      if (config.playoffs?.mvp) steps.push(mk(MVP_STEP, tpl.length, pi));
    });
  } else {
    tpl.forEach((s, i) => config.players.forEach((_, pi) => steps.push(mk(s.id, i, pi))));
    if (config.playoffs?.mvp) config.players.forEach((_, pi) => steps.push(mk(MVP_STEP, tpl.length, pi)));
  }
  stepCache.set(config, steps);
  return steps;
}

export function initPlayoffProgress(): GameProgress {
  return { boards: {}, cursor: 0, picks: {}, overrides: {}, series: {}, mvp: {} };
}

/** Valide un prono de série (vainqueur parmi les deux équipes, score seulement si demandé et hors play-in). */
export function validPick(config: GameConfig, def: SeriesDef, teams: [string | null, string | null], pick: SeriesPick): boolean {
  if (!pick.winner || !teams.includes(pick.winner) || teams.includes(null)) return false;
  const needScore = !!config.playoffs?.withScore && !def.single;
  if (needScore) return Number.isInteger(pick.lost) && pick.lost! >= 0 && pick.lost! <= 3;
  return pick.lost === undefined;
}

export function applyPlayoffAction(
  config: GameConfig,
  league: League,
  progress: GameProgress,
  action: { type: string; winner?: string; lost?: number; name?: string },
): GameProgress | null {
  const step = getPlayoffSteps(config, league)[progress.cursor];
  if (!step) return null;
  if (step.groupId === MVP_STEP) {
    const name = action.type === 'mvp' ? (action.name ?? '').trim() : '';
    if (!name) return null;
    return { ...progress, mvp: { ...progress.mvp, [step.playerId]: name.slice(0, 40) }, cursor: progress.cursor + 1 };
  }
  if (action.type !== 'series' || !action.winner) return null;
  const def = seriesById(config, league, step.groupId)!;
  const picks = playerPicks(config, league, progress, step.playerId);
  const teams = seriesTeams(config, league, picks, def);
  const needScore = !!config.playoffs?.withScore && !def.single;
  const pick: SeriesPick = needScore ? { winner: action.winner, lost: action.lost } : { winner: action.winner };
  if (!validPick(config, def, teams, pick)) return null;
  return {
    ...progress,
    series: { ...progress.series, [seriesKey(step.playerId, def.id)]: pick },
    cursor: progress.cursor + 1,
  };
}

/**
 * Remplace un prono a posteriori (correction) : les séries suivantes devenues incohérentes
 * (vainqueur qui n'est plus dans l'affiche) sont effacées. Renvoie les picks mis à jour.
 */
export function repairPicks(config: GameConfig, league: League, picks: PicksMap): PicksMap {
  const out: PicksMap = {};
  for (const def of templateFor(config, league)) {
    const p = picks[def.id];
    if (!p) continue;
    const teams = seriesTeams(config, league, out, def);
    if (validPick(config, def, teams, p)) out[def.id] = p;
  }
  return out;
}

export function setPlayerPicks(progress: GameProgress, playerId: string, picks: PicksMap): GameProgress {
  const series = Object.fromEntries(Object.entries(progress.series ?? {}).filter(([k]) => !k.startsWith(`${playerId}|`)));
  for (const [id, p] of Object.entries(picks)) series[seriesKey(playerId, id)] = p;
  return { ...progress, series };
}

export interface ConsensusSeries {
  def: SeriesDef;
  teams: [string | null, string | null];
  winner: string | null;
  lost: number | null;
  /** Part des joueurs (0-1) ayant ce vainqueur pour cette série. */
  share: number;
  /** Nombre de votes par équipe pour cette série. */
  votes: Record<string, number>;
}

/** Tableau consensus : série par série, l'équipe qualifiée par le plus de joueurs (égalité → meilleure tête de série). */
export function bracketConsensus(config: GameConfig, league: League, progress: GameProgress): ConsensusSeries[] {
  const all = config.players.map((p) => playerPicks(config, league, progress, p.id));
  const cons: PicksMap = {};
  const out: ConsensusSeries[] = [];
  for (const def of templateFor(config, league)) {
    const teams = seriesTeams(config, league, cons, def);
    const votes: Record<string, number> = {};
    for (const pk of all) {
      const w = pk[def.id]?.winner;
      if (w) votes[w] = (votes[w] ?? 0) + 1;
    }
    let winner: string | null = null;
    if (teams[0] && teams[1]) {
      const [h, a] = teams as [string, string];
      const vh = votes[h] ?? 0;
      const va = votes[a] ?? 0;
      winner = vh > va ? h : va > vh ? a : (seedOf(config, h) ?? 99) <= (seedOf(config, a) ?? 99) ? h : a;
    }
    let lost: number | null = null;
    if (winner && !def.single && config.playoffs?.withScore) {
      const counts = [0, 0, 0, 0];
      for (const pk of all) {
        const p = pk[def.id];
        if (p?.winner === winner && p.lost !== undefined) counts[p.lost]++;
      }
      const max = Math.max(...counts);
      if (max > 0) lost = counts.indexOf(max);
    }
    if (winner) cons[def.id] = lost === null ? { winner } : { winner, lost };
    const n = config.players.length || 1;
    out.push({ def, teams, winner, lost, share: winner ? (votes[winner] ?? 0) / n : 0, votes });
  }
  return out;
}

export function consensusPicks(rows: ConsensusSeries[]): PicksMap {
  const out: PicksMap = {};
  for (const r of rows) if (r.winner) out[r.def.id] = r.lost === null ? { winner: r.winner } : { winner: r.winner, lost: r.lost };
  return out;
}
