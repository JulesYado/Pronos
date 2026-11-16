import { useGame } from '../store/useGameStore';
import { getLeague } from '../leagues';
import { TopBar } from '../components/TopBar';
import { SeedEditor } from '../components/playoffs/SeedEditor';
import { seedCount } from '../engine/bracket';
import { useT } from '../i18n/useT';

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
  const t = useT();
  const count = seedCount(draft.playIn);
  const ready = league.groups.every((g) => (draft.seeds[g.id] ?? []).length >= count);

  const start = () => {
    if (config && !confirm(t.confirmReplace)) return;
    startGame();
  };

  return (
    <div className="screen screen--setup">
      <TopBar />
      <main className="setup setup--wide">
        <h2 className="step-title">{t.playoffsTitle}</h2>
        <div className="options options--4">
          <Toggle
            title={t.playIn}
            value={draft.playIn}
            on={t.playInOn}
            off={t.playInOff}
            onChange={(playIn) => updateDraft({ playIn })}
          />
          <Toggle
            title={t.seriesScore}
            value={draft.withScore}
            on={t.scoreOn}
            off={t.scoreOff}
            onChange={(withScore) => updateDraft({ withScore })}
          />
          <Toggle
            title={t.finalsMvp}
            value={draft.mvp}
            on={t.mvpOn}
            off={t.mvpOff}
            onChange={(mvp) => updateDraft({ mvp })}
          />
          <section className="option card">
            <h3>{t.turnOrder}</h3>
            <div className="seg">
              <button className={draft.turnMode === 'round' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'round' })}>
                {t.round}
                <small>{t.roundDescP}</small>
              </button>
              <button className={draft.turnMode === 'sequential' ? 'is-on' : ''} onClick={() => updateDraft({ turnMode: 'sequential' })}>
                {t.sequential}
                <small>{t.sequentialDescP}</small>
              </button>
            </div>
          </section>
        </div>

        <h2 className="step-title">{t.seedsTitle}</h2>
        <p className="muted">{t.seedsHelp(draft.playIn)}</p>
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
            {t.back}
          </button>
          <span className="muted">{ready ? `${t.players(draft.players.length)} · ${t.ready}` : t.completeSeeds}</span>
          <button className="btn btn--primary btn--big" onClick={start} disabled={!ready}>
            {t.start}
          </button>
        </div>
      </main>
    </div>
  );
}
