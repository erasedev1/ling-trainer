import type { PartOfSpeech } from '../types';
import type { DrillResult, DrillState } from '../roll/session';

/**
 * Personal bests.
 *
 * Word counts are only comparable at the same clock, so the record for "most
 * words" is kept per duration. Rate and accuracy are comparable across drills
 * and are kept once, with a floor so a lucky two-word drill cannot take the
 * accuracy record.
 */
export interface Record {
  value: number;
  at: number;
  seed: number;
  seconds: number;
  types: PartOfSpeech[];
}

export interface RecordBook {
  /** Most valid words, keyed by the clock in seconds. */
  mostWords: Record_<string>;
  bestWordsPerMinute?: Record;
  bestAccuracy?: Record;
}

type Record_<K extends string> = Partial<{ [key in K]: Record }>;

export const EMPTY_RECORDS: RecordBook = { mostWords: {} };

export interface RecordUpdate {
  book: RecordBook;
  /** Human-readable descriptions of records beaten by this drill. */
  beaten: string[];
}

const MIN_ATTEMPTS_FOR_ACCURACY = 8;

export function applyRecords(book: RecordBook, state: DrillState, result: DrillResult): RecordUpdate {
  const stamp: Omit<Record, 'value'> = {
    at: Date.now(),
    seed: state.config.seed,
    seconds: state.config.seconds,
    types: state.config.types,
  };
  const next: RecordBook = { ...book, mostWords: { ...book.mostWords } };
  const beaten: string[] = [];

  const key = String(state.config.seconds);
  const currentWords = book.mostWords[key];
  if (result.valid > 0 && (!currentWords || result.valid > currentWords.value)) {
    next.mostWords[key] = { ...stamp, value: result.valid };
    beaten.push(`Most words in ${state.config.seconds}s: ${result.valid}`);
  }

  if (result.valid > 0 && (!book.bestWordsPerMinute || result.wordsPerMinute > book.bestWordsPerMinute.value)) {
    next.bestWordsPerMinute = { ...stamp, value: result.wordsPerMinute };
    beaten.push(`Best words per minute: ${result.wordsPerMinute.toFixed(1)}`);
  }

  const attempts = result.valid + result.invalid;
  if (attempts >= MIN_ATTEMPTS_FOR_ACCURACY && (!book.bestAccuracy || result.accuracy > book.bestAccuracy.value)) {
    next.bestAccuracy = { ...stamp, value: result.accuracy };
    beaten.push(`Best accuracy: ${(result.accuracy * 100).toFixed(0)}%`);
  }

  return { book: next, beaten };
}

/** The best word count recorded at this clock, if any. */
export function bestFor(book: RecordBook, seconds: number): number | undefined {
  return book.mostWords[String(seconds)]?.value;
}
