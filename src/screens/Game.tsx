import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLeague, groupLabel } from '../leagues';
import { airballSectionOf, airballSections, boardKey, currentStep, currentTeam, getSteps, groupSize, isAirball, isReviewStep, needsPick, remainingTeams, targetSlot } from '../engine/game';
import { AirballRecap } from '../components/methods/AirballRecap';
import { useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { Scoreboard } from '../components/Scoreboard';
import { TeamPicker } from '../components/TeamPicker';
import { Confetti } from '../components/Confetti';
import { Banner, type BannerData } from '../components/Banner';
import { TierBoard } from '../components/methods/TierBoard';
import { RelativeBoard } from '../components/methods/RelativeBoard';
import { PositionBoard } from '../components/methods/PositionBoard';
import { TeamBoard } from '../components/methods/TeamBoard';
import type { BoardProps } from '../components/methods/types';
import { initials, methodLabel } from '../utils/format';
import { useT } from '../i18n/useT';

const BOARDS = { tier: TierBoard, relative: RelativeBoard, position: PositionBoard, team: TeamBoard };

export function Game() {
  const config = useGame((s) => s.config)!;
  const progress = useGame((s) => s.progress)!;
  const act = useGame((s) => s.act);
  const setScreen = useGame((s) => s.setScreen);
  const league = getLeague(config.leagueId);
  const t = useT();
  const step = currentStep(config, league, progress);
  const steps = getSteps(config, league);

  const [banner, setBanner] = useState<BannerData | null>(null);
  const [confetti, setConfetti] = useState(0);
  const prev = useRef<{ cursor: number; groupId?: string; playerId?: string; review?: boolean; section?: number } | null>(null);
  const airball = isAirball(config);
  /** Mode Airball : partie (0 nullos, 1 middle, 2 balèzes) de l'étape, hors récap. */
  const sectionOf = (s: typeof step): number | undefined => {
    if (!airball || !s || s.recap !== undefined) return undefined;
    const n = groupSize(league, s.groupId);
    return airballSectionOf(n, targetSlot(config, n, s.item));
  };
  const sectionBanner = (s: NonNullable<typeof step>, sec: number, kicker?: string): BannerData => {
    const part = airballSections(groupSize(league, s.groupId))[sec];
    return { id: Date.now(), kicker: kicker ?? groupLabel(league, s.groupId), title: t.airballSections[part.id], sub: t.sectionStart(part.from + 1, part.to + 1), color: 'var(--peach)' };
  };

  // Bandeaux de transition : nouveau joueur, nouvelle conférence, fin de partie.
  useEffect(() => {
    const p = prev.current;
    const review = !!step && isReviewStep(league, step);
    const section = sectionOf(step);
    prev.current = { cursor: progress.cursor, groupId: step?.groupId, playerId: step?.playerId, review, section };
    const forward = !p || progress.cursor > p.cursor;
    const player = step ? config.players[step.playerIndex] : null;
    if (!p) {
      if (progress.cursor === 0 && step && airball && section !== undefined) {
        setBanner(sectionBanner(step, section));
      } else if (progress.cursor === 0 && step && player) {
        setBanner({ id: Date.now(), kicker: groupLabel(league, step.groupId), title: config.turnMode === 'round' ? t.letsGo : t.yourTurn(player.name), color: player.color });
      }
      return;
    }
    if (!forward) return;
    if (!step) {
      setConfetti((c) => c + 1);
      return;
    }
    if (step.groupId !== p.groupId) {
      setConfetti((c) => c + 1);
      setBanner({ id: Date.now(), kicker: t.groupDone(groupLabel(league, p.groupId!)), title: t.nextGroup(groupLabel(league, step.groupId)), sub: section !== undefined ? t.airballSections[airballSections(groupSize(league, step.groupId))[section].id] : config.turnMode === 'sequential' ? t.starts(player!.name) : undefined });
    } else if (airball) {
      // Mode Airball : confettis au récap, bandeau au début de chaque partie.
      if (step.recap !== undefined && !p.review) setConfetti((c) => c + 1);
      else if (section !== undefined && section !== p.section) setBanner(sectionBanner(step, section));
    } else if (review && player && (!p.review || step.playerId !== p.playerId)) {
      // Étape d'ajustement de la tier list.
      setBanner({
        id: Date.now(),
        kicker: groupLabel(league, step.groupId),
        title: config.turnMode === 'round' && config.players.length > 1 ? t.yourTurn(player.name) : t.adjustTitle,
        sub: t.adjustSub,
        color: player.color,
      });
    } else if (config.turnMode === 'sequential' && step.playerId !== p.playerId && player) {
      setBanner({ id: Date.now(), kicker: groupLabel(league, step.groupId), title: t.yourTurn(player.name), color: player.color });
    }
  }, [progress.cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = !step;
  const recap = step?.recap !== undefined;
  const player = step && !recap ? config.players[step.playerIndex] : null;
  const board = step ? progress.boards[boardKey(step.playerId, step.groupId)] : null;
  const team = step ? currentTeam(config, league, progress, step) : null;
  const picking = !!step && needsPick(config, progress, step, league);
  const remaining = step && board ? remainingTeams(config, league, board, step.groupId) : [];
  const showPicker = !done && config.order === 'pick' && config.method !== 'position';
  const groupId = step?.groupId ?? league.groups[league.groups.length - 1].id;
  const size = groupSize(league, groupId);
  const placed = step && board ? size - remaining.length : size;
  const pct = (progress.cursor / steps.length) * 100;

  const Board = BOARDS[config.method];
  const boardProps: BoardProps | null = step && board ? { config, league, progress, step, board, team, remaining } : null;

  return (
    <div className="screen game" style={player ? ({ '--sel': player.color } as CSSProperties) : undefined}>
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
              <strong>{done ? t.picksDone : groupLabel(league, groupId)}</strong>
              <span>
                {airball && step ? `${t.airballTitle} · ${t.airballSections[airballSections(size)[step.recap ?? sectionOf(step) ?? 0].id]}` : methodLabel(config.method)} ·{' '}
                {done ? `${size}/${size}` : `${placed}/${size}`}
              </span>
              <div className="progress">
                <motion.div className="progress__bar" animate={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        }
      />
      <main className={`game__main ${showPicker ? 'has-picker' : ''}`}>
        {showPicker && <TeamPicker league={league} teams={remaining} active={picking} selected={team} onPick={(id) => act({ type: 'pick', teamId: id })} />}
        <section className="game__board card">
          {boardProps ? (
            recap ? <AirballRecap key={`recap-${progress.cursor}`} {...boardProps} /> : <Board key={config.method} {...boardProps} />
          ) : (
            <motion.div className="finished" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
              <span className="finished__emoji">🏆</span>
              <h2>{t.allDoneTitle}</h2>
              <p className="lead">{t.allDoneLead}</p>
              <button className="btn btn--primary btn--big" onClick={() => setScreen('reveal')}>
                {t.revealRankings}
              </button>
            </motion.div>
          )}
        </section>
        <Scoreboard config={config} league={league} progress={progress} activePlayerId={player?.id ?? null} groupId={groupId} sections={airball ? airballSections(size) : undefined} />
      </main>

      <Banner banner={banner} onClose={() => setBanner(null)} />
      <Confetti fire={confetti} />
    </div>
  );
}
