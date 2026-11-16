import { describe, expect, it } from 'vitest';
import { nba } from '../leagues/nba';
import { applyAction, initProgress, isDone } from './game';
import {
  bracketConsensus, bracketTemplate, getPlayoffSteps, MVP_STEP, playerPicks, repairPicks, seriesById, seriesTeams,
} from './bracket';
import { defaultTiers } from './tiers';
import type { GameConfig, GameProgress } from './types';

const players = [
  { id: 'a', name: 'Alice', color: '#fff' },
  { id: 'b', name: 'Bob', color: '#fff' },
  { id: 'c', name: 'Chloé', color: '#fff' },
];
const east = nba.groups[0].teamIds.slice(0, 10);
const west = nba.groups[1].teamIds.slice(0, 10);

const cfg = (over: Partial<GameConfig['playoffs']> = {}, turnMode: GameConfig['turnMode'] = 'round'): GameConfig => ({
  mode: 'playoffs',
  playoffs: { seeds: { east, west }, playIn: true, withScore: true, mvp: true, ...over },
  leagueId: 'nba', players, method: 'tier', order: 'alpha', turnMode,
  positionStart: 'top', tiers: defaultTiers(), seed: 1,
});

/** Joue toute la partie en donnant toujours la victoire à l'équipe « home » (ou à l'autre si `away`). */
function playAll(config: GameConfig, choose: (playerIndex: number, seriesId: string) => 'home' | 'away' = () => 'home'): GameProgress {
  let p = initProgress(config, nba);
  const steps = getPlayoffSteps(config, nba);
  for (let guard = 0; guard < 1000 && !isDone(config, nba, p); guard++) {
    const step = steps[p.cursor];
    if (step.groupId === MVP_STEP) {
      p = applyAction(config, nba, p, { type: 'mvp', name: `MVP ${step.playerId}` })!;
      continue;
    }
    const def = seriesById(config, nba, step.groupId)!;
    const teams = seriesTeams(config, nba, playerPicks(config, nba, p, step.playerId), def);
    const w = choose(step.playerIndex, def.id) === 'home' ? teams[0]! : teams[1]!;
    const next = applyAction(config, nba, p, def.single || !config.playoffs!.withScore ? { type: 'series', winner: w } : { type: 'series', winner: w, lost: 2 });
    expect(next).not.toBeNull();
    p = next!;
  }
  return p;
}

describe('tableau des playoffs', () => {
  it('nombre de séries : 6 play-in + 8 + 4 + 2 + 1', () => {
    expect(bracketTemplate(nba, true)).toHaveLength(21);
    expect(bracketTemplate(nba, false)).toHaveLength(15);
  });

  it('premier tour sans play-in : 1-8, 4-5, 3-6, 2-7', () => {
    const c = cfg({ playIn: false });
    const def = seriesById(c, nba, 'east-r1-1')!;
    expect(seriesTeams(c, nba, {}, def)).toEqual([east[0], east[7]]);
    expect(seriesTeams(c, nba, {}, seriesById(c, nba, 'east-r1-4')!)).toEqual([east[3], east[4]]);
  });

  it('play-in : le perdant de 7-8 affronte le vainqueur de 9-10, le vainqueur prend la 8e place', () => {
    const c = cfg();
    const picks = { 'east-pi-a': { winner: east[7] }, 'east-pi-b': { winner: east[9] } };
    expect(seriesTeams(c, nba, picks, seriesById(c, nba, 'east-pi-c')!)).toEqual([east[6], east[9]]);
    const p2 = { ...picks, 'east-pi-c': { winner: east[9] } };
    expect(seriesTeams(c, nba, p2, seriesById(c, nba, 'east-r1-1')!)).toEqual([east[0], east[9]]);
    expect(seriesTeams(c, nba, p2, seriesById(c, nba, 'east-r1-2')!)).toEqual([east[1], east[7]]);
  });

  it('étapes : tour par tour = chaque série passe par tous les joueurs, puis MVP', () => {
    const s = getPlayoffSteps(cfg(), nba);
    expect(s).toHaveLength(21 * 3 + 3);
    expect(s.slice(0, 3).map((x) => x.playerId)).toEqual(['a', 'b', 'c']);
    expect(new Set(s.slice(0, 3).map((x) => x.groupId)).size).toBe(1);
    expect(s.at(-1)!.groupId).toBe(MVP_STEP);
    const seq = getPlayoffSteps(cfg({ mvp: false }, 'sequential'), nba);
    expect(seq).toHaveLength(63);
    expect(seq.slice(0, 21).every((x) => x.playerId === 'a')).toBe(true);
  });

  it('score exigé en série, ignoré en play-in, vainqueur obligatoirement dans l’affiche', () => {
    const c = cfg({ playIn: false });
    const p = initProgress(c, nba);
    expect(applyAction(c, nba, p, { type: 'series', winner: east[0] })).toBeNull();
    expect(applyAction(c, nba, p, { type: 'series', winner: east[3], lost: 1 })).toBeNull();
    expect(applyAction(c, nba, p, { type: 'series', winner: east[0], lost: 4 })).toBeNull();
    expect(applyAction(c, nba, p, { type: 'series', winner: east[7], lost: 3 })).not.toBeNull();
    const c2 = cfg();
    const p2 = initProgress(c2, nba);
    // Play-in : match unique, un éventuel score est ignoré.
    const r = applyAction(c2, nba, p2, { type: 'series', winner: east[6], lost: 1 })!;
    expect(r.series!['a|east-pi-a']).toEqual({ winner: east[6] });
  });

  it('partie complète, champion et MVP', () => {
    const c = cfg();
    const p = playAll(c);
    expect(isDone(c, nba, p)).toBe(true);
    // Toujours « home » : la tête de série n°1 de l'Ouest gagne les Finales (Ouest = home).
    expect(playerPicks(c, nba, p, 'a').finals.winner).toBe(west[0]);
    expect(p.mvp).toEqual({ a: 'MVP a', b: 'MVP b', c: 'MVP c' });
  });

  it('consensus : majorité par série, séries disputées', () => {
    const c = cfg({ playIn: false, mvp: false });
    // Chloé prend toujours l'équipe « away » : 2 contre 1 pour « home ».
    const p = playAll(c, (pi) => (pi === 2 ? 'away' : 'home'));
    const cons = bracketConsensus(c, nba, p);
    const r1 = cons.find((r) => r.def.id === 'east-r1-1')!;
    expect(r1.winner).toBe(east[0]);
    expect(r1.share).toBeCloseTo(2 / 3);
    expect(r1.lost).toBe(2);
    expect(cons.find((r) => r.def.id === 'finals')!.winner).toBe(west[0]);
  });

  it('correction : changer un vainqueur efface les séries suivantes devenues incohérentes', () => {
    const c = cfg({ playIn: false, mvp: false });
    const p = playAll(c);
    const picks = { ...playerPicks(c, nba, p, 'a'), 'east-r1-1': { winner: east[7], lost: 0 } };
    const fixed = repairPicks(c, nba, picks);
    expect(fixed['east-r1-1'].winner).toBe(east[7]);
    expect(fixed['east-r2-a']).toBeUndefined();
    expect(fixed['east-cf']).toBeUndefined();
    expect(fixed['west-cf']).toBeDefined();
  });
});
