import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { teamMap } from '../../leagues';
import { useGame } from '../../store/useGameStore';
import { CurrentTeamCard } from '../CurrentTeamCard';
import { TeamBadge } from '../TeamBadge';
import { useKeys } from './useKeys';
import type { BoardProps } from './types';
import { ordinal } from '../../utils/format';

export function TeamBoard({ league, board, team }: BoardProps) {
  const act = useGame((s) => s.act);
  const map = teamMap(league);
  const size = board.slots.length;
  const [buffer, setBuffer] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const place = (slot: number) => {
    if (team && board.slots[slot] === null) act({ type: 'team', slot });
  };

  useKeys((e) => {
    if (!team) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      clearTimeout(timer.current);
      const next = buffer + e.key;
      const n = parseInt(next, 10);
      if (next.length >= 2 || n * 10 > size) {
        setBuffer('');
        if (n >= 1 && n <= size) place(n - 1);
      } else {
        setBuffer(next);
        timer.current = setTimeout(() => {
          setBuffer('');
          if (n >= 1) place(n - 1);
        }, 700);
      }
    } else if (e.key === 'Escape' || e.key === 'Backspace') setBuffer('');
  });

  return (
    <div className="teamboard">
      <div className="teamboard__side">
        <CurrentTeamCard league={league} teamId={team} placeholder="Choisis une équipe dans la liste" />
        <p className="hint">Clique sur une position libre ou tape son numéro</p>
        {buffer && (
          <motion.div className="buffer" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
            {buffer}…
          </motion.div>
        )}
      </div>
      <div className="slotgrid">
        {board.slots.map((id, i) => {
          const t = id ? map.get(id) : null;
          return (
            <motion.button
              key={i}
              className={`poscell ${t ? 'is-taken' : ''}`}
              disabled={!!t || !team}
              onClick={() => place(i)}
              whileHover={!t && team ? { y: -4, rotate: 1 } : undefined}
              whileTap={!t ? { scale: 0.9 } : undefined}
            >
              <span className="poscell__num">{ordinal(i + 1)}</span>
              {t && (
                <motion.span className="poscell__team" initial={{ scale: 0, rotate: 30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                  <TeamBadge team={t} size="lg" label="name" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
