import { AnimatePresence, motion, Reorder } from 'framer-motion';
import type { League, RankingGroup } from '../../leagues/types';
import { teamMap } from '../../leagues';
import { TeamBadge } from '../TeamBadge';

interface Props {
  league: League;
  group: RankingGroup;
  seeds: string[];
  count: number;
  playIn: boolean;
  onChange: (seeds: string[]) => void;
}

/** Saisie des têtes de série d'une conférence : clic sur une équipe = place suivante, glisser pour réordonner. */
export function SeedEditor({ league, group, seeds, count, playIn, onChange }: Props) {
  const map = teamMap(league);
  const pool = group.teamIds
    .filter((id) => !seeds.includes(id))
    .sort((a, b) => map.get(a)!.city.localeCompare(map.get(b)!.city, 'fr'));
  const full = seeds.length >= count;

  return (
    <div className="seeds">
      <div className="seeds__head">
        <h3>{group.label}</h3>
        <span className={`seeds__count ${full ? 'is-ok' : ''}`}>
          {Math.min(seeds.length, count)}/{count}
        </span>
        {seeds.length > 0 && (
          <button className="btn btn--sm" onClick={() => onChange([])}>
            Vider
          </button>
        )}
      </div>
      <Reorder.Group axis="y" values={seeds} onReorder={onChange} className="seeds__list">
        {seeds.map((id, i) => {
          const zone = i >= count ? 'is-unused' : playIn && i >= 6 ? 'is-pi' : '';
          return (
            <Reorder.Item key={id} value={id} className={`seed-row ${zone}`} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <span className="seed-row__num">{i + 1}</span>
              <TeamBadge team={map.get(id)!} size="xs" label="long" />
              {zone === 'is-pi' && <span className="seed-row__tag">play-in</span>}
              {zone === 'is-unused' && <span className="seed-row__tag">non utilisé</span>}
              <button className="icon-btn icon-btn--sm" title="Retirer" onClick={() => onChange(seeds.filter((x) => x !== id))}>
                ✕
              </button>
            </Reorder.Item>
          );
        })}
        {Array.from({ length: Math.max(0, count - seeds.length) }, (_, k) => (
          <li key={`empty-${k}`} className={`seed-row is-empty ${playIn && seeds.length + k >= 6 ? 'is-pi' : ''}`}>
            <span className="seed-row__num">{seeds.length + k + 1}</span>
            <span className="muted">{k === 0 ? 'Clique une équipe ci-dessous' : '—'}</span>
          </li>
        ))}
      </Reorder.Group>
      <div className="seeds__pool">
        <AnimatePresence initial={false}>
          {pool.map((id) => (
            <motion.button
              key={id}
              layout="position"
              className="seeds__team"
              disabled={full}
              onClick={() => !seeds.includes(id) && seeds.length < count && onChange([...seeds, id])}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              whileHover={full ? undefined : { y: -3 }}
              title={`${map.get(id)!.city} ${map.get(id)!.name}`}
            >
              <TeamBadge team={map.get(id)!} size="sm" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
