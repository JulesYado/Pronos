import type { Tier } from './types';
import { tr } from '../i18n/current';

/** Dégradé pastel du rouge (haut) vers le bleu (bas). */
export function tierGradient(count: number): string[] {
  if (count <= 1) return ['hsl(0 85% 78%)'];
  return Array.from({ length: count }, (_, i) => {
    const hue = Math.round((i / (count - 1)) * 215);
    return `hsl(${hue} 80% 78%)`;
  });
}

export function recolor(tiers: Tier[]): Tier[] {
  const colors = tierGradient(tiers.length);
  return tiers.map((t, i) => ({ ...t, color: colors[i] }));
}

let n = 0;
export const newTierId = () => `t${Date.now().toString(36)}${(n++).toString(36)}`;

export function defaultTiers(names: string[] = tr().defaultTiers): Tier[] {
  return recolor(
    names.map((name, i) => ({
      id: `tier${i}`,
      name,
      color: '',
    })),
  );
}
