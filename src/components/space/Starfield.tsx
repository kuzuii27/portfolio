'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_COLORS } from '@/lib/sceneConfig';

// Depth layers: far stars barely move with scroll, near stars move most.
const DEPTH = [0.2, 0.5, 1];
const SIZE = [1, 1.6, 2.4];

const VERT = `
attribute float aDepth;
attribute float aSize;
attribute float aPhase;
attribute float aBright;
uniform float uScroll;
uniform float uTime;
uniform float uPixel;
uniform float uTwinkle;
varying float vA;
void main() {
  // Positions live in 0..1; wrap vertically so parallax never leaves a gap.
  float y = fract(position.y - uScroll * aDepth);
  gl_Position = vec4(position.x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = aSize * uPixel;
  float tw = 0.5 + 0.5 * sin(uTime * (1.0 + aPhase) * 2.0 + aPhase * 6.2831);
  vA = aBright * mix(1.0, tw, uTwinkle);
}`;

const FRAG = `
uniform vec3 uColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, vA * (1.0 - d * 2.0));
}`;

/** Fixed starfield behind the page. Reduced density in light theme and on mobile; static under prefers-reduced-motion. */
export function Starfield({ theme, count }: { theme: 'light' | 'dark'; count: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: false });
    } catch {
      return; // no WebGL: the page stays plain
    }

    const n = Math.round(count * (theme === 'light' ? 0.5 : 1) * (innerWidth < 768 ? 0.5 : 1));
    const pos = new Float32Array(n * 3);
    const aDepth = new Float32Array(n);
    const aSize = new Float32Array(n);
    const aPhase = new Float32Array(n);
    const aBright = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const layer = r < 0.5 ? 0 : r < 0.8 ? 1 : 2;
      pos[i * 3] = Math.random();
      pos[i * 3 + 1] = Math.random();
      aDepth[i] = DEPTH[layer];
      aSize[i] = SIZE[layer];
      aPhase[i] = Math.random();
      aBright[i] = 0.4 + 0.6 * Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(aDepth, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
    geo.setAttribute('aBright', new THREE.BufferAttribute(aBright, 1));

    const uniforms = {
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uPixel: { value: 1 },
      uTwinkle: { value: reduced ? 0 : 1 },
      uColor: { value: new THREE.Color(SCENE_COLORS[theme].star) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false; // positions are clip-space-like, so object bounds are wrong
    const scene = new THREE.Scene();
    scene.add(points);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const layout = () => {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight, false);
      uniforms.uPixel.value = Math.min(devicePixelRatio, 2);
    };

    let raf = 0;
    const t0 = performance.now();
    let target = 0;
    let lastT = t0;
    const draw = (now: number) => {
      if (document.hidden) { lastT = now; raf = requestAnimationFrame(draw); return; } // no GPU work in a hidden tab
      const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
      lastT = now;
      // ease toward the scroll target every frame: scroll events arrive at a different rate than frames, which reads as stutter
      uniforms.uScroll.value += (target - uniforms.uScroll.value) * (1 - Math.exp(-6 * dt));
      uniforms.uTime.value = (now - t0) / 1000;
      renderer.render(scene, cam);
      raf = requestAnimationFrame(draw);
    };

    const onScroll = () => {
      target = (scrollY / innerHeight) * 0.25;
    };
    const onResize = () => {
      layout();
      if (reduced) renderer.render(scene, cam);
    };

    layout();
    if (reduced) {
      renderer.render(scene, cam);
    } else {
      onScroll();
      uniforms.uScroll.value = target; // start in place, no initial slide
      addEventListener('scroll', onScroll, { passive: true });
      raf = requestAnimationFrame(draw);
    }
    addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      // no forceContextLoss: React reuses this canvas on re-run, and a force-lost canvas never gets a context back
      renderer.dispose();
    };
  }, [theme, count]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
