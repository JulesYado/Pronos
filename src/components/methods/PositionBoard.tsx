import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { divisionLabel, groupLabel, teamMap } from '../../leagues';
import { targetSlot } from '../../engine/game';
import { useGame } from '../../store/useGameStore';
import { TeamBadge } from '../TeamBadge';
import { useKeys } from './useKeys';
import type { BoardProps } from './types';
import { ordinal } from '../../utils/format';
import { useT } from '../../i18n/useT';

const COLS = 5;

export function PositionBoard({ config, league, step, board, remaining }: BoardProps) {
  const act = useGame((s) => s.act);
  const map = teamMap(league);
  const tt = useT();
  const pos = targetSlot(config, board.slots.length, step.item) + 1;
  const teams = remaining
    .map((id) => map.get(id)!)
    .sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`, 'fr'));
  const [focus, setFocus] = useState(0);
  useEffect(() => setFocus(0), [pos, step.playerId]);

  useKeys((e) => {
    const n = teams.length;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS };
    if (e.key in moves) {
      e.preventDefault();
      setFocus((f) => Math.min(n - 1, Math.max(0, f + moves[e.key])));
    } else if (e.key === 'Enter' && teams[focus]) {
      e.preventDefault();
      act({ type: 'position', teamId: teams[focus].id });
    }
  });

  return (
    <div className="posboard">
      <AnimatePresence mode="wait">
        <motion.h2
          key={`${step.playerId}-${pos}`}
          className="question"
          initial={{ y: -30, opacity: 0, rotate: -2 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 30, opacity: 0 }}
        >
          {tt.whoFinishes} <span className="question__pos">{ordinal(pos)}</span>
          <br />
          <small>{tt.inGroup(groupLabel(league, step.groupId))}</small>
        </motion.h2>
      </AnimatePresence>
      <div className="teamgrid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        <AnimatePresence>
          {teams.map((t, i) => (
            <motion.button
              key={t.id}
              layout="position"
              className={`teamcard ${focus === i ? 'is-focus' : ''}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, rotate: 15 }}
              whileHover={{ y: -4, rotate: -1 }}
              whileTap={{ scale: 0.92 }}
              onMouseEnter={() => setFocus(i)}
              onClick={() => act({ type: 'position', teamId: t.id })}
            >
              <TeamBadge team={t} size="lg" />
              <span className="teamcard__name">
                <small>{t.city}</small>
                {t.name}
              </span>
              <span className="teamcard__div">{divisionLabel(league, t.division)}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <p className="hint">{tt.posHint}</p>
    </div>
  );
}
