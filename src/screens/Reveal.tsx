import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { getLeague, groupLabel, teamMap } from '../leagues';
import { useT } from '../i18n/useT';
import { boardKey, playerRanking } from '../engine/game';
import { consensus } from '../engine/consensus';
import { exportGame, useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { TeamBadge } from '../components/TeamBadge';
import { Confetti } from '../components/Confetti';
import { useKeys } from '../components/methods/useKeys';
import { downloadJSON, downloadPNG, stamp } from '../utils/export';
import { initials, ordinal } from '../utils/format';
import type { Player } from '../engine/types';

export function Reveal() {
  const config = useGame((s) => s.config)!;
  const progress = useGame((s) => s.progress)!;
  const setOverride = useGame((s) => s.setOverride);
  const setScreen = useGame((s) => s.setScreen);
  const league = getLeague(config.leagueId);
  const map = teamMap(league);
  const t = useT();
  const [groupId, setGroupId] = useState(league.groups[0].id);
  const size = league.groups.find((g) => g.id === groupId)!.teamIds.length;
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const shown = revealed[groupId] ?? 0;
  const full = shown >= size;
  const [editing, setEditing] = useState<Player | null>(null);
  const [confetti, setConfetti] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const rankings = useMemo(
    () => config.players.map((p) => playerRanking(config, league, progress, p.id, groupId)),
    [config, league, progress, groupId],
  );
  const cons = useMemo(() => consensus(rankings), [rankings]);
  const consPos = useMemo(() => new Map(cons.map((r, i) => [r.teamId, i])), [cons]);
  const debates = useMemo(() => [...cons].sort((a, b) => b.sd - a.sd).slice(0, 5), [cons]);

  const next = () => {
    if (full) return;
    setRevealed((r) => ({ ...r, [groupId]: shown + 1 }));
    if (shown + 1 >= size) setConfetti((c) => c + 1);
  };
  const all = () => {
    setRevealed((r) => ({ ...r, [groupId]: size }));
    setConfetti((c) => c + 1);
  };

  useKeys((e) => {
    if (editing) return;
    if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      next();
    }
  });

  // Une ligne est visible quand on l'a révélée (on part du bas : la dernière place d'abord).
  const isShown = (row: number) => row >= size - shown;
  const hasPlayers = config.players.length > 1;

  return (
    <div className="screen reveal">
      <TopBar
        showUndo
        center={
          <div className="reveal__controls">
            <div className="tabs">
              {league.groups.map((g) => (
                <button key={g.id} className={g.id === groupId ? 'is-on' : ''} onClick={() => setGroupId(g.id)}>
                  {groupLabel(league, g.id)}
                </button>
              ))}
            </div>
            <button className="btn btn--primary" onClick={next} disabled={full}>
              {t.revealCount(shown, size)} <kbd>{t.space}</kbd>
            </button>
            <button className="btn" onClick={all} disabled={full}>
              {t.revealAll}
            </button>
          </div>
        }
      />
      <main className={`reveal__main ${hasPlayers ? '' : 'is-solo'}`} style={{ '--cols': config.players.length + (hasPlayers ? 1 : 0) } as CSSProperties}>
        <div className="reveal__grid card" ref={gridRef}>
          <div className="rv-table">
            <div className="rv-corner">#</div>
            {config.players.map((p) => (
              <div key={p.id} className="rv-head" style={{ '--pc': p.color } as CSSProperties}>
                <span className="avatar">{initials(p.name)}</span>
                <span className="rv-head__name">{p.name}</span>
                <button className="icon-btn icon-btn--sm" title={t.editRanking} onClick={() => setEditing(p)}>
                  ✏️
                </button>
              </div>
            ))}
            {hasPlayers && <div className="rv-head rv-head--cons">{t.consensus}</div>}
            {Array.from({ length: size }, (_, row) => renderRow(row))}
          </div>
        </div>
        {hasPlayers && (
          <aside className="debates card">
            <h3>{t.debatesTitle}</h3>
            <AnimatePresence>
              {full ? (
                debates.map((d, i) => {
                  const t = map.get(d.teamId)!;
                  return (
                    <motion.div key={d.teamId} className="debate" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
                      <TeamBadge team={t} size="sm" label="long" />
                      <div className="debate__pos">
                        {config.players.map((p, j) => (
                          <span key={p.id} style={{ background: p.color }} title={p.name}>
                            {d.positions[j] ?? '–'}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p className="muted">{t.revealForDebates}</p>
              )}
            </AnimatePresence>
            <div className="debates__export">
              <button className="btn btn--sm" onClick={() => gridRef.current && downloadPNG(gridRef.current, `pronos-${groupId}-${stamp()}.png`)}>
                {t.exportPng}
              </button>
              <button
                className="btn btn--sm"
                onClick={() => {
                  const g = exportGame();
                  if (g) downloadJSON(g, `pronos-${config.leagueId}-${stamp()}.json`);
                }}
              >
                {t.exportJson}
              </button>
              <button className="btn btn--sm" onClick={() => setScreen('game')}>
                {t.backToGame}
              </button>
            </div>
          </aside>
        )}
        {!hasPlayers && (
          <div className="debates__export debates__export--solo">
            <button className="btn btn--sm" onClick={() => gridRef.current && downloadPNG(gridRef.current, `pronos-${groupId}-${stamp()}.png`)}>
              {t.exportPng}
            </button>
          </div>
        )}
      </main>
      <AnimatePresence>
        {editing && (
          <EditModal
            key={editing.id}
            player={editing}
            list={playerRanking(config, league, progress, editing.id, groupId).filter((x): x is string => !!x)}
            onClose={() => setEditing(null)}
            onSave={(list) => {
              setOverride(boardKey(editing.id, groupId), list);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
      <Confetti fire={confetti} />
    </div>
  );

  function renderRow(row: number) {
    const visible = isShown(row);
    const zone = league.zones ? (row < league.zones.playoff ? 'is-po' : row < league.zones.playin ? 'is-pi' : '') : '';
    return (
      <Fragment key={row}>
        <div className={`rv-rank ${zone}`}>{row + 1}</div>
        {rankings.map((r, j) => {
          const id = r[row];
          const t = id ? map.get(id) : null;
          const diff = id && full && hasPlayers ? Math.abs((consPos.get(id) ?? row) - row) : null;
          const tone = diff === null ? '' : diff <= 1 ? 'is-agree' : diff >= 4 ? 'is-hot' : '';
          return (
            <div key={j} className={`rv-cell ${tone}`}>
              {visible ? (
                <motion.div
                  key="team"
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ delay: j * 0.12, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {t ? <TeamBadge team={t} size="xs" label="long" /> : <span className="muted">—</span>}
                </motion.div>
              ) : (
                <span className="rv-hidden">?</span>
              )}
            </div>
          );
        })}
        {hasPlayers && (
          <div className="rv-cell rv-cell--cons">
            {visible && cons[row] && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: rankings.length * 0.12 + 0.1 }}>
                <TeamBadge team={map.get(cons[row].teamId)!} size="xs" label="long" />
                <small className="rv-avg">{cons[row].avg.toFixed(1)}</small>
              </motion.div>
            )}
          </div>
        )}
      </Fragment>
    );
  }
}

function EditModal({ player, list, onClose, onSave }: { player: Player; list: string[]; onClose: () => void; onSave: (l: string[]) => void }) {
  const config = useGame((s) => s.config)!;
  const map = teamMap(getLeague(config.leagueId));
  const t = useT();
  const [items, setItems] = useState(list);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal__card card"
        initial={{ y: 60, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t.editRankingTitle(player.name)}</h3>
        <p className="muted">{t.dragTeams}</p>
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="edit-list">
          {items.map((id, i) => (
            <Reorder.Item key={id} value={id} className="edit-row">
              <span className="edit-row__pos">{ordinal(i + 1)}</span>
              <TeamBadge team={map.get(id)!} size="xs" label="full" />
              <span className="grip">⠿</span>
            </Reorder.Item>
          ))}
        </Reorder.Group>
        <div className="row row--end">
          <button className="btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(items)}>
            {t.save}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
