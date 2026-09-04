import { useApp } from '../app-state';

/**
 * The Senior reference, rendered straight from the rule configuration, so it can
 * never drift from what the engine enforces.
 */
export function Rules() {
  const { ruleset } = useApp();
  const graded = (scope: string) =>
    scope === 'word' ? (
      <span className="chip chip-on tiny">graded</span>
    ) : (
      <span className="chip tiny">{scope === 'board' ? 'changes the board' : 'sentence-level'}</span>
    );

  return (
    <div className="page">
      <div className="eyebrow">rule configuration</div>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>{ruleset.label}</h1>
      <p className="dim small" style={{ marginTop: 4 }}>
        Season {ruleset.season} · {ruleset.revised}
      </p>

      <div className="card" style={{ margin: '16px 0' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          sources
        </div>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          {ruleset.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>{' '}
              <span className="faint">— {source.revised}</span>
            </li>
          ))}
        </ul>
        <p className="small dim" style={{ marginBottom: 0 }}>
          Official dictionary: {ruleset.references.dictionary} — {ruleset.references.dictionaryOnline}. Primary grammar:{' '}
          {ruleset.references.grammar[0]}.
        </p>
      </div>

      <Section title="Sentence designation — Player One (LT 6)">
        <div className="split">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              patterns
            </div>
            {ruleset.sentence.patterns.map((p) => (
              <div key={p.id} className="row small" style={{ gap: 8 }}>
                <span className="mono">{p.label}</span>
                {p.seniorOnly && <span className="chip chip-on tiny">senior only</span>}
                {p.requiresPassive && <span className="chip tiny">passive voice</span>}
              </div>
            ))}
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              structures
            </div>
            <p className="small mono">{ruleset.sentence.structures.map((s) => s.label).join(' · ')}</p>
            <div className="eyebrow" style={{ margin: '12px 0 6px' }}>
              purposes
            </div>
            <p className="small mono">{ruleset.sentence.purposes.map((s) => s.label).join(' · ')}</p>
          </div>
        </div>
      </Section>

      <Section title="Type and Function Demands (LT 9, LT 10)">
        {ruleset.typeDemands.map((type) => (
          <div key={type} style={{ marginBottom: 10 }}>
            <div className="mono" style={{ textTransform: 'uppercase', fontSize: 13, color: 'var(--accent)' }}>
              {type}
            </div>
            <div className="small dim">
              {ruleset.functionDemands[type].length
                ? ruleset.functionDemands[type].map((f) => `${f.label}${f.seniorOnly ? ' ★' : ''}`).join(', ')
                : 'no function demands — Player Three plays a cube to Letters or makes a Demand'}
            </div>
          </div>
        ))}
        <p className="tiny faint">★ Senior Division only.</p>
      </Section>

      <Section title="General Demands (LT 16 A–R)">
        <table className="data">
          <thead>
            <tr>
              <th>demand</th>
              <th>applies to</th>
              <th>rule</th>
              <th>trainer</th>
            </tr>
          </thead>
          <tbody>
            {ruleset.generalDemands.map((def) => (
              <tr key={def.id}>
                <td>
                  {def.label}
                  {def.seniorOnly && <span className="chip chip-on tiny" style={{ marginLeft: 6 }}>senior</span>}
                  {def.hint && <div className="tiny faint">{def.hint}</div>}
                </td>
                <td className="tiny dim">{def.requiresType ?? '—'}</td>
                <td className="tiny mono dim">{def.cite}</td>
                <td>{graded(def.scope)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          Limits: at most {ruleset.limits.clauseAndPhraseTotal} clause-or-phrase demands per shake (LT 16 M &amp; N), and
          the &ldquo;must NOT be contained in&rdquo; demand {ruleset.limits.mustNotBeContainedIn} time (LT 16 Q).
        </p>
      </Section>

      <Section title="Scoring chart">
        <p className="small dim" style={{ marginTop: 0 }}>
          {ruleset.scoring.note}
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>situation</th>
              <th>6 points</th>
              <th>4 points</th>
              <th>2 points</th>
            </tr>
          </thead>
          <tbody>
            {ruleset.scoring.situations.map((situation) => (
              <tr key={situation.id}>
                <td>
                  <b>{situation.id}.</b> {situation.label}
                  {situation.note && <div className="tiny faint">{situation.note}</div>}
                </td>
                <td className="tiny">{situation.six.join(', ') || '—'}</td>
                <td className="tiny">{situation.four.join(', ') || '—'}</td>
                <td className="tiny">{situation.two.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Time limits and penalties (LT 13)">
        <div className="split">
          <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Roll, order and designate — {ruleset.timing.designation}s</li>
            <li>Move a cube to Letters — {ruleset.timing.move}s</li>
            <li>Make a Demand — {ruleset.timing.demand}s</li>
            <li>Write a solution — {ruleset.timing.writeSolution / 60} min</li>
            <li>Check an opponent&apos;s solution — {ruleset.timing.checkSolution / 60} min</li>
            <li>
              Round — {ruleset.timing.roundMinutes} min, then a {ruleset.timing.warningMinutes}-minute warning
            </li>
            <li>Every limit carries a spoken {ruleset.timing.countdown}-second countdown</li>
          </ul>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            {ruleset.penalties.map((penalty) => (
              <li key={penalty.id}>
                <b className="mono">{penalty.points}</b> {penalty.label} <span className="faint tiny">{penalty.cite}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="The word (LT 2, LT 22)">
        <p className="small">
          <b>
            {ruleset.word.minLetters}–{ruleset.word.maxLetters} letters.
          </b>
        </p>
        <ul className="small dim" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
          {ruleset.word.legality.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>

      <Section title="The sentence (LT 23)">
        <ul className="small dim" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
          {ruleset.sentence.legality.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}
