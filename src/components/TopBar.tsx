import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { exportGame, useGame } from '../store/useGameStore';
import { downloadJSON, readJSONFile, stamp } from '../utils/export';
import { useT } from '../i18n/useT';

interface Props {
  center?: ReactNode;
  showUndo?: boolean;
}

export function TopBar({ center, showUndo }: Props) {
  const { theme, toggleTheme, lang, toggleLang, undo, history, newGame, importGame, config, setScreen } = useGame();
  const t = useT();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const err = importGame(await readJSONFile(f));
      if (err) alert(err);
    } catch {
      alert(t.invalidJson);
    }
    setOpen(false);
  };

  return (
    <header className="topbar">
      <button className="logo" onClick={() => setScreen('league')} title={t.home}>
        <span className="logo__ball">🏀</span>
        <span className="logo__text">PRONOS</span>
      </button>
      <div className="topbar__center">{center}</div>
      <div className="topbar__actions">
        {showUndo && (
          <button className="icon-btn" onClick={undo} disabled={!history.length} title={t.undoTitle}>
            ↶<span className="icon-btn__label">{t.undo}</span>
          </button>
        )}
        <button className="icon-btn icon-btn--lang" onClick={toggleLang} title={t.langTitle}>
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button className="icon-btn" onClick={toggleTheme} title={t.themeTitle}>
          {theme === 'light' ? '☾' : '☀'}
        </button>
        <div className="menu">
          <button className="icon-btn" onClick={() => setOpen((o) => !o)} title={t.menu}>
            ☰
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                className="menu__panel card"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
              >
                {config && (
                  <button
                    onClick={() => {
                      const g = exportGame();
                      if (g) downloadJSON(g, `pronos-${config.leagueId}-${stamp()}.json`);
                      setOpen(false);
                    }}
                  >
                    {t.exportGameJson}
                  </button>
                )}
                <button onClick={() => fileRef.current?.click()}>{t.importGame}</button>
                <button
                  onClick={() => {
                    if (!config || confirm(t.confirmAbandon)) newGame();
                    setOpen(false);
                  }}
                >
                  {t.newGame}
                </button>
                <p className="menu__hint">{t.shortcutsHint}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
      </div>
    </header>
  );
}
