import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { teamMap } from '../../leagues';
import { useGame } from '../../store/useGameStore';
import { CurrentTeamCard } from '../CurrentTeamCard';
import { TeamBadge } from '../TeamBadge';
import { useKeys } from './useKeys';
import type { BoardProps } from './types';
import { useT } from '../../i18n/useT';

export function RelativeBoard({ league, board, team }: BoardProps) {
  const act = useGame((s) => s.act);
  const map = teamMap(league);
  const t = useT();
  const list = board.list;
  const [slot, setSlot] = useState(Math.floor(list.length / 2));

  useEffect(() => setSlot(Math.floor(list.length / 2)), [list.length, team]);

  const insert = (i: number) => team && act({ type: 'relative', index: i });

  useKeys((e) => {
    if (!team) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlot((s) => Math.max(0, s - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlot((s) => Math.min(list.length, s + 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      insert(slot);
    }
  });

  const above = slot > 0 ? map.get(list[slot - 1]) : null;
  const below = slot < list.length ? map.get(list[slot]) : null;
  const current = team ? map.get(team) : null;

  const slotEl = (i: number) => (
    <button
      className={`slot ${slot === i && team ? 'is-on' : ''} ${list.length === 0 ? 'slot--first' : ''}`}
      onMouseEnter={() => setSlot(i)}
      onClick={() => insert(i)}
      disabled={!team}
    >
      <AnimatePresence>
        {slot === i && current && (
          <motion.span className="slot__ghost" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <TeamBadge team={current} size="xs" label="name" /> {t.here}
          </motion.span>
        )}
      </AnimatePresence>
      {list.length === 0 && !(slot === i && current) && <span>{t.placeFirst}</span>}
    </button>
  );

  return (
    <div className="relboard">
      <div className="relboard__side">
        <CurrentTeamCard league={league} teamId={team} placeholder={t.pickFromList} />
        {current && list.length > 0 && (
          <motion.div className="relboard__compare card" key={`${slot}-${team}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div>
              <span className="muted">{t.below}</span>
              <strong>{above ? `${above.city} ${above.name}` : t.nobodyFirst}</strong>
            </div>
            <div>
              <span className="muted">{t.above}</span>
              <strong>{below ? `${below.city} ${below.name}` : t.nobodyLast}</strong>
            </div>
          </motion.div>
        )}
        <p className="hint">{t.relHint}</p>
      </div>
      <div className="rellist">
        {slotEl(0)}
        {list.map((id, i) => (
          <motion.div key={id} layout="position" className="relrow-wrap" transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
            <motion.div className="relrow" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <span className="relrow__pos">{i + 1}</span>
              <TeamBadge team={map.get(id)!} size="sm" label="full" />
            </motion.div>
            {slotEl(i + 1)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
