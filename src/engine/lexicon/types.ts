import type { PartOfSpeech } from '../types';

export type VerbForm = 'base' | 'past' | 'pastPart' | 'presPart' | 'thirdSg' | 'modal';
export type Degree = 'positive' | 'comparative' | 'superlative';
export type PronounClass = 'personal' | 'indefinite' | 'interrogative' | 'demonstrative' | 'relative';
export type GrammaticalCase = 'nominative' | 'objective' | 'possessive';

export interface NounInfo {
  /** 'sg', 'pl', or both when the word is the same singular and plural. */
  num: ('sg' | 'pl')[];
  collective?: boolean;
}

export interface VerbInfo {
  forms: VerbForm[];
  /** True when at least one lemma yielding this form is a regular verb. */
  reg?: boolean;
  irr?: boolean;
  linking?: boolean;
  aux?: boolean;
  num?: ('sg' | 'pl')[];
}

export interface ModifierInfo {
  deg: Degree[];
  reg?: boolean;
  irr?: boolean;
  /** Has comparative/superlative forms at all. */
  grad?: boolean;
}

export interface PronounInfo {
  cls: PronounClass[];
  case: GrammaticalCase[];
  num: 'sg' | 'pl' | 'both';
}

export interface LexEntry {
  w: string;
  pos: PartOfSpeech[];
  /** Frequency tier: 0 = everyday … 5 = obscure. */
  f: number;
  n?: NounInfo;
  v?: VerbInfo;
  a?: ModifierInfo;
  d?: ModifierInfo;
  p?: PronounInfo;
  /** 1 when the word passes the conservative compound-word test. */
  c?: 1;
}

export interface LexiconPayload {
  version: string;
  note: string;
  sources: Record<string, string>;
  minLength: number;
  maxLength: number;
  words: LexEntry[];
  /** Real spellings we have no tags for; accepted as words, never scored. */
  untagged: string[];
}
