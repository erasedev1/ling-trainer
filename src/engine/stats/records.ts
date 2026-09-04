import type { ModeId, SessionState } from '../modes/session';

export type RecordId =
  | 'max-words-30s'
  | 'best-sprint'
  | 'fastest-five'
  | 'category-gauntlet-score'
  | 'random-gauntlet-score'
  | 'progressive-level'
  | 'simulation-score'
  | 'best-accuracy'
  | 'best-wpm';

export interface PersonalRecord {
  id: RecordId;
  label: string;
  unit: string;
  /** Higher is better unless `lowerIsBetter`. */
  lowerIsBetter?: boolean;
  value: number;
  at: number;
  /** Seed of the run, so it can be replayed. */
  seed?: number;
}

export const RECORD_DEFS: { id: RecordId; label: string; unit: string; lowerIsBetter?: boolean }[] = [
  { id: 'max-words-30s', label: 'Most words in 30 seconds', unit: 'words' },
  { id: 'best-sprint', label: 'Best Shake Sprint score', unit: 'pts' },
  { id: 'fastest-five', label: 'Fastest five valid words', unit: 's', lowerIsBetter: true },
  { id: 'category-gauntlet-score', label: 'Best Category Gauntlet', unit: 'pts' },
  { id: 'random-gauntlet-score', label: 'Best Random Gauntlet', unit: 'pts' },
  { id: 'progressive-level', label: 'Highest Progressive level', unit: 'level' },
  { id: 'simulation-score', label: 'Best Senior Simulation', unit: 'pts' },
  { id: 'best-accuracy', label: 'Best session accuracy', unit: '%' },
  { id: 'best-wpm', label: 'Best words per minute', unit: 'wpm' },
];

export type RecordBook = Partial<Record<RecordId, PersonalRecord>>;

function candidate(id: RecordId, value: number | null, seed?: number): PersonalRecord | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  const def = RECORD_DEFS.find((d) => d.id === id)!;
  return { id, label: def.label, unit: def.unit, lowerIsBetter: def.lowerIsBetter, value, at: Date.now(), seed };
}

/** Records a finished session could set. */
export function candidatesFor(state: SessionState): PersonalRecord[] {
  const mode: ModeId = state.config.mode;
  const out: (PersonalRecord | undefined)[] = [];
  const valid = state.history.reduce((s, r) => s + r.score.valid, 0);
  const invalid = state.history.reduce((s, r) => s + r.score.invalid, 0);
  const points = state.history.reduce((s, r) => s + r.score.points, 0);
  const elapsed = state.history.reduce((s, r) => s + r.elapsedMs, 0);

  if (mode === 'max-out' && state.config.seconds === 30) {
    out.push(candidate('max-words-30s', valid, state.config.seed));
  }
  if (mode === 'shake-sprint') out.push(candidate('best-sprint', points, state.config.seed));
  if (mode === 'category-gauntlet') out.push(candidate('category-gauntlet-score', points, state.config.seed));
  if (mode === 'random-gauntlet') out.push(candidate('random-gauntlet-score', points, state.config.seed));
  if (mode === 'progressive') {
    const cleared = state.history.filter((r) => r.clearedQuota).length;
    out.push(candidate('progressive-level', cleared, state.config.seed));
  }
  if (mode === 'simulation') out.push(candidate('simulation-score', points, state.config.seed));

  // Fastest five: the earliest moment five valid words existed in one shake.
  for (const record of state.history) {
    const times = record.submissions.filter((s) => s.verdict === 'valid').map((s) => s.atMs).sort((a, b) => a - b);
    if (times.length >= 5) out.push(candidate('fastest-five', times[4] / 1000, record.scenario.seed));
  }

  if (valid + invalid >= 10) out.push(candidate('best-accuracy', (valid / (valid + invalid)) * 100, state.config.seed));
  if (elapsed > 10000) out.push(candidate('best-wpm', (valid / elapsed) * 60000, state.config.seed));

  return out.filter((r): r is PersonalRecord => Boolean(r));
}

export interface RecordUpdate {
  book: RecordBook;
  beaten: PersonalRecord[];
}

export function applyRecords(book: RecordBook, candidates: PersonalRecord[]): RecordUpdate {
  const next: RecordBook = { ...book };
  const beaten: PersonalRecord[] = [];
  for (const record of candidates) {
    const current = next[record.id];
    const better = !current || (record.lowerIsBetter ? record.value < current.value : record.value > current.value);
    if (better) {
      next[record.id] = record;
      beaten.push(record);
    }
  }
  return { book: next, beaten };
}
