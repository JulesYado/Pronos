import type { League } from '../leagues/types';
import { hashString, shuffle } from './random';
import { applyPlayoffAction, getPlayoffSteps, initPlayoffProgress } from './bracket';
import type { Action, Board, GameConfig, GameProgress, Step } from './types';

export const boardKey = (playerId: string, groupId: string) => `${playerId}|${groupId}`;

export function groupSize(league: League, groupId: string): number {
  return league.groups.find((g) => g.id === groupId)?.teamIds.length ?? 0;
}

export function emptyBoard(config: GameConfig, size: number): Board {
  return {
    tiers: Object.fromEntries(config.tiers.map((t) => [t.id, [] as string[]])),
    list: [],
    slots: Array(size).fill(null),
  };
}

const stepCache = new WeakMap<GameConfig, Step[]>();

export function getSteps(config: GameConfig, league: League): Step[] {
  const cached = stepCache.get(config);
  if (cached) return cached;
  const steps: Step[] = [];
  for (const g of league.groups) {
    const n = g.teamIds.length;
    if (config.turnMode === 'sequential') {
      config.players.forEach((p, playerIndex) => {
        for (let item = 0; item < n; item++) steps.push({ groupId: g.id, playerId: p.id, playerIndex, item });
      });
    } else {
      for (let item = 0; item < n; item++) {
        config.players.forEach((p, playerIndex) => steps.push({ groupId: g.id, playerId: p.id, playerIndex, item }));
      }
    }
  }
  stepCache.set(config, steps);
  return steps;
}

export function currentStep(config: GameConfig, league: League, progress: GameProgress): Step | null {
  return getSteps(config, league)[progress.cursor] ?? null;
}

export const isPlayoffs = (config: GameConfig) => config.mode === 'playoffs';

export function isDone(config: GameConfig, league: League, progress: GameProgress): boolean {
  const steps = isPlayoffs(config) ? getPlayoffSteps(config, league) : getSteps(config, league);
  return progress.cursor >= steps.length;
}

/** File d'équipes d'un groupe (modes aléatoire/alphabétique). */
export function buildQueue(config: GameConfig, league: League, groupId: string, playerIndex: number): string[] {
  const group = league.groups.find((g) => g.id === groupId)!;
  const teams = league.teams.filter((t) => group.teamIds.includes(t.id));
  if (config.order === 'alpha') {
    return teams
      .slice()
      .sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`, 'fr'))
      .map((t) => t.id);
  }
  // En joueur-par-joueur chaque joueur a son propre tirage ; en tour, tout le monde a le même.
  const idx = config.turnMode === 'sequential' ? playerIndex : 0;
  return shuffle(
    teams.map((t) => t.id),
    config.seed + hashString(`${groupId}#${idx}`),
  );
}

export function pickKey(config: GameConfig, step: Step): string {
  return config.turnMode === 'round'
    ? `${step.groupId}:${step.item}`
    : `${step.playerId}:${step.groupId}:${step.item}`;
}

export function needsPick(config: GameConfig, progress: GameProgress, step: Step): boolean {
  return config.method !== 'position' && config.order === 'pick' && !progress.picks[pickKey(config, step)];
}

export function currentTeam(config: GameConfig, league: League, progress: GameProgress, step: Step): string | null {
  if (config.method === 'position') return null;
  if (config.order === 'pick') return progress.picks[pickKey(config, step)] ?? null;
  return buildQueue(config, league, step.groupId, step.playerIndex)[step.item] ?? null;
}

/** Position (index 0-based) demandée dans la méthode « par position ». */
export function targetSlot(config: GameConfig, size: number, item: number): number {
  return config.positionStart === 'top' ? item : size - 1 - item;
}

export function placedTeams(config: GameConfig, board: Board): string[] {
  switch (config.method) {
    case 'tier':
      return config.tiers.flatMap((t) => board.tiers[t.id] ?? []);
    case 'relative':
      return board.list;
    default:
      return board.slots.filter((s): s is string => s !== null);
  }
}

export function remainingTeams(config: GameConfig, league: League, board: Board, groupId: string): string[] {
  const group = league.groups.find((g) => g.id === groupId)!;
  const placed = new Set(placedTeams(config, board));
  return group.teamIds.filter((id) => !placed.has(id));
}

/** Classement (longueur = taille du groupe, null = non placé). */
export function ranking(config: GameConfig, board: Board, size: number, override?: string[]): (string | null)[] {
  const base = override ?? (config.method === 'position' || config.method === 'team' ? board.slots : placedTeams(config, board));
  return Array.from({ length: size }, (_, i) => base[i] ?? null);
}

