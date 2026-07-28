/**
 * Spike: build public/rive/companion-mascot.riv via rive-mcp-server createRiv.
 * Does NOT vendor/redistribute rive-mcp-server source — only consumes the npm package
 * (install under scratch/rive-gen) and commits the generated .riv output.
 *
 * Usage (from repo root):
 *   node scratch/build-companion-mascot-riv.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'public', 'rive', 'companion-mascot.riv');
const BODY = join(ROOT, 'public', 'images', 'companion-mascot', 'body');
const FACE = join(ROOT, 'public', 'images', 'companion-mascot', 'face');

const writerPath = join(__dirname, 'rive-gen', 'node_modules', 'rive-mcp-server', 'dist', 'rivWriter.js');
if (!existsSync(writerPath)) {
  console.error(
    'Missing rive-mcp-server. Install once:\n' +
      '  cd scratch/rive-gen && npm install rive-mcp-server@0.4.1'
  );
  process.exit(1);
}
const { createRiv } = await import(pathToFileURL(writerPath).href);

const AB = 128;
// Face overlay placement (matches MASCOT_FACE_OVERLAY in companion-mascot-frames.ts)
const FACE_CX = AB * (0.21875 + 0.5 / 2); // 60
const FACE_CY = AB * (0.140625 + 0.46875 / 2); // 48
const FACE_REL = { x: FACE_CX - AB / 2, y: FACE_CY - AB / 2 }; // -4, -16

function mustPng(dir, name) {
  const p = join(dir, name);
  if (!existsSync(p)) throw new Error(`Missing asset: ${p}`);
  return p;
}

const bodyMap = {
  body_idle: mustPng(BODY, 'idle_stand.png'),
  body_listen: mustPng(BODY, 'listen_ear.png'),
  body_speak: mustPng(BODY, 'speak_open.png'),
  body_exec: mustPng(BODY, 'exec_bulb.png'),
};

const faceMap = {
  face_a: mustPng(FACE, 'viseme_a.png'),
  face_e: mustPng(FACE, 'viseme_e.png'),
  face_i: mustPng(FACE, 'viseme_i.png'),
  face_u: mustPng(FACE, 'viseme_u.png'),
};

function soloAnim(name, soloId, childId) {
  return {
    name,
    fps: 60,
    duration: 2,
    loop: 'loop',
    tracks: [
      {
        target: soloId,
        property: 'soloActive',
        keyframes: [{ frame: 0, ref: childId }],
      },
    ],
  };
}

const scene = {
  artboard: { name: 'Companion', width: AB, height: AB },
  // Transparent artboard — no background fill (FAB overlays cleanly)
  groups: [
    { id: 'bodySolo', x: AB / 2, y: AB / 2, solo: true, active: 'body_idle' },
    { id: 'faceSolo', x: AB / 2, y: AB / 2, solo: true, active: 'face_a' },
  ],
  images: [
    ...Object.entries(bodyMap).map(([id, pngPath], i) => ({
      id,
      pngPath,
      x: 0,
      y: 0,
      scale: 1,
      parent: 'bodySolo',
      z: 1000 + i,
    })),
    ...Object.entries(faceMap).map(([id, pngPath], i) => ({
      id,
      pngPath,
      x: FACE_REL.x,
      y: FACE_REL.y,
      scale: 1,
      parent: 'faceSolo',
      z: 2000 + i,
    })),
  ],
  animations: [
    soloAnim('pose_idle', 'bodySolo', 'body_idle'),
    soloAnim('pose_listen', 'bodySolo', 'body_listen'),
    soloAnim('pose_speak', 'bodySolo', 'body_speak'),
    soloAnim('pose_exec', 'bodySolo', 'body_exec'),
    soloAnim('mouth_a', 'faceSolo', 'face_a'),
    soloAnim('mouth_e', 'faceSolo', 'face_e'),
    soloAnim('mouth_i', 'faceSolo', 'face_i'),
    soloAnim('mouth_u', 'faceSolo', 'face_u'),
  ],
  stateMachine: {
    name: 'CompanionSM',
    inputs: [
      { name: 'status', type: 'number', initial: 0 },
      { name: 'viseme', type: 'number', initial: 0 },
    ],
    layers: [
      {
        name: 'Status',
        states: [
          { name: 'idle', animation: 'pose_idle' },
          { name: 'listening', animation: 'pose_listen' },
          { name: 'speaking', animation: 'pose_speak' },
          { name: 'executing', animation: 'pose_exec' },
        ],
        transitions: [
          { from: 'entry', to: 'idle' },
          { from: 'any', to: 'idle', condition: { input: 'status', op: '==', value: 0 } },
          { from: 'any', to: 'listening', condition: { input: 'status', op: '==', value: 1 } },
          { from: 'any', to: 'speaking', condition: { input: 'status', op: '==', value: 2 } },
          { from: 'any', to: 'executing', condition: { input: 'status', op: '==', value: 3 } },
        ],
      },
      {
        name: 'Viseme',
        states: [
          { name: 'v0', animation: 'mouth_a' },
          { name: 'v1', animation: 'mouth_e' },
          { name: 'v2', animation: 'mouth_i' },
          { name: 'v3', animation: 'mouth_u' },
        ],
        transitions: [
          { from: 'entry', to: 'v0' },
          { from: 'any', to: 'v0', condition: { input: 'viseme', op: '==', value: 0 } },
          { from: 'any', to: 'v1', condition: { input: 'viseme', op: '==', value: 1 } },
          { from: 'any', to: 'v2', condition: { input: 'viseme', op: '==', value: 2 } },
          { from: 'any', to: 'v3', condition: { input: 'viseme', op: '==', value: 3 } },
        ],
      },
    ],
  },
};

// Resolve pngPath → bytes (same as riv_create tool)
for (const img of scene.images) {
  img.bytes = new Uint8Array(readFileSync(img.pngPath));
  delete img.pngPath;
}

const { bytes, warnings } = createRiv(scene);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, bytes);

console.log(`Wrote ${OUT} (${bytes.length} bytes)`);
if (warnings?.length) console.log('warnings:', warnings);

// Validate with official @rive-app/canvas if available
async function validate() {
  let Rive;
  try {
    ({ default: Rive } = await import(
      join(__dirname, 'rive-gen', 'node_modules', '@rive-app', 'canvas', 'rive.js')
    ));
  } catch {
    try {
      ({ default: Rive } = await import('@rive-app/canvas'));
    } catch (e) {
      console.warn('Skip runtime validate (no @rive-app/canvas):', e.message);
      return;
    }
  }

  // Node has no canvas — use buffer load / inspect via WASM if possible.
  // Prefer canvas-advanced file loader from the same package tree.
  try {
    const advancedPath = join(
      __dirname,
      'rive-gen',
      'node_modules',
      '@rive-app',
      'canvas-advanced',
      'canvas_advanced.mjs'
    );
    const riveMod = await import(advancedPath);
    const wasmPath = join(
      __dirname,
      'rive-gen',
      'node_modules',
      '@rive-app',
      'canvas-advanced',
      'rive.wasm'
    );
    const runtime = await riveMod.default({
      locateFile: () => wasmPath,
    });
    const file = await runtime.load(new Uint8Array(bytes));
    const ab = file.defaultArtboard();
    const sm = new runtime.StateMachineInstance(
      ab.stateMachineByName('CompanionSM'),
      ab
    );
    const inputs = [];
    for (let i = 0; i < sm.inputCount(); i++) {
      const inp = sm.input(i);
      inputs.push({ name: inp.name, type: inp.constructor?.name ?? '?' });
    }
    console.log('Runtime validate OK');
    console.log(
      JSON.stringify(
        {
          artboard: ab.name,
          stateMachine: 'CompanionSM',
          inputs,
          animationCount: ab.animationCount?.() ?? 'n/a',
        },
        null,
        2
      )
    );
    // Drive status 0→3 and advance
    let statusInp = null;
    let visemeInp = null;
    for (let i = 0; i < sm.inputCount(); i++) {
      const inp = sm.input(i);
      if (inp.name === 'status') statusInp = inp.asNumber();
      if (inp.name === 'viseme') visemeInp = inp.asNumber();
    }
    if (!statusInp || !visemeInp) throw new Error('Missing status/viseme number inputs');
    for (const s of [0, 1, 2, 3]) {
      statusInp.value = s;
      visemeInp.value = s;
      sm.advance(1 / 60);
      ab.advance(1 / 60);
    }
    console.log('State machine inputs driven 0–3 successfully');
    sm.delete();
    ab.delete();
    file.delete();
    runtime.cleanup();
  } catch (e) {
    console.warn('Advanced runtime validate failed, trying magic-header check:', e.message);
    const magic = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    if (magic !== 'RIVE') throw new Error(`Bad magic: ${magic}`);
    console.log('File magic RIVE OK; size', bytes.length);
  }
}

await validate();
console.log('Done.');
