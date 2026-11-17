import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { groupLabel, teamMap } from '../../leagues';
import { airballSections, groupSize, playerRanking } from '../../engine/game';
import { useGame } from '../../store/useGameStore';
import { TeamBadge } from '../TeamBadge';
import { useKeys } from './useKeys';
import type { BoardProps } from './types';
import { useT } from '../../i18n/useT';
import { initials, ordinal } from '../../utils/format';

/** Mode Airball : récap d'une partie (5 places) avec les choix de tous les joueurs côte à côte. */
export function AirballRecap({ config, league, progress, step }: BoardProps) {
  const act = useGame((s) => s.act);
  const t = useT();
  const map = teamMap(league);
  const size = groupSize(league, step.groupId);
  const section = airballSections(size)[step.recap ?? 0];
  const slots = Array.from({ length: section.to - section.from + 1 }, (_, i) => section.from + i);
  const rankings = config.players.map((p) => playerRanking(config, league, progress, p.id, step.groupId));

  useKeys((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      act({ type: 'confirm' });
    }
  });

  return (
    <div className={`recap recap--${section.id}`}>
      <div className="recap__head">
        <span className="recap__kicker">{t.recapKicker(groupLabel(league, step.groupId))}</span>
        <motion.h2 className="recap__title" initial={{ scale: 0.6, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          {t.airballSections[section.id]}
        </motion.h2>
        <span className="muted">
          {t.sectionStart(section.from + 1, section.to + 1)} · {t.recapHint}
        </span>
      </div>
      <div className="recap__grid" style={{ '--cols': config.players.length } as CSSProperties}>
        <div />
        {config.players.map((p) => (
          <div key={p.id} className="rv-head" style={{ '--pc': p.color } as CSSProperties}>
            <span className="avatar">{initials(p.name)}</span>
            <span className="rv-head__name">{p.name}</span>
          </div>
        ))}
        {slots.map((slot, row) => {
          const ids = rankings.map((r) => r[slot]);
          const unanimous = ids.length > 1 && ids.every((id) => id && id === ids[0]);
          return [
            <div key={`r${slot}`} className="recap__pos">{ordinal(slot + 1)}</div>,
            ...ids.map((id, j) => {
              const team = id ? map.get(id) : null;
              return (
                <motion.div
                  key={`${slot}-${j}`}
                  className={`rv-cell ${unanimous ? 'is-agree' : ''}`}
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ delay: row * 0.12 + j * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {team ? <TeamBadge team={team} size="sm" label="long" /> : <span className="muted">—</span>}
                </motion.div>
              );
            }),
          ];
        })}
      </div>
      <motion.button className="btn btn--primary btn--big recap__next" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => act({ type: 'confirm' })}>
        {t.continue} <kbd>{t.enter}</kbd>
      </motion.button>
    </div>
  );
}
