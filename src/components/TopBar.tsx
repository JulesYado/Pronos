import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { exportGame, useGame } from '../store/useGameStore';
import { downloadJSON, readJSONFile, stamp } from '../utils/export';

interface Props {
  center?: ReactNode;
  showUndo?: boolean;
}

export function TopBar({ center, showUndo }: Props) {
  const { theme, toggleTheme, undo, history, newGame, importGame, config, setScreen } = useGame();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const err = importGame(await readJSONFile(f));
      if (err) alert(err);
    } catch {
      alert('Fichier JSON invalide.');
    }
    setOpen(false);
  };

  return (
    <header className="topbar">
      <button className="logo" onClick={() => setScreen('league')} title="Accueil">
        <span className="logo__ball">🏀</span>
        <span className="logo__text">PRONOS</span>
      </button>
      <div className="topbar__center">{center}</div>
      <div className="topbar__actions">
        {showUndo && (
          <button className="icon-btn" onClick={undo} disabled={!history.length} title="Annuler (Ctrl+Z)">
            ↶<span className="icon-btn__label">Annuler</span>
          </button>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Thème clair/sombre (T)">
          {theme === 'light' ? '☾' : '☀'}
        </button>
        <div className="menu">
          <button className="icon-btn" onClick={() => setOpen((o) => !o)} title="Menu">
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
                    💾 Exporter la partie (JSON)
                  </button>
                )}
                <button onClick={() => fileRef.current?.click()}>📂 Importer une partie</button>
                <button
                  onClick={() => {
                    if (!config || confirm('Abandonner la partie en cours ?')) newGame();
                    setOpen(false);
                  }}
                >
                  ✨ Nouvelle partie
                </button>
                <p className="menu__hint">Raccourcis : Ctrl+Z annuler · T thème · M son</p>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
      </div>
    </header>
  );
}
