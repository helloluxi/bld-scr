// Reproduction code for all statistics shown on help.html.
// Run with: node tests/reproduction.js
//
// Loads the browser-style IIFEs in cycler.js and cycler4.js without modifying
// them, then prints every distribution (3BLD edges/corners and 4x4 wings/centers).

const fs = require('fs');
const path = require('path');

function loadIIFE(file, varName) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
  return new Function(src.replace(`const ${varName} = `, 'return '))();
}

const cycler  = loadIIFE('cycler.js',  'cycler');
const cycler4 = loadIIFE('cycler4.js', 'cycler4');

// Print a table with header row, padding each column to its max width.
// Numeric columns (all cells parse as a number, or are "—" / "#N") are right-aligned.
function printTable(name, headers, rows) {
  console.log(`\n=== ${name} ===`);
  const isNum = s => s === '—' || /^#\d/.test(s) || (s !== '' && Number.isFinite(Number(s)));
  const data = [headers, ...rows.map(r => r.map(c => String(c)))];
  const numeric = headers.map((_, i) => rows.length > 0 && rows.every(r => isNum(String(r[i]))));
  const widths = headers.map((_, i) => Math.max(...data.map(r => r[i].length)));
  for (const r of data) {
    console.log(r.map((c, i) => numeric[i] ? c.padStart(widths[i]) : c.padEnd(widths[i])).join('  '));
  }
}

// ── 3BLD ──────────────────────────────────────────────────────────────

const allE = [...cycler.evenEdges, ...cycler.oddEdges];
const allC = [...cycler.evenCorners, ...cycler.oddCorners];
const eT = 980995276800, cT = 88179840;

function tally(configs, keyFn) {
  const t = new Map();
  for (const cc of configs) t.set(keyFn(cc), (t.get(keyFn(cc)) || 0) + cc.count);
  return [...t].sort((a, b) => a[0] - b[0]);
}

function show(name, keyLabel, rows, total) {
  let cum = 0;
  const out = rows.map(([k, v]) => {
    cum += v;
    return [k, Math.round(v), (v / total).toFixed(4), (cum / total).toFixed(4)];
  });
  printTable(name, [keyLabel, 'Count', 'Prob', 'Cum'], out);
}

// ── 3BLD Algs ──
show("Edge Algs (Basic)",   'Algs', tally(allE, c => c.alg), eT);
show("Corner Algs (Basic)", 'Algs', tally(allC, c => c.alg), cT);

// Saved-alg means by skill level
const skillLevels = [
  { name: 'Basic 3-style',           e: cc => cc.alg,                c: cc => cc.alg },
  { name: 'Floating plain 3-cycles', e: cc => cc.alg - cc.closed3,   c: cc => cc.alg - cc.closed3 },
  { name: 'Full Floating',           e: cc => cc.algFF,       c: cc => cc.algFF },
  { name: 'Full Floating Parity',    e: cc => cc.algFFP,      c: cc => cc.algFFP },
];

function avg(configs, fn, total) {
  let s = 0;
  for (const cc of configs) s += fn(cc) * cc.count;
  return s / total;
}

function totalAvg(eFn, cFn) {
  const eByP = [new Map(), new Map()], cByP = [new Map(), new Map()];
  for (const cc of allE) { const k = eFn(cc); eByP[cc.parity].set(k, (eByP[cc.parity].get(k) || 0) + cc.count); }
  for (const cc of allC) { const k = cFn(cc); cByP[cc.parity].set(k, (cByP[cc.parity].get(k) || 0) + cc.count); }
  let w = 0, ws = 0;
  for (let p = 0; p <= 1; p++) {
    let eS = 0, cS = 0;
    for (const v of eByP[p].values()) eS += v;
    for (const v of cByP[p].values()) cS += v;
    w += eS * cS;
    for (const [ek, ev] of eByP[p]) for (const [ck, cv] of cByP[p]) ws += (ek + ck) * ev * cv;
  }
  return ws / w;
}

{
  const rows = skillLevels.map(lv => {
    const eM = avg(allE, lv.e, eT), cM = avg(allC, lv.c, cT), tM = totalAvg(lv.e, lv.c);
    return [lv.name, eM.toFixed(2), cM.toFixed(2), tM.toFixed(2)];
  });
  printTable('Saved-alg Means by Skill Level', ['Skill', 'Edge', 'Corner', 'Total'], rows);
}

