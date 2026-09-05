import { describe, expect, it } from 'vitest';
import {
  finishDrill,
  resultOf,
  startDrill,
  submitWord,
  tickDrill,
  type DrillConfig,
} from '../src/engine/roll/session';
import { EMPTY_RECORDS, applyRecords, bestFor } from '../src/engine/stats/records';
import { byType, toRollLog, totals, weakestType, type RollLog } from '../src/engine/stats/stats';
import { createLocalStore } from '../src/engine/persistence/store';
import { deps, lexicon } from './helpers';

const config = (patch: Partial<DrillConfig> = {}): DrillConfig => ({
  seed: 20260905,
  seconds: 60,
  types: ['noun'],
  ...patch,
});

describe('drill lifecycle', () => {
  it('starts running with a full clock and an answer key', () => {
    const state = startDrill(config(), deps());
    expect(state.status).toBe('running');
    expect(state.remainingMs).toBe(60000);
    expect(state.key.count).toBeGreaterThan(0);
  });

  it('runs the clock down and finishes exactly once', () => {
    let state = startDrill(config({ seconds: 2 }), deps());
    for (let i = 0; i < 25; i++) state = tickDrill(state, 100);
    expect(state.status).toBe('finished');
    expect(state.remainingMs).toBe(0);
    const before = state.elapsedMs;
    state = tickDrill(state, 100);
    expect(state.elapsedMs).toBe(before);
  });

  it('accepts a valid word once and calls the repeat a duplicate', () => {
    let state = startDrill(config(), deps());
    const word = state.key.words[0];
    state = submitWord(state, word, deps());
    state = submitWord(state, word, deps());
    expect(state.submissions.map((s) => s.verdict)).toEqual(['valid', 'duplicate']);
  });

  it('ignores submissions after the clock stops', () => {
    let state = finishDrill(startDrill(config(), deps()));
    const word = state.key.words[0];
    state = submitWord(state, word, deps());
    expect(state.submissions).toHaveLength(0);
  });

  it('stamps each submission with the time it was made', () => {
    let state = startDrill(config(), deps());
    state = tickDrill(state, 2000);
    state = submitWord(state, state.key.words[0], deps());
    expect(state.submissions[0].atMs).toBe(2000);
  });
});

describe('results', () => {
  it('counts found, wrong, missed and accuracy', () => {
    let state = startDrill(config(), deps());
    state = submitWord(state, state.key.words[0], deps());
    state = submitWord(state, state.key.words[1], deps());
    state = submitWord(state, 'zzzzq', deps());
    state = tickDrill(state, 30000);
    const result = resultOf(finishDrill(state), lexicon());

    expect(result.valid).toBe(2);
    expect(result.invalid).toBe(1);
    expect(result.missed).toBe(state.key.count - 2);
    expect(result.accuracy).toBeCloseTo(2 / 3);
    expect(result.available).toBe(state.key.count);
  });

  it('does not count duplicates against accuracy', () => {
    let state = startDrill(config(), deps());
    const word = state.key.words[0];
    state = submitWord(state, word, deps());
    state = submitWord(state, word, deps());
    const result = resultOf(finishDrill(state), lexicon());
    expect(result.accuracy).toBe(1);
    expect(result.duplicates).toBe(1);
  });

  it('reports words per minute against the time actually elapsed', () => {
    let state = startDrill(config(), deps());
    state = submitWord(state, state.key.words[0], deps());
    state = submitWord(state, state.key.words[1], deps());
    state = tickDrill(state, 30000);
    expect(resultOf(state, lexicon()).wordsPerMinute).toBeCloseTo(4, 5);
  });

  it('attributes each found word to every chosen part of speech it satisfies', () => {
    let state = startDrill(config({ types: ['noun', 'verb'] }), deps());
    for (const word of state.key.words.slice(0, 5)) state = submitWord(state, word, deps());
    const result = resultOf(finishDrill(state), lexicon());
    for (const [type, found] of Object.entries(result.foundByType)) {
      expect(found).toBeLessThanOrEqual(state.key.availableByType[type]);
    }
    const anyFound = Object.values(result.foundByType).reduce((a, b) => a + b, 0);
    expect(anyFound).toBeGreaterThanOrEqual(result.valid);
  });
});

