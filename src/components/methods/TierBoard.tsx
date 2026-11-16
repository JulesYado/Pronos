import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { teamMap } from '../../leagues';
import { boardKey, isReviewStep } from '../../engine/game';
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
  const review = isReviewStep(league, step);
  const map = teamMap(league);
  const tt = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const justDragged = useRef(false);
  /** Pendant un glisser : équipe déplacée et point de dépôt (tier + position). */
  const [drag, setDrag] = useState<{ id: string; tierId: string | null; index: number } | null>(null);
  const [moved, setMoved] = useState<string | null>(null);

  useEffect(() => setSelected(null), [key]);

  /** Tier et position d'insertion sous le pointeur (en ignorant l'équipe déplacée). */
  const dropTarget = (x: number, y: number, dragged: string): { tierId: string | null; index: number } => {
    const tierEl = document.elementsFromPoint(x, y).find((el) => el instanceof HTMLElement && el.dataset.tierId) as HTMLElement | undefined;
    if (!tierEl) return { tierId: null, index: 0 };
    const items = [...tierEl.querySelectorAll<HTMLElement>('[data-team-id]')].filter((el) => el.dataset.teamId !== dragged);
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
        index = i;
        break;
      }
    }
    return { tierId: tierEl.dataset.tierId!, index };
  };

  const pointer = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) =>
    'clientX' in e ? { x: e.clientX, y: e.clientY } : { x: info.point.x - window.scrollX, y: info.point.y - window.scrollY };

  const drop = (id: string, tierId: string, index: number) => {
    const next: Record<string, string[]> = {};
    for (const t of config.tiers) next[t.id] = (board.tiers[t.id] ?? []).filter((x) => x !== id);
    next[tierId] = [...next[tierId].slice(0, index), id, ...next[tierId].slice(index)];
    if (JSON.stringify(next) !== JSON.stringify(board.tiers)) {
      setMoved(id);
      editTiers(key, next);
    }
  };

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
    if (review && !selected && e.key === 'Enter') {
      e.preventDefault();
      act({ type: 'confirm' });
      return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= config.tiers.length) {
      e.preventDefault();
      onTier(config.tiers[n - 1].id);
    } else if (e.key === 'Escape') setSelected(null);
  });



  return (
    <div className="tierboard">
      <div className="tierboard__top">
        {review ? (
          <motion.div className="review card" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="review__text">
              <strong className="review__title">{tt.adjustTitle} ✍️</strong>
              <span>{selected ? tt.tierMove(map.get(selected)?.name ?? '') : tt.adjustHint}</span>
            </div>
            <motion.button className="btn btn--primary btn--big" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => act({ type: 'confirm' })}>
              {tt.confirmRanking} <kbd>{tt.enter}</kbd>
            </motion.button>
          </motion.div>
        ) : (
          <>
            <CurrentTeamCard league={league} teamId={team} compact placeholder={tt.pickFromList} />
            <p className="hint">{selected ? tt.tierMove(map.get(selected)?.name ?? '') : tt.tierHint}</p>
          </>
        )}
      </div>
      <div className="tiers">
        {config.tiers.map((t, i) => {
          const values = board.tiers[t.id] ?? [];
          const dropHere = drag?.tierId === t.id;
          // Repère d'insertion : position parmi les autres équipes du tier.
          const others = values.filter((id) => id !== drag?.id);
          return (
            <motion.div
              key={t.id}
              data-tier-id={t.id}
              className={`tier ${team || selected ? 'is-target' : ''} ${dropHere ? 'is-drop' : ''} ${drag && values.includes(drag.id) ? 'has-drag' : ''}`}
              style={{ '--tier': t.color } as CSSProperties}
              onClick={() => onTier(t.id)}
              whileHover={(team || selected) && !drag ? { x: 6 } : undefined}
            >
              <div className="tier__label">
                <span className="tier__key">{i + 1}</span>
                <span className="tier__name">{t.name}</span>
              </div>
              <div className="tier__teams">
                {values.map((id) => {
                  const marker = dropHere && others.indexOf(id) === drag!.index && id !== drag!.id;
                  return (
                    <Fragment key={id}>
                      {marker && <span className="tier__marker" />}
                      <motion.div
                        data-team-id={id}
                        layout="position"
                        layoutId={`tier-team-${key}-${id}`}
                        className={`tier__team ${selected === id ? 'is-selected' : ''} ${drag?.id === id ? 'is-dragging' : ''}`}
                        initial={moved === id ? false : { scale: 0, y: -30 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        drag
                        dragSnapToOrigin
                        dragMomentum={false}
                        whileDrag={{ scale: 1.15, zIndex: 20 }}
                        onDragStart={() => {
                          justDragged.current = true;
                          setSelected(null);
                          setDrag({ id, tierId: t.id, index: others.indexOf(id) });
                        }}
                        onDrag={(e, info) => {
                          const { x, y } = pointer(e, info);
                          const target = dropTarget(x, y, id);
                          setDrag((d) => (d && (d.tierId !== target.tierId || d.index !== target.index) ? { id, ...target } : d));
                        }}
                        onDragEnd={(e, info) => {
                          const { x, y } = pointer(e, info);
                          const target = dropTarget(x, y, id);
                          setDrag(null);
                          setTimeout(() => (justDragged.current = false), 80);
                          if (target.tierId) drop(id, target.tierId, target.index);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (justDragged.current) return;
                          setSelected((s) => (s === id ? null : id));
                        }}
                      >
                        <TeamBadge team={map.get(id)!} size="md" />
                      </motion.div>
                    </Fragment>
                  );
                })}
                {dropHere && drag!.index >= others.length && <span className="tier__marker" />}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
