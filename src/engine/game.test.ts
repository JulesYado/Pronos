import { describe, expect, it } from 'vitest';
import { nba } from '../leagues/nba';
import { consensus } from './consensus';
import {
  airballSections, applyAction, boardKey, buildQueue, currentStep, currentTeam, getSteps, initProgress, isDone, isReviewStep, needsPick, playerRanking, remainingTeams,
  setBoardTiers,
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

describe('tier list : ajustements avant validation', () => {
  it('joueur par joueur : une étape d’ajustement après les 15 équipes de chaque joueur', () => {
    const c = cfg({ method: 'tier', review: true });
    const s = getSteps(c, nba);
    expect(s).toHaveLength(64);
    expect(s[15]).toMatchObject({ playerId: 'a', groupId: 'east', item: 15 });
    expect(isReviewStep(nba, s[15])).toBe(true);
    expect(s[16]).toMatchObject({ playerId: 'b', item: 0 });
  });

  it('tour par tour : les ajustements de chaque joueur viennent après toutes les équipes', () => {
    const c = cfg({ method: 'tier', review: true, turnMode: 'round', order: 'pick' });
    const s = getSteps(c, nba);
    expect(s.slice(30, 32).map((x) => [x.playerId, x.item])).toEqual([['a', 15], ['b', 15]]);
    expect(needsPick(c, initProgress(c, nba), s[30], nba)).toBe(false);
  });

  it('on peut déplacer les équipes puis valider ; rien d’autre n’est accepté', () => {
    const c = cfg({ method: 'tier', review: true, players: [players[0]] });
    let p = initProgress(c, nba);
    for (let i = 0; i < 15; i++) p = must(applyAction(c, nba, p, { type: 'tier', tierId: c.tiers[i % 5].id }));
    const step = currentStep(c, nba, p)!;
    expect(isReviewStep(nba, step)).toBe(true);
    expect(currentTeam(c, nba, p, step)).toBeNull();
    expect(applyAction(c, nba, p, { type: 'tier', tierId: c.tiers[0].id })).toBeNull();
    // Ajustement : ATL passe du tier 1 au tier 5.
    const key = boardKey('a', 'east');
    const tiers = { ...p.boards[key].tiers };
    tiers[c.tiers[0].id] = tiers[c.tiers[0].id].filter((x) => x !== 'ATL');
    tiers[c.tiers[4].id] = [...tiers[c.tiers[4].id], 'ATL'];
    p = setBoardTiers(p, key, tiers);
    expect(playerRanking(c, nba, p, 'a', 'east')[14]).toBe('ATL');
    p = must(applyAction(c, nba, p, { type: 'confirm' }));
    expect(currentStep(c, nba, p)).toMatchObject({ groupId: 'west', item: 0 });
  });

  it('anciennes parties (sans review) : pas d’étape d’ajustement', () => {
    expect(getSteps(cfg({ method: 'tier' }), nba)).toHaveLength(60);
  });
});

describe('mode Airball (par position)', () => {
  const c = cfg({ method: 'position', airball: true, turnMode: 'round', positionStart: 'bottom' });

  it('trois parties de 5 places : nullos (11-15), middle (6-10), balèzes (1-5)', () => {
    expect(airballSections(15)).toEqual([
      { id: 'nullos', from: 10, to: 14 },
      { id: 'middle', from: 5, to: 9 },
      { id: 'balezes', from: 0, to: 4 },
    ]);
  });

  it('tour par tour, un récap après chaque partie', () => {
    const s = getSteps(c, nba);
    // 15 places × 2 joueurs + 3 récaps, par conférence.
    expect(s).toHaveLength(2 * (30 + 3));
    expect(s.slice(0, 2).map((x) => x.playerId)).toEqual(['a', 'b']);
    expect(s[10]).toMatchObject({ recap: 0, groupId: 'east' });
    expect(s[21]).toMatchObject({ recap: 1 });
    expect(s[32]).toMatchObject({ recap: 2 });
    expect(s[33]).toMatchObject({ groupId: 'west', item: 0 });
  });

  it('le récap ne se valide qu’avec « confirm », puis on continue à la 10e place', () => {
    let p = initProgress(c, nba);
    for (let i = 0; i < 10; i++) {
      const st = currentStep(c, nba, p)!;
      const board = p.boards[boardKey(st.playerId, 'east')];
      p = must(applyAction(c, nba, p, { type: 'position', teamId: remainingTeams(c, nba, board, 'east')[0] }));
    }
    const recap = currentStep(c, nba, p)!;
    expect(recap.recap).toBe(0);
    expect(playerRanking(c, nba, p, 'a', 'east').slice(10).every(Boolean)).toBe(true);
    expect(applyAction(c, nba, p, { type: 'position', teamId: 'WAS' })).toBeNull();
    p = must(applyAction(c, nba, p, { type: 'confirm' }));
    expect(currentStep(c, nba, p)).toMatchObject({ item: 5, playerId: 'a' });
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
