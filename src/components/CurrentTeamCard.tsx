import { AnimatePresence, motion } from 'framer-motion';
import type { League } from '../leagues/types';
import { divisionLabel, teamMap } from '../leagues';
import { TeamBadge } from './TeamBadge';

interface Props {
  league: League;
  teamId: string | null;
  /** affiché à la place de l'équipe quand il faut d'abord en choisir une */
  placeholder?: string;
  compact?: boolean;
}

export function CurrentTeamCard({ league, teamId, placeholder, compact }: Props) {
  const team = teamId ? teamMap(league).get(teamId) : null;
  return (
    <div className={`current ${compact ? 'current--compact' : ''}`}>
      <span className="current__label">À placer</span>
      <AnimatePresence mode="popLayout">
        {team ? (
          <motion.div
            key={team.id}
            className="current__team"
            initial={{ y: -80, rotate: -10, scale: 0.6, opacity: 0 }}
            animate={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          >
            <TeamBadge team={team} size={compact ? 'lg' : 'xl'} />
            <div className="current__name">
              <small>{team.city}</small>
              <strong>{team.name}</strong>
              <span className="current__div">Division {divisionLabel(league, team.division)}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="ph" className="current__placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {placeholder ?? '…'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
