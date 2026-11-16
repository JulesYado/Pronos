import type { CSSProperties } from 'react';
import type { Team } from '../leagues/types';
import { textOn } from '../utils/color';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  team: Team;
  size?: BadgeSize;
  /** none : pastille seule ; name : surnom ; full : ville + surnom (2 lignes) ; long : « Ville Surnom » sur une ligne */
  label?: 'none' | 'name' | 'full' | 'long';
  className?: string;
}

export function TeamBadge({ team, size = 'md', label = 'none', className = '' }: Props) {
  const [c1, c2] = team.colors;
  const style = { '--c1': c1, '--c2': c2, '--fg': textOn(c1) } as CSSProperties;
  return (
    <span className={`badge badge--${size} ${className}`} style={style} title={`${team.city} ${team.name}`}>
      <span className="badge__chip">
        <span className="badge__abbr">{team.abbr}</span>
      </span>
      {label === 'name' && <span className="badge__name">{team.name}</span>}
      {label === 'long' && <span className="badge__name">{team.city} {team.name}</span>}
      {label === 'full' && (
        <span className="badge__name">
          <small>{team.city}</small>
          {team.name}
        </span>
      )}
    </span>
  );
}
