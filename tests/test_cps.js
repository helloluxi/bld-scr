#!/usr/bin/env node
// Verify all four readEdge edge streams (memo / execBasic / execCps /
// execCpsMwp) via Example.verifyEdge. Uses fmt=false → plain letters with no
// HTML and no "(Parity:)" text. Filter matches the web UI's CPS demo at
// src/help.js: parity===1, open1<=1.
//
// Run from repo root:  node tests/test_cps.js [N]

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

function trial() {
  const r = scrambler.getScrambleAndCode({
    edgeFilter: c => c.parity === 1 && c.open1 <= 1,
  });
  const codeStr = r.edgeCode;
  Example.setLetterScheme(Example.DEFAULT_EDGE_CODE, Example.DEFAULT_CORNER_CODE);
  const cubeState = Example.generateCubeState(codeStr, r.cornerCode);
  const edge = Example.readEdge(cubeState, false);

  const variants = [
    { name: 'memo',        code: edge.memo },
    { name: 'execBasic',   code: edge.execBasic },
    { name: 'execCps',     code: edge.execCps },
    { name: 'execCpsMwp',  code: edge.execCpsMwp },
  ];
  function segs(code) { return (code || '').split(' ').filter(Boolean); }
  function exactlyOneSingle(code) {
    return segs(code).filter(s => s.length === 1).length === 1;
  }
  function singleAtTail(code) {
    const s = segs(code);
    return s.length === 0 || s.slice(0, -1).every(seg => seg.length !== 1);
  }
  const results = variants.map(v => {
    let ok = Example.verifyEdge(cubeState, v.code);
    // Exec variants: must have exactly one single-letter (parity) segment.
    if (ok && (v.name === 'execBasic' || v.name === 'execCps' || v.name === 'execCpsMwp')) {
      ok = exactlyOneSingle(v.code);
    }
    // execCps: the single-letter segment must be at the very end.
    if (ok && v.name === 'execCps') {
      ok = singleAtTail(v.code);
    }
    return { ...v, ok };
  });

  return {
    config: r.edgeCC.cycles.map(c => `(${c.perm},${c.ori})`).join(' '),
    codeStr, results,
  };
}

const N = parseInt(process.argv[2] || '200', 10);
let pass = 0, fail = 0;
const failures = [];
for (let i = 0; i < N; i++) {
  const t = trial();
  if (t.results.every(r => r.ok)) pass++;
  else {
    fail++;
    if (failures.length < 5) failures.push(t);
  }
}
console.log(`Trials: ${N}  pass: ${pass}  fail: ${fail}`);
for (const f of failures) {
  console.log(`  config: ${f.config}`);
  console.log(`  code:   ${f.codeStr}`);
  for (const r of f.results) {
    if (r.ok) continue;
    console.log(`  ${r.name}: ${r.code}`);
  }
  console.log('  ---');
}
process.exit(fail === 0 ? 0 : 1);