export function playerRanking(
  config: GameConfig,
  league: League,
  progress: GameProgress,
  playerId: string,
  groupId: string,
): (string | null)[] {
  const key = boardKey(playerId, groupId);
  return ranking(config, progress.boards[key], groupSize(league, groupId), progress.overrides[key]);
}

export function initProgress(config: GameConfig, league: League): GameProgress {
  if (isPlayoffs(config)) return initPlayoffProgress();
  const boards: Record<string, Board> = {};
  for (const p of config.players) {
    for (const g of league.groups) boards[boardKey(p.id, g.id)] = emptyBoard(config, g.teamIds.length);
  }
  return autoResolve(config, league, { boards, cursor: 0, picks: {}, overrides: {} });
}

function withBoard(progress: GameProgress, key: string, board: Board, advance: boolean): GameProgress {
  return {
    ...progress,
    boards: { ...progress.boards, [key]: board },
    cursor: advance ? progress.cursor + 1 : progress.cursor,
  };
}

const setSlot = (slots: (string | null)[], i: number, v: string) => slots.map((s, j) => (j === i ? v : s));

/** Résout les étapes sans choix possible (dernière équipe, dernière place…). */
function autoResolve(config: GameConfig, league: League, progress: GameProgress): GameProgress {
  let p = progress;
  const steps = getSteps(config, league);
  for (let guard = 0; guard < 10000; guard++) {
    const step = steps[p.cursor];
    if (!step) return p;
    const key = boardKey(step.playerId, step.groupId);
    const board = p.boards[key];
    const rem = remainingTeams(config, league, board, step.groupId);
    if (needsPick(config, p, step) && rem.length === 1) {
      p = { ...p, picks: { ...p.picks, [pickKey(config, step)]: rem[0] } };
      continue;
    }
    if (config.method === 'position' && rem.length === 1) {
      const slot = targetSlot(config, board.slots.length, step.item);
      p = withBoard(p, key, { ...board, slots: setSlot(board.slots, slot, rem[0]) }, true);
      continue;
    }
    if (config.method === 'team') {
      const team = currentTeam(config, league, p, step);
      const free = board.slots.flatMap((s, i) => (s === null ? [i] : []));
      if (team && free.length === 1) {
        p = withBoard(p, key, { ...board, slots: setSlot(board.slots, free[0], team) }, true);
        continue;
      }
    }
    return p;
  }
  return p;
}

/** Applique une action du joueur courant. Renvoie null si l'action est invalide. */
export function applyAction(config: GameConfig, league: League, progress: GameProgress, action: Action): GameProgress | null {
  if (isPlayoffs(config)) return applyPlayoffAction(config, league, progress, action);
  const step = currentStep(config, league, progress);
  if (!step) return null;
  const key = boardKey(step.playerId, step.groupId);
  const board = progress.boards[key];
  const rem = remainingTeams(config, league, board, step.groupId);

  if (action.type === 'pick') {
    if (!needsPick(config, progress, step) || !rem.includes(action.teamId)) return null;
    return autoResolve(config, league, { ...progress, picks: { ...progress.picks, [pickKey(config, step)]: action.teamId } });
  }

  if (action.type === 'position') {
    if (config.method !== 'position' || !rem.includes(action.teamId)) return null;
    const slot = targetSlot(config, board.slots.length, step.item);
    return autoResolve(config, league, withBoard(progress, key, { ...board, slots: setSlot(board.slots, slot, action.teamId) }, true));
  }

  const team = currentTeam(config, league, progress, step);
  if (!team || !rem.includes(team)) return null;
  let next: Board;
  switch (action.type) {
    case 'tier':
      if (config.method !== 'tier' || !(action.tierId in board.tiers)) return null;
      next = { ...board, tiers: { ...board.tiers, [action.tierId]: [...board.tiers[action.tierId], team] } };
      break;
    case 'relative': {
      if (config.method !== 'relative') return null;
      const i = Math.max(0, Math.min(board.list.length, action.index));
      next = { ...board, list: [...board.list.slice(0, i), team, ...board.list.slice(i)] };
      break;
    }
    case 'team':
      if (config.method !== 'team' || action.slot < 0 || action.slot >= board.slots.length || board.slots[action.slot] !== null) return null;
      next = { ...board, slots: setSlot(board.slots, action.slot, team) };
      break;
    default:
      return null;
  }
  return autoResolve(config, league, withBoard(progress, key, next, true));
}

/** Réorganise les tiers d'un plateau (correction en cours de partie). */
export function setBoardTiers(progress: GameProgress, key: string, tiers: Record<string, string[]>): GameProgress {
  const board = progress.boards[key];
  return withBoard(progress, key, { ...board, tiers }, false);
}

export function setOverride(progress: GameProgress, key: string, list: string[]): GameProgress {
  return { ...progress, overrides: { ...progress.overrides, [key]: list } };
}
