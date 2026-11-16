import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLeague, teamMap } from '../leagues';
import {
  champion, getPlayoffSteps, MVP_STEP, playerPicks, seriesById, seriesTeams, templateFor, type RoundId,
} from '../engine/bracket';
import { useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';
import { Banner, type BannerData } from '../components/Banner';
import { TeamBadge } from '../components/TeamBadge';
import { Bracket } from '../components/playoffs/Bracket';
import { DuelCard } from '../components/playoffs/DuelCard';
import { initials } from '../utils/format';
import { roundLabel, roundName, scoreLabel } from '../utils/playoffs';
import { useT } from '../i18n/useT';
import type { Step } from '../engine/types';

export function PlayoffGame() {
  const config = useGame((s) => s.config)!;
  const progress = useGame((s) => s.progress)!;
  const act = useGame((s) => s.act);
  const setScreen = useGame((s) => s.setScreen);
  const league = getLeague(config.leagueId);
  const map = teamMap(league);
  const t = useT();
  const steps = getPlayoffSteps(config, league);
  const tpl = templateFor(config, league);
  const step: Step | null = steps[progress.cursor] ?? null;
  const player = step ? config.players[step.playerIndex] : null;
  const isMvp = step?.groupId === MVP_STEP;
  const def = step && !isMvp ? seriesById(config, league, step.groupId)! : null;

  const [viewId, setViewId] = useState<string | null>(null);
  const shownPlayer = config.players.find((p) => p.id === viewId) ?? player ?? config.players[0];
  const shownPicks = playerPicks(config, league, progress, shownPlayer.id);
  const myPicks = player ? playerPicks(config, league, progress, player.id) : {};
  const teams = def ? seriesTeams(config, league, myPicks, def) : null;

  const [banner, setBanner] = useState<BannerData | null>(null);
  const [confetti, setConfetti] = useState(0);
  const prev = useRef<{ cursor: number; round?: RoundId | 'mvp'; playerId?: string } | null>(null);
  const roundOf = (s: Step | null): RoundId | 'mvp' | undefined => (!s ? undefined : s.groupId === MVP_STEP ? 'mvp' : seriesById(config, league, s.groupId)!.round);

  // On revient sur le joueur actif à chaque nouveau tour de jeu.
  useEffect(() => setViewId(null), [player?.id]);

  // Bandeaux : début, nouveau joueur, nouveau tour, MVP, fin.
  useEffect(() => {
    const p = prev.current;
    const round = roundOf(step);
    prev.current = { cursor: progress.cursor, round, playerId: step?.playerId };
    if (!p) {
      if (progress.cursor === 0 && step && player) {
        setBanner({ id: Date.now(), kicker: t.playoffs, title: config.turnMode === 'round' ? t.playoffsStart : t.yourTurn(player.name), color: player.color });
      }
      return;
    }
    if (progress.cursor <= p.cursor) return;
    if (!step) {
      setConfetti((c) => c + 1);
      return;
    }
    if (config.turnMode === 'sequential' && step.playerId !== p.playerId && player) {
      setBanner({ id: Date.now(), kicker: t.playoffs, title: t.yourTurn(player.name), color: player.color });
    } else if (round !== p.round) {
      if (p.round === 'f' || round === 'mvp') setConfetti((c) => c + 1);
      const title = round === 'mvp' ? t.mvpBanner : t.nextRound(roundLabel(league, seriesById(config, league, step.groupId)!));
      const label = p.round === 'mvp' || !p.round ? '' : roundName(league, p.round);
      setBanner({ id: Date.now(), kicker: label ? t.roundDone(label) : t.playoffs, title, color: round === 'mvp' ? 'var(--lemon)' : undefined });
    }
  }, [progress.cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = player ? Object.keys(myPicks).length : tpl.length;
  const pct = (progress.cursor / steps.length) * 100;

  return (
    <div className="screen game pgame" style={player ? ({ '--sel': player.color } as CSSProperties) : undefined}>
      <TopBar
        showUndo
        center={
          <div className="turn">
            <AnimatePresence mode="popLayout">
              {player && (
                <motion.div
                  key={player.id}
                  className="turn__player"
                  style={{ '--pc': player.color } as CSSProperties}
                  initial={{ y: -40, opacity: 0, rotate: -6 }}
                  animate={{ y: 0, opacity: 1, rotate: -1.5 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  <span className="avatar">{initials(player.name)}</span>
                  {player.name}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="turn__info">
              <strong>{!step ? t.picksDone : isMvp ? t.finalsMvp : roundLabel(league, def!)}</strong>
              <span>
                {t.seriesCount(Math.min(mine, tpl.length), tpl.length)}
              </span>
              <div className="progress">
                <motion.div className="progress__bar" animate={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        }
      />
      <main className="pgame__main">
        <div className="pgame__left">
          <section className="pgame__duel card">
            {def && teams ? (
              <DuelCard key={`${progress.cursor}`} config={config} league={league} def={def} teams={teams} onPick={(p) => act({ type: 'series', ...p })} />
            ) : isMvp && player ? (
              <MvpCard key={player.id} name={player.name} champ={champion(myPicks)} onSubmit={(name) => act({ type: 'mvp', name })} />
            ) : (
              <motion.div className="finished" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
                <span className="finished__emoji">🏆</span>
                <h2>{t.allBracketsDone}</h2>
                <button className="btn btn--primary btn--big" onClick={() => setScreen('reveal')}>
                  {t.revealBrackets}
                </button>
              </motion.div>
            )}
          </section>
          <section className="pgame__others card">
            <h3 className="sb-title">{t.thePicks}</h3>
            {config.players.map((p) => {
              const pk = playerPicks(config, league, progress, p.id);
              const cur = def ? pk[def.id] : undefined;
              const champ = champion(pk);
              return (
                <button
                  key={p.id}
                  className={`other ${p.id === player?.id ? 'is-active' : ''} ${p.id === shownPlayer.id ? 'is-shown' : ''}`}
                  style={{ '--pc': p.color } as CSSProperties}
                  onClick={() => setViewId(p.id)}
                  title={t.seeBracket}
                >
                  <span className="avatar">{initials(p.name)}</span>
                  <span className="other__name">{p.name}</span>
                  <span className="other__pick">
                    {cur ? (
                      <>
                        <TeamBadge team={map.get(cur.winner)!} size="xs" />
                        <small>{scoreLabel(cur.lost)}</small>
                      </>
                    ) : (
                      <small className="muted">{Object.keys(pk).length}/{tpl.length}</small>
                    )}
                  </span>
                  <span className="other__champ" title={t.theirChampion}>
                    🏆 {champ ? <TeamBadge team={map.get(champ)!} size="xs" /> : <small className="muted">?</small>}
                  </span>
                </button>
              );
            })}
          </section>
        </div>
        <section className="pgame__bracket card">
          <div className="pgame__bracket-head">
            <h3 className="sb-title">
              {t.bracketOf} <span style={{ background: shownPlayer.color }} className="name-chip">{shownPlayer.name}</span>
            </h3>
            {shownPlayer.id !== player?.id && player && (
              <button className="btn btn--sm" onClick={() => setViewId(null)}>
                {t.backTo(player.name)}
              </button>
            )}
          </div>
          <Bracket config={config} league={league} picks={shownPicks} color={shownPlayer.color} current={shownPlayer.id === player?.id ? def?.id : null} />
        </section>
      </main>
      <Banner banner={banner} onClose={() => setBanner(null)} />
      <Confetti fire={confetti} />
    </div>
  );
}

function MvpCard({ name, champ, onSubmit }: { name: string; champ: string | null; onSubmit: (n: string) => void }) {
  const config = useGame((s) => s.config)!;
  const team = champ ? teamMap(getLeague(config.leagueId)).get(champ) : null;
  const t = useT();
  const [value, setValue] = useState('');
  return (
    <motion.form
      className="mvp"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value);
      }}
    >
      <span className="duel__round">{t.mvpBanner}</span>
      {team && (
        <div className="mvp__champ">
          <TeamBadge team={team} size="lg" />
          <span>
            {t.championOf(name)} <strong>{team.city} {team.name}</strong>
          </span>
        </div>
      )}
      <label className="mvp__label">
        <span>
          {t.mvpQuestion[0]}
          <strong>{name}</strong>
          {t.mvpQuestion[1]}
        </span>
        <input className="input" autoFocus value={value} maxLength={40} onChange={(e) => setValue(e.target.value)} placeholder={t.playerName} />
      </label>
      <button className="btn btn--primary" disabled={!value.trim()}>
        {t.submit}
      </button>
    </motion.form>
  );
}
