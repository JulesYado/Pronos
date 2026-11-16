import { dicts, type Dict, type Lang } from './dict';

/** Langue courante, lisible hors des composants (libellés calculés). Mise à jour par le store. */
let current: Lang = 'fr';

export const getLang = () => current;
export const setCurrentLang = (l: Lang) => {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
};
export const tr = (): Dict => dicts[current];
