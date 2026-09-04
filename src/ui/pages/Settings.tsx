import { useState } from 'react';
import { useApp } from '../app-state';
import { CUBE_COLOR_COUNTS, CUBE_SETS } from '../../../data/cube-sets';
import type { Cube, CubeColor, CubeSet } from '../../engine/types';
import { Cube as CubeView } from '../components/Board';

/**
 * The cube editor exists because AGLOA does not publish the letter faces — see
 * docs/RESEARCH.md, open question 1. A club that reads the faces off a physical
 * set once makes every generated shake exact for everyone using this device.
 */
export function Settings() {
  const app = useApp();
  const { settings } = app.data;
  const [draft, setDraft] = useState<string>(() => serialise(app.cubeSet));
  const [error, setError] = useState<string>();

  const save = () => {
    try {
      const cubes = parse(draft);
      const custom: CubeSet = {
        id: 'custom',
        label: 'Custom cube set',
        provenance: 'custom',
        note: 'Entered by hand from a physical LinguiSHTIK set.',
        demandColors: ['black', 'green'],
        cubes,
      };
      app.updateSettings({ cubeSetId: 'custom', customCubeSet: custom });
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="page page-narrow">
      <h1 style={{ fontSize: 26, marginBottom: 14 }}>Settings</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          answer key
        </div>
        <label className="row spread">
          <span className="small">Missed words shown after a shake</span>
          <input
            type="number"
            min={5}
            max={200}
            value={settings.showAnswerKeyLimit}
            onChange={(e) => app.updateSettings({ showAnswerKeyLimit: Math.max(5, Number(e.target.value) || 40) })}
            className="btn btn-sm mono"
            style={{ width: 90, background: 'var(--bg-sunken)', textAlign: 'right' }}
          />
        </label>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          cube set
        </div>
        <div className="notice" style={{ marginBottom: 12 }}>
          The official AGLOA materials publish the cube <b>colours</b> — four each of red, black, green, pink and yellow
          plus three orange — and two facts about their content: two red cubes must contain a U, and some red cubes carry
          a C instead. They do <b>not</b> publish the six faces of any cube. The set shipped here is a documented
          approximation. Read the faces off your club&apos;s physical set and paste them below to make every generated
          shake exact.
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <span className="chip">{app.cubeSet.label}</span>
          <span className={`chip${app.cubeSet.provenance === 'custom' ? ' chip-on' : ''}`}>
            {app.cubeSet.provenance}
          </span>
          {settings.cubeSetId === 'custom' && (
            <button
              className="btn btn-sm"
              onClick={() => {
                app.updateSettings({ cubeSetId: CUBE_SETS[0].id });
                setDraft(serialise(CUBE_SETS[0]));
              }}
            >
              Back to the shipped set
            </button>
          )}
        </div>

        <div className="grid" style={{ gap: 8, marginBottom: 12 }}>
          {(Object.keys(CUBE_COLOR_COUNTS) as CubeColor[]).map((color) => (
            <div key={color} className="row" style={{ gap: 6 }}>
              <span className="eyebrow" style={{ width: 62 }}>
                {color}
              </span>
              {app.cubeSet.cubes
                .filter((c) => c.color === color)
                .map((cube) => (
                  <span key={cube.id} className="row" style={{ gap: 3 }}>
                    {cube.faces.map((face, i) => (
                      <CubeView key={i} letter={face} color={color} small />
                    ))}
                  </span>
                ))}
            </div>
          ))}
        </div>

        <label className="eyebrow">one cube per line: colour then six letters</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={12}
          className="mono"
          style={{
            width: '100%',
            marginTop: 6,
            padding: 12,
            borderRadius: 'var(--r)',
            background: 'var(--bg-sunken)',
            color: 'var(--ink)',
            border: '1px solid var(--line-strong)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        />
        {error && <div className="notice" style={{ borderLeftColor: 'var(--bad)', marginTop: 10 }}>{error}</div>}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btn-primary" onClick={save}>
            Save cube set
          </button>
          <button className="btn btn-sm" onClick={() => setDraft(serialise(app.cubeSet))}>
            Reset editor
          </button>
        </div>
      </div>

      <p className="tiny faint" style={{ marginTop: 16 }}>
        All training data lives in this browser only. Nothing is uploaded.
      </p>
    </div>
  );
}

function serialise(set: CubeSet): string {
  return set.cubes.map((cube) => `${cube.color} ${cube.faces.join(' ')}`).join('\n');
}

function parse(text: string): Cube[] {
  const colors = new Set(Object.keys(CUBE_COLOR_COUNTS));
  const counts: Record<string, number> = {};
  const cubes: Cube[] = [];

  for (const [n, line] of text.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const color = parts[0].toLowerCase();
    const faces = parts.slice(1).join('').toUpperCase().split('');
    if (!colors.has(color)) throw new Error(`Line ${n + 1}: "${parts[0]}" is not one of ${[...colors].join(', ')}.`);
    if (faces.length !== 6) throw new Error(`Line ${n + 1}: a cube needs exactly six letters, found ${faces.length}.`);
    if (faces.some((f) => !/^[A-Z]$/.test(f))) throw new Error(`Line ${n + 1}: faces must be letters A–Z.`);
    counts[color] = (counts[color] ?? 0) + 1;
    cubes.push({ id: `${color}-${counts[color]}`, color: color as CubeColor, faces });
  }

  for (const [color, expected] of Object.entries(CUBE_COLOR_COUNTS)) {
    if ((counts[color] ?? 0) !== expected) {
      throw new Error(`Tournament play uses ${expected} ${color} cubes; found ${counts[color] ?? 0}.`);
    }
  }
  return cubes;
}
