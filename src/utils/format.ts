export const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);

export const METHOD_LABELS = {
  tier: 'Tier list',
  relative: 'Classement relatif',
  position: 'Par position',
  team: 'Par équipe',
} as const;

export const ORDER_LABELS = {
  random: 'Aléatoire',
  alpha: 'Alphabétique',
  pick: 'Choix libre',
} as const;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
