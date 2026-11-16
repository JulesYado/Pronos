import { useGame } from '../store/useGameStore';
import { getLeague } from '../leagues';
import { TopBar } from '../components/TopBar';
import { SeedEditor } from '../components/playoffs/SeedEditor';
import { seedCount } from '../engine/bracket';

function Toggle({ title, value, on, off, onChange }: { title: string; value: boolean; on: [string, string]; off: [string, string]; onChange: (v: boolean) => void }) {
  return (
    <section className="option card">
      <h3>{title}</h3>
      <div className="seg">
        <button className={value ? 'is-on' : ''} onClick={() => onChange(true)}>
          {on[0]}
          <small>{on[1]}</small>
        </button>
        <button className={!value ? 'is-on' : ''} onClick={() => onChange(false)}>
          {off[0]}
          <small>{off[1]}</small>
        </button>
      </div>
    </section>
  );
}

export function PlayoffSetup() {
  const { draft, updateDraft, setScreen, startGame, config, leagueId } = useGame();
  const league = getLeague(leagueId);
  const count = seedCount(draft.playIn);
  const ready = league.groups.every((g) => (draft.seeds[g.id] ?? []).length >= count);

  const start = () => {
    if (config && !confirm('Une partie est déjà en cours. La remplacer ?')) return;
    startGame();
  };

  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup setup--wide">
        <h2 className="step-title">3. Les playoffs 🏆</h2>
        <div className="options options--4">
          <Toggle
            title="Play-in"
            value={draft.playIn}
            on={['🎟️ Oui', '7e à 10e : matchs de barrage']}
            off={['⏭️ Non', 'Direct au 1er tour']}
            onChange={(playIn) => updateDraft({ playIn })}
          />
          <Toggle
            title="Score des séries"
            value={draft.withScore}
            on={['🔢 Oui', 'Vainqueur + 4-0 … 4-3']}
            off={['✅ Non', 'Vainqueur seulement']}
            onChange={(withScore) => updateDraft({ withScore })}
          />
          <Toggle
            title="MVP des Finales"
            value={draft.mvp}
            on={['⭐ Oui', 'Chacun nomme son MVP']}
            off={['🚫 Non', 'Pas de MVP']}
            onChange={(mvp) => updateDraft({ mvp })}
          />
          <section className="option card">
            <h3>Ordre de passage</h3>
            <div className="seg">
              <button className={draft.turnMode === 'round' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'round' })}>
                🔁 Tour par tour
                <small>Chaque série passe par tous</small>
              </button>
              <button className={draft.turnMode === 'sequential' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'sequential' })}>
                👤 Joueur par joueur
                <small>Chacun fait tout son tableau</small>
              </button>
            </div>
          </section>
        </div>

        <h2 className="step-title">Têtes de série</h2>
        <p className="muted">
          Clique sur les équipes dans l'ordre (1re tête de série d'abord), glisse pour corriger. {draft.playIn ? '10 équipes par conférence, dont 4 au play-in.' : '8 équipes par conférence.'}
        </p>
        <div className="seeds-grid">
          {league.groups.map((g) => (
            <SeedEditor
              key={g.id}
              league={league}
              group={g}
              seeds={draft.seeds[g.id] ?? []}
              count={count}
              playIn={draft.playIn}
              onChange={(seeds) => updateDraft({ seeds: { ...draft.seeds, [g.id]: seeds } })}
            />
          ))}
        </div>

        <div className="setup__nav">
          <button className="btn" onClick={() => setScreen('players')}>
            ◀ Retour
          </button>
          <span className="muted">{ready ? `${draft.players.length} joueur${draft.players.length > 1 ? 's' : ''} · prêt !` : 'Complète les têtes de série'}</span>
          <button className="btn btn--primary btn--big" onClick={start} disabled={!ready}>
            C'est parti ! 🚀
          </button>
        </div>
      </main>
    </div>
  );
}
