// Pure platformer physics for the destroy game v3 (plan: docs/superpowers/plans/2026-11-20-destroy-game-v3-platformer.md).
// Viewport px, y grows downward. `y` is the player's feet. Platforms are one-way: pass up through, land on top, drop through with down.

export type Platform = { l: number; r: number; t: number };
export type Input = { dir: -1 | 0 | 1; jump: boolean; jumpPressed: boolean; down: boolean };
export type Player = {
  x: number; y: number; vx: number; vy: number;
  onGround: boolean; jumps: number; fuel: number; coyote: number; buffer: number; drop: number; flip: number; facing: 1 | -1;
};

export const FUEL = 1.2; // seconds of flight per air trip
const G = 2200;
const RUN = 380;
const JUMP = -720;
const FLY_UP = 3600;
const FLY_MAX = -430;
const FALL_MAX = 1300;
const COYOTE = 0.1;
const BUFFER = 0.12;
const DROP = 0.25;
const SUB = 1 / 120; // substep: a 1300 px/s fall moves ~11 px per step, so a platform top is never skipped

export const newPlayer = (x: number, y: number): Player => ({ x, y, vx: 0, vy: 0, onGround: false, jumps: 0, fuel: FUEL, coyote: 0, buffer: 0, drop: 0, flip: 0, facing: 1 });

function sub(p: Player, inp: Input, plats: Platform[], dt: number): Player {
  const n = { ...p };
  const air = !n.onGround;
  // horizontal: accelerate toward the wanted speed, faster on the ground
  const want = inp.dir * RUN;
  const rate = (air ? 1800 : 3200) * dt;
  n.vx += Math.max(-rate, Math.min(rate, want - n.vx));
  if (inp.dir) n.facing = inp.dir;

  n.coyote = Math.max(0, n.coyote - dt);
  n.buffer = Math.max(0, n.buffer - dt);
  n.drop = Math.max(0, n.drop - dt);
  n.flip = Math.max(0, n.flip - dt);
  if (inp.jumpPressed) n.buffer = BUFFER;

  if (inp.down && n.onGround) { n.drop = DROP; n.onGround = false; n.coyote = 0; }

  if (n.buffer > 0 && (n.onGround || n.coyote > 0)) {
    n.vy = JUMP; n.jumps = 1; n.onGround = false; n.coyote = 0; n.buffer = 0;
  } else if (inp.jumpPressed && !n.onGround && n.jumps === 1) {
    n.vy = JUMP * 0.9; n.jumps = 2; n.flip = 0.45; n.buffer = 0;
  } else if (inp.jump && !n.onGround && n.jumps >= 2 && n.fuel > 0) {
    n.vy = Math.max(FLY_MAX, n.vy - FLY_UP * dt); n.fuel = Math.max(0, n.fuel - dt);
  }
  if (!(inp.jump && n.jumps >= 2 && n.fuel > 0 && !n.onGround) || n.vy > 0) n.vy = Math.min(FALL_MAX, n.vy + G * dt);
  else n.vy = Math.min(FALL_MAX, n.vy + G * dt * 0.15); // thrusting: gravity barely bites

  const py = n.y;
  n.x += n.vx * dt;
  n.y += n.vy * dt;

  n.onGround = false;
  if (n.vy >= 0 && n.drop === 0) {
    for (const pl of plats) {
      if (n.x >= pl.l && n.x <= pl.r && py <= pl.t + 0.01 && n.y >= pl.t) {
        n.y = pl.t; n.vy = 0; n.onGround = true; n.jumps = 0; n.fuel = FUEL; n.coyote = COYOTE;
        break;
      }
    }
  }
  return n;
}

/** One frame of platformer physics, split into fixed substeps so low frame rates never tunnel through a platform. */
export function step(p: Player, inp: Input, plats: Platform[], dt: number): Player {
  const steps = Math.max(1, Math.ceil(dt / SUB));
  const h = dt / steps;
  let cur = p;
  for (let i = 0; i < steps; i++) cur = sub(cur, i === 0 ? inp : { ...inp, jumpPressed: false }, plats, h);
  return cur;
}
