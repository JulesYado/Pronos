import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PLAYER_COLORS, useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { initials } from '../utils/format';
import { useT } from '../i18n/useT';

const MAX = 12;

export function PlayersSetup() {
  const { draft, updateDraft, setScreen } = useGame();
  const t = useT();
  const [name, setName] = useState('');
  const players = draft.players;

  const add = () => {
    const n = name.trim();
    if (!n || players.length >= MAX) return;
    const used = new Set(players.map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[players.length % PLAYER_COLORS.length];
    updateDraft({ players: [...players, { id: `p${Date.now().toString(36)}`, name: n, color }] });
    setName('');
  };

  const rename = (id: string, value: string) =>
    updateDraft({ players: players.map((p) => (p.id === id ? { ...p, name: value } : p)) });

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= players.length) return;
    const next = [...players];
    [next[i], next[j]] = [next[j], next[i]];
    updateDraft({ players: next });
  };

  const valid = players.length > 0 && players.every((p) => p.name.trim());

  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup">
        <h2 className="step-title">{t.whoPlays}</h2>
        <p className="lead">{t.playersLead}</p>
        <form
          className="player-form"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.playerName}
            maxLength={20}
            autoFocus
          />
          <button className="btn btn--primary" type="submit" disabled={!name.trim() || players.length >= MAX}>
            {t.add}
          </button>
        </form>
        <ul className="player-list">
          <AnimatePresence initial={false}>
            {players.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                className="player-chip card"
                style={{ background: p.color }}
                initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: i % 2 ? 1 : -1 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 10 }}
              >
                <span className="avatar avatar--lg">{initials(p.name) || '?'}</span>
                <input className="player-chip__name" value={p.name} onChange={(e) => rename(p.id, e.target.value)} maxLength={20} />
                <div className="player-chip__tools">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title={t.moveUp}>▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === players.length - 1} title={t.moveDown}>▼</button>
                  <button type="button" onClick={() => updateDraft({ players: players.filter((x) => x.id !== p.id) })} title={t.remove}>
                    ✕
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {players.length === 0 && <p className="muted center">{t.noPlayers}</p>}
        <div className="setup__nav">
          <button className="btn" onClick={() => setScreen('league')}>
            {t.back}
          </button>
          <button className="btn btn--primary btn--big" disabled={!valid} onClick={() => setScreen('method')}>
            {t.next}
          </button>
        </div>
      </main>
    </div>
  );
}
