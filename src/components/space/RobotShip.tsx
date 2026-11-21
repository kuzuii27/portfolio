'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gameState } from '@/lib/game';
import { GUNS, type Gun } from '@/lib/weapons';

/** 'wipe' = text-wipe job (was the `scrub` boolean). grab/pull/throw/weld = meteor repair. */
export type Action = 'idle' | 'wipe' | 'grab' | 'pull' | 'throw' | 'weld';
/** tilt: radians, + = bank right; thrust: 0..1 flame length.
 *  onHand(x, y, torchOn): CSS px of the grip point and the torch tip inside the robot box, every frame (parent places DOM rock/sparks there). */
type Props = {
  tilt: number;
  thrust: number;
  facing?: 1 | -1;
  arrived?: boolean;
  action?: Action;
  /** true while the page robot flies in after the loader: it turns to face the screen and burns its thrust */
  entering?: boolean;
  onHand?: (grip: { x: number; y: number }, tip: { x: number; y: number }, torchOn: number) => void;
};

const MODEL = '/models/robot.glb';
const GUN_SCALE = 1.5; // game guns are drawn bigger than the tools so they read at a glance
/** Barrel tip in hand space (before GUN_SCALE is applied elsewhere): where shots leave from. */
const MUZZLE_Y: Record<Gun, number> = { pistol: -0.86, smg: -1.12, shotgun: -1.46, laser: -1.04, rocket: -1.3, flame: -1.2, bomb: -1.19 };
/** How hard each gun kicks the arm and pushes the body back (1 = rocket). */
const RECOIL: Record<Gun, number> = { pistol: 0.3, smg: 0.15, shotgun: 0.9, laser: 0.7, rocket: 1, flame: 0.05, bomb: 0.6 };
const SWAP_S = 0.3; // switching guns: the arm lowers, the gun swaps at the bottom, the arm raises again
const VIEW = { w: 1.2, t: 1.4, b: -1.9 }; // half width and vertical extent; the flame hangs below the feet
/** Where the cloth lands while mopping (robot turned away), as a fraction of the robot box from its centre. Derived from the arm/mop geometry below. */
export const MOP_HEAD = { dx: -0.17, dy: 0.36 };
/** Wipe geometry, as fractions of the robot box height (box = VIEW units). The raised hand reaches HAND_UP above the robot's centre; the body top (head) is HEAD_TOP above it. Used by SpaceScene to put the robot just below the text. */
export const WIPE = { handUp: 0.41, headTop: 0.5 };

