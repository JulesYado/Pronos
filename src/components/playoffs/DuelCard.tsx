import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { League } from '../../leagues/types';
import { teamMap } from '../../leagues';
import { seedOf, type SeriesDef } from '../../engine/bracket';
import type { GameConfig, SeriesPick } from '../../engine/types';
import { TeamBadge } from '../TeamBadge';
import { useKeys } from '../methods/useKeys';
import { roundLabel, seriesSub } from '../../utils/playoffs';
import { useT } from '../../i18n/useT';

interface Props {
  config: GameConfig;
  league: League;
  def: SeriesDef;
  teams: [string | null, string | null];
  onPick: (pick: SeriesPick) => void;
  /** Prono actuel (mode correction). */
  value?: SeriesPick;
  /** Désactive le clavier (plusieurs cartes à l'écran). */
  noKeys?: boolean;
  compact?: boolean;
}

/** Carte « duel » : les deux équipes face à face ; un clic = vainqueur (+ score). */
export function DuelCard({ config, league, def, teams, onPick, value, noKeys, compact }: Props) {
  const map = teamMap(league);
  const t = useT();
  const withScore = !!config.playoffs?.withScore && !def.single;
  const [focus, setFocus] = useState(0);

  useKeys((e) => {
    if (noKeys || !teams[0] || !teams[1]) return;
    if (e.key === 'ArrowLeft') setFocus(0);
    else if (e.key === 'ArrowRight') setFocus(1);
    else if (withScore && /^[0-3]$/.test(e.key)) onPick({ winner: teams[focus]!, lost: Number(e.key) });
    else if (!withScore && e.key === 'Enter') onPick({ winner: teams[focus]! });
    else return;
    e.preventDefault();
  });

  return (
    <div className={`duel ${compact ? 'duel--compact' : ''}`}>
      {!compact && (
        <div className="duel__head">
          <span className="duel__round">{roundLabel(league, def)}</span>
          <span className="duel__sub">{seriesSub(league, def)}</span>
        </div>
      )}
      <div className="duel__teams">
        <AnimatePresence mode="popLayout" initial={false}>
          {teams.map((id, side) => {
            const team = id ? map.get(id) : null;
            const chosen = value?.winner === id;
            return (
              <motion.div
                key={`${def.id}-${side}`}
                className={`duel__side ${focus === side && !noKeys ? 'is-focus' : ''} ${chosen ? 'is-chosen' : ''}`}
                initial={{ x: side ? 120 : -120, opacity: 0, rotate: side ? 6 : -6 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: side * 0.06 }}
                onMouseEnter={() => setFocus(side)}
              >
                {team ? (
                  <>
                    <motion.button
                      className="duel__team"
                      onClick={() => !withScore && onPick({ winner: team.id })}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={withScore}
                    >
                      <span className="duel__seed">{seedOf(config, team.id) ?? ''}</span>
                      <TeamBadge team={team} size={compact ? 'md' : 'xl'} />
                      <span className="duel__name">
                        <small>{team.city}</small>
                        {team.name}
                      </span>
                    </motion.button>
                    {withScore && (
                      <div className="duel__scores">
                        {[0, 1, 2, 3].map((lost) => (
                          <motion.button
                            key={lost}
                            className={`duel__score ${chosen && value?.lost === lost ? 'is-on' : ''}`}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onPick({ winner: team.id, lost })}
                            title={t.wins(team.name, lost)}
                          >
                            4-{lost}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="duel__tbd">{t.tbd}</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <motion.span key={def.id} className="duel__vs" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -8 }} transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}>
          VS
        </motion.span>
      </div>
      {!compact && (
        <p className="hint">
          {withScore ? t.hintScore : def.single ? t.hintSingle : t.hintWinner}
        </p>
      )}
    </div>
  );
}
