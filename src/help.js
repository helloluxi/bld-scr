function edgeAlgH(cc, s) {
  if (s.fullParity) return cc.algFullParity;
  if (s.fullEdge) return cc.algFullFloat;
  if (s.naiveEdge) return cc.alg - cc.closed3;
  return cc.alg;
}
function cornerAlgH(cc, s) {
  if (s.fullParity) return cc.algFullParity;
  if (s.fullCorner) return cc.algFullFloat;
  if (s.naiveCorner) return cc.alg - cc.closed3;
  return cc.alg;
}

const isZh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
const t = {
  edge: isZh ? '棱块' : 'Edge',
  corner: isZh ? '角块' : 'Corner',
  total: isZh ? '总计' : 'Total',
  alg: isZh ? '公式' : 'Algs',
  count: isZh ? '计数' : 'Count',
  probability: isZh ? '概率' : 'Probability',
  cumulative: isZh ? '累积' : 'Cumulative',
  mean: isZh ? '均值' : 'mean',
  std: isZh ? '标准差' : 'std',
  basic: isZh ? '基础' : 'Basic',
  naiveFloat3: isZh ? '只浮动三循环' : 'Naive Float 3-Cycle',
  fullFloat: isZh ? '全浮动' : 'Full Floating',
  fullFloatParity: isZh ? '全浮动奇偶' : 'Full Floating Parity',
  parityEven: isZh ? '偶' : 'even',
  parityOdd: isZh ? '奇' : 'odd',
  parity: isZh ? '奇偶' : 'Parity',
  breaks: isZh ? '小循环' : 'Breaks',
  workedEdges: isZh ? '棱块' : 'Edges',
  workedCorners: isZh ? '角块' : 'Corners',
  parityError: isZh ? '奇偶检查失败' : 'Parity check failed',
  reductionLogic: isZh ? '归约逻辑' : 'reduction logic',
};

function edgeSkillLabel(s) {
  if (s.fullParity) return t.fullFloatParity;
  if (s.fullEdge) return t.fullFloat;
  if (s.naiveEdge) return t.naiveFloat3;
  return t.basic;
}
function cornerSkillLabel(s) {
  if (s.fullParity) return t.fullFloatParity;
  if (s.fullCorner) return t.fullFloat;
  if (s.naiveCorner) return t.naiveFloat3;
  return t.basic;
}
function totalSkillLabel(s) {
  const e = edgeSkillLabel(s), c = cornerSkillLabel(s);
  return e === c ? e : `${e} + ${c}`;
}

function getHelpSkills() {
  return {
    naiveEdge:   document.getElementById('h-skill-naive-edge').checked,
    fullEdge:    document.getElementById('h-skill-fullfloat-edge').checked,
    naiveCorner: document.getElementById('h-skill-naive-corner').checked,
    fullCorner:  document.getElementById('h-skill-fullfloat-corner').checked,
    fullParity:  document.getElementById('h-skill-fullfloat-parity').checked,
  };
}

function tallyByAlg(configs, algFn, skills) {
  const t = new Map();
  for (const cc of configs) {
    const k = algFn(cc, skills);
    t.set(k, (t.get(k) || 0) + cc.count);
  }
  return [...t].sort((a, b) => a[0] - b[0]);
}

function distToRows(dist, total) {
  const rows = []; let cum = 0;
  for (const [k, v] of dist) {
    cum += v;
    rows.push({ label: k, value: v, probability: v / total, cumulative: cum / total });
  }
  return rows;
}

function meanStd(rows) {
  let mean = 0, variance = 0;
  for (const r of rows) mean += r.label * r.probability;
  for (const r of rows) variance += Math.pow(r.label - mean, 2) * r.probability;
  return { mean, std: Math.sqrt(variance) };
}

function renderTable(tableEl, rows) {
  let html = `<tr><th>${t.alg}</th><th>${t.count}</th><th>${t.probability}</th><th>${t.cumulative}</th></tr>`;
  for (const r of rows) {
    html += `<tr><td>${r.label}</td><td>${Math.round(r.value)}</td><td>${r.probability.toFixed(4)}</td><td>${r.cumulative.toFixed(4)}</td></tr>`;
  }
  tableEl.innerHTML = html;
}

