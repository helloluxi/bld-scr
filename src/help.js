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
  advanced: isZh ? '进阶' : 'Advanced',
  naiveFloat3: isZh ? '仅浮动纯三循环' : 'Float plain 3-cycle only',
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
  flipTwist: isZh ? '翻色' : 'Flip / Twist',
  rawMemo: isZh ? '原始编码' : 'Raw Memo',
  execution: isZh ? '执行' : 'Execution',
};

function edgeSkillLabel(s) {
  if (s.basicEdge) return t.basic;
  if (s.naiveEdge) return t.naiveFloat3;
  if (s.fullEdge) return t.fullFloat;
  return t.basic;
}
function cornerSkillLabel(s) {
  if (s.basicCorner) return t.basic;
  if (s.naiveCorner) return t.naiveFloat3;
  if (s.fullCorner) return t.fullFloat;
  return t.basic;
}
function totalSkillLabel(s) {
  const e = edgeSkillLabel(s), c = cornerSkillLabel(s);
  const parityLabel = s.basicParity ? '' : s.fullParity ? ` + ${t.fullFloatParity}` : '';
  const base = e === c ? e : `${e} + ${c}`;
  return base + parityLabel;
}

function getHelpSkills() {
  return {
    naiveEdge:   document.getElementById('h-skill-naive-edge').checked,
    fullEdge:    document.getElementById('h-skill-fullfloat-edge').checked,
    naiveCorner: document.getElementById('h-skill-naive-corner').checked,
    fullCorner:  document.getElementById('h-skill-fullfloat-corner').checked,
    fullParity:  document.getElementById('h-skill-fullfloat-parity').checked,
    basicEdge:   document.getElementById('h-skill-basic-edge').checked,
    basicCorner: document.getElementById('h-skill-basic-corner').checked,
    basicParity: document.getElementById('h-skill-basic-parity').checked,
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
  renderTable(document.getElementById('edge-algs-table'), edgeRows);
  renderChart(document.getElementById('edge-algs-chart'), edgeRows, '');
  document.getElementById('edge-algs-stats').textContent = `${t.edge}${t.mean} (${eLabel.toLowerCase()}): ${es.mean.toFixed(2)}, ${t.std}: ${es.std.toFixed(2)}`;

  // Corner
  const cornerDist = tallyByAlg([...cycler.evenCorners, ...cycler.oddCorners], cornerAlgH, skills);
  const cornerRows = distToRows(cornerDist, cT);
  const cs = meanStd(cornerRows);
  renderTable(document.getElementById('corner-algs-table'), cornerRows);
  renderChart(document.getElementById('corner-algs-chart'), cornerRows, '');
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
  renderTable(document.getElementById('total-algs-table'), totalRows);
  renderChart(document.getElementById('total-algs-chart'), totalRows, '');
  document.getElementById('total-algs-stats').textContent = `${t.total}${t.mean} (${tLabel.toLowerCase()}): ${ts.mean.toFixed(2)}, ${t.std}: ${ts.std.toFixed(2)}`;
}

function populateBigBldTables() {
  if (typeof cycler4 === 'undefined') return 0;
  const t0 = performance.now();

  const { wings, centers } = cycler4;

  let wingTotal = 0n;
  for (const w of wings) wingTotal += w.count;
  const wingTotalNum = Number(wingTotal);

  function tallyBigInt(keyFn) {
    const m = new Map();
    for (const w of wings) {
      const k = keyFn(w);
      m.set(k, (m.get(k) || 0n) + w.count);
    }
    return [...m].sort((a, b) => a[0] - b[0]);
  }

  function fillBigBld(stat, rows, fmtLabel) {
    const tbody = lastTbody(stat);
    if (!tbody) return;
    tbody.innerHTML = rows.map(([k, v]) =>
      `<tr><td>${fmtLabel ? fmtLabel(k) : k}</td><td>${v}</td><td>${(Number(v) / wingTotalNum).toFixed(4)}</td></tr>`
    ).join('');
  }

  fillBigBld('wing-breaks', tallyBigInt(w => w.breaks));
  fillBigBld('wing-solved', tallyBigInt(w => w.closed1));
  fillBigBld('wing-float2', tallyBigInt(w => w.closed2));
  fillBigBld('wing-float3', tallyBigInt(w => w.closed3));

  const centerData = centers();
  const centerTotal = centerData.reduce((s, [, c]) => s + c, 0);
  const centerTbody = lastTbody('wing-centers');
  if (centerTbody) {
    let meanC = 0;
    centerTbody.innerHTML = centerData.map(([u, c]) => {
      const p = c / centerTotal;
      meanC += u * p;
      return `<tr><td>${u}</td><td>${c}</td><td>${p.toFixed(4)}</td></tr>`;
    }).join('');
    const meanEl = document.getElementById('bigbld-centers-mean');
    if (meanEl) meanEl.textContent = `Mean: ${Math.round(meanC)}`;
  }

  updateWingAlgsTable();

  const elapsed = performance.now() - t0;
  const timingEl = document.getElementById('bigbld-timing');
  if (timingEl) timingEl.textContent = `Computed in ${elapsed.toFixed(0)} ms`;
  return elapsed;
}

function updateWingAlgsTable() {
  if (typeof cycler4 === 'undefined') return;
  const { wings } = cycler4;

  const skill = document.getElementById('bigbld-skill-full').checked ? 'full'
    : document.getElementById('bigbld-skill-naive').checked ? 'naive' : 'basic';
  const evenChecked = document.getElementById('bigbld-parity-even').checked;
  const oddChecked = document.getElementById('bigbld-parity-odd').checked;
  const bothChecked = document.getElementById('bigbld-parity-both').checked;
  const parity = evenChecked && !oddChecked ? 'even' : oddChecked && !evenChecked ? 'odd' : 'total';

  const algKey = w => skill === 'full' ? w.algFullFloat2
    : skill === 'naive' ? w.algs2
    : w.algs2 + 2 * w.closed3;

  const m = new Map();
  for (const w of wings) {
    const a2 = algKey(w);
    const isOdd = a2 % 2 === 1;
    if (parity === 'even' && isOdd) continue;
    if (parity === 'odd' && !isOdd) continue;
    const k = Math.ceil(a2 / 2);
    m.set(k, (m.get(k) || 0n) + w.count);
  }
  const sorted = [...m].sort((a, b) => a[0] - b[0]);

  let total = 0n;
  for (const [, v] of sorted) total += v;
  const totalNum = Number(total);

  const tbody = lastTbody('wing-algs');
  if (!tbody) return;
  let cum = 0;
  tbody.innerHTML = sorted.map(([k, v]) => {
    const p = Number(v) / totalNum;
    cum += p;
    return `<tr><td>${k}</td><td>${v}</td><td>${p.toFixed(4)}</td><td>${cum.toFixed(4)}</td></tr>`;
  }).join('');

  let mean = 0, variance = 0;
  for (const [k, v] of sorted) { const p = Number(v) / totalNum; mean += k * p; }
  for (const [k, v] of sorted) { const p = Number(v) / totalNum; variance += Math.pow(k - mean, 2) * p; }
  const statsEl = document.getElementById('bigbld-wing-algs-stats');
  if (statsEl) statsEl.textContent = `${t.mean}: ${mean.toFixed(2)}, ${t.std}: ${Math.sqrt(variance).toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  let t3bld = 0, tBigBld = 0;

  // Self-test
  const test = cycler.selfTest();
  if (test.errors > 0) {
    const errEl = document.getElementById('algs-error');
    errEl.style.display = '';
    errEl.textContent = `${t.parityError}: ${test.errors} ${isZh ? '处' : ''}${t.reductionLogic}${isZh ? '错误。' : ' errors.'}`;
  }

  // Wire up 3BLD skill checkboxes (row-exclusive)
  document.querySelectorAll('#algs-card .skill-checkboxes input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      // Row-exclusive behavior: only one checked per row
      if (cb.checked) {
        cb.closest('.parity-checkbox-row').querySelectorAll('input[type="checkbox"]').forEach(o => { if (o !== cb) o.checked = false; });
      } else {
        // Ensure at least one is always checked (re-check Basic if nothing is)
        const row = cb.closest('.parity-checkbox-row');
        const anyChecked = row.querySelector('input[type="checkbox"]:checked');
        if (!anyChecked) {
          const basicCb = row.querySelector('input[type="checkbox"][id*="-basic"]');
          if (basicCb) basicCb.checked = true;
        }
      }
      // When Full Floating Parity is checked, auto-check full floating for edge/corner and uncheck others
      if (cb.id === 'h-skill-fullfloat-parity' && cb.checked) {
        document.getElementById('h-skill-fullfloat-edge').checked = true;
        document.getElementById('h-skill-naive-edge').checked = false;
        document.getElementById('h-skill-basic-edge').checked = false;
        document.getElementById('h-skill-fullfloat-corner').checked = true;
        document.getElementById('h-skill-naive-corner').checked = false;
        document.getElementById('h-skill-basic-corner').checked = false;
      }
      // Uncheck Full Floating Parity if either edge or corner is not full floating
      const pCb = document.getElementById('h-skill-fullfloat-parity');
      if (pCb.checked && (!document.getElementById('h-skill-fullfloat-edge').checked || !document.getElementById('h-skill-fullfloat-corner').checked))
        pCb.checked = false;
      updateAlgsSection();
    });
  });

  // Populate static data tables from cycler.js (must run before chart parsing)
  const t0 = performance.now();
  populateStaticTables();
  updateAlgsSection();
  t3bld = performance.now() - t0;

  // Populate Big BLD tables from cycler4.js
  tBigBld = populateBigBldTables();

  // Wire up Big BLD skill checkboxes
  document.querySelectorAll('#bigbld .skill-checkboxes input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      // Skill row: exclusive (always one checked)
      if (cb.id.includes('skill')) {
        if (cb.checked) {
          cb.closest('.parity-checkbox-row').querySelectorAll('input[type="checkbox"]').forEach(o => { if (o !== cb) o.checked = false; });
        } else {
          // Ensure at least one is always checked
          const row = cb.closest('.parity-checkbox-row');
          const anyChecked = row.querySelector('input[type="checkbox"]:checked');
          if (!anyChecked) {
            const basicCb = row.querySelector('input[type="checkbox"][id*="basic"]');
            if (basicCb) basicCb.checked = true;
          }
        }
      }
      // Parity row: non-exclusive, "Both" option available
      // When "Both" is checked, uncheck individual parities
      if (cb.id === 'bigbld-parity-both' && cb.checked) {
        document.getElementById('bigbld-parity-even').checked = false;
        document.getElementById('bigbld-parity-odd').checked = false;
      }
      // When individual parity is checked, uncheck "Both"
      if ((cb.id === 'bigbld-parity-even' || cb.id === 'bigbld-parity-odd') && cb.checked) {
        document.getElementById('bigbld-parity-both').checked = false;
      }
      updateWingAlgsTable();
    });
  });

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

    function fmtHalf(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }

    function fmtCycles(cycles) {
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

    function fmtConfig(cc) {
      const buf = cc.cycles[0];
      const secondary = fmtCycles(cc.cycles);
      return secondary ? `(${buf.perm},${buf.ori}) + ${secondary}` : `(${buf.perm},${buf.ori})`;
    }

    function renderMemoSection(label, cc, memoData) {
      const cfg = fmtConfig(cc);
      let h = `<div class="memo-section" style="margin-bottom: 1.5rem;">`;
      h += `<h3 style="margin-top: 0;">${label}: ${cfg}</h3>`;
      h += `<div style="font-family: 'Consolas', monospace; line-height: 1.8;">`;
      h += `<div>${t.rawMemo}: ${memoData.rawMemo}</div>`;
      h += `<div>${t.execution} (${t.basic}): ${memoData.basicExec}</div>`;
      h += `<div>${t.execution} (${t.advanced}): ${memoData.advancedExec}</div>`;
      h += `<div>${t.execution} (${t.fullFloat}): ${memoData.floatingExec}</div>`;
      h += `</div>`;
      h += `</div>`;
      return h;
    }

    function renderCombinedTable(eCC, cCC) {
      const ep = eCC.parity ? t.parityOdd : t.parityEven;
      const cp = cCC.parity ? t.parityOdd : t.parityEven;
      const row = (name, e, c) => `<tr><td>${name}</td><td>${e}</td><td>${c}</td></tr>`;
      let h = '<table class="worked-example-table">';
      h += `<tr><th></th><th>${t.workedEdges}</th><th>${t.workedCorners}</th></tr>`;
      h += row(t.parity, ep, cp);
      h += row(t.breaks, eCC.breaks, cCC.breaks);
      h += row(t.flipTwist, eCC.open1, cCC.open1);
      h += row(`${t.alg} (${t.basic})`, fmtHalf(eCC.alg), fmtHalf(cCC.alg));
      h += row(`${t.alg} (${t.naiveFloat3})`, fmtHalf(eCC.alg - eCC.closed3), fmtHalf(cCC.alg - cCC.closed3));
      h += row(`${t.alg} (${t.fullFloat})`, fmtHalf(eCC.algFullFloat), fmtHalf(cCC.algFullFloat));
      h += row(`${t.alg} (${t.fullFloatParity})`, fmtHalf(eCC.algFullParity), fmtHalf(cCC.algFullParity));
      h += row(t.count, eCC.count.toLocaleString(), cCC.count.toLocaleString());
      h += '</table>';
      return h;
    }

    let h = '';

    // Generate scramble and get actual code strings
    if (typeof scrambler.getScrambleAndCode === 'function') {
      const { scramble, edgeCode: edgeCodeStr, cornerCode: cornerCodeStr, edgeCC: eCC, cornerCC: cCC } = scrambler.getScrambleAndCode();

      h += `<p><code>${scramble}</code></p>`;
      // Generate memo notation from code strings and cycle configs
      if (window.Example && typeof Example.generateFullMemoFromCode === 'function') {
        const memo = Example.generateFullMemoFromCode(edgeCodeStr, cornerCodeStr, eCC, cCC);        memo.edges.representation = edgeCodeStr;
        memo.corners.representation = cornerCodeStr;        h += `<div class="memo-container" style="margin: 1rem 0;">`;
        h += renderMemoSection(t.workedEdges, eCC, memo.edges);
        h += renderMemoSection(t.workedCorners, cCC, memo.corners);
        h += `</div>`;
      }

      h += renderCombinedTable(eCC, cCC);
    } else {
      h += '<p>Scramble generator not available.</p>';
    }

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
      { name: isZh ? '仅浮动纯三循环' : 'Float plain 3-cycle only', e: cc => cc.alg - cc.closed3, c: cc => cc.alg - cc.closed3 },
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
    const savedFull = totalsByName[isZh ? '仅浮动纯三循环' : 'Float plain 3-cycle only'] - totalsByName[t.fullFloat];
    const savedParity = totalsByName[t.fullFloat] - totalsByName[t.fullFloatParity];
    document.getElementById('saved-algs-quip').textContent = isZh
      ? `你真的会想背 2768 个全浮动 3-style 公式，只为了平均每把少 ${savedFull.toFixed(2)} 个公式；再多背 11088 个全浮动奇偶公式，也只再少背 ${savedParity.toFixed(2)} 个公式吗？这些都只是理论上界，还没考虑人类实际能力。人生苦短，别背了～`
      : `Bruh, would you really want to learn 2,768 full-floating 3-style algs just to save ${savedFull.toFixed(2)} algs per scramble on average, and another 11,088 full-floating parity algs just to save ${savedParity.toFixed(2)} algs per scramble? These are only theoretical upper bounds, without accounting for human-level practicality. Life is short, be happy :)`;

    // Saved-alg distribution per skill level (vs Basic)
    const distLevels = [
      { name: isZh ? '仅浮动纯三循环' : 'Float plain 3-cycle only', e: cc => cc.closed3,            c: cc => cc.closed3 },
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
    const totalDistEl = document.getElementById('saved-algs-total-dist-table');
    if (edgeDistEl)   renderSavedDist(edgeDistEl,   allE, lv => lv.e, eT);
    if (cornerDistEl) renderSavedDist(cornerDistEl, allC, lv => lv.c, cT);
    if (totalDistEl)  renderSavedTotalDist(totalDistEl);

    function renderSavedTotalDist(tableEl) {
      const dists = distLevels.map(lv => {
        const eByP = [new Map(), new Map()];
        const cByP = [new Map(), new Map()];
        for (const cc of allE) { const k = lv.e(cc); eByP[cc.parity].set(k, (eByP[cc.parity].get(k) || 0) + cc.count); }
        for (const cc of allC) { const k = lv.c(cc); cByP[cc.parity].set(k, (cByP[cc.parity].get(k) || 0) + cc.count); }
        const result = new Map();
        let totalWeight = 0;
        for (let p = 0; p <= 1; p++) {
          let eS = 0, cS = 0;
          for (const v of eByP[p].values()) eS += v;
          for (const v of cByP[p].values()) cS += v;
          totalWeight += eS * cS;
          for (const [ek, ev] of eByP[p]) {
            for (const [ck, cv] of cByP[p]) {
              const k = Math.round((ek + ck) * 2) / 2;
              result.set(k, (result.get(k) || 0) + ev * cv);
            }
          }
        }
        const out = new Map();
        for (const [k, v] of result) out.set(k, v / totalWeight);
        return out;
      });
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

    // Big BLD saved-alg statistics
    if (typeof cycler4 !== 'undefined') {
      const { wings } = cycler4;
      let wingTotal = 0n;
      for (const w of wings) wingTotal += w.count;
      const wingTotalNum = Number(wingTotal);

      const levels = [
        { name: t.basic, fn: w => w.algs2 / 2 + 2 * w.closed3 },
        { name: t.naiveFloat3, fn: w => w.algs2 / 2 },
        { name: t.fullFloat, fn: w => w.algFullFloat2 / 2 },
      ];

      let baseMean = null;
      const bigBldTbody = document.querySelector('#bigbld-saved-algs-table tbody');
      if (bigBldTbody) {
        for (const lv of levels) {
          let sum = 0;
          for (const w of wings) sum += lv.fn(w) * Number(w.count);
          const mean = sum / wingTotalNum;
          if (baseMean === null) baseMean = mean;
          const saved = baseMean - mean;
          bigBldTbody.innerHTML += `<tr><td>${lv.name}</td><td>${mean.toFixed(2)}</td><td>${saved.toFixed(2)}</td></tr>`;
        }
      }

      // Saved distribution for Big BLD
      function bigBldSavedDist(fn) {
        const m = new Map();
        for (const w of wings) {
          const basic = w.algs2 / 2 + 2 * w.closed3;
          const k = basic - fn(w);
          m.set(k, (m.get(k) || 0n) + w.count);
        }
        const out = new Map();
        for (const [k, v] of m) out.set(k, Number(v) / wingTotalNum);
        return out;
      }

      const bigBldDistEl = document.getElementById('bigbld-saved-algs-dist-table');
      if (bigBldDistEl) {
        const dists = levels.slice(1).map(lv => ({ name: lv.name, dist: bigBldSavedDist(lv.fn) }));
        const keys = new Set();
        for (const d of dists) for (const k of d.dist.keys()) keys.add(k);
        const sorted = [...keys].sort((a, b) => a - b);
        let html = `<thead><tr><th>${isZh ? '节省' : 'Saved'}</th>` +
          dists.map(d => `<th>${d.name}</th>`).join('') + `</tr></thead><tbody>`;
        for (const k of sorted) {
          html += `<tr><td>${k}</td>` +
            dists.map(d => `<td>${(d.dist.get(k) || 0).toFixed(4)}</td>`).join('') + `</tr>`;
        }
        html += '</tbody>';
        bigBldDistEl.innerHTML = html;
      }
    }

    // Display combined timing
    const timing3bldEl = document.getElementById('timing-3bld');
    const timingBigbldEl = document.getElementById('timing-bigbld');
    if (timing3bldEl && timingBigbldEl && t3bld > 0 && tBigBld > 0) {
      timing3bldEl.textContent = `${t3bld.toFixed(0)} ms`;
      timingBigbldEl.textContent = `${tBigBld.toFixed(0)} ms`;
    }
  })();
});
