import type { CSSProperties } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { newTierId, recolor } from '../engine/tiers';
import type { MethodId, OrderMode, Tier } from '../engine/types';
import { useT } from '../i18n/useT';

const METHODS: { id: MethodId; icon: string; color: string }[] = [
  { id: 'tier', icon: '🎚️', color: 'var(--pink)' },
  { id: 'relative', icon: '↕️', color: 'var(--sky)' },
  { id: 'position', icon: '🎯', color: 'var(--mint)' },
  { id: 'team', icon: '🔢', color: 'var(--lemon)' },
];

const ORDERS: OrderMode[] = ['random', 'alpha', 'pick'];

function TierEditor({ tiers, onChange }: { tiers: Tier[]; onChange: (t: Tier[]) => void }) {
  const tt = useT();
  return (
    <div className="tier-editor">
      <Reorder.Group axis="y" values={tiers} onReorder={(t) => onChange(recolor(t))} className="tier-editor__list">
        {tiers.map((t, i) => (
          <Reorder.Item key={t.id} value={t} className="tier-editor__row" style={{ background: t.color }}>
            <span className="grip" title={tt.dragToReorder}>⠿</span>
            <span className="tier__key">{i + 1}</span>
            <input
              className="input input--sm"
              value={t.name}
              maxLength={24}
              onChange={(e) => onChange(tiers.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
            />
            <input
              type="color"
              title={tt.color}
              value={toHex(t.color)}
              onChange={(e) => onChange(tiers.map((x) => (x.id === t.id ? { ...x, color: e.target.value } : x)))}
            />
            <button className="icon-btn icon-btn--sm" disabled={tiers.length <= 2} onClick={() => onChange(recolor(tiers.filter((x) => x.id !== t.id)))}>
              ✕
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <div className="row">
        <button
          className="btn btn--sm"
          disabled={tiers.length >= 9}
          onClick={() => onChange(recolor([...tiers, { id: newTierId(), name: tt.newTier(tiers.length + 1), color: '' }]))}
        >
          {tt.addTier}
        </button>
        <button className="btn btn--sm" onClick={() => onChange(recolor(tiers))}>
          {tt.autoGradient}
        </button>
      </div>
    </div>
  );
}

/** Convertit une couleur CSS quelconque en #rrggbb pour l'input color. */
function toHex(color: string): string {
  if (color.startsWith('#')) return color;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return '#cccccc';
  ctx.fillStyle = color;
  return ctx.fillStyle as string;
}

export function MethodSetup() {
  const { draft, updateDraft, setScreen, startGame, config } = useGame();
  const usesOrder = draft.method !== 'position';
  const t = useT();

  const start = () => {
    if (config && !confirm(t.confirmReplace)) return;
    startGame();
  };

  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup setup--wide">
        <h2 className="step-title">{t.howTitle}</h2>
        <div className="method-grid">
          {METHODS.map((m, i) => (
            <motion.button
              key={m.id}
              className={`method-card card ${draft.method === m.id ? 'is-on' : ''}`}
              style={{ '--mc': m.color } as CSSProperties}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1, rotate: draft.method === m.id ? -1.5 : 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                updateDraft({ method: m.id });
              }}
            >
              <span className="method-card__icon">{m.icon}</span>
              <strong>{t.methods[m.id].title}</strong>
              <span>{t.methods[m.id].desc}</span>
            </motion.button>
          ))}
        </div>

        <div className="options">
          <section className="option card">
            <h3>{t.turnOrderTitle}</h3>
            <div className="seg">
              <button className={draft.turnMode === 'sequential' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'sequential' })}>
                {t.sequential}
                <small>{t.sequentialDesc}</small>
              </button>
              <button className={draft.turnMode === 'round' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'round' })}>
                {t.round}
                <small>{t.roundDesc}</small>
              </button>
            </div>
          </section>

          {usesOrder ? (
            <section className="option card">
              <h3>{t.teamOrderTitle}</h3>
              <div className="seg">
                {ORDERS.map((o) => (
                  <button key={o} className={draft.order === o ? 'is-on' : ''} onClick={() => updateDraft({ order: o })}>
                    {t.orders[o].label}
                    <small>{t.orders[o].desc}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="option card">
              <h3>{t.startWith}</h3>
              <div className="seg">
                <button className={draft.positionStart === 'top' ? 'is-on' : ''} onClick={() => updateDraft({ positionStart: 'top' })}>
                  {t.top}
                  <small>{t.topDesc}</small>
                </button>
                <button className={draft.positionStart === 'bottom' ? 'is-on' : ''} onClick={() => updateDraft({ positionStart: 'bottom' })}>
                  {t.bottom}
                  <small>{t.bottomDesc}</small>
                </button>
              </div>
            </section>
          )}

          {draft.method === 'tier' && (
            <section className="option option--full card">
              <h3>{t.tiersTitle}</h3>
              <TierEditor tiers={draft.tiers} onChange={(tiers) => updateDraft({ tiers })} />
            </section>
          )}
        </div>

        <div className="setup__nav">
          <button className="btn" onClick={() => setScreen('players')}>
            {t.back}
          </button>
          <span className="muted">{t.eastThenWest} · {t.players(draft.players.length)}</span>
          <button className="btn btn--primary btn--big" onClick={start} disabled={draft.tiers.some((t) => !t.name.trim())}>
            {t.start}
          </button>
        </div>
      </main>
    </div>
  );
}