// ── Cascading Pseudo Swap ──
function falling(x, k) {
  let r = 1;
  for (let i = 0; i < k; i++) r *= (x - i);
  return r;
}

function computeCPS(even, odd, P, hNum, hDen) {
  const all = new Array(P + 1).fill(0), oddArr = new Array(P + 1).fill(0);
  function process(cc, isOdd) {
    const p0 = cc.cycles[0].perm, f1 = cc.closed1;
    const h = (p0 > 1) ? 1 : 0;
    const n0 = Math.max(0, p0 - 2) + f1, a0 = P - h - n0;
    const vcs = h === 0
      ? [[cc.count, a0, P - a0]]
      : [[cc.count * hNum / hDen,         a0 + 1, P - a0 - 1],
         [cc.count * (hDen - hNum) / hDen, a0,     P - a0]];
    for (const [w, a, n] of vcs) {
      if (a === 0) { all[0] += w; if (isOdd) oddArr[0] += w; continue; }
      for (let k = 1; k <= P; k++) {
        if (k - 1 > n) break;
        const c = w * a * falling(n, k - 1) / falling(P, k);
        all[k] += c;
        if (isOdd) oddArr[k] += c;
      }
    }
  }
  even.forEach(cc => process(cc, false));
  odd .forEach(cc => process(cc, true));
  return { all, odd: oddArr };
}

function showCPS(name, arr, P) {
  const t = arr.reduce((s, v) => s + v, 0);
  const rows = [];
  let cum = 0;
  for (let k = 1; k <= P; k++) {
    cum += arr[k];
    rows.push([`#${k}`, Math.round(arr[k]), (arr[k] / t).toFixed(4), (cum / t).toFixed(4)]);
  }
  rows.push(['—', Math.round(arr[0]), (arr[0] / t).toFixed(4), '1.0000']);
  printTable(name, ['Pos', 'Count', 'Prob', 'Cum'], rows);
}

const edgeCPS   = computeCPS(cycler.evenEdges,   cycler.oddEdges,   11, 1, 2);
const cornerCPS = computeCPS(cycler.evenCorners, cycler.oddCorners,  7, 1, 3);
showCPS("Cascading Pseudo Swap (Edges) — All Parities",   edgeCPS.all,   11);
showCPS("Cascading Pseudo Swap (Edges) — Odd Parity Only", edgeCPS.odd,  11);
showCPS("Cascading Pseudo Swap (Corners) — All Parities",   cornerCPS.all, 7);
showCPS("Cascading Pseudo Swap (Corners) — Odd Parity Only", cornerCPS.odd, 7);

// ── Cycle Breaks ──
show("Edge Cycle Breaks",   'Breaks', tally(allE, c => c.breaks), eT);
show("Corner Cycle Breaks", 'Breaks', tally(allC, c => c.breaks), cT);

// ── Flip / Twist ──
show("Flipped Edges",   'Flipped', tally(allE, c => c.open1), eT);
show("Twisted Corners", 'Twisted', tally(allC, c => c.open1), cT);

// 4-flip / 3-twist probability (no cumulative — single-row events)
let fourFlip = 0, threeTwist = 0;
for (const cc of allE) if (cc.open1 >= 3) fourFlip += cc.count;
for (const cc of allC) {
  const cw = cc.cwTwist, ccw = cc.ccwTwist;
  if (cw >= 3 || ccw >= 3 || (cw === 2 && ccw === 0) || (ccw === 2 && cw === 0)) threeTwist += cc.count;
}
printTable('4-flip / 3-twist Probability', ['Event', 'Count', 'Prob'], [
  ['Edge 4-flip',    fourFlip,   (fourFlip / eT).toFixed(4)],
  ['Corner 3-twist', threeTwist, (threeTwist / cT).toFixed(4)],
]);

// ── LTCT & T2C ──
// LTCT: odd parity with exactly one twisted non-buffer corner (open1 == 1)
// T2C:  odd parity with at least one misoriented non-buffer 2-cycle (open2 >= 1)
const oddC = cycler.oddCorners;
const ltctT2c = [
  ["LTCT", cc => cc.open1 === 1],
  ["T2C",  cc => cc.open2 >= 1],
];
{
  const rows = [];
  for (const [name, pred] of ltctT2c) {
    let all = 0, odd = 0;
    for (const cc of allC) if (pred(cc)) all += cc.count;
    for (const cc of oddC) if (pred(cc)) odd += cc.count;
    rows.push([name, 'All', all, (all / cT).toFixed(4)]);
    rows.push([name, 'Odd', odd, (odd / cT).toFixed(4)]);
  }
  printTable('LTCT & T2C', ['Case', 'Parity', 'Count', 'Prob'], rows);
}

