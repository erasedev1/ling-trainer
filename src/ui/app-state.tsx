import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Lexicon } from '../engine/lexicon/lexicon';
import { SENIOR_2026, type Ruleset } from '../../data/senior-2026';
import { APPROXIMATE_2026, CUBE_SETS } from '../../data/cube-sets';
import type { CubeSet } from '../engine/types';
import { createLocalStore, type Settings, type StoredData } from '../engine/persistence/store';
import type { SessionLog, ShakeLog } from '../engine/stats/stats';
import type { RecordBook } from '../engine/stats/records';

interface AppValue {
  ruleset: Ruleset;
  cubeSet: CubeSet;
  lexicon: Lexicon | undefined;
  lexiconError: string | undefined;
  data: StoredData;
  updateSettings(patch: Partial<Settings>): void;
  /** Append finished shakes as they happen, so nothing is lost if the player walks away. */
  recordShakes(shakes: ShakeLog[]): void;
  recordSession(session: SessionLog, records: RecordBook): void;
  clearAll(): void;
}

const Ctx = createContext<AppValue | undefined>(undefined);

export function useApp(): AppValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp outside provider');
  return value;
}

/** The lexicon is a ~5 MB asset; it is fetched once and shared by every drill. */
export function AppProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createLocalStore(), []);
  const [data, setData] = useState<StoredData>(() => store.load());
  const [lexicon, setLexicon] = useState<Lexicon>();
  const [lexiconError, setLexiconError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}data/lexicon.json`;
    Lexicon.load(url)
      .then((lex) => {
        if (!cancelled) setLexicon(lex);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLexiconError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Writes are applied against the latest snapshot, not the one captured by the
  // render that scheduled them: a drill can record shakes and then the session
  // summary within a single tick, and the second write must not clobber the first.
  const latest = useRef(data);
  latest.current = data;
  const persist = useCallback(
    (mutate: (previous: StoredData) => StoredData) => {
      const next = mutate(latest.current);
      latest.current = next;
      setData(next);
      store.save(next);
    },
    [store],
  );

  const value: AppValue = {
    ruleset: SENIOR_2026,
    cubeSet:
      (data.settings.cubeSetId === 'custom' ? data.settings.customCubeSet : undefined) ??
      CUBE_SETS.find((c) => c.id === data.settings.cubeSetId) ??
      APPROXIMATE_2026,
    lexicon,
    lexiconError,
    data,
    updateSettings(patch) {
      persist((previous) => ({ ...previous, settings: { ...previous.settings, ...patch } }));
    },
    recordShakes(shakes) {
      if (!shakes.length) return;
      persist((previous) => ({ ...previous, shakes: [...previous.shakes, ...shakes] }));
    },
    recordSession(session, records) {
      persist((previous) => ({ ...previous, sessions: [...previous.sessions, session], records }));
    },
    clearAll() {
      store.clear();
      const fresh = store.load();
      latest.current = fresh;
      setData(fresh);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
