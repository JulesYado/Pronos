import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { League } from '../../leagues/types';
import { teamMap } from '../../leagues';
import { seedOf, seriesTeams, templateFor, type PicksMap, type RoundId, type SeriesDef } from '../../engine/bracket';
import type { GameConfig } from '../../engine/types';
import { TeamBadge } from '../TeamBadge';

interface Props {
  config: GameConfig;
  league: League;
  picks: PicksMap;
  /** Couleur du joueur (vainqueurs surlignés). */
  color: string;
  /** Série en cours (mise en avant). */
  current?: string | null;
  /** Tours visibles (révélation) ; tous si absent. */
  visibleRounds?: Set<RoundId>;
  compact?: boolean;
}

/** Tableau complet : Ouest à gauche, Est à droite, Finales au centre. */
export function Bracket({ config, league, picks, color, current, visibleRounds, compact }: Props) {
  const tpl = templateFor(config, league);
  const byRound = (groupId: string | null, round: RoundId) => tpl.filter((s) => s.groupId === groupId && s.round === round);
  const [east, west] = league.groups.map((g) => g.id);
  const rounds: RoundId[] = config.playoffs?.playIn ? ['pi', 'r1', 'r2', 'cf'] : ['r1', 'r2', 'cf'];
  const finals = tpl.find((s) => s.round === 'f')!;
  const champ = picks.finals?.winner && (!visibleRounds || visibleRounds.has('f')) ? teamMap(league).get(picks.finals.winner) : null;

  // Révélation : un tour montre ses affiches dès que le tour précédent est révélé, ses vainqueurs quand il l'est lui-même.
  const order: RoundId[] = [...rounds, 'f'];
  const vis = (r: RoundId) => ({
    hidePick: !!visibleRounds && !visibleRounds.has(r),
    hideTeams: !!visibleRounds && order.indexOf(r) > 0 && !visibleRounds.has(order[order.indexOf(r) - 1]),
  });

  const col = (groupId: string, round: RoundId) => (
    <div key={`${groupId}-${round}`} className={`bk-col bk-col--${round}`}>
      {byRound(groupId, round).map((s) => (
        <Match key={s.id} def={s} config={config} league={league} picks={picks} current={current === s.id} {...vis(s.round)} />
      ))}
    </div>
  );

  return (
    <div className={`bracket ${compact ? 'bracket--compact' : ''}`} style={{ '--pc': color, '--cols': rounds.length * 2 + 1 } as CSSProperties}>
      <div className="bk-side">{rounds.map((r) => col(west ?? east, r))}</div>
      <div className="bk-col bk-col--f">
        <div className="bk-trophy">
          <span className="bk-trophy__cup">🏆</span>
          {champ ? (
            <motion.div key={champ.id} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
              <TeamBadge team={champ} size={compact ? 'md' : 'lg'} />
            </motion.div>
          ) : (
            <span className="bk-trophy__empty">?</span>
          )}
        </div>
        <Match def={finals} config={config} league={league} picks={picks} current={current === finals.id} {...vis('f')} />
      </div>
      <div className="bk-side bk-side--right">{[...rounds].reverse().map((r) => col(east, r))}</div>
    </div>
  );
}

function Match({ def, config, league, picks, current, hidePick, hideTeams }: { def: SeriesDef; config: GameConfig; league: League; picks: PicksMap; current: boolean; hidePick: boolean; hideTeams: boolean }) {
  const map = teamMap(league);
  const teams = seriesTeams(config, league, picks, def);
  const pick = hidePick ? undefined : picks[def.id];
  return (
    <div className={`bk-match ${current ? 'is-current' : ''} ${def.single ? 'is-single' : ''}`}>
      {teams.map((id, i) => {
        const team = id && !hideTeams ? map.get(id) : null;
        const win = !!pick && pick.winner === id;
        const lose = !!pick && !win;
        const score = pick && !def.single && pick.lost !== undefined ? (win ? 4 : pick.lost) : null;
        return (
          <div key={i} className={`bk-team ${win ? 'is-win' : ''} ${lose ? 'is-lose' : ''}`}>
            {team ? (
              <motion.span key={team.id} className="bk-team__in" initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                <span className="bk-seed">{seedOf(config, team.id)}</span>
                <TeamBadge team={team} size="xs" label="name" />
              </motion.span>
            ) : (
              <span className="bk-team__tbd">{hideTeams ? '?' : '—'}</span>
            )}
            {score !== null && <span className="bk-score">{score}</span>}
            {pick && def.single && win && <span className="bk-score">✓</span>}
          </div>
        );
      })}
    </div>
  );
}