// ── Order of 3x3x3 Rubik's Cube Group Elements ──
const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a;
};

const lcm = (a, b) => a / gcd(a, b) * b;

function cycleOrder(cycle, O) {
  return cycle.ori === 0 ? cycle.perm : cycle.perm * (O / gcd(O, cycle.ori));
}

function configOrder(cc, O) {
  return cc.cycles.reduce((acc, cycle) => lcm(acc, cycleOrder(cycle, O)), 1);
}

function withOrders(configs, O) {
  return configs.map(cc => ({ order: configOrder(cc, O), count: BigInt(cc.count) }));
}

function addPairs(dist, edges, corners) {
  for (const e of edges) {
    for (const c of corners) {
      const order = lcm(e.order, c.order);
      dist.set(order, (dist.get(order) || 0n) + e.count * c.count);
    }
  }
}

const evenEdges   = withOrders(cycler.evenEdges,   2);
const oddEdges    = withOrders(cycler.oddEdges,    2);
const evenCorners = withOrders(cycler.evenCorners, 3);
const oddCorners  = withOrders(cycler.oddCorners,  3);
const dist = new Map();

addPairs(dist, evenEdges, evenCorners);
addPairs(dist, oddEdges, oddCorners);

let total = 0n;
const orderRows = [];
for (const [order, count] of [...dist].sort((a, b) => a[0] - b[0])) {
  total += count;
  orderRows.push([order, count]);
}
printTable("Order of 3x3x3 Rubik's Cube Group Elements", ['Order', 'Count'], orderRows);
console.log(`Total states: ${total}`);

// ── 4x4x4 ─────────────────────────────────────────────────────────────

const WT = 620448401733239439360000n; // 24!

function tally4(keyFn) {
  const t = new Map();
  for (const cc of cycler4.wings) t.set(keyFn(cc), (t.get(keyFn(cc)) || 0n) + cc.count);
  return [...t].sort((a, b) => a[0] - b[0]);
}

function show4(name, keyLabel, rows, denom) {
  let cum = 0n;
  const out = rows.map(([k, v]) => {
    cum += v;
    const p  = Number(v   * 100000n / denom) / 100000;
    const cp = Number(cum * 100000n / denom) / 100000;
    return [k, v, p.toFixed(4), cp.toFixed(4)];
  });
  printTable(name, [keyLabel, 'Count', 'Prob', 'Cum'], out);
}

// Wing Algs
show4('Wing Algs', 'Algs', tally4(c => c.algF3), WT);

// Wing alg means by skill level
const wingTotalNum = Number(WT);
const wingLevels = [
  { name: 'Basic',          fn: w => w.alg },
  { name: 'Basic floating', fn: w => w.algF3 },
  { name: 'Full Floating',  fn: w => w.algFF },
];
{
  const rows = wingLevels.map(lv => {
    let s = 0;
    for (const w of cycler4.wings) s += lv.fn(w) * Number(w.count);
    return [lv.name, (s / wingTotalNum).toFixed(2)];
  });
  printTable('Wing Alg Means by Skill Level', ['Skill', 'Mean'], rows);
}

show4('Wing Cycle Breaks',       'Breaks',   tally4(c => c.breaks),  WT);
show4('Solved Wings',            'Solved',   tally4(c => c.closed1), WT);
show4('Float 2-Cycles in Wings', 'Cycles',   tally4(c => c.closed2), WT);
show4('Float 3-Cycles in Wings', 'Cycles',   tally4(c => c.closed3), WT);

const cd = cycler4.centers();
const ctTotal = cd.reduce((s, [, v]) => s + v, 0);
{
  let ctCum = 0;
  const rows = cd.map(([k, v]) => {
    ctCum += v;
    return [k, v, (v / ctTotal).toFixed(4), (ctCum / ctTotal).toFixed(4)];
  });
  printTable('Unsolved x/t-Centers', ['Unsolved', 'Count', 'Prob', 'Cum'], rows);
}
