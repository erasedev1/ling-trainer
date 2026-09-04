import { useEffect, useRef, useState } from 'react';
import type { SubmissionResult } from '../../engine/types';

/**
 * The input is the product.
 *
 * One box, Enter to submit, focus never leaves it, no button to reach for, no
 * animation between words. Submitted words appear as tokens below so the player
 * can see at a glance what has already been said without re-reading anything.
 */
export function AnswerInput({
  onSubmit,
  disabled,
  submissions,
  placeholder = 'type a word, press Enter',
}: {
  onSubmit(word: string): void;
  disabled?: boolean;
  submissions: SubmissionResult[];
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  // Keep focus in the box: any stray click on the drill returns the caret here.
  useEffect(() => {
    if (disabled) return;
    const refocus = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea')) return;
      ref.current?.focus();
    };
    document.addEventListener('click', refocus);
    return () => document.removeEventListener('click', refocus);
  }, [disabled]);

  return (
    <>
      <input
        ref={ref}
        className="answer-input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        inputMode="text"
        aria-label="Answer"
        onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z]/g, ''))}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const word = value.trim();
          if (!word) return;
          onSubmit(word);
          setValue('');
        }}
      />
      <div className="tokens" aria-live="polite" aria-label="submitted words">
        {submissions
          .slice()
          .reverse()
          .map((submission, i) => (
            <span
              key={`${submission.word}-${i}`}
              className={`token token-${tokenClass(submission)}`}
              title={submission.reason}
            >
              {submission.word}
            </span>
          ))}
      </div>
    </>
  );
}

function tokenClass(submission: SubmissionResult): string {
  switch (submission.verdict) {
    case 'valid':
      return 'valid';
    case 'duplicate':
      return 'duplicate';
    case 'unverified':
      return 'unverified';
    default:
      return 'invalid';
  }
}