function renderChart(mount, rows, title) {
  if (typeof chartUtils === 'undefined') return;
  mount.innerHTML = '';
  chartUtils.renderChartInMount(
    mount,
    rows.map(r => r.label),
    rows.map(r => r.probability),
    title,
    { spaced: rows.length <= 5 }
  );
}

function lastTbody(stat) {
  const t = document.querySelector(`[data-stat="${stat}"]`);
  if (!t) return null;
  const tbodies = t.querySelectorAll('tbody');
  return tbodies[tbodies.length - 1] || null;
}

function populateStaticTables() {
  const allE = [...cycler.evenEdges, ...cycler.oddEdges];
  const allC = [...cycler.evenCorners, ...cycler.oddCorners];
  const eT = 980995276800, cT = 88179840;

  function tally(configs, keyFn) {
    const m = new Map();
    for (const cc of configs) m.set(keyFn(cc), (m.get(keyFn(cc)) || 0) + cc.count);
    return [...m].sort((a, b) => a[0] - b[0]);
  }

  function fillTbody(stat, html) {
    const tbody = lastTbody(stat);
    if (tbody) tbody.innerHTML = html;
  }

  function probRows(rows, total) {
    return rows.map(([k, v]) =>
      `<tr><td>${k}</td><td>${Math.round(v)}</td><td>${(v / total).toFixed(4)}</td></tr>`
    ).join('');
  }

  // Cycle Breaks
  fillTbody('edge-breaks',   probRows(tally(allE, c => c.breaks), eT));
  fillTbody('corner-breaks', probRows(tally(allC, c => c.breaks), cT));

  // Flip / Twist
  fillTbody('edge-flipped',   probRows(tally(allE, c => c.open1), eT));
  fillTbody('corner-twisted', probRows(tally(allC, c => c.open1), cT));

  // Float 3-Cycles
  fillTbody('edge-float3',   probRows(tally(allE, c => c.closed3), eT));
  fillTbody('corner-float3', probRows(tally(allC, c => c.closed3), cT));

  // LTCT / T2C (odd parity, with at least one open1 / open2 secondary cycle)
  let ltct = 0, t2c = 0;
  for (const cc of cycler.oddCorners) {
    if (cc.open1 >= 1) ltct += cc.count;
    if (cc.open2 >= 1) t2c  += cc.count;
  }
  fillTbody('ltct-t2c',
    `<tr><td>LTCT</td><td>${ltct.toLocaleString()}</td><td>${(ltct / cT).toFixed(4)}</td></tr>` +
    `<tr><td>T2C</td><td>${t2c.toLocaleString()}</td><td>${(t2c / cT).toFixed(4)}</td></tr>`
  );

  // Fixed Break-In Swap
  populateBreakInSwap();

  // Order distribution
  populateOrderTable();
}

function populateBreakInSwap() {
  const noP  = lastTbody('bis-no-parity');
  const oddP = lastTbody('bis-odd');
  if (!noP && !oddP) return;

  function falling(x, k) { let r = 1; for (let i = 0; i < k; i++) r *= (x - i); return r; }

  const res = new Array(12).fill(0), resOdd = new Array(12).fill(0);
  function process(cc, isOdd) {
    const p0 = cc.cycles[0].perm, f1 = cc.closed1;
    const h = (p0 > 1) ? 1 : 0;
    const n0 = Math.max(0, p0 - 2) + f1, a0 = 11 - h - n0;
    const vcs = h === 0
      ? [[cc.count, a0, 11 - a0]]
      : [[cc.count / 2, a0 + 1, 11 - a0 - 1],
         [cc.count / 2, a0,     11 - a0]];
    for (const [w, a, n] of vcs) {
      if (a === 0) { res[0] += w; if (isOdd) resOdd[0] += w; continue; }
      for (let k = 1; k <= 11; k++) {
        if (k - 1 > n) break;
        const c = w * a * falling(n, k - 1) / falling(11, k);
        res[k] += c;
        if (isOdd) resOdd[k] += c;
      }
    }
  }
  cycler.evenEdges.forEach(cc => process(cc, false));
  cycler.oddEdges .forEach(cc => process(cc, true));

  function render(arr) {
    const tot = arr.reduce((s, v) => s + v, 0);
    let html = '', cum = 0;
    for (let k = 1; k <= 11; k++) {
      cum += arr[k];
      html += `<tr><td>#${k}</td><td>${Math.round(arr[k])}</td><td>${(arr[k] / tot).toFixed(4)}</td><td>${(cum / tot).toFixed(4)}</td></tr>`;
    }
    html += `<tr><td>—</td><td>${Math.round(arr[0])}</td><td>${(arr[0] / tot).toFixed(4)}</td><td>1.0000</td></tr>`;
    return html;
  }
  if (noP)  noP .innerHTML = render(res);
  if (oddP) oddP.innerHTML = render(resOdd);
}

