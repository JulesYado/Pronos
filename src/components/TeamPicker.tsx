import { motion, AnimatePresence } from 'framer-motion';
import type { League } from '../leagues/types';
import { teamMap } from '../leagues';
import { TeamBadge } from './TeamBadge';

interface Props {
  league: League;
  teams: string[];
  active: boolean;
  selected: string | null;
  onPick: (teamId: string) => void;
}

/** Liste latérale des équipes restantes (mode « choix libre »). */
export function TeamPicker({ league, teams, active, selected, onPick }: Props) {
  const map = teamMap(league);
  const sorted = teams
    .map((id) => map.get(id)!)
    .sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`, 'fr'));
  return (
    <aside className={`picker card ${active ? 'picker--active' : ''}`}>
      <h3 className="picker__title">{active ? '👉 Choisis une équipe' : 'Équipes restantes'}</h3>
      <div className="picker__list">
        <AnimatePresence initial={false}>
          {sorted.map((t) => (
            <motion.button
              key={t.id}
              layout="position"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40, scale: 0.8 }}
              className={`picker__item ${selected === t.id ? 'is-selected' : ''}`}
              disabled={!active}
              onClick={() => onPick(t.id)}
            >
              <TeamBadge team={t} size="sm" label="full" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}
