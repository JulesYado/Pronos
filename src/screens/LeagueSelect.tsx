import { motion } from 'framer-motion';
import { leagues, upcoming } from '../leagues';
import { useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { METHOD_LABELS } from '../utils/format';

export function LeagueSelect() {
  const { chooseLeague, config, progress, setScreen } = useGame();
  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup">
        <motion.h1 className="hero" initial={{ scale: 0.8, rotate: -3, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }}>
          Pronos <span>de saison</span>
        </motion.h1>
        <p className="lead">Classe les équipes, compare les pronos de tout le monde, et rendez-vous en fin de saison !</p>

        {config && progress && (
          <motion.div className="resume card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <span>
              Partie en cours : <strong>{leagues[config.leagueId]?.name}</strong> · {config.mode === 'playoffs' ? 'Playoffs' : METHOD_LABELS[config.method]} ·{' '}
              {config.players.map((p) => p.name).join(', ')}
            </span>
            <button className="btn btn--primary" onClick={() => setScreen('game')}>
              Reprendre ▶
            </button>
          </motion.div>
        )}

        <h2 className="step-title">1. Choisis ta ligue</h2>
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
                {l.sport} · Saison {l.season}
              </span>
              <div className="league-card__modes">
                <motion.button className="btn btn--sm" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => chooseLeague(l.id, 'season')}>
                  📊 Saison régulière
                </motion.button>
                {l.playoffs && (
                  <motion.button className="btn btn--sm btn--primary" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => chooseLeague(l.id, 'playoffs')}>
                    🏆 Playoffs
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
              <span className="league-card__sub">{l.sport}</span>
              <span className="sticker">Bientôt</span>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
