import { useGame } from '../store/useGameStore';
import { dicts, type Dict } from './dict';

/** Dictionnaire de la langue choisie ; le composant se met à jour quand elle change. */
export function useT(): Dict {
  return dicts[useGame((s) => s.lang)];
}
