import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { League } from '../leagues/types';
import { groupShort, teamMap } from '../leagues';
import { useT } from '../i18n/useT';
import { boardKey, playerRanking } from '../engine/game';
import type { GameConfig, GameProgress } from '../engine/types';
import { TeamBadge } from './TeamBadge';
import { initials } from '../utils/format';

interface Props {
  config: GameConfig;
  league: League;
  progress: GameProgress;
  activePlayerId: string | null;
  groupId: string;
  /** Mode Airball : parties du classement (séparateurs). */
  sections?: { id: string; from: number; to: number }[];
}

/** Classements en cours de tous les joueurs, toujours visibles. */
export function Scoreboard({ config, league, progress, activePlayerId, groupId, sections }: Props) {
  const [view, setView] = useState(groupId);
  useEffect(() => setView(groupId), [groupId]);
  const map = teamMap(league);
  const group = league.groups.find((g) => g.id === view)!;
  const size = group.teamIds.length;
  const many = config.players.length > 3;
  const t = useT();
  // Séparateur au début de chaque partie (mode Airball) + teinte de la partie.
  const sectionClass = (i: number) => {
    const s = sections?.find((x) => i >= x.from && i <= x.to);
    return s ? `sb-sec sb-sec--${s.id} ${i === s.from && i > 0 ? 'sb-sec--start' : ''}` : '';
  };

  return (
    <aside className="scoreboard card">
      <div className="scoreboard__head">
        <h3>{t.standings}</h3>
        <div className="tabs tabs--sm">
          {league.groups.map((g) => (
            <button key={g.id} className={g.id === view ? 'is-on' : ''} onClick={() => setView(g.id)}>
              {groupShort(league, g.id)}
            </button>
          ))}
        </div>
      </div>
      <div className="scoreboard__body">
        <div className="scoreboard__ranks">
          <div className="sb-head" />
          {Array.from({ length: size }, (_, i) => (
            <div key={i} className={`sb-rank ${sectionClass(i)}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="scoreboard__cols">
          {config.players.map((p) => {
            const ranking = playerRanking(config, league, progress, p.id, view);
            const placed = ranking.filter(Boolean).length;
            const active = p.id === activePlayerId;
            const compact = many && !active;
            const board = progress.boards[boardKey(p.id, view)];
            const tierColor = new Map<string, string>();
            if (config.method === 'tier' && !progress.overrides[boardKey(p.id, view)]) {
              config.tiers.forEach((t) => board.tiers[t.id]?.forEach((id) => tierColor.set(id, t.color)));
            }
            return (
              <div
                key={p.id}
                className={`sb-col ${active ? 'is-active' : ''} ${compact ? 'is-compact' : ''}`}
                style={{ '--pc': p.color } as CSSProperties}
              >
                <div className="sb-head" title={p.name}>
                  <span className="avatar">{initials(p.name)}</span>
                  {!compact && <span className="sb-name">{p.name}</span>}
                  <span className="sb-count">
                    {placed}/{size}
                  </span>
                </div>
                {ranking.map((id, i) => {
                  const team = id ? map.get(id) : null;
                  return (
                    <div key={i} className={`sb-cell ${sectionClass(i)}`} style={id && tierColor.get(id) ? ({ '--tc': tierColor.get(id) } as CSSProperties) : undefined}>
                      {team && (
                        <motion.div
                          key={team.id}
                          layoutId={`${p.id}-${view}-${team.id}`}
                          layout="position"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                          className="sb-team"
                        >
                          <TeamBadge team={team} size="xs" label={compact ? 'none' : 'name'} />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
