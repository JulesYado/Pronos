import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLeague, teamMap } from '../leagues';
import {
  bracketConsensus, champion, consensusPicks, playerPicks, repairPicks, seriesTeams, templateFor, ROUND_ORDER, type PicksMap, type RoundId,
} from '../engine/bracket';
import { exportGame, useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { TeamBadge } from '../components/TeamBadge';
import { Confetti } from '../components/Confetti';
import { Bracket } from '../components/playoffs/Bracket';
import { DuelCard } from '../components/playoffs/DuelCard';
import { useKeys } from '../components/methods/useKeys';
import { downloadJSON, downloadPNG, stamp } from '../utils/export';
import { initials } from '../utils/format';
import { roundLabel, scoreLabel, seriesSub } from '../utils/playoffs';
import type { Player } from '../engine/types';

type View = 'table' | 'consensus' | string;

export function PlayoffReveal() {
  const config = useGame((s) => s.config)!;
  const progress = useGame((s) => s.progress)!;
  const setScreen = useGame((s) => s.setScreen);
  const setBracket = useGame((s) => s.setBracket);
  const league = getLeague(config.leagueId);
  const map = teamMap(league);
  const tpl = templateFor(config, league);
  const rounds = ROUND_ORDER.filter((r) => tpl.some((s) => s.round === r));
  const [shown, setShown] = useState(0);
  const full = shown >= rounds.length;
  const visible = useMemo(() => new Set<RoundId>(rounds.slice(0, shown)), [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState<View>('table');
  const [editing, setEditing] = useState<Player | null>(null);
  const [confetti, setConfetti] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const multi = config.players.length > 1;

  const all = useMemo(() => config.players.map((p) => playerPicks(config, league, progress, p.id)), [config, league, progress]);
  const cons = useMemo(() => bracketConsensus(config, league, progress), [config, league, progress]);
  const consPicks = useMemo(() => consensusPicks(cons), [cons]);
  const disputed = useMemo(
    () => cons.filter((r) => r.winner && r.def.round !== 'pi').sort((a, b) => a.share - b.share || ROUND_ORDER.indexOf(b.def.round) - ROUND_ORDER.indexOf(a.def.round)).slice(0, 5),
    [cons],
  );

  const next = () => {
    if (full) return;
    setShown(shown + 1);
    if (shown + 1 >= rounds.length) setConfetti((c) => c + 1);
  };
  useKeys((e) => {
    if (editing) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      next();
    }
  });

  const viewPlayer = config.players.find((p) => p.id === view);

  return (
    <div className="screen reveal">
      <TopBar
        showUndo
        center={
          <div className="reveal__controls">
            <button className="btn btn--primary" onClick={next} disabled={full}>
              {full ? 'Tout est révélé !' : `Révéler : ${rounds[shown] === 'f' ? league.playoffs?.finalsLabel ?? 'Finales' : roundLabel(league, tpl.find((s) => s.round === rounds[shown])!)}`} <kbd>Espace</kbd>
            </button>
            <button className="btn" onClick={() => { setShown(rounds.length); setConfetti((c) => c + 1); }} disabled={full}>
              Tout révéler
            </button>
          </div>
        }
      />
      <main className="reveal__main">
        <div className="reveal__grid card prv" ref={gridRef}>
          <div className="tabs prv__tabs">
            <button className={view === 'table' ? 'is-on' : ''} onClick={() => setView('table')}>📋 Séries</button>
            {multi && <button className={view === 'consensus' ? 'is-on' : ''} onClick={() => setView('consensus')}>🤝 Consensus</button>}
            {config.players.map((p) => (
              <button key={p.id} className={view === p.id ? 'is-on' : ''} onClick={() => setView(p.id)} style={{ '--pc': p.color } as CSSProperties}>
                {p.name}
              </button>
            ))}
          </div>
          {view === 'table' ? (
            <div className="rv-table prv-table" style={{ '--cols': config.players.length + (multi ? 1 : 0) } as CSSProperties}>
              <div className="rv-corner">Série</div>
              {config.players.map((p) => (
                <div key={p.id} className="rv-head" style={{ '--pc': p.color } as CSSProperties}>
                  <span className="avatar">{initials(p.name)}</span>
                  <span className="rv-head__name">{p.name}</span>
                  <button className="icon-btn icon-btn--sm" title="Corriger ce tableau" onClick={() => setEditing(p)}>✏️</button>
                </div>
              ))}
              {multi && <div className="rv-head rv-head--cons">🤝 Consensus</div>}
              {rounds.map((r) => (
                <Fragment key={r}>
                  <div className="prv-round">{r === 'f' ? league.playoffs?.finalsLabel ?? 'Finales' : roundLabel(league, tpl.find((s) => s.round === r)!)}</div>
                  {tpl.filter((s) => s.round === r).map((def) => {
                    const on = visible.has(r);
                    const c = cons.find((x) => x.def.id === def.id)!;
                    return (
                      <Fragment key={def.id}>
                        <div className="prv-label">{seriesSub(league, def)}</div>
                        {all.map((pk, j) => {
                          const pick = pk[def.id];
                          const tone = on && multi && pick && c.winner ? (pick.winner === c.winner ? 'is-agree' : 'is-hot') : '';
                          return (
                            <div key={j} className={`rv-cell ${tone}`}>
                              {on && pick ? (
                                <motion.div initial={{ rotateX: 90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ delay: j * 0.08, type: 'spring', stiffness: 300, damping: 20 }}>
                                  <TeamBadge team={map.get(pick.winner)!} size="xs" label="long" />
                                  <small className="rv-avg">{scoreLabel(pick.lost)}</small>
                                </motion.div>
                              ) : (
                                <span className="rv-hidden">?</span>
                              )}
                            </div>
                          );
                        })}
                        {multi && (
                          <div className="rv-cell rv-cell--cons">
                            {on && c.winner && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: all.length * 0.08 + 0.1 }}>
                                <TeamBadge team={map.get(c.winner)!} size="xs" label="long" />
                                <small className="rv-avg">
                                  {scoreLabel(c.lost)} · {Math.round(c.share * 100)}%
                                </small>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          ) : (
            <Bracket
              config={config}
              league={league}
              picks={view === 'consensus' ? consPicks : all[config.players.findIndex((p) => p.id === view)]}
              color={viewPlayer?.color ?? 'var(--lemon)'}
              visibleRounds={visible}
            />
          )}
        </div>
        <aside className="debates card">
          <h3>🏆 Champions</h3>
          {config.players.map((p, j) => {
            const champ = full ? champion(all[j]) : null;
            return (
              <div key={p.id} className="champ-row" style={{ '--pc': p.color } as CSSProperties}>
                <span className="avatar">{initials(p.name)}</span>
                <span className="champ-row__name">{p.name}</span>
                {champ ? (
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: j * 0.15, type: 'spring' }} className="champ-row__team">
                    <TeamBadge team={map.get(champ)!} size="sm" />
                  </motion.span>
                ) : (
                  <span className="rv-hidden">?</span>
                )}
                {champ && config.playoffs?.mvp && progress.mvp?.[p.id] && (
                  <motion.small className="champ-row__mvp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: j * 0.15 + 0.3 }}>
                    ⭐ MVP : {progress.mvp[p.id]}
                  </motion.small>
                )}
              </div>
            );
          })}
          {multi && (
            <>
              <h3>🔥 Séries les plus disputées</h3>
              <AnimatePresence>
                {full ? (
                  disputed.map((d, i) => (
                    <motion.div key={d.def.id} className="debate" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
                      <small className="muted">{roundLabel(league, d.def)} · {seriesSub(league, d.def)}</small>
                      <div className="debate__pos">
                        {config.players.map((p, j) => {
                          const w = all[j][d.def.id]?.winner;
                          return (
                            <span key={p.id} style={{ background: p.color }} title={p.name}>
                              {w ? map.get(w)!.abbr : '–'} {scoreLabel(all[j][d.def.id]?.lost)}
                            </span>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="muted">Révèle tout le tableau pour voir les débats…</p>
                )}
              </AnimatePresence>
            </>
          )}
          <div className="debates__export">
            <button className="btn btn--sm" onClick={() => gridRef.current && downloadPNG(gridRef.current, `playoffs-${view}-${stamp()}.png`)}>
              🖼️ Exporter en PNG
            </button>
            <button
              className="btn btn--sm"
              onClick={() => {
                const g = exportGame();
                if (g) downloadJSON(g, `playoffs-${config.leagueId}-${stamp()}.json`);
              }}
            >
              💾 Exporter en JSON
            </button>
            <button className="btn btn--sm" onClick={() => setScreen('game')}>
              ◀ Retour au jeu
            </button>
          </div>
        </aside>
      </main>
      <AnimatePresence>
        {editing && (
          <EditBracket
            key={editing.id}
            player={editing}
            initial={playerPicks(config, league, progress, editing.id)}
            onClose={() => setEditing(null)}
            onSave={(picks) => {
              setBracket(editing.id, picks);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
      <Confetti fire={confetti} />
    </div>
  );
}

function EditBracket({ player, initial, onClose, onSave }: { player: Player; initial: PicksMap; onClose: () => void; onSave: (p: PicksMap) => void }) {
  const config = useGame((s) => s.config)!;
  const league = getLeague(config.leagueId);
  const tpl = templateFor(config, league);
  const [picks, setPicks] = useState(initial);
  const complete = tpl.every((s) => picks[s.id]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal__card modal__card--wide card"
        initial={{ y: 60, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        style={{ '--sel': player.color } as CSSProperties}
      >
        <h3>Corriger le tableau de {player.name}</h3>
        <p className="muted">Changer un vainqueur efface les séries suivantes devenues impossibles : il faudra les refaire.</p>
        <div className="edit-duels">
          {tpl.map((def) => (
            <div key={def.id} className={`edit-duel ${picks[def.id] ? '' : 'is-missing'}`}>
              <small className="muted">
                {roundLabel(league, def)} · {seriesSub(league, def)}
              </small>
              <DuelCard
                compact
                noKeys
                config={config}
                league={league}
                def={def}
                teams={seriesTeams(config, league, picks, def)}
                value={picks[def.id]}
                onPick={(p) => setPicks(repairPicks(config, league, { ...picks, [def.id]: p }))}
              />
            </div>
          ))}
        </div>
        <div className="row row--end">
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn--primary" disabled={!complete} onClick={() => onSave(picks)}>
            Enregistrer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
