import { useEffect } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { useGame } from './store/useGameStore';
import { Backdrop } from './components/Backdrop';
import { LeagueSelect } from './screens/LeagueSelect';
import { PlayersSetup } from './screens/PlayersSetup';
import { MethodSetup } from './screens/MethodSetup';
import { Game } from './screens/Game';
import { Reveal } from './screens/Reveal';
import { PlayoffSetup } from './screens/PlayoffSetup';
import { PlayoffGame } from './screens/PlayoffGame';
import { PlayoffReveal } from './screens/PlayoffReveal';
import { useT } from './i18n/useT';

export default function App() {
  const screen = useGame((s) => s.screen);
  const theme = useGame((s) => s.theme);
  const hasGame = useGame((s) => !!s.config && !!s.progress);
  const playoffGame = useGame((s) => s.config?.mode === 'playoffs');
  const playoffDraft = useGame((s) => s.draft.mode === 'playoffs');

  const t = useT();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.title = `${t.heroTop} ${t.heroSub}`;
  }, [t]);

  // Raccourcis globaux.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const s = useGame.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (s.screen === 'game' || s.screen === 'reveal') {
          e.preventDefault();
          s.undo();
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 't' || e.key === 'T') s.toggleTheme();
      else if (e.key === 'l' || e.key === 'L') s.toggleLang();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const current = (screen === 'game' || screen === 'reveal') && !hasGame ? 'league' : screen;

  return (
    <MotionConfig reducedMotion="user">
      <Backdrop />
      {/* Animation d'entrée seulement : un écran ne bloque jamais le suivant. */}
      <motion.div
          key={current}
          className="screen-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {current === 'league' && <LeagueSelect />}
          {current === 'players' && <PlayersSetup />}
          {current === 'method' && (playoffDraft ? <PlayoffSetup /> : <MethodSetup />)}
          {current === 'game' && (playoffGame ? <PlayoffGame /> : <Game />)}
          {current === 'reveal' && (playoffGame ? <PlayoffReveal /> : <Reveal />)}
      </motion.div>
    </MotionConfig>
  );
}
