// Weapon table and small pure helpers for the destroy game. Key order = number keys 1..7.

export type Gun = 'pistol' | 'smg' | 'shotgun' | 'rocket' | 'laser' | 'flame' | 'bomb';

/** cooldown in seconds; auto = keeps firing while the button is held; spread in radians across all pellets; range in px for short-range weapons. `laser` is shown as "Railgun", `bomb` is the parachute bomb "Too Much". */
export const WEAPONS: Record<Gun, { label: string; auto: boolean; cooldown: number; pellets: number; spread: number; range?: number }> = {
  pistol: { label: 'Pistol', auto: false, cooldown: 0.25, pellets: 1, spread: 0 },
  smg: { label: 'SMG', auto: true, cooldown: 0.09, pellets: 1, spread: 0.07 },
  shotgun: { label: 'Shotgun', auto: false, cooldown: 0.8, pellets: 7, spread: 0.3 },
  rocket: { label: 'Rocket', auto: false, cooldown: 1.1, pellets: 1, spread: 0 },
  laser: { label: 'Railgun', auto: false, cooldown: 1.4, pellets: 1, spread: 0 },
  flame: { label: 'Flame', auto: true, cooldown: 0.05, pellets: 1, spread: 0.14, range: 240 },
  bomb: { label: 'Too Much', auto: false, cooldown: 2.5, pellets: 1, spread: 0 },
};
export const BOMBLETS = 8; // the parachute bomb splits into this many
export const GUNS = Object.keys(WEAPONS) as Gun[];
export const GRENADE_COOLDOWN = 1.2;

export const gunFromKey = (k: string): Gun | null => (/^[1-9]$/.test(k) ? (GUNS[Number(k) - 1] ?? null) : null);

export const nextWeapon = (cur: Gun, dir: 1 | -1): Gun => GUNS[(GUNS.indexOf(cur) + dir + GUNS.length) % GUNS.length];

/** n angles evenly spread over `spread` radians around 0, each nudged by up to half a slot. One pellet flies straight. */
export function spreadAngles(n: number, spread: number, rnd: () => number = Math.random): number[] {
  if (n <= 1) return [0];
  return Array.from({ length: n }, (_, i) => -spread / 2 + (spread * i) / (n - 1) + (rnd() - 0.5) * (spread / n));
}

/** Point at t (0..1) on a lob from (x0,y0) to (x1,y1) that rises `h` px above the straight line at the middle. */
export const arcPoint = (x0: number, y0: number, x1: number, y1: number, t: number, h: number) => ({
  x: x0 + (x1 - x0) * t,
  y: y0 + (y1 - y0) * t - 4 * h * t * (1 - t),
});

/** n landing spots scattered around (x,y): evenly spaced directions, each nudged, at 40-100% of `radius`. */
export function bombletTargets(x: number, y: number, n: number, radius: number, rnd: () => number = Math.random) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
    const d = radius * (0.4 + 0.6 * rnd());
    return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
  });
}
