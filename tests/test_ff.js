#!/usr/bin/env node
// Verify Overview Full Floating exec correctness by reusing scrambler.genCube +
// applyBldLetter from src/. Strategy:
//   scrambled = genCube(edgeCode + cornerCode)
//   parse memo.{edges,corners}.floatingExec into a flat BLD letter sequence,
//   apply each letter forward to the scrambled cube  →  must equal SOLVED_CUBE.
//
// Token expansion:
//   `(X:)YZ`   → `XYZX`        (one floating alg = setup·pair·undo)
//   `(X:)Y`    → `XYX`         (parity-absorbed (2,0) residual after Parity strip)
//   `Y+ / Y-`  → head + ori-letter for piece(Y) (twist alg, two same-piece letters)
//   plain letters pass through.
// Buffer letters (A, B for edges; a, h, q for corners) MUST NOT appear in any
// token — buffer twists/flips have no codeStr letters and are solved out of
// band, so any buffer letter in the exec output is treated as a hard error.
//
// Run from repo root:  node tests/test_ff.js [N]

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sandbox = { console, Math, Array, Object, Map, Set, BigInt, Number, Boolean, Error,
  parseInt, parseFloat, isFinite, isNaN,
  document: { createElement: () => ({ style: {} }) },
  performance: { now: () => Date.now() } };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const SRC = path.join(__dirname, '..', 'src');
const EXPOSE = {
  'cycler.js':    'globalThis.cycler = cycler;',
  'min2phase.js': 'globalThis.min2phase = min2phase;',
  'scrambler.js': 'globalThis.scrambler = scrambler;',
  'example.js':   '',
};
for (const file of Object.keys(EXPOSE)) {
  const code = fs.readFileSync(path.join(SRC, file), 'utf8');
  vm.runInContext(code + '\n' + EXPOSE[file], sandbox, { filename: file });
}
const { scrambler, Example } = sandbox;
const EDGE_CODE = Example.DEFAULT_EDGE_CODE;
const CORNER_CODE = Example.DEFAULT_CORNER_CODE;

function assertNonBuffer(letter) {
  const eIdx = EDGE_CODE.indexOf(letter);
  if (eIdx >= 0 && (eIdx >> 1) === 0) throw new Error(`buffer edge letter '${letter}' in exec`);
  const cIdx = CORNER_CODE.indexOf(letter);
  if (cIdx >= 0 && ((cIdx / 3) | 0) === 0) throw new Error(`buffer corner letter '${letter}' in exec`);
  if (eIdx < 0 && cIdx < 0) throw new Error(`unknown letter '${letter}' in exec`);
}

// Twist alg for piece P (non-buffer): head letter + ori-letter of the same piece.
// Adjacent pairs cancel cleanly when this expansion is concatenated with the
// floating chunk that produced the twist, recovering the original codeStr.
function expandTwist(letter, sign) {
  assertNonBuffer(letter);
  const eIdx = EDGE_CODE.indexOf(letter);
  if (eIdx >= 0) {
    const piece = eIdx >> 1;
    return EDGE_CODE[piece * 2] + EDGE_CODE[piece * 2 + 1];
  }
  const cIdx = CORNER_CODE.indexOf(letter);
  const piece = (cIdx / 3) | 0;
  return CORNER_CODE[piece * 3] + CORNER_CODE[piece * 3 + (sign === '-' ? 1 : 2)];
}

function parseExec(html) {
  const text = html.replace(/<[^>]+>/g, '').replace(/\(Parity:\)/g, '');
  let out = '';
  for (const tok of text.split(/\s+/).filter(t => t.length)) {
    let m;
    if ((m = tok.match(/^\(([A-Za-z]):\)([A-Za-z])([A-Za-z])$/))) {
      [m[1], m[2], m[3]].forEach(assertNonBuffer);
      out += m[1] + m[2] + m[3] + m[1]; continue;
    }
    if ((m = tok.match(/^\(([A-Za-z]):\)([A-Za-z])$/))) {
      [m[1], m[2]].forEach(assertNonBuffer);
      out += m[1] + m[2] + m[1]; continue;
    }
    if (/^([A-Za-z][+\-])+$/.test(tok)) {
      const re = /([A-Za-z])([+\-])/g;
      let mm;
      while ((mm = re.exec(tok))) out += expandTwist(mm[1], mm[2]);
      continue;
    }
    if (/^[A-Za-z]+$/.test(tok)) {
      for (const L of tok) assertNonBuffer(L);
      out += tok; continue;
    }
    throw new Error(`unexpected token: ${tok}`);
  }
  return out;
}

function diagnose(cube, target) {
  const wrong = [];
  for (let i = 0; i < cube.length; i++) {
    if (cube[i] !== target[i]) wrong.push(`sticker ${i}: got '${cube[i]}', want '${target[i]}'`);
  }
  return wrong;
}

function trial() {
  const r = scrambler.getScrambleAndCode();
  const memo = Example.generateFullMemoFromCode(r.edgeCode, r.cornerCode, r.edgeCC, r.cornerCC);
  const letters = parseExec(memo.edges.floatingExec) + parseExec(memo.corners.floatingExec);

  const scrambled = scrambler.genCube(r.edgeCode + r.cornerCode).split('');
  for (const L of letters) scrambler.applyBldLetter(scrambled, L);
  const result = scrambled.join('');
  const ok = result === scrambler.SOLVED_CUBE;
  return {
    ok,
    eConfig: r.edgeCC.cycles.map(c => `(${c.perm},${c.ori})`).join(' '),
    cConfig: r.cornerCC.cycles.map(c => `(${c.perm},${c.ori})`).join(' '),
    edgeCode: r.edgeCode,
    cornerCode: r.cornerCode,
    edgeFloat: memo.edges.floatingExec.replace(/<[^>]+>/g, ''),
    cornerFloat: memo.corners.floatingExec.replace(/<[^>]+>/g, ''),
    letters,
    diff: ok ? null : diagnose(scrambled, scrambler.SOLVED_CUBE.split('')),
  };
}

const N = parseInt(process.argv[2] || '200', 10);
let pass = 0, fail = 0;
const failures = [];
for (let i = 0; i < N; i++) {
  const t = trial();
  if (t.ok) pass++;
  else {
    fail++;
    if (failures.length < 5) failures.push(t);
  }
}
console.log(`Trials: ${N}  pass: ${pass}  fail: ${fail}`);
for (const f of failures) {
  console.log(`  edges:   ${f.eConfig}  ${f.edgeCode}  →  ${f.edgeFloat}`);
  console.log(`  corners: ${f.cConfig}  ${f.cornerCode}  →  ${f.cornerFloat}`);
  console.log(`  letters: ${f.letters}`);
  if (f.diff) console.log(`  ${f.diff.length} sticker mismatch(es): ${f.diff.slice(0, 6).join('; ')}${f.diff.length > 6 ? ' …' : ''}`);
  console.log('  ---');
}
process.exit(fail === 0 ? 0 : 1);
