import * as THREE from 'three';
import { canvasFor, disposeTree, type PlanetHandle } from '@/components/space/Planet';

export interface SkyObjectProps {
  theme: 'light' | 'dark';
  radius: number;
  position: [number, number, number];
}

// Radial glow sprite: a soft falloff from `inner` to transparent. Used for the sun corona and moon halo.
function glowSprite(color: string, scale: number, strength: number) {
  const S = 256;
  const { c, ctx } = canvasFor(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color.replace(/[\d.]+\)$/, `${strength * 0.45})`));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

// Moon surface: grey noise base plus randomly placed craters (dark floor, lit rim).
function craterTexture() {
  const W = 512;
  const H = 256;
  const { c, ctx } = canvasFor(W, H);
  ctx.fillStyle = '#8d8d94';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 2 + Math.pow(Math.random(), 3) * 26;
    ctx.fillStyle = `rgba(60,60,68,${0.25 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,230,236,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.15);
    ctx.beginPath();
    ctx.arc(x + r * 0.15, y + r * 0.15, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sun (light theme: emissive disc + corona) or Moon (dark theme: cratered sphere + halo). Mount object into the scene; call update(dt) per frame and dispose() on unmount. */
export function createSkyObject({ theme, radius, position }: SkyObjectProps): PlanetHandle {
  const object = new THREE.Group();
  object.position.set(...position);
  let body: THREE.Mesh;

  if (theme === 'light') {
    body = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff1b8 }),
    );
    object.add(body, glowSprite('rgba(255,214,120,1)', radius * 6, 0.9));
  } else {
    body = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 32),
      new THREE.MeshStandardMaterial({ map: craterTexture(), roughness: 0.95, metalness: 0 }),
    );
    object.add(body, glowSprite('rgba(200,210,255,1)', radius * 4, 0.5));
  }

  return {
    object,
    update(dt) {
      body.rotation.y += dt * 0.02;
    },
    dispose() {
      object.removeFromParent();
      disposeTree(object);
    },
  };
}
