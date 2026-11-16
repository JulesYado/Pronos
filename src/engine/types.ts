export type MethodId = 'tier' | 'relative' | 'position' | 'team';
export type OrderMode = 'random' | 'alpha' | 'pick';
export type TurnMode = 'sequential' | 'round';
export type PositionStart = 'top' | 'bottom';

export interface Tier {
  id: string;
  name: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
}

export type GameMode = 'season' | 'playoffs';

export interface PlayoffConfig {
  /** Têtes de série par conférence (10 avec play-in, 8 sinon), de la 1re à la dernière. */
  seeds: Record<string, string[]>;
  playIn: boolean;
  withScore: boolean;
  mvp: boolean;
}

/** Prono d'une série : vainqueur et nombre de matchs perdus par le vainqueur (score 4-x). */
export interface SeriesPick {
  winner: string;
  lost?: number;
}

export interface GameConfig {
  /** Absent = saison régulière (parties enregistrées avant le mode playoffs). */
  mode?: GameMode;
  playoffs?: PlayoffConfig;
  leagueId: string;
  players: Player[];
  method: MethodId;
  order: OrderMode;
  turnMode: TurnMode;
  positionStart: PositionStart;
  tiers: Tier[];
  seed: number;
  /** Tier list : étape d'ajustement par joueur avant de valider (absent sur les anciennes parties). */
  review?: boolean;
}

/** Pronostic d'un joueur pour un groupe (une conférence). */
export interface Board {
  tiers: Record<string, string[]>;
  list: string[];
  slots: (string | null)[];
}

export interface GameProgress {
  /** clé `${playerId}|${groupId}` */
  boards: Record<string, Board>;
  cursor: number;
  /** équipes choisies en mode « choix libre » */
  picks: Record<string, string>;
  /** classements corrigés a posteriori */
  overrides: Record<string, string[]>;
  /** Playoffs : clé `${playerId}|${seriesId}` */
  series?: Record<string, SeriesPick>;
  /** Playoffs : MVP des Finales par joueur */
  mvp?: Record<string, string>;
}

export interface Step {
  groupId: string;
  playerId: string;
  playerIndex: number;
  item: number;
}

export type Action =
  | { type: 'pick'; teamId: string }
  | { type: 'tier'; tierId: string }
  | { type: 'relative'; index: number }
  | { type: 'position'; teamId: string }
  | { type: 'team'; slot: number }
  | { type: 'series'; winner: string; lost?: number }
  | { type: 'mvp'; name: string }
  | { type: 'confirm' };
