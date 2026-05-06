// Reproduction code for all statistics shown on help.html.
// Run with: node src/reproduction.js
//
// Loads the browser-style IIFEs in cycler.js and cycler4.js without modifying
// them, then prints every distribution (3BLD edges/corners and 4x4 wings/centers).

const fs = require('fs');
const path = require('path');

function loadIIFE(file, varName) {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  return new Function(src.replace(`const ${varName} = `, 'return '))();
}

const cycler  = loadIIFE('cycler.js',  'cycler');
const cycler4 = loadIIFE('cycler4.js', 'cycler4');

// ── 3BLD ──────────────────────────────────────────────────────────────

const allE = [...cycler.evenEdges, ...cycler.oddEdges];
const allC = [...cycler.evenCorners, ...cycler.oddCorners];
const eT = 980995276800, cT = 88179840;

function tally(configs, keyFn) {
  const t = new Map();
  for (const cc of configs) t.set(keyFn(cc), (t.get(keyFn(cc)) || 0) + cc.count);
  return [...t].sort((a, b) => a[0] - b[0]);
}

function show(name, rows, total) {
  console.log(`\n=== ${name} ===`);
  for (const [k, v] of rows) console.log(`${k}\t${Math.round(v)}\t${(v / total).toFixed(4)}`);
}

// Cycle Breaks
show("Edge Cycle Breaks", tally(allE, c => c.breaks), eT);
show("Corner Cycle Breaks", tally(allC, c => c.breaks), cT);

// Flip / Twist
show("Flipped Edges", tally(allE, c => c.open1), eT);
show("Twisted Corners", tally(allC, c => c.open1), cT);

// 4-flip / 3-twist Probability
let fourFlip = 0, threeTwist = 0;
for (const cc of allE) if (cc.open1 >= 3) fourFlip += cc.count;
for (const cc of allC) {
  const cw = cc.cwTwist, ccw = cc.ccwTwist;
  if (cw >= 3 || ccw >= 3 || (cw === 2 && ccw === 0) || (ccw === 2 && cw === 0)) threeTwist += cc.count;
}
console.log(`\n=== 4-flip / 3-twist Probability ===`);
console.log(`Edge 4-flip\t${fourFlip}\t${(fourFlip/eT).toFixed(4)}`);
console.log(`Corner 3-twist\t${threeTwist}\t${(threeTwist/cT).toFixed(4)}`);

// Edge / Corner / Total Algs (Basic 3-style — other skill levels derive from cc.algFullFloat etc.)
show("Edge Algs (Basic)",   tally(allE, c => c.alg), eT);
show("Corner Algs (Basic)", tally(allC, c => c.alg), cT);

// Saved-alg means by skill level
const skillLevels = [
  { name: 'Basic 3-style',           e: cc => cc.alg,                c: cc => cc.alg },
  { name: 'Floating plain 3-cycles', e: cc => cc.alg - cc.closed3,   c: cc => cc.alg - cc.closed3 },
  { name: 'Full Floating',           e: cc => cc.algFullFloat,       c: cc => cc.algFullFloat },
  { name: 'Full Floating Parity',    e: cc => cc.algFullParity,      c: cc => cc.algFullParity },
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

console.log('\n=== Saved-alg Means by Skill Level ===');
console.log('Skill\tEdge\tCorner\tTotal');
for (const lv of skillLevels) {
  const eM = avg(allE, lv.e, eT), cM = avg(allC, lv.c, cT), tM = totalAvg(lv.e, lv.c);
  console.log(`${lv.name}\t${eM.toFixed(2)}\t${cM.toFixed(2)}\t${tM.toFixed(2)}`);
}

// Cascading Pseudo Swap (buffer index distribution)
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
  console.log(`\n=== ${name} ===`);
  const t = arr.reduce((s, v) => s + v, 0);
  let cum = 0;
  for (let k = 1; k <= P; k++) {
    cum += arr[k];
    console.log(`#${k}\t${Math.round(arr[k])}\t${(arr[k] / t).toFixed(4)}\t${(cum / t).toFixed(4)}`);
  }
  console.log(`—\t${Math.round(arr[0])}\t${(arr[0] / t).toFixed(4)}\t1.0000`);
}

