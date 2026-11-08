// Shared scene config: planet order, scroll length, shooting-star rate, theme colours.
// Sections map 1:1 to planets, in page order.

export const PLANETS = [
  { id: 'top', name: 'Earth', kind: 'earth' },
  { id: 'work', name: 'Mars', kind: 'mars' },
  { id: 'skills', name: 'Saturn', kind: 'ringed' },
  { id: 'about', name: 'Ice', kind: 'ice' },
  { id: 'contact', name: 'Nebula', kind: 'nebula' },
] as const;

export const SHOOTING_STARS = {
  minIntervalMs: 6000,
  maxIntervalMs: 18000,
  cometChance: 0.05,
} as const;

export const THEME_FADE_MS = 700; // crossfade band required by the brief: 600 to 800 ms

export const SCENE_COLORS = {
  dark: { planet: 0x4f46e5, ring: 0xa5b4fc, star: 0xffffff },
  light: { planet: 0xf59e0b, ring: 0xfde68a, star: 0xfef3c7 },
} as const;
