# LING Trainer — Senior Division 2026

A speed drill for Academic Games **LinguiSHTIK**, built on the current Senior Division rules
(Tournament Rules 2026-27, June 2026; Senior Order of Play, June 2026).

It does one thing:

```
ROLL THE CUBES  →  PICK PARTS OF SPEECH  →  TYPE WORDS  →  TIME UP
```

All 23 cubes are rolled, the way Player One starts a shake. You pick which parts of speech
count and how long you get. Then you type every word you can that is spelled from those
letters and usable as one of those parts of speech.

Live at **https://erasedev1.github.io/ling-trainer/**

## Quick start

```bash
npm install
npm run lexicon     # builds public/data/lexicon.json (needs python3 + network, once)
npm run dev         # http://localhost:5173
npm test            # engine tests
npm run build       # static site in dist/
```

Entirely static: no server, no accounts, no network at runtime. Everything you do stays in
your browser.

## What counts as a word

- **4–10 letters** (LT 2)
- spelled from the cubes rolled — one cube spells one letter, so two Ms need two M cubes
- usable as one of the parts of speech you picked (LT 22 G)
- no contractions, hyphens, apostrophes or proper nouns (LT 22 A)

A real word the trainer has no grammar data for is reported **unverified** — it counts
neither for nor against you, because the official dictionary would settle it and this one
cannot.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` builds and publishes `dist/` on every push to the default
branch. **One repository setting has to be changed by hand, once:**

> **Settings → Pages → Build and deployment → Source: _GitHub Actions_**

This cannot be automated — GitHub blocks the Pages settings API for a workflow's
`GITHUB_TOKEN` (`403 Resource not accessible by integration`). Until it is changed, Pages
serves the repository *source*, the browser is handed `index.html`'s `<script
src="/src/main.tsx">`, and the page renders **blank**. The workflow's `check` job reports
the current setting in the run summary.

## Two things worth knowing

**The cube faces are an approximation.** AGLOA publishes the cube *colours* — four each of
red, black, green, pink and yellow, plus three orange — and two facts about their content
(two red cubes must contain a U; some red cubes carry a C instead). No official document
lists the six faces of any cube. **Settings → cube set** lets you type in the faces from a
physical set, after which every roll is exact.

**The dictionary is an approximation too.** The official reference is Webster's Third
Unabridged, which is not redistributable. The trainer uses an open word list for spellings
and an open lexicon for part-of-speech tags. See [`docs/RESEARCH.md`](docs/RESEARCH.md).

## Documentation

- [`docs/RESEARCH.md`](docs/RESEARCH.md) — what the official Senior rules actually say, and
  what can and cannot be checked automatically
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the engine is kept separate from the UI

## When the rules change

`data/senior-2026.ts` holds what the drill needs: the parts of speech a Senior player can be
demanded (LT 9), and the word rules (LT 2, LT 22). Copy it, edit it, point the app at the new
file. No engine code hard-codes a rule.