const edgeCPS   = computeCPS(cycler.evenEdges,   cycler.oddEdges,   11, 1, 2);
const cornerCPS = computeCPS(cycler.evenCorners, cycler.oddCorners,  7, 1, 3);
showCPS("Cascading Pseudo Swap (Edges) — No Parity Constraint", edgeCPS.all,   11);
showCPS("Cascading Pseudo Swap (Edges) — Odd Parity Only",      edgeCPS.odd,   11);
showCPS("Cascading Pseudo Swap (Corners) — No Parity Constraint", cornerCPS.all, 7);
showCPS("Cascading Pseudo Swap (Corners) — Odd Parity Only",      cornerCPS.odd, 7);

// LTCT & T2C
const oddC = cycler.oddCorners;
for (const [name, key] of [["LTCT", "open1"], ["T2C", "open2"]]) {
  let all = 0, odd = 0;
  for (const cc of allC) if (cc[key] >= 1) all += cc.count;
  for (const cc of oddC) if (cc[key] >= 1) odd += cc.count;
  console.log(`${name}\tAll\t${all}\t${(all/cT).toFixed(4)}`);
  console.log(`${name}\tOdd\t${odd}\t${(odd/cT).toFixed(4)}`);
}

// Order of 3x3x3 Rubik's Cube Group Elements
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
console.log("\n=== Order of 3x3x3 Rubik's Cube Group Elements ===");
console.log("Order\tCount");
for (const [order, count] of [...dist].sort((a, b) => a[0] - b[0])) {
  total += count;
  console.log(`${order}\t${count}`);
}
console.log(`Total states: ${total}`);

// ── 4x4x4 ─────────────────────────────────────────────────────────────

const WT = 620448401733239439360000n; // 24!

function tally4(keyFn) {
  const t = new Map();
  for (const cc of cycler4.wings) t.set(keyFn(cc), (t.get(keyFn(cc)) || 0n) + cc.count);
  return [...t].sort((a, b) => a[0] - b[0]);
}

function show4(name, rows, denom, fmt = k => k) {
  console.log(`\n=== ${name} ===`);
  for (const [k, v] of rows) {
    const p = Number(v * 100000n / denom) / 100000;
    console.log(`${fmt(k)}\t${v}\t${p.toFixed(4)}`);
  }
}

show4('Wing Algs',               tally4(c => c.algF3),   WT);
show4('Wing Cycle Breaks',       tally4(c => c.breaks),  WT);
show4('Solved Wings',            tally4(c => c.closed1), WT);
show4('Float 2-Cycles in Wings', tally4(c => c.closed2), WT);
show4('Float 3-Cycles in Wings', tally4(c => c.closed3), WT);

// Wing alg means by skill level
const wingTotalNum = Number(WT);
const wingLevels = [
  { name: 'Basic',          fn: w => w.alg },
  { name: 'Basic floating', fn: w => w.algF3 },
  { name: 'Full Floating',  fn: w => w.algFF },
];
console.log('\n=== Wing Alg Means by Skill Level ===');
console.log('Skill\tMean');
for (const lv of wingLevels) {
  let s = 0;
  for (const w of cycler4.wings) s += lv.fn(w) * Number(w.count);
  console.log(`${lv.name}\t${(s / wingTotalNum).toFixed(2)}`);
}

const cd = cycler4.centers();
const ctTotal = cd.reduce((s, [, v]) => s + v, 0);
console.log('\n=== Unsolved x/t-Centers ===');
for (const [k, v] of cd) console.log(`${k}\t${v}\t${(v / ctTotal).toFixed(4)}`);
