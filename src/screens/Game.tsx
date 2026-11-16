import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLeague, groupLabel } from '../leagues';
import { boardKey, currentStep, currentTeam, getSteps, groupSize, needsPick, remainingTeams } from '../engine/game';
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
import { initials, METHOD_LABELS } from '../utils/format';

const BOARDS = { tier: TierBoard, relative: RelativeBoard, position: PositionBoard, team: TeamBoard };

export function Game() {
  const config = useGame((s) => s.config)!;
  const progress = useGame((s) => s.progress)!;
  const act = useGame((s) => s.act);
  const setScreen = useGame((s) => s.setScreen);
  const league = getLeague(config.leagueId);
  const step = currentStep(config, league, progress);
  const steps = getSteps(config, league);

  const [banner, setBanner] = useState<BannerData | null>(null);
  const [confetti, setConfetti] = useState(0);
  const prev = useRef<{ cursor: number; groupId?: string; playerId?: string } | null>(null);

  // Bandeaux de transition : nouveau joueur, nouvelle conférence, fin de partie.
  useEffect(() => {
    const p = prev.current;
    prev.current = { cursor: progress.cursor, groupId: step?.groupId, playerId: step?.playerId };
    const forward = !p || progress.cursor > p.cursor;
    const player = step ? config.players[step.playerIndex] : null;
    if (!p) {
      if (progress.cursor === 0 && step && player) {
        setBanner({ id: Date.now(), kicker: groupLabel(league, step.groupId), title: config.turnMode === 'round' ? 'Que le jeu commence !' : `À toi, ${player.name} !`, color: player.color });
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
      setBanner({ id: Date.now(), kicker: `${groupLabel(league, p.groupId!)} terminée !`, title: `Place à la ${groupLabel(league, step.groupId)}`, sub: config.turnMode === 'sequential' ? `${player!.name} commence` : undefined });
    } else if (config.turnMode === 'sequential' && step.playerId !== p.playerId && player) {
      setBanner({ id: Date.now(), kicker: groupLabel(league, step.groupId), title: `À toi, ${player.name} !`, color: player.color });
    }
  }, [progress.cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = !step;
  const player = step ? config.players[step.playerIndex] : null;
  const board = step ? progress.boards[boardKey(step.playerId, step.groupId)] : null;
  const team = step ? currentTeam(config, league, progress, step) : null;
  const picking = !!step && needsPick(config, progress, step);
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
              <strong>{done ? 'Pronos terminés !' : groupLabel(league, groupId)}</strong>
              <span>
                {METHOD_LABELS[config.method]} · {done ? `${size}/${size}` : `${placed}/${size}`}
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
            <Board key={config.method} {...boardProps} />
          ) : (
            <motion.div className="finished" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
              <span className="finished__emoji">🏆</span>
              <h2>Tous les pronos sont faits !</h2>
              <p className="lead">Prêts pour la grande révélation ?</p>
              <button className="btn btn--primary btn--big" onClick={() => setScreen('reveal')}>
                Révéler les classements ✨
              </button>
            </motion.div>
          )}
        </section>
        <Scoreboard config={config} league={league} progress={progress} activePlayerId={player?.id ?? null} groupId={groupId} />
      </main>

      <Banner banner={banner} onClose={() => setBanner(null)} />
      <Confetti fire={confetti} />
    </div>
  );
}
