'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Robot } from '@/components/Robot';
import type { Pose } from '@/lib/robotScript';

type Props = { pose?: Pose; talking?: boolean; walking?: boolean };

// Same robot as the SVG, built from shapes. 1 unit = 100 SVG px, feet at y = 0.
// Frame matches the SVG viewBox (320 x 300, feet at 286) so the pet keeps its foot position.
const VIEW = { l: -1.6, r: 1.6, t: 2.86, b: -0.14 };

/** 3D version of the robot. Reads walk direction and air/climb from the parent `.pet` element. Falls back to the SVG without WebGL. */
export function Robot3D({ pose = 'stand', talking = false, walking = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const props = useRef({ pose, talking, walking });
  const [failed, setFailed] = useState(false);
  props.current = { pose, talking, walking };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      queueMicrotask(() => setFailed(true)); // no WebGL: show the SVG robot
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(VIEW.l, VIEW.r, VIEW.t, VIEW.b, 0.1, 50);
    camera.position.set(0, 2.2, 10); // slightly above, so the 3D shows
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-3, 5, 6);
    scene.add(sun);

    const shell = new THREE.MeshStandardMaterial({ color: 0xf1f4f8, roughness: 0.35, metalness: 0.05 });
    const joint = new THREE.MeshStandardMaterial({ color: 0x9aa4af, roughness: 0.45, metalness: 0.3 });
    const visor = new THREE.MeshStandardMaterial({ color: 0x0b1118, roughness: 0.15, metalness: 0.4 });
    const glow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      return o;
    };
    const group = (x = 0, y = 0, z = 0, ...kids: THREE.Object3D[]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.add(...kids);
      return g;
    };

    const robot = new THREE.Group();
    const body = new THREE.Group();
    robot.add(body);
    scene.add(robot);

    // torso, chest panel, glowing core, belt
    body.add(mesh(new RoundedBoxGeometry(0.92, 0.96, 0.7, 4, 0.3), shell, 0, 1.04, 0));
    body.add(mesh(new RoundedBoxGeometry(0.52, 0.28, 0.1, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0xdfe5eb, roughness: 0.5 }), 0, 1.2, 0.33));
    body.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), glow, 0, 1.2, 0.39));
    body.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 24), joint, 0, 0.68, 0));

    // arms pivot at the shoulder, legs at the hip
    const limb = (x: number, y: number, len: number, r: number, end: THREE.Object3D) => {
      end.position.y = -len - 2 * r;
      return group(x, y, 0, mesh(new THREE.CapsuleGeometry(r, len, 6, 12), shell, 0, -len / 2 - r, 0), end);
    };
    const hand = () => mesh(new THREE.SphereGeometry(0.12, 16, 12), shell);
    const armL = limb(-0.52, 1.36, 0.36, 0.13, hand());
    const armR = limb(0.52, 1.36, 0.36, 0.13, hand());
    const foot = () => mesh(new RoundedBoxGeometry(0.34, 0.12, 0.42, 2, 0.05), joint, 0, 0, 0.05);
    const legL = limb(-0.18, 0.66, 0.3, 0.12, foot());
    const legR = limb(0.18, 0.66, 0.3, 0.12, foot());
    legL.children[1].position.y = legR.children[1].position.y = -0.6; // foot sole on the ground
    body.add(armL, armR, legL, legR);
    for (const x of [-0.52, 0.52]) body.add(mesh(new THREE.SphereGeometry(0.15, 16, 12), joint, x, 1.36, 0));

    // head pivots at the neck
    const eyeGeo = new THREE.TorusGeometry(0.1, 0.026, 8, 24);
    const eyes = group(0, 0.48, 0.5, mesh(eyeGeo, glow, -0.18, 0, 0.14), mesh(eyeGeo, glow, 0.18, 0, 0.14));
    const visorBar = mesh(new THREE.CapsuleGeometry(0.2, 0.44, 6, 16), visor, 0, 0.48, 0.5);
    visorBar.rotation.z = Math.PI / 2;
    visorBar.scale.z = 0.6;
    const mouth = mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 16, Math.PI), joint, 0, 0.2, 0.47);
    mouth.rotation.z = Math.PI;
    const ear = (x: number) => {
      const e = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 20), joint, x, 0.48, 0);
      e.rotation.z = Math.PI / 2;
      return e;
    };
    const head = group(0, 1.56, 0,
      mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), joint, 0, 0.02, 0),
      mesh(new THREE.SphereGeometry(0.58, 32, 24), shell, 0, 0.56, 0),
      ear(-0.57), ear(0.57),
      mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8), joint, 0, 1.18, 0),
      mesh(new THREE.SphereGeometry(0.05, 12, 8), glow, 0, 1.27, 0),
      visorBar, eyes, mouth,
    );
    body.add(head);

    // cleaning props: a mop held in front, a cloth in the right hand
    const mop = group(0, 0.95, 0.5,
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), joint, 0, -0.5, 0),
      mesh(new RoundedBoxGeometry(0.5, 0.08, 0.2, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.9 }), 0, -1.0, 0),
    );
    body.add(mop);
    const cloth = mesh(new RoundedBoxGeometry(0.2, 0.07, 0.2, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.9 }), 0, -0.66, 0.08);
    armR.add(cloth);

    const shadow = mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14, depthWrite: false }), 0, 0.01, 0);
    shadow.rotation.x = -Math.PI / 2;
    robot.add(shadow);

    const resize = () => {
      const w = el.clientWidth;
      renderer.setSize(w, (w * 300) / 320);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const look = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      look.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
      look.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.3)) / (innerHeight / 2)));
    };
    addEventListener('pointermove', onPointer, { passive: true });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pet = el.closest('.pet, .case-bot');
    const ease = (o: THREE.Object3D, k: number, x: number, y: number, z: number) => {
      o.rotation.x += (x - o.rotation.x) * k;
      o.rotation.y += (y - o.rotation.y) * k;
      o.rotation.z += (z - o.rotation.z) * k;
    };

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let lastPose: Pose = 'stand';
    let flipAt = -9;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) t += dt;
      const { pose: p, talking: talk, walking: walk } = props.current;
      const dir = pet?.getAttribute('data-dir') === '-1' ? -1 : 1;
      const air = pet?.classList.contains('air') ?? false;
      const climb = pet?.classList.contains('climb') ?? false;
      const k = reduced ? 1 : Math.min(1, dt * 10);
      const s = Math.sin(t * 11);
      if (p === 'flip' && lastPose !== 'flip') flipAt = t;
      lastPose = p;
      const flipQ = Math.min(1, (t - flipAt) / 0.7); // a started flip always finishes, even if the pose changes (slow phones)
      const flipping = flipQ < 1;
      const sit = p === 'sit' && !walk && !air && !climb;
      const wipe = p === 'wipe' && !walk && !air && !climb;

      // facing: toward the walk direction, back to us while climbing or wiping, side-on for the flip so it reads
      const angry = p === 'angry' && !air && !climb;
      const scrub = p === 'scrub' && !air && !climb;
      ease(robot, flipping ? 1 : k, 0, climb || wipe ? Math.PI : flipping ? -dir * Math.PI / 2 : sit ? dir * 0.8 : angry ? 0 : scrub ? 0.15 : walk ? dir * 0.9 : dir * 0.3, 0);
      body.position.set(0, walk ? Math.abs(s) * 0.05 : climb ? Math.abs(Math.sin(t * 8)) * 0.06 : sit ? -0.55 : Math.sin(t * 1.6) * 0.02, 0);
      body.rotation.x = 0;
      body.scale.setScalar(1);
      if (angry) { body.position.x = Math.sin(t * 55) * 0.03; body.position.y = Math.abs(Math.sin(t * 10)) * 0.06; } // trembling stomp
      if (scrub) { body.rotation.x = 0.2; body.position.x = Math.sin(t * 16) * 0.04; body.position.y = -0.45; } // crouched low over the text
      if (flipping) {
        // tucked backflip around the middle of the body (y = 1.1)
        const q = flipQ < 0.5 ? 2 * flipQ * flipQ : 1 - (-2 * flipQ + 2) ** 2 / 2;
        const a = -2 * Math.PI * q;
        body.rotation.x = a;
        body.position.set(0, 1.1 - 1.1 * Math.cos(a), -1.1 * Math.sin(a));
        body.scale.setScalar(0.8);
      }
      shadow.visible = !air && !climb && !flipping;
      mop.visible = p === 'mop' && !air && !climb;
      mop.rotation.set(-0.35, 0, Math.sin(t * 6) * 0.35);
      cloth.visible = wipe || scrub;

      // limbs as [forward swing (negative = forward/up), outward spread] per limb
      let aL = [0, 0.12], aR = [0, 0.12], lL = [0, 0], lR = [0, 0];
      if (climb) {
        const c = Math.sin(t * 8);
        aL = [-2.7 + c * 0.4, 0.45]; aR = [-2.7 - c * 0.4, 0.45];
        lL = [-0.5 - c * 0.4, 0]; lR = [-0.5 + c * 0.4, 0];
      } else if (air) {
        aL = [0, 2.3]; aR = [0, 2.3]; lL = [0, 0.25]; lR = [0, 0.25];
      } else if (flipping) {
        aL = [-1.0, 0.2]; aR = [-1.0, 0.2]; lL = [-1.3, 0]; lR = [-1.3, 0];
      } else if (p === 'mop') {
        aL = [-0.9, -0.05]; aR = [-0.9, -0.05];
        if (walk) { lL = [-s * 0.3, 0]; lR = [s * 0.3, 0]; }
      } else if (angry) {
        const pump = Math.sin(t * 14) * 0.35; // fists shaking over the head
        aL = [-2.7 + pump, 0.4]; aR = [-2.7 - pump, 0.4];
        const stomp = Math.sin(t * 10);
        lL = [-Math.max(0, stomp) * 0.6, 0]; lR = [-Math.max(0, -stomp) * 0.6, 0];
      } else if (scrub) {
        aR = [-0.25, 0.55 + Math.sin(t * 18) * 0.35]; // arm down and out, towel rubbing at foot level
        aL = [-0.3, 0.6]; // other arm out for balance
        const st = walk ? Math.sin(t * 6) * 0.25 : 0;
        lL = [-1.0 - st, 0.15]; lR = [-1.0 + st, 0.15]; // knees bent
      } else if (walk) {
        aL = [s * 0.5, 0.12]; aR = [-s * 0.5, 0.12]; lL = [-s * 0.55, 0]; lR = [s * 0.55, 0];
      } else if (sit) {
        const w = Math.sin(t * 4) * 0.3;
        aL = [-0.3, 0.25]; aR = [-0.3, 0.25]; lL = [-1.4 + w, 0.1]; lR = [-1.4 - w, 0.1];
      } else if (wipe) aR = [-2.6, 0.3 + Math.sin(t * 9) * 0.4];
      else if (p === 'wave') aR = [0, 2.6 + Math.sin(t * 12) * 0.35];
      else if (p === 'thumbs') aR = [-1.2, 0.6];
      else if (p === 'present') { aL = [-0.9, 0.9]; aR = [-0.9, 0.9]; }
      else if (p === 'point') aL = [0, 1.55];
      else if (p === 'think') aR = [-2.3, -0.3];
      // left side spreads outward with negative z, right side with positive z
      ease(armL, k, aL[0], 0, -aL[1]);
      ease(armR, k, aR[0], 0, aR[1]);
      ease(legL, k, lL[0], 0, -lL[1]);
      ease(legR, k, lR[0], 0, lR[1]);

      const nap = p === 'nap' && !walk && !air && !climb;
      ease(head, k, nap ? 0.25 : angry ? 0.2 : scrub ? 0.15 : look.y * 0.35, climb || wipe ? 0 : angry ? 0 : look.x * 0.6 - robot.rotation.y * 0.4, nap ? 0.18 : p === 'think' ? -0.12 : 0);
      if (angry) head.rotation.z = Math.sin(t * 40) * 0.07; // head shake
      const blink = nap ? 0.15 : angry ? 0.5 : t % 5.5 > 5.3 ? 0.1 : 1; // narrowed glare when angry
      eyes.scale.y += (blink - eyes.scale.y) * Math.min(1, k * 2);
      mouth.scale.y = talk && !reduced ? 1 + Math.abs(Math.sin(t * 20)) * 1.4 : 1;
      glow.color.set(p === 'angry' ? 0xef4444 : 0x38bdf8); // red when angry, shared by eyes/core/antenna

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('pointermove', onPointer);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
      renderer.forceContextLoss(); // dispose() alone keeps the WebGL context alive; browsers cap live contexts (~16)
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) return <Robot pose={pose} talking={talking} walking={walking} />;
  return <div className="robot3d" ref={host} aria-hidden="true" />;
}