/** The flying main character: procedural robot + thruster flame. Uses /models/robot.glb when it exists. Position comes from the parent. */
export function RobotShip({ tilt, thrust, facing = 1, arrived = false, action = 'idle', entering = false, onHand }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const input = useRef({ tilt, thrust, facing, arrived, action, entering, onHand });
  useEffect(() => {
    input.current = { tilt, thrust, facing, arrived, action, entering, onHand };
  }, [tilt, thrust, facing, arrived, action, entering, onHand]);

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
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xe0f2ff });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.8, metalness: 0 });
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
    // welding visor: a dark half-dome on a hinge at the forehead; flipped up (out of the way) by default
    const weldVisor = new THREE.Group();
    weldVisor.position.set(0, 0.2, 0.3);
    head.add(weldVisor);
    add(weldVisor, new THREE.SphereGeometry(0.44, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), visor);

    const armGeo = new THREE.CapsuleGeometry(0.09, 0.35, 4, 12);
    const socketGeo = new THREE.SphereGeometry(0.13, 20, 14);
    const handGeo = new THREE.SphereGeometry(0.11, 20, 14);
    const squeeGeo = [new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), new THREE.BoxGeometry(0.42, 0.06, 0.1), new THREE.BoxGeometry(0.4, 0.04, 0.14)];
    const torchGeo = [new THREE.CylinderGeometry(0.06, 0.06, 0.34, 10), new THREE.CylinderGeometry(0.03, 0.06, 0.2, 10), new THREE.SphereGeometry(0.04, 10, 8)];
    let squeegee!: THREE.Group;
    let torch!: THREE.Group;
    // one gun set and muzzle per hand (index 0 = left arm, 1 = right): the gun is carried by the arm on the cursor side, so the robot never has to flip
    const gunSets = [] as Record<Gun, THREE.Group>[];
    const muzzles = [] as THREE.Object3D[]; // empty anchor at the barrel tip, projected to page px for the shot origin
    let grip!: THREE.Object3D; // empty anchor at the palm: where the rock is held
    let tip!: THREE.Object3D; // empty anchor at the torch nozzle end
    const arms = [-1, 1].map((side) => {
      add(proc, socketGeo, joint, side * 0.41, 0.2, 0); // joint ball seated in the torso wall (half width 0.4)
      const a = new THREE.Group(); // shoulder pivot = socket centre
      a.position.set(side * 0.41, 0.2, 0);
      proc.add(a);
      add(a, armGeo, joint, 0, -0.27, 0);
      const hand = add(a, handGeo, shell, 0, -0.56, 0); // on the arm axis, overlaps the capsule end
      if (side === 1) {
        grip = new THREE.Object3D();
        grip.position.set(0, -0.56, 0);
        a.add(grip);
        torch = new THREE.Group(); // welding torch in the same hand, same mount as the mop
        hand.add(torch);
        add(torch, torchGeo[0], joint, 0, -0.18, 0); // handle
        add(torch, torchGeo[1], shell, 0, -0.45, 0); // tapered nozzle
        tip = add(torch, torchGeo[2], tipMat, 0, -0.58, 0);
        torch.visible = false;
        torch.scale.setScalar(0.001);

        // squeegee for the window-cleaning wipe: grey handle, T-head bar, dark rubber blade. Scaled in only while wiping.
        squeegee = new THREE.Group();
        hand.add(squeegee);
        add(squeegee, squeeGeo[0], joint, 0, -0.3, 0); // handle
        add(squeegee, squeeGeo[1], shell, 0, -0.52, 0); // T head
        add(squeegee, squeeGeo[2], rubber, 0, -0.6, 0); // blade, flat against the glass
        squeegee.visible = false;
        squeegee.scale.setScalar(0.001);
      }
      {
        // game guns: same hand mount, barrel along the arm axis (-y). Scaled in only while the game runs.
        const orange = new THREE.MeshStandardMaterial({ color: 0xff7a3a, roughness: 0.4, metalness: 0.2 });
        const mk = () => { const g = new THREE.Group(); hand.add(g); g.visible = false; g.scale.setScalar(0.001); return g; };
        const pistol = mk();
        add(pistol, new THREE.BoxGeometry(0.1, 0.42, 0.1), joint, 0, -0.3, 0); // barrel
        add(pistol, new THREE.BoxGeometry(0.09, 0.18, 0.09), joint, 0, -0.08, -0.08); // grip
        const laser = mk();
        add(laser, new THREE.BoxGeometry(0.15, 0.5, 0.15), shell, 0, -0.32, 0);
        add(laser, new THREE.SphereGeometry(0.07, 12, 8), glow, 0, -0.6, 0); // emitter
        const rocket = mk();
        add(rocket, new THREE.CylinderGeometry(0.13, 0.13, 0.6, 14), joint, 0, -0.35, 0);
        const nose = add(rocket, new THREE.ConeGeometry(0.13, 0.22, 14), orange, 0, -0.76, 0);
        nose.rotation.x = Math.PI; // cone tip points down the arm
        const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.7, metalness: 0 });
        const smg = mk();
        add(smg, new THREE.BoxGeometry(0.14, 0.5, 0.14), joint, 0, -0.3, 0); // body
        add(smg, new THREE.BoxGeometry(0.07, 0.24, 0.1), rubber, 0.11 * side, -0.32, 0); // magazine, sideways so it reads in profile
        add(smg, new THREE.CylinderGeometry(0.035, 0.035, 0.25, 10), rubber, 0, -0.62, 0); // barrel
        const shotgun = mk();
        add(shotgun, new THREE.CylinderGeometry(0.05, 0.05, 0.95, 12), joint, 0, -0.5, 0); // long barrel
        add(shotgun, new THREE.CylinderGeometry(0.04, 0.04, 0.6, 10), shell, 0.09 * side, -0.4, 0); // pump tube
        add(shotgun, new THREE.BoxGeometry(0.14, 0.25, 0.14), rubber, 0, -0.18, 0); // receiver
        add(shotgun, new THREE.BoxGeometry(0.1, 0.3, 0.1), wood, 0, 0.1, 0); // stock
        const flame = mk();
        add(flame, new THREE.CylinderGeometry(0.07, 0.07, 0.55, 12), joint, 0, -0.32, 0); // pipe
        add(flame, new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12), orange, 0.14 * side, -0.2, 0); // fuel tank on the side
        add(flame, new THREE.ConeGeometry(0.07, 0.2, 12), orange, 0, -0.68, 0).rotation.x = Math.PI; // nozzle, tip down the arm
        add(flame, new THREE.SphereGeometry(0.035, 10, 8), tipMat, 0, -0.8, 0); // pilot light
        const bomb = mk();
        add(bomb, new THREE.CylinderGeometry(0.17, 0.17, 0.55, 16), rubber, 0, -0.35, 0); // fat launcher tube
        add(bomb, new THREE.CylinderGeometry(0.19, 0.19, 0.08, 16), glow, 0, -0.6, 0); // glowing ring
        add(bomb, new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), joint, 0, -0.72, 0); // wide muzzle
        gunSets[(side + 1) / 2] = { pistol, smg, shotgun, laser, rocket, flame, bomb };
        const mz = new THREE.Object3D();
        hand.add(mz);
        muzzles[(side + 1) / 2] = mz;
      }
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

    let kWide = 1; // game: the canvas (and the camera frustum) is 2x so a long gun arm is never cut at the box edge
    const resize = () => {
      const w = el.clientWidth;
      const mid = (VIEW.t + VIEW.b) / 2;
      const half = (VIEW.t - VIEW.b) / 2;
      camera.left = -VIEW.w * kWide; camera.right = VIEW.w * kWide; camera.top = mid + half * kWide; camera.bottom = mid - half * kWide;
      camera.updateProjectionMatrix();
      renderer.setSize(w, (w * (VIEW.t - VIEW.b)) / (2 * VIEW.w));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const look = { x: innerWidth / 2, y: innerHeight / 2 };
    const onMove = (e: PointerEvent) => { look.x = e.clientX; look.y = e.clientY; };
    addEventListener('pointermove', onMove, { passive: true });
    const cur = { tilt: 0, thrust: 0, yaw: 0.55, wave: 0, scrub: 0, torch: 0, squee: 0, visor: 0, armX: 0, armZ: 0.15, lean: 0, lx: 0, ly: 0, kick: 0, gun: 0, flipT: 1 };
    const gripV = new THREE.Vector3();
    const tipV = new THREE.Vector3();
    const mzV = new THREE.Vector3();
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let phaseT = 0; // seconds in the current action (drives the tug and throw cycle)
    let prevAct: Action = 'idle';
    let lastShot = gameState.shots;
    let shownGun: Gun = 'pistol'; // the gun that is scaling in or out
    let wantGun: Gun | null = null; // the selected gun; shownGun catches up at the bottom of the switch dip
    let swapT = 1; // seconds since the gun was changed
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); // clamp >= 0: a negative first dt once blew up damp()
      last = now;
      if (!reduced) t += dt;
      const k = Math.min(1, dt * 6);
      const { tilt: tiltTo, thrust: thrustTo, facing: face, arrived: here, action: act, entering: enter, onHand: report } = input.current;
      if (act !== prevAct) { phaseT = 0; prevAct = act; }
      const gunSel = gameState.gun;
      const shooting = !!gunSel && !reduced;
      if (!gunSel) wantGun = null;
      else if (gunSel !== wantGun) { if (wantGun) swapT = 0; else shownGun = gunSel; wantGun = gunSel; } // the first pick shows at once; a change dips
      swapT += dt;
      if (wantGun && swapT >= SWAP_S / 2) shownGun = wantGun;
      const dip = swapT < SWAP_S ? Math.abs(swapT - SWAP_S / 2) / (SWAP_S / 2) : 1; // 1 = gun up, 0 = lowered
      if (gameState.shots !== lastShot) { lastShot = gameState.shots; cur.kick = 1; }
      const wantK = shooting || (act === 'wipe' && !reduced) ? 2 : 1; // the raised squeegee reaches past the normal canvas edge and was cut off
      if (wantK !== kWide) { kWide = wantK; el.classList.toggle('robot-wide', kWide === 2); resize(); }
      let aimPhi = 0; // right-arm angle that points the gun at the cursor, in the screen plane
      if (shooting) {
        const rr = el.getBoundingClientRect();
        const ppu = rr.width / (2 * VIEW.w * kWide); // px per scene unit
        const side = gameState.aim.x >= rr.left + rr.width / 2 ? 1 : -1; // mirror the robot toward the cursor
        cur.flipT = side;
        const sx = rr.left + rr.width / 2 + side * 0.41 * 0.88 * ppu; // 0.88 = cos of the body turn // shoulder, screen px
        const sy = rr.top + (-0.25 + 1.65 * kWide - 0.2) * ppu;
        const bank = ship.rotation.z;
        const dx = gameState.aim.x - sx;
        const dyUp = -(gameState.aim.y - sy);
        const vx = dx * Math.cos(bank) + dyUp * Math.sin(bank); // undo the ship's bank so the gun still points true
        const vy = -dx * Math.sin(bank) + dyUp * Math.cos(bank);
        aimPhi = Math.atan2(side * vx, -vy);
      }
      cur.kick = Math.max(0, cur.kick - dt * 6);
      cur.gun += ((shooting ? 1 : 0) - cur.gun) * Math.min(1, dt * 8);
      phaseT += dt;
      const repair = act === 'grab' || act === 'pull' || act === 'throw' || act === 'weld';
      const weldOn = act === 'weld' && !reduced;
      cur.tilt += (tiltTo - cur.tilt) * k;
      cur.thrust += (thrustTo - cur.thrust) * k;
      // while flying in the robot faces the screen (yaw 0); at rest it turns to the usual facing. Same damping either way.
      cur.yaw += ((repair || act === 'wipe' ? Math.PI : enter ? 0 : shooting ? cur.flipT * 0.5 : face * 0.6) - cur.yaw) * Math.min(1, dt * 3.2); // smooth rotation, no jerks
      cur.wave += ((here && !reduced ? 1 : 0) - cur.wave) * Math.min(1, dt * 5);
      cur.scrub += (((act === 'wipe' || repair) && !reduced ? 1 : 0) - cur.scrub) * Math.min(1, dt * 8);
      cur.torch += ((weldOn ? 1 : 0) - cur.torch) * Math.min(1, dt * 6); // torch scales in and out
      cur.squee += ((act === 'wipe' && !reduced ? 1 : 0) - cur.squee) * Math.min(1, dt * 7); // squeegee scales in while the window-clean runs
      cur.visor += ((weldOn ? 1 : 0) - cur.visor) * Math.min(1, dt * 5);
      const box = el.getBoundingClientRect();
      const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
      cur.lx += (clamp1((look.x - (box.left + box.width / 2)) / 300) - cur.lx) * k;
      cur.ly += (clamp1((look.y - (box.top + box.height * 0.3)) / 300) - cur.ly) * k;
      eyes.forEach((e, i) => e.position.set((i ? 0.13 : -0.13) + cur.lx * 0.1, -cur.ly * 0.05, 0.47));

      ship.rotation.y = cur.yaw;
      ship.rotation.z = -cur.tilt - face * cur.thrust * 0.2; // bank by tilt, lean forward while moving
      head.rotation.y = (reduced ? 0 : Math.sin(t * 1.3) * 0.5 * (1 - cur.thrust)) + cur.lx * 0.3;
      weldVisor.rotation.x = -Math.PI / 2 + cur.visor * (Math.PI / 2); // hinge at the forehead: flips down while welding
      const raised = Math.max(cur.wave, cur.scrub);

      // right arm: idle wave, wiping scrub, or the repair cycle (grab reach, pull tug, throw wind-up + release, weld trace)
      let tgtX = 0, tgtZ = 0.15 + raised * (2.2 + Math.sin(t * (cur.scrub > 0.5 ? 22 : 8)) * 0.3), lean = 0;
      if (act === 'wipe' && !reduced) {
        // window cleaner: the near arm reaches UP to the text and stays steady (no shake); a slight lean into the sweep
        tgtX = 0; tgtZ = 2.4; lean = Math.max(-0.1, Math.min(0.1, cur.tilt * 0.4)); // lean follows the bank (travel direction)
      } else if (act === 'grab') { tgtX = -Math.PI / 2.2; tgtZ = 0.45; }
      else if (act === 'pull') {
        const tug = Math.max(0, Math.sin(phaseT * Math.PI * 2.2)); // ~2-3 tugs over 1.4 s
        tgtX = -Math.PI / 2.2 + tug * 0.35; tgtZ = 0.45; lean = -tug * 0.12;
      } else if (act === 'throw') {
        const windUp = Math.min(1, phaseT / 0.35);          // arm pulls back with the rock
        const release = Math.min(1, Math.max(0, (phaseT - 0.35) / 0.2)); // then swings through
        tgtX = -Math.PI / 2.2 - release * 1.0; tgtZ = 0.45 - windUp * 0.9 + release * 0.9; lean = windUp * 0.1 - release * 0.15;
      } else if (act === 'weld') { tgtX = -Math.PI / 2.4; tgtZ = 0.3; }
      else if (shooting) { tgtX = 0; tgtZ = aimPhi * dip + 0.15 * (1 - dip) + cur.kick * 0.3 * RECOIL[shownGun]; } // game: arm points at the cursor, recoil flicks it up
      const armK = Math.min(1, dt * (shooting ? 24 : 9));
      cur.armX += (tgtX - cur.armX) * armK;
      cur.armZ += (tgtZ - cur.armZ) * armK;
      cur.lean += (lean - cur.lean) * Math.min(1, dt * 6);
      // the working arm is the right one, or while shooting the one on the cursor side; the other hangs (arm 0 is the mirror of arm 1)
      const work = shooting && cur.flipT < 0 ? 0 : 1;
      const rest = 1 - work;
      arms[work].rotation.x = cur.armX;
      arms[work].rotation.z = work ? cur.armZ : -cur.armZ;
      arms[rest].rotation.x = repair || act === 'wipe' ? -Math.PI / 2.4 : 0;
      arms[rest].rotation.z = (rest ? 1 : -1) * (0.15 + cur.thrust * 0.3);
      body.rotation.z = cur.lean;
      torch.rotation.z = -arms[1].rotation.z * 0.3; // tilts less than the mop: reads better angled
      torch.scale.setScalar(Math.max(0.001, cur.torch));
      torch.visible = cur.torch > 0.01;
      squeegee.scale.setScalar(Math.max(0.001, cur.squee));
      squeegee.visible = cur.squee > 0.01;
      for (const h of [0, 1]) {
        for (const k of GUNS) { const on = k === shownGun && h === work; gunSets[h][k].scale.setScalar(on ? Math.max(0.001, cur.gun * dip * GUN_SCALE) : 0.001); gunSets[h][k].visible = on && cur.gun > 0.01; }
        muzzles[h].position.y = MUZZLE_Y[shownGun];
      }
      body.position.y = reduced ? 0 : Math.sin(t * 1.8) * 0.05; // idle bob
      body.position.x = -cur.flipT * cur.kick * RECOIL[shownGun] * 0.12; // the shot pushes the body back, away from the target
      const flick = reduced ? 1 : 1 + Math.sin(t * 37) * 0.08 + Math.sin(t * 23) * 0.05;
      for (const f of flames) {
        f.scale.set(0.8 + cur.thrust * 0.4, (0.05 + cur.thrust * 1.3) * flick, 0.8 + cur.thrust * 0.4);
      }

      renderer.render(scene, camera);
      if (shooting) {
        const rr = el.getBoundingClientRect();
        muzzles[work].getWorldPosition(mzV).project(camera);
        gameState.muzzle.x = rr.left + (mzV.x * 0.5 + 0.5) * rr.width;
        gameState.muzzle.y = rr.top + (1 - (mzV.y * 0.5 + 0.5)) * rr.height;
      }
      if (report) {
        // project the grip and torch tip into CSS px inside the robot box, so the parent can place DOM rock/sparks exactly there
        const w = el.clientWidth;
        const h = (w * (VIEW.t - VIEW.b)) / (2 * VIEW.w);
        const toCss = (v: THREE.Vector3) => ({ x: (v.x * 0.5 + 0.5) * w, y: (1 - (v.y * 0.5 + 0.5)) * h });
        report(toCss(grip.getWorldPosition(gripV).project(camera)), toCss(tip.getWorldPosition(tipV).project(camera)), cur.torch);
      }
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
      socketGeo.dispose();
      handGeo.dispose();
      torchGeo.forEach((g) => g.dispose());
      squeeGeo.forEach((g) => g.dispose());
      rubber.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="robot-ship" ref={host} aria-hidden="true" />;
}
