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

// Float 3-Cycles
show("Float 3-Cycle Edges", tally(allE, c => c.closed3), eT);
show("Float 3-Cycle Corners", tally(allC, c => c.closed3), cT);

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

show4('Wing Algs',               tally4(c => c.algs2),   WT, k => `${k / 2}`);
show4('Wing Cycle Breaks',       tally4(c => c.breaks),  WT);
show4('Solved Wings',            tally4(c => c.closed1), WT);
show4('Float 2-Cycles in Wings', tally4(c => c.closed2), WT);
show4('Float 3-Cycles in Wings', tally4(c => c.closed3), WT);

const cd = cycler4.centers();
const ctTotal = cd.reduce((s, [, v]) => s + v, 0);
console.log('\n=== Unsolved x/t-Centers ===');
for (const [k, v] of cd) console.log(`${k}\t${v}\t${(v / ctTotal).toFixed(4)}`);
