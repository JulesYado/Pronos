import { describe, expect, it } from 'vitest';
import { nba } from '../leagues/nba';
import { consensus } from './consensus';
import {
  applyAction, boardKey, buildQueue, currentStep, currentTeam, getSteps, initProgress, isDone, playerRanking, remainingTeams,
} from './game';
import { defaultTiers } from './tiers';
import type { GameConfig, GameProgress } from './types';

const players = [
  { id: 'a', name: 'Alice', color: '#fff' },
  { id: 'b', name: 'Bob', color: '#fff' },
];

const cfg = (over: Partial<GameConfig>): GameConfig => ({
  leagueId: 'nba', players, method: 'team', order: 'alpha', turnMode: 'sequential',
  positionStart: 'top', tiers: defaultTiers(), seed: 42, ...over,
});

function must(p: GameProgress | null): GameProgress {
  expect(p).not.toBeNull();
  return p!;
}

describe('étapes', () => {
  it('joueur par joueur : 15 équipes du joueur A puis B, Est puis Ouest', () => {
    const s = getSteps(cfg({}), nba);
    expect(s).toHaveLength(60);
    expect(s.slice(0, 15).every((x) => x.playerId === 'a' && x.groupId === 'east')).toBe(true);
    expect(s[15].playerId).toBe('b');
    expect(s[30].groupId).toBe('west');
  });
  it('tour par tour : alternance des joueurs', () => {
    const s = getSteps(cfg({ turnMode: 'round' }), nba);
    expect(s.slice(0, 4).map((x) => x.playerId)).toEqual(['a', 'b', 'a', 'b']);
    expect(s[0].item).toBe(0);
    expect(s[1].item).toBe(0);
    expect(s[2].item).toBe(1);
  });
});

describe('files', () => {
  it('alphabétique', () => {
    const q = buildQueue(cfg({}), nba, 'east', 0);
    expect(q[0]).toBe('ATL');
    expect(q).toHaveLength(15);
  });
  it('aléatoire déterministe, différent par joueur en séquentiel', () => {
    const c = cfg({ order: 'random' });
    expect(buildQueue(c, nba, 'east', 0)).toEqual(buildQueue(c, nba, 'east', 0));
    expect(buildQueue(c, nba, 'east', 0)).not.toEqual(buildQueue(c, nba, 'east', 1));
    expect(new Set(buildQueue(c, nba, 'east', 0)).size).toBe(15);
  });
});

describe('méthode par équipe', () => {
  it('bloque les positions prises et place la dernière automatiquement', () => {
    const c = cfg({ players: [players[0]] });
    let p = initProgress(c, nba);
    p = must(applyAction(c, nba, p, { type: 'team', slot: 3 }));
    expect(applyAction(c, nba, p, { type: 'team', slot: 3 })).toBeNull();
    for (let i = 0; i < 15; i++) {
      if (i === 3 || i === 14) continue;
      p = must(applyAction(c, nba, p, { type: 'team', slot: i }));
    }
    // la 15e équipe va seule en dernière place libre
    expect(p.cursor).toBe(15);
    expect(playerRanking(c, nba, p, 'a', 'east').every(Boolean)).toBe(true);
  });
});

describe('méthode relative', () => {
  it('insère entre deux équipes', () => {
    const c = cfg({ method: 'relative', players: [players[0]] });
    let p = initProgress(c, nba);
    p = must(applyAction(c, nba, p, { type: 'relative', index: 0 })); // ATL
    p = must(applyAction(c, nba, p, { type: 'relative', index: 0 })); // BOS au-dessus
    p = must(applyAction(c, nba, p, { type: 'relative', index: 1 })); // BKN entre
    expect(p.boards[boardKey('a', 'east')].list).toEqual(['BOS', 'BKN', 'ATL']);
  });
});

describe('méthode tier', () => {
  it('le classement concatène les tiers du haut vers le bas', () => {
    const c = cfg({ method: 'tier', players: [players[0]] });
    let p = initProgress(c, nba);
    p = must(applyAction(c, nba, p, { type: 'tier', tierId: c.tiers[4].id })); // ATL loterie
    p = must(applyAction(c, nba, p, { type: 'tier', tierId: c.tiers[0].id })); // BOS favori
    expect(playerRanking(c, nba, p, 'a', 'east').slice(0, 3)).toEqual(['BOS', 'ATL', null]);
  });
});

describe('méthode position', () => {
  it('par le bas, avec dernière équipe automatique', () => {
    const c = cfg({ method: 'position', positionStart: 'bottom', players: [players[0]] });
    let p = initProgress(c, nba);
    const step = currentStep(c, nba, p)!;
    expect(currentTeam(c, nba, p, step)).toBeNull();
    p = must(applyAction(c, nba, p, { type: 'position', teamId: 'WAS' }));
    expect(playerRanking(c, nba, p, 'a', 'east')[14]).toBe('WAS');
    expect(applyAction(c, nba, p, { type: 'position', teamId: 'WAS' })).toBeNull();
    for (let i = 0; i < 13; i++) {
      const board = p.boards[boardKey('a', 'east')];
      p = must(applyAction(c, nba, p, { type: 'position', teamId: remainingTeams(c, nba, board, 'east')[0] }));
    }
    expect(p.cursor).toBe(15);
  });
});

describe('choix libre en tour', () => {
  it("l'équipe choisie par le premier joueur est imposée aux suivants", () => {
    const c = cfg({ order: 'pick', turnMode: 'round', method: 'relative' });
    let p = initProgress(c, nba);
    expect(applyAction(c, nba, p, { type: 'relative', index: 0 })).toBeNull();
    p = must(applyAction(c, nba, p, { type: 'pick', teamId: 'TOR' }));
    p = must(applyAction(c, nba, p, { type: 'relative', index: 0 }));
    const s = currentStep(c, nba, p)!;
    expect(s.playerId).toBe('b');
    expect(currentTeam(c, nba, p, s)).toBe('TOR');
  });
  it('partie complète jusqu’à la fin', () => {
    const c = cfg({ order: 'pick', turnMode: 'round', method: 'team' });
    let p = initProgress(c, nba);
    let guard = 0;
    while (!isDone(c, nba, p) && guard++ < 500) {
      const s = currentStep(c, nba, p)!;
      const board = p.boards[boardKey(s.playerId, s.groupId)];
      if (!currentTeam(c, nba, p, s)) {
        p = must(applyAction(c, nba, p, { type: 'pick', teamId: remainingTeams(c, nba, board, s.groupId)[0] }));
      } else {
        p = must(applyAction(c, nba, p, { type: 'team', slot: board.slots.indexOf(null) }));
      }
    }
    expect(isDone(c, nba, p)).toBe(true);
  });
});

describe('consensus', () => {
  it('moyenne et écart-type', () => {
    const rows = consensus([
      ['A', 'B', 'C'],
      ['B', 'A', 'C'],
      ['C', 'B', 'A'],
    ]);
    expect(rows[0].teamId).toBe('B');
    expect(rows[0].avg).toBeCloseTo(5 / 3);
    expect(rows.find((r) => r.teamId === 'C')!.sd).toBeGreaterThan(0);
  });
});
