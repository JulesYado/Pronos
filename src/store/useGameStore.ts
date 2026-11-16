import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLeague } from '../leagues';
import { applyAction, initProgress, isDone, setBoardTiers, setOverride } from '../engine/game';
import { defaultTiers } from '../engine/tiers';
import { detectLang, dicts, type Lang } from '../i18n/dict';
import { setCurrentLang, tr } from '../i18n/current';
import { seedCount, setPlayerPicks, type PicksMap } from '../engine/bracket';
import type { Action, GameConfig, GameMode, GameProgress, MethodId, OrderMode, Player, PositionStart, Tier, TurnMode } from '../engine/types';

export type Screen = 'league' | 'players' | 'method' | 'game' | 'reveal';

export interface Draft {
  mode: GameMode;
  players: Player[];
  method: MethodId;
  order: OrderMode;
  turnMode: TurnMode;
  positionStart: PositionStart;
  tiers: Tier[];
  /** Playoffs : têtes de série saisies par conférence, options. */
  seeds: Record<string, string[]>;
  playIn: boolean;
  withScore: boolean;
  mvp: boolean;
}

export const PLAYER_COLORS = ['#FFAAC9', '#A0D2EB', '#A8E6CF', '#FFD3B6', '#C3B1E1', '#FFF3B0', '#FF8B94', '#B5EAD7', '#E2C2FF', '#9EE7E5', '#FFC6A5', '#D4F0A0'];

export interface SavedGame {
  app: 'pronostic';
  version: 1;
  config: GameConfig;
  progress: GameProgress;
  exportedAt: string;
}

interface State {
  screen: Screen;
  leagueId: string;
  draft: Draft;
  config: GameConfig | null;
  progress: GameProgress | null;
  history: GameProgress[];
  theme: 'light' | 'dark';
  lang: Lang;

  setScreen: (s: Screen) => void;
  chooseLeague: (id: string, mode?: GameMode) => void;
  updateDraft: (d: Partial<Draft>) => void;
  startGame: () => void;
  act: (a: Action) => boolean;
  undo: () => void;
  editTiers: (key: string, tiers: Record<string, string[]>) => void;
  setOverride: (key: string, list: string[]) => void;
  setBracket: (playerId: string, picks: PicksMap) => void;
  newGame: () => void;
  importGame: (data: unknown) => string | null;
  toggleTheme: () => void;
  toggleLang: () => void;
}

const HISTORY_MAX = 200;

// Langue par défaut (avant lecture de la sauvegarde) : celle du navigateur.
setCurrentLang(detectLang());

const initialDraft = (): Draft => ({
  mode: 'season',
  players: [],
  method: 'tier',
  order: 'random',
  turnMode: 'round',
  positionStart: 'bottom',
  tiers: defaultTiers(),
  seeds: {},
  playIn: true,
  withScore: true,
  mvp: true,
});

export const useGame = create<State>()(
  persist(
    (set, get) => {
      const commit = (next: GameProgress) => {
        const { progress, history } = get();
        set({ progress: next, history: progress ? [...history, progress].slice(-HISTORY_MAX) : history });
      };
      return {
        screen: 'league',
        leagueId: 'nba',
        draft: initialDraft(),
        config: null,
        progress: null,
        history: [],
        theme: 'light',
        lang: detectLang(),

        setScreen: (screen) => set({ screen }),
        chooseLeague: (leagueId, mode = 'season') => set({ leagueId, draft: { ...get().draft, mode }, screen: 'players' }),
        updateDraft: (d) => set({ draft: { ...get().draft, ...d } }),

        startGame: () => {
          const { draft, leagueId } = get();
          const league = getLeague(leagueId);
          const n = seedCount(draft.playIn);
          const config: GameConfig = {
            mode: draft.mode,
            ...(draft.mode === 'playoffs'
              ? {
                  playoffs: {
                    seeds: Object.fromEntries(league.groups.map((g) => [g.id, (draft.seeds[g.id] ?? []).slice(0, n)])),
                    playIn: draft.playIn,
                    withScore: draft.withScore,
                    mvp: draft.mvp,
                  },
                }
              : {}),
            leagueId,
            players: draft.players,
            method: draft.method,
            order: draft.order,
            turnMode: draft.turnMode,
            positionStart: draft.positionStart,
            tiers: draft.tiers,
            seed: Math.floor(Math.random() * 2 ** 31),
          };
          set({ config, progress: initProgress(config, league), history: [], screen: 'game' });
        },

        act: (action) => {
          const { config, progress } = get();
          if (!config || !progress) return false;
          const next = applyAction(config, getLeague(config.leagueId), progress, action);
          if (!next) return false;
          commit(next);
          return true;
        },

        undo: () => {
          const { history } = get();
          if (!history.length) return;
          set({ progress: history[history.length - 1], history: history.slice(0, -1) });
        },

        editTiers: (key, tiers) => {
          const { progress } = get();
          if (progress) commit(setBoardTiers(progress, key, tiers));
        },

        setOverride: (key, list) => {
          const { progress } = get();
          if (progress) commit(setOverride(progress, key, list));
        },

        setBracket: (playerId, picks) => {
          const { progress } = get();
          if (progress) commit(setPlayerPicks(progress, playerId, picks));
        },

        newGame: () => set({ config: null, progress: null, history: [], screen: 'league' }),

        importGame: (data) => {
          const d = data as Partial<SavedGame> | null;
          if (!d || d.app !== 'pronostic' || !d.config || !d.progress) return tr().unknownFile;
          try {
            const league = getLeague(d.config.leagueId);
            const done = isDone(d.config, league, d.progress);
            set({
              config: d.config,
              progress: d.progress,
              history: [],
              leagueId: d.config.leagueId,
              screen: done ? 'reveal' : 'game',
            });
            return null;
          } catch (e) {
            return (e as Error).message;
          }
        },

        toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),

        toggleLang: () => {
          const { lang, draft } = get();
          const next: Lang = lang === 'fr' ? 'en' : 'fr';
          setCurrentLang(next);
          // Les catégories par défaut non modifiées suivent la langue.
          const old = dicts[lang].defaultTiers;
          const tiers = draft.tiers.map((t, i) => (t.id === `tier${i}` && t.name === old[i] ? { ...t, name: dicts[next].defaultTiers[i] } : t));
          set({ lang: next, draft: { ...draft, tiers } });
        },
      };
    },
    {
      name: 'pronostic-v1',
      version: 3,
      // v2 : nouvelles valeurs par défaut (tour par tour, position par le bas), sons supprimés.
      migrate: (persisted, version) => {
        const s = persisted as Partial<State> & { sound?: unknown };
        if (version < 2 && s.draft) s.draft = { ...s.draft, turnMode: 'round', positionStart: 'bottom' };
        delete s.sound;
        // v3 : mode playoffs (nouveaux champs du brouillon).
        if (s.draft) s.draft = { ...initialDraft(), ...s.draft };
        return s as State;
      },
      partialize: (s) => ({
        screen: s.screen,
        leagueId: s.leagueId,
        draft: s.draft,
        config: s.config,
        progress: s.progress,
        history: s.history.slice(-30),
        theme: s.theme,
        lang: s.lang,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.lang) setCurrentLang(state.lang);
      },
    },
  ),
);

export function exportGame(): SavedGame | null {
  const { config, progress } = useGame.getState();
  if (!config || !progress) return null;
  return { app: 'pronostic', version: 1, config, progress, exportedAt: new Date().toISOString() };
}

if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
