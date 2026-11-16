import type { League } from '../../leagues/types';
import type { Board, GameConfig, GameProgress, Step } from '../../engine/types';

export interface BoardProps {
  config: GameConfig;
  league: League;
  progress: GameProgress;
  step: Step;
  board: Board;
  /** équipe à placer (null si à choisir, ou méthode par position) */
  team: string | null;
  remaining: string[];
}
