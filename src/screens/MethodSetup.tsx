import type { CSSProperties } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useGame } from '../store/useGameStore';
import { TopBar } from '../components/TopBar';
import { newTierId, recolor } from '../engine/tiers';
import type { MethodId, OrderMode, Tier } from '../engine/types';

const METHODS: { id: MethodId; icon: string; title: string; desc: string; color: string }[] = [
  { id: 'tier', icon: '🎚️', title: 'Tier list', desc: 'Range chaque équipe dans une catégorie, du rouge (top) au bleu (bas), puis ordonne-les.', color: 'var(--pink)' },
  { id: 'relative', icon: '↕️', title: 'Classement relatif', desc: 'Place chaque équipe entre deux équipes déjà classées.', color: 'var(--sky)' },
  { id: 'position', icon: '🎯', title: 'Par position', desc: 'Pour chaque place (du haut ou du bas), choisis l’équipe qui l’occupera.', color: 'var(--mint)' },
  { id: 'team', icon: '🔢', title: 'Par équipe', desc: 'Pour chaque équipe présentée, choisis sa position finale.', color: 'var(--lemon)' },
];

const ORDERS: { id: OrderMode; label: string; desc: string }[] = [
  { id: 'random', label: '🎲 Aléatoire', desc: 'Tirage au sort' },
  { id: 'alpha', label: '🔤 Alphabétique', desc: 'De Atlanta à Washington' },
  { id: 'pick', label: '👆 Choix libre', desc: 'Liste sur le côté' },
];

function TierEditor({ tiers, onChange }: { tiers: Tier[]; onChange: (t: Tier[]) => void }) {
  return (
    <div className="tier-editor">
      <Reorder.Group axis="y" values={tiers} onReorder={(t) => onChange(recolor(t))} className="tier-editor__list">
        {tiers.map((t, i) => (
          <Reorder.Item key={t.id} value={t} className="tier-editor__row" style={{ background: t.color }}>
            <span className="grip" title="Glisser pour réordonner">⠿</span>
            <span className="tier__key">{i + 1}</span>
            <input
              className="input input--sm"
              value={t.name}
              maxLength={24}
              onChange={(e) => onChange(tiers.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
            />
            <input
              type="color"
              title="Couleur"
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
          onClick={() => onChange(recolor([...tiers, { id: newTierId(), name: `Tier ${tiers.length + 1}`, color: '' }]))}
        >
          + Ajouter un tier
        </button>
        <button className="btn btn--sm" onClick={() => onChange(recolor(tiers))}>
          🌈 Dégradé auto
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

  const start = () => {
    if (config && !confirm('Une partie est déjà en cours. La remplacer ?')) return;
    startGame();
  };

  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup setup--wide">
        <h2 className="step-title">3. Comment pronostiquer ?</h2>
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
              <strong>{m.title}</strong>
              <span>{m.desc}</span>
            </motion.button>
          ))}
        </div>

        <div className="options">
          <section className="option card">
            <h3>Ordre de passage des joueurs</h3>
            <div className="seg">
              <button className={draft.turnMode === 'sequential' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'sequential' })}>
                👤 Joueur par joueur
                <small>Chacun fait tout son classement</small>
              </button>
              <button className={draft.turnMode === 'round' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'round' })}>
                🔁 Tour par tour
                <small>Chaque équipe passe par tous les joueurs</small>
              </button>
            </div>
          </section>

          {usesOrder ? (
            <section className="option card">
              <h3>Ordre des équipes</h3>
              <div className="seg">
                {ORDERS.map((o) => (
                  <button key={o.id} className={draft.order === o.id ? 'is-on' : ''} onClick={() => updateDraft({ order: o.id })}>
                    {o.label}
                    <small>{o.desc}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="option card">
              <h3>Commencer par</h3>
              <div className="seg">
                <button className={draft.positionStart === 'top' ? 'is-on' : ''} onClick={() => updateDraft({ positionStart: 'top' })}>
                  ⬆️ Le haut
                  <small>Du 1er au 15e</small>
                </button>
                <button className={draft.positionStart === 'bottom' ? 'is-on' : ''} onClick={() => updateDraft({ positionStart: 'bottom' })}>
                  ⬇️ Le bas
                  <small>Du 15e au 1er</small>
                </button>
              </div>
            </section>
          )}

          {draft.method === 'tier' && (
            <section className="option option--full card">
              <h3>Catégories (du plus haut au plus bas)</h3>
              <TierEditor tiers={draft.tiers} onChange={(tiers) => updateDraft({ tiers })} />
            </section>
          )}
        </div>

        <div className="setup__nav">
          <button className="btn" onClick={() => setScreen('players')}>
            ◀ Retour
          </button>
          <span className="muted">Conférence Est puis Ouest · {draft.players.length} joueur{draft.players.length > 1 ? 's' : ''}</span>
          <button className="btn btn--primary btn--big" onClick={start} disabled={draft.tiers.some((t) => !t.name.trim())}>
            C'est parti ! 🚀
          </button>
        </div>
      </main>
    </div>
  );
}
