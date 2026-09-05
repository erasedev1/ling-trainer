import type { PartOfSpeech } from '../types';
import type { LexEntry, LexiconPayload } from './types';

const A_CODE = 97;

/**
 * Indexed view over the trainer lexicon.
 *
 * The letter-count vector for every entry is precomputed once so the shake
 * solver can test tens of thousands of words against a letter pool per frame.
 */
export class Lexicon {
  readonly version: string;
  readonly note: string;
  readonly minLength: number;
  readonly maxLength: number;

  private readonly byWord = new Map<string, LexEntry>();
  private readonly untagged: Set<string>;
  /** Parallel arrays, one slot per tagged entry. */
  private readonly entries: LexEntry[];
  private readonly counts: Uint8Array; // entries.length * 26
  private readonly lengths: Uint8Array;

  constructor(payload: LexiconPayload) {
    this.version = payload.version;
    this.note = payload.note;
    this.minLength = payload.minLength;
    this.maxLength = payload.maxLength;
    this.entries = payload.words;
    this.untagged = new Set(payload.untagged);

    this.counts = new Uint8Array(this.entries.length * 26);
    this.lengths = new Uint8Array(this.entries.length);
    for (let i = 0; i < this.entries.length; i++) {
      const w = this.entries[i].w;
      this.byWord.set(w, this.entries[i]);
      this.lengths[i] = w.length;
      const base = i * 26;
      for (let j = 0; j < w.length; j++) {
        this.counts[base + (w.charCodeAt(j) - A_CODE)]++;
      }
    }
  }

  get size(): number {
    return this.entries.length;
  }

  /** Tagged entry, or undefined. */
  lookup(word: string): LexEntry | undefined {
    return this.byWord.get(word);
  }

  /** True when the spelling exists but carries no grammatical tags. */
  isUntaggedSpelling(word: string): boolean {
    return this.untagged.has(word);
  }

  /** Any real English spelling (tagged or not). */
  isSpelling(word: string): boolean {
    return this.byWord.has(word) || this.untagged.has(word);
  }

  entryAt(index: number): LexEntry {
    return this.entries[index];
  }

  lengthAt(index: number): number {
    return this.lengths[index];
  }

  /** Letter count of `letterIndex` (0 = a) in the entry at `index`. */
  countAt(index: number, letterIndex: number): number {
    return this.counts[index * 26 + letterIndex];
  }

  countsView(): Uint8Array {
    return this.counts;
  }

  /** Every tagged word usable as the given part of speech. */
  wordsForPos(pos: PartOfSpeech): LexEntry[] {
    return this.entries.filter((e) => e.pos.includes(pos));
  }

  private posIndex = new Map<PartOfSpeech, Int32Array>();

  /**
   * Entry indices usable as `pos`, cached. The solver scans this instead of the
   * whole lexicon, which keeps a full re-solve well under a frame.
   */
  indicesForPos(pos: PartOfSpeech): Int32Array {
    const cached = this.posIndex.get(pos);
    if (cached) return cached;
    const out: number[] = [];
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].pos.includes(pos)) out.push(i);
    }
    const arr = Int32Array.from(out);
    this.posIndex.set(pos, arr);
    return arr;
  }

  /** Every part of speech the lexicon has tagged entries for. */
  allPartsOfSpeech(): PartOfSpeech[] {
    const all: PartOfSpeech[] = [
      'noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection',
    ];
    return all.filter((pos) => this.indicesForPos(pos).length > 0);
  }

  private commonIndex = new Map<number, Int32Array>();

  /** Entry indices whose frequency tier is at most `maxTier`, cached. */
  commonIndices(maxTier: number): Int32Array {
    const cached = this.commonIndex.get(maxTier);
    if (cached) return cached;
    const out: number[] = [];
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].f <= maxTier) out.push(i);
    }
    const arr = Int32Array.from(out);
    this.commonIndex.set(maxTier, arr);
    return arr;
  }

  static async load(url: string, fetchImpl: typeof fetch = fetch): Promise<Lexicon> {
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`lexicon ${url}: ${res.status}`);
    return new Lexicon((await res.json()) as LexiconPayload);
  }
}

/** 26-slot letter count for an arbitrary string of a–z. */
export function letterCounts(word: string): Int16Array {
  const out = new Int16Array(26);
  for (let i = 0; i < word.length; i++) {
    const c = word.charCodeAt(i) - A_CODE;
    if (c >= 0 && c < 26) out[c]++;
  }
  return out;
}

export function letterIndex(letter: string): number {
  return letter.toLowerCase().charCodeAt(0) - A_CODE;
}
