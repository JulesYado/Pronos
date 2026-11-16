import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Reorder, motion } from 'framer-motion';
import { teamMap } from '../../leagues';
import { boardKey } from '../../engine/game';
import { useGame } from '../../store/useGameStore';
import { CurrentTeamCard } from '../CurrentTeamCard';
import { TeamBadge } from '../TeamBadge';
import { useKeys } from './useKeys';
import type { BoardProps } from './types';
import { useT } from '../../i18n/useT';

export function TierBoard({ config, league, step, board, team }: BoardProps) {
  const act = useGame((s) => s.act);
  const editTiers = useGame((s) => s.editTiers);
  const key = boardKey(step.playerId, step.groupId);
  const map = teamMap(league);
  const tt = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [local, setLocal] = useState(board.tiers);
  const localRef = useRef(local);
  const justDragged = useRef(false);

  useEffect(() => {
    setLocal(board.tiers);
    localRef.current = board.tiers;
  }, [board.tiers]);
  useEffect(() => setSelected(null), [key]);

  const moveSelected = (tierId: string) => {
    if (!selected) return;
    const next: Record<string, string[]> = {};
    for (const t of config.tiers) next[t.id] = (board.tiers[t.id] ?? []).filter((id) => id !== selected);
    next[tierId] = [...next[tierId], selected];
    editTiers(key, next);
    setSelected(null);
  };

  const onTier = (tierId: string) => {
    if (selected) moveSelected(tierId);
    else if (team) act({ type: 'tier', tierId });
  };

  useKeys((e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= config.tiers.length) {
      e.preventDefault();
      onTier(config.tiers[n - 1].id);
    } else if (e.key === 'Escape') setSelected(null);
  });

  const commitDrag = () => {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 80);
    if (JSON.stringify(localRef.current) !== JSON.stringify(board.tiers)) editTiers(key, localRef.current);
  };

  return (
    <div className="tierboard">
      <div className="tierboard__top">
        <CurrentTeamCard league={league} teamId={team} compact placeholder={tt.pickFromList} />
        <p className="hint">
          {selected
            ? tt.tierMove(map.get(selected)?.name ?? '')
            : tt.tierHint}
        </p>
      </div>
      <div className="tiers">
        {config.tiers.map((t, i) => {
          const values = local[t.id] ?? [];
          return (
            <motion.div
              key={t.id}
              className={`tier ${team || selected ? 'is-target' : ''}`}
              style={{ '--tier': t.color } as CSSProperties}
              onClick={() => onTier(t.id)}
              whileHover={team || selected ? { x: 6 } : undefined}
            >
              <div className="tier__label">
                <span className="tier__key">{i + 1}</span>
                <span className="tier__name">{t.name}</span>
              </div>
              <Reorder.Group
                axis="x"
                values={values}
                onReorder={(v) => {
                  const next = { ...localRef.current, [t.id]: v };
                  localRef.current = next;
                  setLocal(next);
                }}
                className="tier__teams"
              >
                {values.map((id) => (
                  <Reorder.Item
                    key={id}
                    value={id}
                    className={`tier__team ${selected === id ? 'is-selected' : ''}`}
                    initial={{ scale: 0, y: -30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    whileDrag={{ scale: 1.15, zIndex: 5 }}
                    onDragEnd={commitDrag}
                    onClick={(e: { stopPropagation: () => void }) => {
                      e.stopPropagation();
                      if (justDragged.current) return;
                      setSelected((s) => (s === id ? null : id));
                    }}
                  >
                    <TeamBadge team={map.get(id)!} size="md" />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
