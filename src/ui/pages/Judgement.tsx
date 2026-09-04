import { useEffect, useMemo, useState } from 'react';
import { JUDGEMENT_BANK, RULE_BANK, type JudgementItem, type RuleItem } from '../../../data/judgement-bank';
import { createRng, randomSeed } from '../../engine/shake/rng';
import { useApp } from '../app-state';
import { topicLabel } from '../../engine/stats/stats';
import { navigate, type Route } from '../router';

type Bank = 'analysis' | 'validation' | 'rule';

interface Attempt {
  correct: boolean;
  chosen: number;
}

/**
 * Curated judgement drills.
 *
 * Everything here is transcribed from the official materials with its answer and
 * explanation, because these are exactly the sentence-level calls that cannot be
 * generated correctly (docs/RESEARCH.md §3.2). Wrong answers show the citation.
 */
export function Judgement({ route }: { route: Route }) {
  const app = useApp();
  const topic = route.params.get('topic') ?? '';
  const [bank, setBank] = useState<Bank>('analysis');
  const [seed, setSeed] = useState(randomSeed);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [answered, setAnswered] = useState<number | null>(null);

  const items = useMemo(() => {
    const rng = createRng(seed);
    const matches = (topics: string[]) => !topic || topics.includes(topic);
    if (bank === 'rule') return rng.shuffle(RULE_BANK.filter((item) => matches(item.topics)));
    return rng.shuffle(JUDGEMENT_BANK.filter((item) => item.kind === bank && matches(item.topics)));
  }, [bank, seed, topic]);

  useEffect(() => {
    setIndex(0);
    setAttempts([]);
    setAnswered(null);
  }, [bank, seed, topic]);

  const item = items[index];
  const options = bank === 'rule' ? (item as RuleItem).options : ['Yes', 'No'];
  const correctIndex = bank === 'rule' ? (item as RuleItem).correct : (item as JudgementItem).answer === 'yes' ? 0 : 1;

  const choose = (choice: number) => {
    if (answered !== null || !item) return;
    const correct = choice === correctIndex;
    setAnswered(choice);
    setAttempts((a) => [...a, { correct, chosen: choice }]);
    // Judgement topics are the only measurement the trainer has for the
    // sentence-level demands, so every answer feeds the weakness dashboard.
    app.recordJudgement({ at: Date.now(), itemId: item.id, kind: bank, topics: item.topics, correct });
  };

  const advance = () => {
    setAnswered(null);
    setIndex((i) => (i + 1) % items.length);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (answered !== null && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        advance();
        return;
      }
      const n = Number(event.key);
      if (answered === null && n >= 1 && n <= options.length) choose(n - 1);
      if (answered === null && bank !== 'rule') {
        if (event.key.toLowerCase() === 'y') choose(0);
        if (event.key.toLowerCase() === 'n') choose(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const right = attempts.filter((a) => a.correct).length;

  if (!item) {
    return (
      <div className="page page-narrow">
        <p className="dim">
          No {bank} items{topic ? ` for ${topicLabel(topic)}` : ''}.
        </p>
        {topic && (
          <button className="btn" onClick={() => navigate('/judgement')}>
            Show every topic
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <div className="row spread" style={{ marginBottom: 14 }}>
        <div className="seg">
          <button aria-pressed={bank === 'analysis'} onClick={() => setBank('analysis')}>
            Analysis
          </button>
          <button aria-pressed={bank === 'validation'} onClick={() => setBank('validation')}>
            Solution check
          </button>
          <button aria-pressed={bank === 'rule'} onClick={() => setBank('rule')}>
            Rules
          </button>
        </div>
        <div className="mono small dim">
          {right} / {attempts.length} · item {index + 1} of {items.length}
        </div>
      </div>

      {topic && (
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="chip chip-on">topic: {topicLabel(topic)}</span>
          <button className="btn btn-sm" onClick={() => navigate('/judgement')}>
            Clear filter
          </button>
        </div>
      )}
      <div className="card">
        {bank !== 'rule' && (item as JudgementItem).demands && (
          <div className="mono small" style={{ color: 'var(--accent)', marginBottom: 10 }}>
            {(item as JudgementItem).demands!.join('  ·  ')}
          </div>
        )}

        <div className="jitem">
          {bank === 'rule' ? (
            (item as RuleItem).question
          ) : (
            <>
              &ldquo;{(item as JudgementItem).sentence}&rdquo;
              <span className="q">{(item as JudgementItem).question}</span>
            </>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          {options.map((option, i) => (
            <button
              key={i}
              className={`choice${
                answered === null ? '' : i === correctIndex ? ' choice-right' : i === answered ? ' choice-wrong' : ''
              }`}
              onClick={() => choose(i)}
            >
              <kbd>{i + 1}</kbd>
              {option}
            </button>
          ))}
        </div>

        {answered !== null && (
          <>
            <div className="notice notice-info" style={{ marginTop: 12 }}>
              {answered === correctIndex ? 'Correct. ' : 'Not quite. '}
              {item.explanation}
              <div className="tiny faint" style={{ marginTop: 6 }}>
                {bank === 'rule' ? (item as RuleItem).source : (item as JudgementItem).source}
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={advance} autoFocus>
                Next <kbd>Enter</kbd>
              </button>
              <button className="btn btn-sm" onClick={() => setSeed(randomSeed())}>
                Reshuffle
              </button>
            </div>
          </>
        )}
      </div>

      <p className="tiny faint" style={{ marginTop: 14 }}>
        Every item is transcribed from the official AGLOA materials — the Handbook &amp; Judges Manual&apos;s Judge&apos;s
        Self-Test (§XVIII), the Tournament Rules and the Scoring Chart — with AGLOA&apos;s own answer and explanation.
      </p>
    </div>
  );
}
