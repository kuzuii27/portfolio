import { describe, expect, it } from 'vitest';
import { newPlayer, step, FUEL, type Input, type Player } from '@/lib/platformer';

const idle: Input = { dir: 0, jump: false, jumpPressed: false, down: false };
const ground = [{ l: 0, r: 1000, t: 500 }];
const run = (p: Player, inp: Input, plats = ground, secs = 1, dt = 1 / 60) => { for (let i = 0; i < secs / dt; i++) p = step(p, i === 0 ? inp : { ...inp, jumpPressed: false }, plats, dt); return p; };

describe('platformer', () => {
  it('falls and lands on a platform top', () => {
    const p = run(newPlayer(300, 100), idle, ground, 2);
    expect(p.y).toBe(500);
    expect(p.onGround).toBe(true);
    expect(p.vy).toBe(0);
  });

  it('does not tunnel through a thin platform at a huge dt', () => {
    let p = newPlayer(300, 440);
    p.vy = 1200;
    p = step(p, idle, ground, 0.1);
    expect(p.y).toBeLessThanOrEqual(500);
    expect(p.onGround).toBe(true);
  });

  it('jumps up, allows exactly one more jump in the air, then no more', () => {
    let p = run(newPlayer(300, 500), idle, ground, 0.1);
    p = step(p, { ...idle, jump: true, jumpPressed: true }, ground, 1 / 60);
    expect(p.vy).toBeLessThan(0);
    expect(p.jumps).toBe(1);
    p = run(p, idle, ground, 0.2);
    p = step(p, { ...idle, jump: true, jumpPressed: true }, ground, 1 / 60);
    expect(p.jumps).toBe(2);
    expect(p.flip).toBeGreaterThan(0);
    const before = p.vy;
    p = run(p, idle, ground, 0.1);
    p = step(p, { ...idle, jumpPressed: true }, ground, 1 / 60);
    expect(p.jumps).toBe(2);
    expect(p.vy).toBeGreaterThan(before); // no third jump: gravity only
  });

  it('jumps up through a platform from below and lands on it', () => {
    const plats = [...ground, { l: 200, r: 400, t: 400 }];
    let p = newPlayer(300, 500);
    p = step(p, { ...idle, jump: true, jumpPressed: true }, plats, 1 / 60);
    let hitHead = false;
    for (let i = 0; i < 120 && !p.onGround || i < 5; i++) { p = step(p, idle, plats, 1 / 60); if (p.y < 400) hitHead = true; }
    expect(hitHead).toBe(true);
    p = run(p, idle, plats, 2);
    expect(p.y).toBe(400); // came back down onto the ledge
  });

  it('holds to fly after the double jump until the fuel is gone, then falls', () => {
    let p = newPlayer(300, 500);
    p = step(p, { ...idle, jump: true, jumpPressed: true }, ground, 1 / 60);
    p = run(p, { ...idle, jump: true }, ground, 0.1);
    p = step(p, { ...idle, jump: true, jumpPressed: true }, ground, 1 / 60);
    const fuel0 = p.fuel;
    p = run(p, { ...idle, jump: true }, ground, 0.4);
    expect(p.fuel).toBeLessThan(fuel0);
    expect(p.vy).toBeLessThan(0);
    p = run(p, { ...idle, jump: true }, ground, FUEL + 0.5);
    expect(p.fuel).toBe(0);
    expect(p.vy).toBeGreaterThan(0); // out of fuel: falling
  });

  it('refuels on the ground', () => {
    let p = newPlayer(300, 500);
    p.fuel = 0;
    p = run(p, idle, ground, 0.2);
    expect(p.fuel).toBe(FUEL);
  });

  it('drops through a platform when down is held, and not otherwise', () => {
    const plats = [...ground, { l: 200, r: 400, t: 300 }];
    let p = run(newPlayer(300, 300), idle, plats, 0.3);
    expect(p.y).toBe(300);
    p = step(p, { ...idle, down: true }, plats, 1 / 60);
    p = run(p, idle, plats, 1);
    expect(p.y).toBe(500);
  });

  it('allows a jump shortly after walking off a ledge (coyote time)', () => {
    const plats = [{ l: 0, r: 300, t: 500 }];
    let p = run(newPlayer(290, 500), { ...idle, dir: 1 }, plats, 0.12);
    expect(p.onGround).toBe(false);
    p = step(p, { ...idle, jump: true, jumpPressed: true }, plats, 1 / 60);
    expect(p.vy).toBeLessThan(0);
    expect(p.jumps).toBe(1);
  });

  it('runs toward the input, faces it, and slows to a stop', () => {
    let p = run(newPlayer(300, 500), { ...idle, dir: -1 }, ground, 0.5);
    expect(p.x).toBeLessThan(300);
    expect(p.facing).toBe(-1);
    p = run(p, idle, ground, 1);
    expect(Math.abs(p.vx)).toBeLessThan(1);
  });
});
