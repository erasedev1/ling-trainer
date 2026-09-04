/**
 * CUBE CONFIGURATION.
 *
 * The official AGLOA materials describe the *colours* of the LinguiSHTIK cubes
 * — four each of red, black, green, pink and yellow plus three orange, 23 in
 * tournament play (Tournament Rules LT 3; "Playing LinguiSHTIK", rev. 2023) —
 * and two facts about their content: two red cubes must contain the letter U,
 * and some red cubes carry a C instead. **No official document publishes the
 * six faces of any cube.**
 *
 * So the default set below is an approximation, and it is labelled as such
 * everywhere it is used. If you can read the faces off a physical set, replace
 * `APPROXIMATE_2026.cubes` (or add a set through Settings, which writes a
 * `custom` set to local storage) and every generated shake becomes exact.
 * Nothing else in the codebase hard-codes a letter.
 */

import type { CubeSet } from '../src/engine/types';

const faces = (s: string) => s.split(' ');

export const APPROXIMATE_2026: CubeSet = {
  id: 'approximate-2026',
  label: 'Approximate 23-cube set',
  provenance: 'approximate',
  note:
    'AGLOA publishes the cube colours but not the letter faces. This set matches the ' +
    'published colour counts (4 red / black / green / pink / yellow, 3 orange), puts U on ' +
    'exactly two red cubes as the rules require, and spreads the alphabet so shakes play ' +
    'realistically. Replace it in Settings with the faces from your own set.',
  demandColors: ['black', 'green'],
  cubes: [
    { id: 'red-1', color: 'red', faces: faces('A E I O U S') },
    { id: 'red-2', color: 'red', faces: faces('E A O U T N') },
    { id: 'red-3', color: 'red', faces: faces('A E I R S T') },
    { id: 'red-4', color: 'red', faces: faces('E O I L N D') },

    { id: 'black-1', color: 'black', faces: faces('T N R S L C') },
    { id: 'black-2', color: 'black', faces: faces('E A I O M P') },
    { id: 'black-3', color: 'black', faces: faces('T D G H B J') },
    { id: 'black-4', color: 'black', faces: faces('E A S R N Y') },

    { id: 'green-1', color: 'green', faces: faces('E A I O T S') },
    { id: 'green-2', color: 'green', faces: faces('R N L D C M') },
    { id: 'green-3', color: 'green', faces: faces('E A U I P H') },
    { id: 'green-4', color: 'green', faces: faces('T S R N G W') },

    { id: 'pink-1', color: 'pink', faces: faces('E A I O R T') },
    { id: 'pink-2', color: 'pink', faces: faces('S N L D M B') },
    { id: 'pink-3', color: 'pink', faces: faces('E A O U C Q') },
    { id: 'pink-4', color: 'pink', faces: faces('T R S I H F') },

    { id: 'yellow-1', color: 'yellow', faces: faces('E A I O N S') },
    { id: 'yellow-2', color: 'yellow', faces: faces('T R L D P G') },
    { id: 'yellow-3', color: 'yellow', faces: faces('E A U V Z W') },
    { id: 'yellow-4', color: 'yellow', faces: faces('S T N R M Y') },

    { id: 'orange-1', color: 'orange', faces: faces('E A I O U Y') },
    { id: 'orange-2', color: 'orange', faces: faces('T S R N D L') },
    { id: 'orange-3', color: 'orange', faces: faces('E A C H K X') },
  ],
};

export const CUBE_SETS: CubeSet[] = [APPROXIMATE_2026];

export const CUBE_COLOR_COUNTS: Record<string, number> = {
  red: 4,
  black: 4,
  green: 4,
  pink: 4,
  yellow: 4,
  orange: 3,
};
