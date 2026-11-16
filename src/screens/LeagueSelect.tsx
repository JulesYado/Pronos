import { motion } from 'framer-motion';
import { leagues, sportLabel, upcoming } from '../leagues';
import { useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { methodLabel } from '../utils/format';
import { useT } from '../i18n/useT';

export function LeagueSelect() {
  const { chooseLeague, config, progress, setScreen } = useGame();
  const t = useT();
  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup">
        <motion.h1 className="hero" initial={{ scale: 0.8, rotate: -3, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }}>
          {t.heroTop} <span>{t.heroSub}</span>
        </motion.h1>
        <p className="lead">{t.heroLead}</p>

        {config && progress && (
          <motion.div className="resume card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <span>
              {t.resumeLabel} <strong>{leagues[config.leagueId]?.name}</strong> · {config.mode === 'playoffs' ? t.playoffs : methodLabel(config.method)} ·{' '}
              {config.players.map((p) => p.name).join(', ')}
            </span>
            <button className="btn btn--primary" onClick={() => setScreen('game')}>
              {t.resume}
            </button>
          </motion.div>
        )}

        <h2 className="step-title">{t.chooseLeague}</h2>
        <div className="league-grid">
          {Object.values(leagues).map((l, i) => (
            <motion.div
              key={l.id}
              className="league-card card"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
            >
              <span className="league-card__emoji">{l.emoji}</span>
              <span className="league-card__name">{l.name}</span>
              <span className="league-card__sub">
                {sportLabel(l.id, l.sport)} · {t.season(l.season)}
              </span>
              <div className="league-card__modes">
                <motion.button className="btn btn--sm" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => chooseLeague(l.id, 'season')}>
                  {t.regularSeason}
                </motion.button>
                {l.playoffs && (
                  <motion.button className="btn btn--sm btn--primary" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => chooseLeague(l.id, 'playoffs')}>
                    {t.playoffsBtn}
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
          {upcoming.map((l, i) => (
            <motion.div
              key={l.id}
              className="league-card card is-disabled"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: (i + 1) * 0.08 }}
            >
              <span className="league-card__emoji">{l.emoji}</span>
              <span className="league-card__name">{l.name}</span>
              <span className="league-card__sub">{sportLabel(l.id, l.sport)}</span>
              <span className="sticker">{t.soon}</span>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
