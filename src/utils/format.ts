import { tr } from '../i18n/current';
import type { MethodId } from '../engine/types';

export const ordinal = (n: number) => tr().ordinal(n);

export const methodLabel = (m: MethodId) => tr().methods[m].title;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
