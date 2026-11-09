'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Props = { tilt: number; thrust: number; facing?: 1 | -1; arrived?: boolean; scrub?: boolean }; // tilt: radians, + = bank right; thrust: 0..1 flame length

const MODEL = '/models/robot.glb';
const VIEW = { w: 1.2, t: 1.4, b: -1.9 }; // half width and vertical extent; the flame hangs below the feet

/** The flying main character: procedural robot + thruster flame. Uses /models/robot.glb when it exists. Position comes from the parent. */
export function RobotShip({ tilt, thrust, facing = 1, arrived = false, scrub = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const input = useRef({ tilt, thrust, facing, arrived, scrub });
  useEffect(() => {
    input.current = { tilt, thrust, facing, arrived, scrub };
  }, [tilt, thrust, facing, arrived, scrub]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // no WebGL: nothing to draw
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-VIEW.w, VIEW.w, VIEW.t, VIEW.b, 0.1, 50);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-3, 5, 6);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xdbeafe, 1.6); // soft rim from behind, keeps the shell readable on dark and light
    rim.position.set(4, 3, -5);
    scene.add(rim);

    const shell = new THREE.MeshStandardMaterial({ color: 0xf1f4f8, roughness: 0.35, metalness: 0.05 });
    const joint = new THREE.MeshStandardMaterial({ color: 0x9aa4af, roughness: 0.45, metalness: 0.3 });
    const visor = new THREE.MeshStandardMaterial({ color: 0x0b1118, roughness: 0.15, metalness: 0.4 });
    const glow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, depthWrite: false });
    const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };

    const ship = new THREE.Group(); // banking happens here
    const body = new THREE.Group(); // idle bob happens here; flame rides along
    ship.add(body);
    scene.add(ship);

    // procedural robot, hidden once a GLB loads
    const proc = new THREE.Group();
    body.add(proc);
    add(proc, new RoundedBoxGeometry(0.8, 0.8, 0.6, 4, 0.25), shell);
    const head = new THREE.Group(); // scans left/right when idle
    head.position.y = 0.8;
    proc.add(head);
    add(head, new THREE.SphereGeometry(0.42, 32, 24), shell);
    const visorBar = add(head, new THREE.CapsuleGeometry(0.16, 0.5, 6, 16), visor, 0, 0, 0.36);
    visorBar.rotation.z = Math.PI / 2;
    visorBar.scale.z = 0.6;
    add(head, new THREE.SphereGeometry(0.06, 12, 8), glow, 0, 0.45, 0);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9be7ff });
    const eyes = [-1, 1].map((s) => add(head, new THREE.SphereGeometry(0.055, 12, 8), eyeMat, s * 0.13, 0, 0.47)); // slide inside the visor toward the cursor
    const armGeo = new THREE.CapsuleGeometry(0.09, 0.35, 4, 12);
    const arms = [-1, 1].map((side) => {
      const a = new THREE.Group(); // shoulder pivot
      a.position.set(side * 0.52, 0.2, 0);
      proc.add(a);
      add(a, armGeo, joint, 0, -0.27, 0);
      return a;
    });
    add(proc, new THREE.CylinderGeometry(0.3, 0.3, 0.12, 24), joint, 0, -0.5, 0);

    // two thruster nozzles; each flame is a cone whose base sits on the nozzle and points down
    const flameGeo = new THREE.CylinderGeometry(0.13, 0.02, 1, 12).translate(0, -0.5, 0);
    const flames = [-0.25, 0.25].map((x) => {
      add(body, new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16), joint, x, -0.6, 0);
      const f = add(body, flameGeo, flameMat, x, -0.66, 0);
      return f;
    });

    // optional GLB: only fetched when the file exists; any failure keeps the procedural robot
    let alive = true;
    fetch(MODEL, { method: 'HEAD' })
      .then(async (r) => {
        if (!r.ok || !alive) return;
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
        const draco = new DRACOLoader().setDecoderPath('/draco/'); // open issue: decoder files are not shipped
        const loader = new GLTFLoader().setDRACOLoader(draco);
        const gltf = await loader.loadAsync(MODEL);
        if (!alive) return;
        const g = gltf.scene;
        const box = new THREE.Box3().setFromObject(g);
        const size = box.getSize(new THREE.Vector3());
        const s = 1.8 / size.y; // normalize to ~1.8 units tall, feet at y = -0.9
        const c = box.getCenter(new THREE.Vector3());
        g.scale.setScalar(s);
        g.position.set(-c.x * s, -box.min.y * s - 0.9, -c.z * s);
        body.add(g);
        proc.visible = false;
      })
      .catch(() => {});

    const resize = () => {
      const w = el.clientWidth;
      renderer.setSize(w, (w * (VIEW.t - VIEW.b)) / (2 * VIEW.w));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const look = { x: innerWidth / 2, y: innerHeight / 2 };
    const onMove = (e: PointerEvent) => { look.x = e.clientX; look.y = e.clientY; };
    addEventListener('pointermove', onMove, { passive: true });
    const cur = { tilt: 0, thrust: 0, yaw: 0.55, wave: 0, scrub: 0, lx: 0, ly: 0 };
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) t += dt;
      const k = Math.min(1, dt * 6);
      const { tilt: tiltTo, thrust: thrustTo, facing: face, arrived: here, scrub: busy } = input.current;
      cur.tilt += (tiltTo - cur.tilt) * k;
      cur.thrust += (thrustTo - cur.thrust) * k;
      cur.yaw += ((busy ? Math.PI : face * 0.6) - cur.yaw) * Math.min(1, dt * 3.2); // smooth, silky rotation without sudden jerks
      cur.wave += ((here && !reduced ? 1 : 0) - cur.wave) * Math.min(1, dt * 5);
      cur.scrub += ((busy && !reduced ? 1 : 0) - cur.scrub) * Math.min(1, dt * 8);
      const box = el.getBoundingClientRect();
      const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
      cur.lx += (clamp1((look.x - (box.left + box.width / 2)) / 300) - cur.lx) * k;
      cur.ly += (clamp1((look.y - (box.top + box.height * 0.3)) / 300) - cur.ly) * k;
      eyes.forEach((e, i) => e.position.set((i ? 0.13 : -0.13) + cur.lx * 0.1, -cur.ly * 0.05, 0.47));

      ship.rotation.y = cur.yaw;
      ship.rotation.z = -cur.tilt - face * cur.thrust * 0.2; // bank by tilt, lean forward while moving
      head.rotation.y = (reduced ? 0 : Math.sin(t * 1.3) * 0.5 * (1 - cur.thrust)) + cur.lx * 0.3;
      const raised = Math.max(cur.wave, cur.scrub);
      arms[1].rotation.z = 0.15 + raised * (2.2 + Math.sin(t * (cur.scrub > 0.5 ? 22 : 8)) * 0.3);
      if (busy) { arms[1].rotation.x = -Math.PI / 2.4; arms[0].rotation.x = -Math.PI / 2.4; } else { arms[1].rotation.x = 0; arms[0].rotation.x = 0; } // raised: waves when arrived, scrubs fast when working
      arms[0].rotation.z = -0.15 - cur.thrust * 0.3;
      body.position.y = reduced ? 0 : Math.sin(t * 1.8) * 0.05; // idle bob
      const flick = reduced ? 1 : 1 + Math.sin(t * 37) * 0.08 + Math.sin(t * 23) * 0.05;
      for (const f of flames) {
        f.scale.set(0.8 + cur.thrust * 0.4, (0.05 + cur.thrust * 1.3) * flick, 0.8 + cur.thrust * 0.4);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
      });
      flameGeo.dispose();
      armGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="robot-ship" ref={host} aria-hidden="true" />;
}