function populateOrderTable() {
  const el = lastTbody('order');
  if (!el) return;
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  const cycleOrder = (c, O) => c.ori === 0 ? c.perm : c.perm * (O / gcd(O, c.ori));
  const configOrder = (cc, O) => cc.cycles.reduce((acc, c) => lcm(acc, cycleOrder(c, O)), 1);
  const withOrders = (configs, O) => configs.map(cc => ({ order: configOrder(cc, O), count: BigInt(cc.count) }));
  function addPairs(dist, edges, corners) {
    for (const e of edges) for (const c of corners) {
      const o = lcm(e.order, c.order);
      dist.set(o, (dist.get(o) || 0n) + e.count * c.count);
    }
  }
  const evenE = withOrders(cycler.evenEdges,   2);
  const oddE  = withOrders(cycler.oddEdges,    2);
  const evenC = withOrders(cycler.evenCorners, 3);
  const oddC  = withOrders(cycler.oddCorners,  3);
  const dist = new Map();
  addPairs(dist, evenE, evenC);
  addPairs(dist, oddE,  oddC);
  el.innerHTML = [...dist].sort((a, b) => a[0] - b[0])
    .map(([order, count]) => `<tr><td>${order}</td><td>${count}</td></tr>`).join('');
}

function updateAlgsSection() {
  const skills = getHelpSkills();
  const eLabel = edgeSkillLabel(skills);
  const cLabel = cornerSkillLabel(skills);
  const tLabel = totalSkillLabel(skills);
  const eT = 980995276800, cT = 88179840;

  // Edge
  const edgeDist = tallyByAlg([...cycler.evenEdges, ...cycler.oddEdges], edgeAlgH, skills);
  const edgeRows = distToRows(edgeDist, eT);
  const es = meanStd(edgeRows);
  document.getElementById('edge-algs-summary').textContent = `${t.edge} ${t.alg} (${eLabel})`;
  renderTable(document.getElementById('edge-algs-table'), edgeRows);
  renderChart(document.getElementById('edge-algs-chart'), edgeRows, `${t.edge} ${t.alg} (${eLabel})`);
  document.getElementById('edge-algs-stats').textContent = `${t.edge}${t.mean} (${eLabel.toLowerCase()}): ${es.mean.toFixed(2)}, ${t.std}: ${es.std.toFixed(2)}`;

  // Corner
  const cornerDist = tallyByAlg([...cycler.evenCorners, ...cycler.oddCorners], cornerAlgH, skills);
  const cornerRows = distToRows(cornerDist, cT);
  const cs = meanStd(cornerRows);
  document.getElementById('corner-algs-summary').textContent = `${t.corner} ${t.alg} (${cLabel})`;
  renderTable(document.getElementById('corner-algs-table'), cornerRows);
  renderChart(document.getElementById('corner-algs-chart'), cornerRows, `${t.corner} ${t.alg} (${cLabel})`);
  document.getElementById('corner-algs-stats').textContent = `${t.corner}${t.mean} (${cLabel.toLowerCase()}): ${cs.mean.toFixed(2)}, ${t.std}: ${cs.std.toFixed(2)}`;

  // Total (convolve edge+corner with parity matching)
  const edgeByParity = [new Map(), new Map()];
  for (const cc of [...cycler.evenEdges, ...cycler.oddEdges]) {
    const k = edgeAlgH(cc, skills);
    edgeByParity[cc.parity].set(k, (edgeByParity[cc.parity].get(k) || 0) + cc.count);
  }
  const cornerByParity = [new Map(), new Map()];
  for (const cc of [...cycler.evenCorners, ...cycler.oddCorners]) {
    const k = cornerAlgH(cc, skills);
    cornerByParity[cc.parity].set(k, (cornerByParity[cc.parity].get(k) || 0) + cc.count);
  }
  const totalDist = new Map();
  let totalWeight = 0;
  for (let p = 0; p <= 1; p++) {
    let eSum = 0, cSum = 0;
    for (const v of edgeByParity[p].values()) eSum += v;
    for (const v of cornerByParity[p].values()) cSum += v;
    totalWeight += eSum * cSum;
    for (const [ek, ev] of edgeByParity[p]) {
      for (const [ck, cv] of cornerByParity[p]) {
        const t = ek + ck;
        totalDist.set(t, (totalDist.get(t) || 0) + ev * cv);
      }
    }
  }
  const totalRows = distToRows([...totalDist].sort((a, b) => a[0] - b[0]), totalWeight);
  const ts = meanStd(totalRows);
  document.getElementById('total-algs-summary').textContent = `${t.total} ${t.alg} (${tLabel})`;
  renderTable(document.getElementById('total-algs-table'), totalRows);
  renderChart(document.getElementById('total-algs-chart'), totalRows, `${t.total} ${t.alg} (${tLabel})`);
  document.getElementById('total-algs-stats').textContent = `${t.total}${t.mean} (${tLabel.toLowerCase()}): ${ts.mean.toFixed(2)}, ${t.std}: ${ts.std.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  // Self-test
  const test = cycler.selfTest();
  if (test.errors > 0) {
    const errEl = document.getElementById('algs-error');
    errEl.style.display = '';
    errEl.textContent = `${t.parityError}: ${test.errors} ${isZh ? '处' : ''}${t.reductionLogic}${isZh ? '错误。' : ' errors.'}`;
  }

  // Wire up skill checkboxes
  document.querySelectorAll('.skill-checkboxes input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.id === 'h-skill-fullfloat-parity' && cb.checked) {
        ['h-skill-fullfloat-edge', 'h-skill-fullfloat-corner',
         'h-skill-naive-edge', 'h-skill-naive-corner'].forEach(id =>
          document.getElementById(id).checked = true);
      }
      updateAlgsSection();
    });
  });

  // Populate static data tables from cycler.js (must run before chart parsing)
  populateStaticTables();

  // Static charts (non-algs)
  document.querySelectorAll('.help-chart').forEach(mount => {
    if (mount.id) return; // skip dynamic charts
    const table = mount.previousElementSibling;
    if (!table || table.tagName !== 'TABLE') return;
    const rows = chartUtils.parseProbabilityTable(table);
    chartUtils.renderChartInMount(
      mount,
      rows.map(row => row.label),
      rows.map(row => row.value),
      mount.dataset.chartTitle || '',
      { spaced: mount.dataset.chartSpaced !== 'false' && rows.length <= 5 }
    );
  });

  updateAlgsSection();

  // Random worked example
  function rollExample() {
    const out = document.getElementById('worked-example-output');
    const bugEl = document.getElementById('worked-example-bug');

    // Weighted pick proportional to count
    function pickWeighted(configs) {
      let total = 0;
      for (const cc of configs) total += cc.count;
      let r = Math.random() * total;
      for (const cc of configs) { r -= cc.count; if (r <= 0) return cc; }
      return configs[configs.length - 1];
    }

    // Decide parity proportionally: weight = evenEdgeTotal*evenCornerTotal vs oddEdgeTotal*oddCornerTotal
    let evenW = 0, oddW = 0;
    for (const cc of cycler.evenEdges) evenW += cc.count;
    for (const cc of cycler.oddEdges) oddW += cc.count;
    const parity = Math.random() < evenW / (evenW + oddW) ? 0 : 1;
    const eCC = pickWeighted(parity === 0 ? cycler.evenEdges : cycler.oddEdges);
    const cCC = pickWeighted(parity === 0 ? cycler.evenCorners : cycler.oddCorners);

    function fmtHalf(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }

    function fmtCycles(cycles) {
      // Group secondaries by (perm, ori), show e.g. (2,1)*3
      const sec = cycles.slice(1);
      const groups = [];
      for (const c of sec) {
        const key = `(${c.perm},${c.ori})`;
        const last = groups[groups.length - 1];
        if (last && last.key === key) last.n++;
        else groups.push({ key, n: 1 });
      }
      return groups.map(g => g.n > 1 ? g.key + '*' + g.n : g.key).join(' + ');
    }

    function renderConfig(label, cc) {
      const buf = cc.cycles[0];
      const parityStr = cc.parity ? t.parityOdd : t.parityEven;
      const secondary = fmtCycles(cc.cycles);
      const cfgTitle = secondary
        ? `(${buf.perm},${buf.ori}) + ${secondary}`
        : `(${buf.perm},${buf.ori})`;
      let h = `<h3>${label}: ${cfgTitle}</h3>`;
      h += '<table class="worked-example-table">';
      h += `<tr><td>${t.parity}</td><td>${parityStr}</td></tr>`;
      h += `<tr><td>${t.breaks}</td><td>${cc.breaks}</td></tr>`;
      h += `<tr><td>${t.count}</td><td>${cc.count.toLocaleString()}</td></tr>`;
      h += `<tr><td>${t.alg} (${t.basic})</td><td>${fmtHalf(cc.alg)}</td></tr>`;
      h += `<tr><td>${t.alg} (${t.naiveFloat3})</td><td>${fmtHalf(cc.alg - cc.closed3)}</td></tr>`;
      h += `<tr><td>${t.alg} (${t.fullFloat})</td><td>${fmtHalf(cc.algFullFloat)}</td></tr>`;
      h += `<tr><td>${t.alg} (${t.fullFloatParity})</td><td>${fmtHalf(cc.algFullParity)}</td></tr>`;
      h += '</table>';
      return h;
    }

    let h = '';

    // Generate scramble first
    try {
      const eRef = eCC, cRef = cCC;
      scrambler.getProbabilityFromBoolFunction(x => x === eRef, x => x === cRef);
      if (scrambler.isValid()) {
        h += `<p><code>${scrambler.getScramble()}</code></p>`;
        bugEl.style.display = '';
      }
    } catch (e) {}

    h += renderConfig(t.workedEdges, eCC) + renderConfig(t.workedCorners, cCC);
    out.innerHTML = h;
  }

  document.getElementById('reroll-btn').addEventListener('click', rollExample);
  rollExample();

  // Saved-alg statistics
  (function() {
    const eT = 980995276800, cT = 88179840;
    const allE = [...cycler.evenEdges, ...cycler.oddEdges];
    const allC = [...cycler.evenCorners, ...cycler.oddCorners];

    function avg(configs, fn, total) {
      let s = 0;
      for (const cc of configs) s += fn(cc) * cc.count;
      return s / total;
    }

    const levels = [
      { name: t.basic, e: cc => cc.alg, c: cc => cc.alg },
      { name: isZh ? '只浮动三循环' : 'Naive float 3-style', e: cc => cc.alg - cc.closed3, c: cc => cc.alg - cc.closed3 },
      { name: t.fullFloat, e: cc => cc.algFullFloat, c: cc => cc.algFullFloat },
      { name: t.fullFloatParity, e: cc => cc.algFullParity, c: cc => cc.algFullParity },
    ];

    // Total by parity convolution
    function totalAvg(eFn, cFn) {
      const eByP = [new Map(), new Map()];
      const cByP = [new Map(), new Map()];
      for (const cc of allE) { const k = eFn(cc); eByP[cc.parity].set(k, (eByP[cc.parity].get(k) || 0) + cc.count); }
      for (const cc of allC) { const k = cFn(cc); cByP[cc.parity].set(k, (cByP[cc.parity].get(k) || 0) + cc.count); }
      let w = 0, ws = 0;
      for (let p = 0; p <= 1; p++) {
        let eS = 0, cS = 0;
        for (const v of eByP[p].values()) eS += v;
        for (const v of cByP[p].values()) cS += v;
        w += eS * cS;
        for (const [ek, ev] of eByP[p]) {
          for (const [ck, cv] of cByP[p]) {
            ws += (ek + ck) * ev * cv;
          }
        }
      }
      return ws / w;
    }

    let baseE = null, baseC = null, baseT = null;
    const totalsByName = {};
    const tbody = document.querySelector('#saved-algs-table tbody');
    for (const lv of levels) {
      const eM = avg(allE, lv.e, eT);
      const cM = avg(allC, lv.c, cT);
      const tM = totalAvg(lv.e, lv.c);
      totalsByName[lv.name] = tM;
      if (baseE === null) { baseE = eM; baseC = cM; baseT = tM; }
      const fmt = v => v.toFixed(2);
      const saved = (cur, base) => (base - cur).toFixed(2);
      tbody.innerHTML += `<tr><td>${lv.name}</td><td>${fmt(eM)}</td><td>${saved(eM, baseE)}</td><td>${fmt(cM)}</td><td>${saved(cM, baseC)}</td><td>${fmt(tM)}</td><td>${saved(tM, baseT)}</td></tr>`;
    }
    const fmtNum = n => n.toLocaleString('en-US');
    const floatAlgs = 2768;
    const parityAlgs = 11088;
    const savedFull = totalsByName[isZh ? '只浮动三循环' : 'Naive float 3-style'] - totalsByName[t.fullFloat];
    const savedParity = totalsByName[t.fullFloat] - totalsByName[t.fullFloatParity];
    document.getElementById('saved-algs-quip').textContent = isZh
      ? `你真的会想背 ${fmtNum(floatAlgs)} 个全浮动 3-style 公式，只为了平均每把少 ${savedFull.toFixed(2)} 个公式；再多 ${fmtNum(parityAlgs)} 个全浮动奇偶公式，也只再少背 ${savedParity.toFixed(2)} 个公式吗？这些都只是理论上界，还没考虑人类实际能力。人生苦短，别背了～`
      : `Bruh, would you really want to learn ${fmtNum(floatAlgs)} full-floating 3-style algs just to save ${savedFull.toFixed(2)} algs per scramble on average, and another ${fmtNum(parityAlgs)} full-floating parity algs just to save ${savedParity.toFixed(2)} algs per scramble? These are only theoretical upper bounds, without accounting for human-level practicality. Life is short, be happy :)`;

    // Saved-alg distribution per skill level (vs Basic)
    const distLevels = [
      { name: isZh ? '只浮动三循环' : 'Naive float 3-style', e: cc => cc.closed3,            c: cc => cc.closed3 },
      { name: t.fullFloat,       e: cc => cc.alg - cc.algFullFloat,  c: cc => cc.alg - cc.algFullFloat },
      { name: t.fullFloatParity, e: cc => cc.alg - cc.algFullParity, c: cc => cc.alg - cc.algFullParity },
    ];

    function savedDist(configs, fn, total) {
      const m = new Map();
      for (const cc of configs) {
        const k = fn(cc);
        m.set(k, (m.get(k) || 0) + cc.count);
      }
      const out = new Map();
      for (const [k, v] of m) out.set(k, v / total);
      return out;
    }

    function renderSavedDist(tableEl, configs, pick, total) {
      const dists = distLevels.map(lv => savedDist(configs, pick(lv), total));
      const keys = new Set();
      for (const d of dists) for (const k of d.keys()) keys.add(k);
      const sorted = [...keys].sort((a, b) => a - b);
      const fmtK = k => Number.isInteger(k) ? String(k) : k.toFixed(1);
      let html = `<thead><tr><th>${isZh ? '节省' : 'Saved'}</th>` +
        distLevels.map(lv => `<th>${lv.name}</th>`).join('') + `</tr></thead><tbody>`;
      for (const k of sorted) {
        html += `<tr><td>${fmtK(k)}</td>` +
          dists.map(d => `<td>${(d.get(k) || 0).toFixed(4)}</td>`).join('') + `</tr>`;
      }
      html += '</tbody>';
      tableEl.innerHTML = html;
    }

    const edgeDistEl = document.getElementById('saved-algs-edge-dist-table');
    const cornerDistEl = document.getElementById('saved-algs-corner-dist-table');
    if (edgeDistEl)   renderSavedDist(edgeDistEl,   allE, lv => lv.e, eT);
    if (cornerDistEl) renderSavedDist(cornerDistEl, allC, lv => lv.c, cT);
  })();
});
