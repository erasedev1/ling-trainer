import type { CubeColor, Demand, ShakeState } from '../../engine/types';
import { poolLetters, resourceLetters } from '../../engine/shake/pool';
import type { Designation } from '../../engine/generator/scenario';

export function Cube({
  letter,
  color,
  wild,
  small,
}: {
  letter: string;
  color: CubeColor;
  wild?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={`cube cube-${color}${small ? ' cube-sm' : ''}${wild ? ' cube-wild' : ''}`}
      title={wild ? `${color} cube — wild, may be any letter` : `${color} cube`}
    >
      {letter}
    </span>
  );
}

export function DesignationLine({ designation }: { designation: Designation }) {
  return (
    <div className="designation">
      <span className="kind">{designation.kind}</span>
      {designation.label}
    </div>
  );
}

/**
 * The demand stack, split by what the trainer can actually grade.
 *
 * Sentence-scope demands are shown because reading a full stack quickly is part
 * of the skill, but they are visibly marked so nobody mistakes the drill for a
 * complete judgement of a solution (docs/RESEARCH.md §3.2).
 */
export function DemandStack({ demands, compact }: { demands: Demand[]; compact?: boolean }) {
  // Order matches the Order of Play: Type, Function, then everything demanded
  // afterwards — graded first, sentence-level below.
  const type = demands.filter((d) => d.category === 'type');
  const fn = demands.filter((d) => d.category === 'function');
  const graded = demands.filter((d) => d.scope === 'word' && d.category !== 'type');
  const shown = demands.filter((d) => d.scope !== 'word' && d.category !== 'function');

  return (
    <div className="demands">
      {type.map((demand, i) => (
        <div key={`t-${i}`} className="demand demand-graded">
          {demandText(demand)}
        </div>
      ))}
      {fn.map((demand, i) => (
        <div key={`f-${i}`} className="demand demand-ungraded">
          {demandText(demand)}
          <span className="tag" title="Function Demand (LT 10) — a property of the sentence, not the word">
            function
          </span>
        </div>
      ))}
      {graded.map((demand, i) => (
        <div key={`${demand.defId}-${i}`} className="demand demand-graded">
          {demandText(demand)}
        </div>
      ))}
      {!compact &&
        shown.map((demand, i) => (
          <div key={`${demand.defId}-${i}`} className="demand demand-ungraded">
            {demandText(demand)}
            <span className="tag" title="A property of the sentence you would write — shown, but not graded here">
              sentence
            </span>
          </div>
        ))}
    </div>
  );
}

export function demandText(demand: Demand): string {
  const p = demand.params ?? {};
  if (demand.category === 'type') return String(p.pos ?? demand.label).toUpperCase();
  if (demand.defId === 'gen.mustContain') return `must contain ${String(p.letter)}`;
  if (demand.defId === 'gen.mustNotContain') return `must not contain ${String(p.letter)}`;
  if (demand.defId === 'gen.numberOfLetters') return `exactly ${p.count} letters`;
  if (demand.defId === 'gen.letterTransfer') return `all ${p.from}'s are ${p.to}'s`;
  if (demand.defId === 'gen.colorWild') return `${p.color} is wild`;
  if (demand.defId === 'not.in') return `must NOT be in a ${p.choice}`;
  if (demand.defId === 'cpf.function') return `that ${p.of} functions as ${p.choice}`;
  if (p.choice) return `${demand.label} (${p.choice})`;
  return demand.label;
}

export function Board({ shake, showResources = true }: { shake: ShakeState; showResources?: boolean }) {
  const letters = poolLetters(shake);
  const resources = resourceLetters(shake);
  const allowance = Number.isFinite(shake.resourceAllowance) ? shake.resourceAllowance : resources.length;

  return (
    <div className="grid" style={{ gap: 10, justifyItems: 'center' }}>
      <div className="eyebrow">letters</div>
      <div className="cubes">
        {letters.map((cube, i) => (
          <Cube key={i} letter={cube.letter} color={cube.color} wild={cube.wild} />
        ))}
      </div>
      {showResources && (
        <>
          <div className="eyebrow" style={{ marginTop: 6 }}>
            resources — you may use {allowance === resources.length ? 'any' : allowance}{' '}
            {allowance === 1 ? 'cube' : 'cubes'}
          </div>
          <div className="cubes">
            {resources.map((cube, i) => (
              <Cube key={i} letter={cube.letter} color={cube.color} wild={cube.wild} small />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function solveContextNote(shake: ShakeState): string {
  switch (shake.solveContext) {
    case 'challenge-now':
      return 'Challenge Now — letters on the mat plus one cube from Resources (LT 19 A).';
    case 'forceout':
      return 'Forceout — letters on the mat plus two cubes from Resources (LT 24).';
    case 'impossible':
      return 'Answering Challenge Impossible — any letters from Letters and Resources (LT 20 B).';
    default:
      return 'Open practice — every rolled cube is available.';
  }
}