describe('personal bests', () => {
  const finished = (seconds: number, words: number) => {
    let state = startDrill(config({ seconds }), deps());
    for (const word of state.key.words.slice(0, words)) state = submitWord(state, word, deps());
    state = tickDrill(state, seconds * 1000);
    return state;
  };

  it('keeps the best word count per clock, and does not mix clocks', () => {
    const first = finished(60, 3);
    let update = applyRecords(EMPTY_RECORDS, first, resultOf(first, lexicon()));
    expect(bestFor(update.book, 60)).toBe(3);
    expect(bestFor(update.book, 30)).toBeUndefined();

    const better = finished(60, 6);
    update = applyRecords(update.book, better, resultOf(better, lexicon()));
    expect(bestFor(update.book, 60)).toBe(6);

    const worse = finished(60, 2);
    update = applyRecords(update.book, worse, resultOf(worse, lexicon()));
    expect(bestFor(update.book, 60)).toBe(6);
  });

  it('will not award an accuracy record on a handful of attempts', () => {
    const state = finished(60, 2);
    const update = applyRecords(EMPTY_RECORDS, state, resultOf(state, lexicon()));
    expect(update.book.bestAccuracy).toBeUndefined();
  });

  it('names the records it beat', () => {
    const state = finished(60, 4);
    const update = applyRecords(EMPTY_RECORDS, state, resultOf(state, lexicon()));
    expect(update.beaten.join(' ')).toContain('Most words in 60s');
  });
});

describe('statistics', () => {
  const logFor = (types: DrillConfig['types'], take: number) => {
    let state = startDrill(config({ types }), deps());
    for (const word of state.key.words.slice(0, take)) state = submitWord(state, word, deps());
    state = tickDrill(state, 60000);
    return toRollLog(state, resultOf(state, lexicon()));
  };

  it('totals across rolls', () => {
    const logs = [logFor(['noun'], 3), logFor(['noun'], 5)];
    const t = totals(logs);
    expect(t.rolls).toBe(2);
    expect(t.valid).toBe(8);
    expect(t.accuracy).toBe(1);
    expect(t.wordsPerMinute).toBeCloseTo(4);
  });

  it('ranks the slowest part of speech first and names it', () => {
    const logs: RollLog[] = [
      { ...logFor(['noun'], 20), seconds: 60, foundByType: { noun: 20 }, availableByType: { noun: 900 } },
      { ...logFor(['verb'], 1), seconds: 60, foundByType: { verb: 1 }, availableByType: { verb: 900 } },
    ];
    const stats = byType([...logs, ...logs, ...logs]);
    expect(stats[0].type).toBe('verb');
    expect(stats[0].perMinute).toBeCloseTo(1);
    expect(weakestType(stats)?.type).toBe('verb');
  });

  it('says nothing is slow until two parts of speech have enough rolls', () => {
    const noun = { ...logFor(['noun'], 5), seconds: 60, foundByType: { noun: 5 }, availableByType: { noun: 900 } };
    expect(weakestType(byType([noun, noun, noun]))).toBeUndefined();
  });

  it('says nothing is slow when two parts of speech are close', () => {
    const a = { ...logFor(['noun'], 10), seconds: 60, foundByType: { noun: 10 }, availableByType: { noun: 900 } };
    const b = { ...logFor(['verb'], 9), seconds: 60, foundByType: { verb: 9 }, availableByType: { verb: 900 } };
    expect(weakestType(byType([a, a, a, b, b, b]))).toBeUndefined();
  });
});

describe('persistence', () => {
  it('round-trips and survives corrupt data', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    const store = createLocalStore(storage);
    const data = store.load();
    expect(data.settings.types).toEqual(['noun']);
    store.save({ ...data, settings: { ...data.settings, seconds: 90, types: ['noun', 'verb'] } });

    const reloaded = createLocalStore(storage).load();
    expect(reloaded.settings.seconds).toBe(90);
    expect(reloaded.settings.types).toEqual(['noun', 'verb']);

    memory.set('ling-trainer:v2', 'not json');
    expect(createLocalStore(storage).load().rolls).toEqual([]);
  });
});
