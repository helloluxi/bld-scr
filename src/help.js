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

function getOrCreateTbody(tableEl) {
  let tbody = tableEl.querySelector('tbody');
  if (!tbody) { tbody = document.createElement('tbody'); tableEl.appendChild(tbody); }
  return tbody;
}

function renderTable(tableEl, rows) {
  const tbody = getOrCreateTbody(tableEl);
  let html = '';
  for (const r of rows) {
    html += `<tr><td>${r.label}</td><td>${Math.round(r.value)}</td><td>${r.probability.toFixed(4)}</td><td>${r.cumulative.toFixed(4)}</td></tr>`;
  }
  tbody.innerHTML = html;
}

function renderChart(mount, rows, title) {
  if (typeof chartUtils === 'undefined') return;
  mount.innerHTML = '';
  chartUtils.renderChartInMount(
    mount,
    rows.map(r => r.label),
    rows.map(r => r.probability),
    title,
    { spaced: rows.length <= 5, cumulative: rows.map(r => r.cumulative) }
  );
}

function setStats(el, mean, std) {
  if (!el) return;
  const m = el.querySelector('[data-mean]'); if (m) m.textContent = mean.toFixed(2);
  const s = el.querySelector('[data-std]'); if (s) s.textContent = std.toFixed(2);
}

function setStatsAfterTable(stat, mean, std) {
  setStats(document.querySelector(`[data-stats-for="${stat}"]`), mean, std);
}

function meanStdFromPairs(pairs) {
  let tot = 0, sx = 0, sxx = 0;
  for (const [k, v] of pairs) { tot += v; sx += k * v; sxx += k * k * v; }
  if (tot === 0) return { mean: 0, std: 0 };
  const mean = sx / tot;
  return { mean, std: Math.sqrt(Math.max(0, sxx / tot - mean * mean)) };
}

function lastTbody(stat) {
  const t = document.querySelector(`[data-stat="${stat}"]`);
  if (!t) return null;
  const tbodies = t.querySelectorAll('tbody');
  return tbodies[tbodies.length - 1] || null;
}

function fillRowCell(stat, rowName, cellAttr, value) {
  const table = document.querySelector(`[data-stat="${stat}"]`);
  if (!table) return;
  const row = table.querySelector(`[data-row="${rowName}"]`);
  if (!row) return;
  const cell = row.querySelector(`[${cellAttr}]`);
  if (cell) cell.textContent = value;
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
    let cum = 0;
    return rows.map(([k, v]) => {
      cum += v;
      return `<tr><td>${k}</td><td>${Math.round(v)}</td><td>${(v / total).toFixed(4)}</td><td>${(cum / total).toFixed(4)}</td></tr>`;
    }).join('');
  }

  function statsFromTally(rows, total) {
    return meanStdFromPairs(rows.map(([k, v]) => [k, v / total]));
  }

  // Cycle Breaks
  const edgeBreaks = tally(allE, c => c.breaks);
  const cornerBreaks = tally(allC, c => c.breaks);
  fillTbody('edge-breaks',   probRows(edgeBreaks, eT));
  fillTbody('corner-breaks', probRows(cornerBreaks, cT));
  { const s = statsFromTally(edgeBreaks, eT);   setStatsAfterTable('edge-breaks',   s.mean, s.std); }
  { const s = statsFromTally(cornerBreaks, cT); setStatsAfterTable('corner-breaks', s.mean, s.std); }

  // Flip / Twist
  const edgeFlipped = tally(allE, c => c.open1);
  const cornerTwisted = tally(allC, c => c.open1);
  fillTbody('edge-flipped',   probRows(edgeFlipped, eT));
  fillTbody('corner-twisted', probRows(cornerTwisted, cT));
  { const s = statsFromTally(edgeFlipped, eT);    setStatsAfterTable('edge-flipped',   s.mean, s.std); }
  { const s = statsFromTally(cornerTwisted, cT);  setStatsAfterTable('corner-twisted', s.mean, s.std); }

  // Multi-flip / 3-twist invocation probability
  let fourFlip = 0, threeTwist = 0;
  for (const cc of allE) if (cc.open1 >= 3) fourFlip += cc.count;
  for (const cc of allC) {
    const cw = cc.cwTwist, ccw = cc.ccwTwist;
    if (cw >= 3 || ccw >= 3 || (cw === 2 && ccw === 0) || (ccw === 2 && cw === 0)) threeTwist += cc.count;
  }
  fillRowCell('multi-flip-twist', 'edge-4flip',    'data-count', fourFlip.toLocaleString());
  fillRowCell('multi-flip-twist', 'edge-4flip',    'data-prob',  (fourFlip / eT).toFixed(4));
  fillRowCell('multi-flip-twist', 'corner-3twist', 'data-count', threeTwist.toLocaleString());
  fillRowCell('multi-flip-twist', 'corner-3twist', 'data-prob',  (threeTwist / cT).toFixed(4));

  // LTCT / T2C (odd parity, with at least one open1 / open2 secondary cycle)
  let ltct = 0, t2c = 0;
  for (const cc of cycler.oddCorners) {
    if (cc.open1 >= 1) ltct += cc.count;
    if (cc.open2 >= 1) t2c  += cc.count;
  }
  fillRowCell('ltct-t2c', 'ltct', 'data-count', ltct.toLocaleString());
  fillRowCell('ltct-t2c', 'ltct', 'data-prob',  (ltct / cT).toFixed(4));
  fillRowCell('ltct-t2c', 't2c',  'data-count', t2c.toLocaleString());
  fillRowCell('ltct-t2c', 't2c',  'data-prob',  (t2c / cT).toFixed(4));

  // Cascading Pseudo Swap
  populateBreakInSwap();

  // Order distribution
  populateOrderTable();
}

function populateBreakInSwap() {
  buildBreakInSwap({
    statKey: 'cps',
    modePrefix: 'cps',
    even: cycler.evenEdges,
    odd: cycler.oddEdges,
    pieceCount: 11,
    visIndices: 22,
    hApplicableNum: 1,
    hApplicableDen: 2,
  });
  buildBreakInSwap({
    statKey: 'cps-corner',
    modePrefix: 'cps-corner',
    even: cycler.evenCorners,
    odd: cycler.oddCorners,
    pieceCount: 7,
    visIndices: 21,
    hApplicableNum: 1,
    hApplicableDen: 3,
  });
}

function buildBreakInSwap(opts) {
  const { statKey, modePrefix, even, odd, pieceCount: P, visIndices: V,
          hApplicableNum: hNum, hApplicableDen: hDen } = opts;
  const tbody = lastTbody(statKey);
  if (!tbody) return;

  function falling(x, k) { let r = 1; for (let i = 0; i < k; i++) r *= (x - i); return r; }

  const res = new Array(P + 1).fill(0), resOdd = new Array(P + 1).fill(0);
  function process(cc, isOdd) {
    const p0 = cc.cycles[0].perm, f1 = cc.closed1;
    const h = (p0 > 1) ? 1 : 0;
    const n0 = Math.max(0, p0 - 2) + f1, a0 = P - h - n0;
    const vcs = h === 0
      ? [[cc.count, a0, P - a0]]
      : [[cc.count * hNum / hDen,         a0 + 1, P - a0 - 1],
         [cc.count * (hDen - hNum) / hDen, a0,     P - a0]];
    for (const [w, a, n] of vcs) {
      if (a === 0) { res[0] += w; if (isOdd) resOdd[0] += w; continue; }
      for (let k = 1; k <= P; k++) {
        if (k - 1 > n) break;
        const c = w * a * falling(n, k - 1) / falling(P, k);
        res[k] += c;
        if (isOdd) resOdd[k] += c;
      }
    }
  }
  even.forEach(cc => process(cc, false));
  odd .forEach(cc => process(cc, true));

  // Spread arr[0] (no applicable target) evenly across synthetic indices P+1..V
  // so the cumulative curve continues smoothly to 1.
  const spreadCount = V - P;
  function expand(arr) {
    const out = new Array(V + 1).fill(0);
    for (let k = 1; k <= P; k++) out[k] = arr[k];
    const each = arr[0] / spreadCount;
    for (let k = P + 1; k <= V; k++) out[k] = each;
    return out;
  }

  function render(arr) {
    const tot = arr.reduce((s, v) => s + v, 0);
    const labels = [], values = [], cumulative = [];
    let cum = 0, html = '';
    for (let k = 1; k <= V; k++) {
      cum += arr[k];
      const p = arr[k] / tot;
      labels.push(`#${k}`);
      values.push(p);
      cumulative.push(cum / tot);
      html += `<tr><td>#${k}</td><td>${Math.round(arr[k])}</td><td>${p.toFixed(4)}</td><td>${(cum / tot).toFixed(4)}</td></tr>`;
    }
    return { html, labels, values, cumulative };
  }

  function update() {
    const oddOnly = document.getElementById(`${modePrefix}-mode-odd`)?.checked;
    const arr = expand(oddOnly ? resOdd : res);
    const { html, labels, values, cumulative } = render(arr);
    tbody.innerHTML = html;

    const table = document.querySelector(`[data-stat="${statKey}"]`);
    const chart = table && table.parentElement.querySelector('.help-chart');
    if (chart) {
      chartUtils.renderChartInMount(chart, labels, values, chart.dataset.chartTitle || '', {
        spaced: chart.dataset.chartSpaced !== 'false' && labels.length <= 5,
        cumulative,
      });
    }
  }

  const modeRow = document.getElementById(`${modePrefix}-mode-all`).closest('.parity-checkbox-row');
  uiUtils.wireExclusiveGroup(modeRow, update);
  update();
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
  const eT = 980995276800, cT = 88179840;

  // Edge
  const edgeDist = tallyByAlg([...cycler.evenEdges, ...cycler.oddEdges], edgeAlgH, skills);
  const edgeRows = distToRows(edgeDist, eT);
  const es = meanStd(edgeRows);
  renderTable(document.getElementById('edge-algs-table'), edgeRows);
  renderChart(document.getElementById('edge-algs-chart'), edgeRows, '');
  setStats(document.getElementById('edge-algs-stats'), es.mean, es.std);

  // Corner
  const cornerDist = tallyByAlg([...cycler.evenCorners, ...cycler.oddCorners], cornerAlgH, skills);
  const cornerRows = distToRows(cornerDist, cT);
  const cs = meanStd(cornerRows);
  renderTable(document.getElementById('corner-algs-table'), cornerRows);
  renderChart(document.getElementById('corner-algs-chart'), cornerRows, '');
  setStats(document.getElementById('corner-algs-stats'), cs.mean, cs.std);

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
  setStats(document.getElementById('total-algs-stats'), ts.mean, ts.std);
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

  function fillBigBld(stat, rows) {
    const tbody = lastTbody(stat);
    if (!tbody) return;
    const probPairs = rows.map(([k, v]) => [k, Number(v) / wingTotalNum]);
    let cum = 0;
    tbody.innerHTML = rows.map(([k, v], i) => {
      cum += probPairs[i][1];
      return `<tr><td>${k}</td><td>${v}</td><td>${probPairs[i][1].toFixed(4)}</td><td>${cum.toFixed(4)}</td></tr>`;
    }).join('');
    const s = meanStdFromPairs(probPairs);
    setStatsAfterTable(stat, s.mean, s.std);
    const table = document.querySelector(`[data-stat="${stat}"]`);
    const chart = table && table.parentElement.querySelector('.help-chart');
    if (chart) {
      const labels = probPairs.map(([k]) => k);
      const values = probPairs.map(([, p]) => p);
      let acc = 0;
      const cumulative = values.map(v => acc += v);
      chartUtils.renderChartInMount(chart, labels, values, chart.dataset.chartTitle || '', {
        spaced: labels.length <= 5,
        cumulative,
      });
    }
  }

  fillBigBld('wing-breaks', tallyBigInt(w => w.breaks));
  fillBigBld('wing-solved', tallyBigInt(w => w.closed1));
  fillBigBld('wing-float2', tallyBigInt(w => w.closed2));
  fillBigBld('wing-float3', tallyBigInt(w => w.closed3));

  const centerData = centers();
  const centerTotal = centerData.reduce((s, [, c]) => s + c, 0);
  const centerTbody = lastTbody('wing-centers');
  if (centerTbody) {
    let cum = 0;
    centerTbody.innerHTML = centerData.map(([u, c]) => {
      const p = c / centerTotal;
      cum += p;
      return `<tr><td>${u}</td><td>${c}</td><td>${p.toFixed(4)}</td><td>${cum.toFixed(4)}</td></tr>`;
    }).join('');
    const probPairs = centerData.map(([u, c]) => [u, c / centerTotal]);
    const s = meanStdFromPairs(probPairs);
    setStats(document.getElementById('bigbld-centers-stats'), s.mean, s.std);
    const chart = centerTbody.closest('details').querySelector('.help-chart');
    if (chart) {
      const labels = probPairs.map(([u]) => u);
      const values = probPairs.map(([, p]) => p);
      let acc = 0;
      const cumulative = values.map(v => acc += v);
      chartUtils.renderChartInMount(chart, labels, values, chart.dataset.chartTitle || '', {
        spaced: labels.length <= 5,
        cumulative,
      });
    }
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
  const parity = document.getElementById('bigbld-parity-even').checked ? 'even'
    : document.getElementById('bigbld-parity-odd').checked ? 'odd' : 'total';

  const getAlg = w => skill === 'full' ? Math.ceil(w.algFF)
    : skill === 'naive' ? w.algF3
    : w.alg;
  const isOdd = w => w.parity === 1;

  const m = new Map();
  for (const w of wings) {
    if (parity === 'even' && isOdd(w)) continue;
    if (parity === 'odd' && !isOdd(w)) continue;
    const k = getAlg(w);
    m.set(k, (m.get(k) || 0n) + w.count);
  }
  const sorted = [...m].sort((a, b) => a[0] - b[0]);

  let total = 0n;
  for (const [, v] of sorted) total += v;
  const totalNum = Number(total);

  const tbody = lastTbody('wing-algs');
  if (!tbody) return;
  const labels = [];
  const values = [];
  const cumArr = [];
  let cum = 0;
  tbody.innerHTML = sorted.map(([k, v]) => {
    const p = Number(v) / totalNum;
    cum += p;
    labels.push(k);
    values.push(p);
    cumArr.push(cum);
    return `<tr><td>${k}</td><td>${v}</td><td>${p.toFixed(4)}</td><td>${cum.toFixed(4)}</td></tr>`;
  }).join('');

  const s = meanStdFromPairs(sorted.map(([k, v]) => [k, Number(v) / totalNum]));
  setStats(document.getElementById('bigbld-wing-algs-stats'), s.mean, s.std);

  const table = document.querySelector('[data-stat="wing-algs"]');
  const chart = table && table.parentElement.querySelector('.help-chart');
  if (chart) {
    chartUtils.renderChartInMount(chart, labels, values, chart.dataset.chartTitle || '', {
      spaced: labels.length <= 5,
      cumulative: cumArr,
    });
  }
}

// Letter scheme presets
const LETTER_PRESETS = {
  mine:   { edge: 'ABCDEFGHIJKLMNOPQRSTWXYZ', corner: 'ahqcbtedwgfzilsknxmpyojr' },
  chichu: { edge: 'ABCDEFGHIJKLMNOPQRSTWXYZ', corner: 'jklabcdefghiwmnopqrstxyz' },
  speffz: { edge: 'CIDEAQBMUKXGWSVOJPLFRHTN', corner: 'cmjdihaerbqnuglxsfwtovkp' },
};
const LS_KEY = 'bld-scr.letterScheme';

const edgePositions = [
  'UF','FU','UL','LU','UB','BU','UR','RU',
  'DF','FD','DL','LD','DB','BD','DR','RD',
  'FR','RF','FL','LF','BL','LB','BR','RB'
];
const cornerPositions = [
  'UFR','RUF','FUR','UFL','FUL','LUF',
  'UBL','LUB','BUL','UBR','BUR','RUB',
  'DFL','LDF','FDL','DBL','BDL','LDB',
  'DBR','BRD','RDB','DFR','FDR','RDF'
];

function updateInputHint(input, positions) {
  const v = input.value;
  if (v.length === 24) {
    input.style.backgroundImage = 'none';
  } else if (v.length < 24) {
    const nextPos = positions[v.length];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '13px monospace';
    const text = `← ${nextPos}`;
    const metrics = ctx.measureText(text);
    canvas.width = metrics.width + 10;
    canvas.height = 20;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText(text, 5, 15);
    input.style.backgroundImage = `url(${canvas.toDataURL()})`;
    input.style.backgroundRepeat = 'no-repeat';
    input.style.backgroundPosition = 'right 8px center';
  } else {
    input.style.backgroundImage = 'none';
  }
}

function _applyLetterPreset(name) {
  const p = LETTER_PRESETS[name];
  if (!p) return;
  const ei = document.getElementById('letter-scheme-edge');
  const ci = document.getElementById('letter-scheme-corner');
  if (ei) { ei.value = p.edge; updateInputHint(ei, edgePositions); }
  if (ci) { ci.value = p.corner; updateInputHint(ci, cornerPositions); }
  validateSchemeInputs();
  persistLetterScheme();
  if (typeof window._rollExample === 'function') window._rollExample();
}

function validateSchemeInputs() {
  const ei = document.getElementById('letter-scheme-edge');
  const ci = document.getElementById('letter-scheme-corner');
  let valid = true;
  [ei, ci].forEach(input => {
    if (!input) return;
    const v = input.value;
    if (v.length !== 24 || new Set(v).size !== 24) {
      input.style.borderColor = 'red';
      input.style.borderWidth = '2px';
      valid = false;
    } else {
      input.style.borderColor = '';
      input.style.borderWidth = '';
    }
  });
  return valid;
}

function persistLetterScheme() {
  const ei = document.getElementById('letter-scheme-edge');
  const ci = document.getElementById('letter-scheme-corner');
  if (!ei || !ci) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ edge: ei.value, corner: ci.value }));
  } catch (e) { /* ignore */ }
}

function loadLetterScheme() {
  const ei = document.getElementById('letter-scheme-edge');
  const ci = document.getElementById('letter-scheme-corner');
  if (!ei || !ci) return;
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const { edge, corner } = JSON.parse(saved);
      if (edge && edge.length === 24) ei.value = edge;
      if (corner && corner.length === 24) ci.value = corner;
    }
  } catch (e) { /* ignore */ }
  // Default to "mine" preset if empty
  if (!ei.value) ei.value = LETTER_PRESETS.mine.edge;
  if (!ci.value) ci.value = LETTER_PRESETS.mine.corner;
  validateSchemeInputs();
}

function getActiveScheme() {
  const ei = document.getElementById('letter-scheme-edge');
  const ci = document.getElementById('letter-scheme-corner');
  const edge = ei && ei.value.length === 24 && new Set(ei.value).size === 24 ? ei.value : LETTER_PRESETS.mine.edge;
  const corner = ci && ci.value.length === 24 && new Set(ci.value).size === 24 ? ci.value : LETTER_PRESETS.mine.corner;
  return { edge, corner };
}

// Expose applyLetterPreset globally for onclick handlers
window.applyLetterPreset = _applyLetterPreset;

document.addEventListener('DOMContentLoaded', () => {
  let t3bld = 0, tBigBld = 0;

  // Self-test
  const test = cycler.selfTest();
  if (test.errors > 0) {
    const errEl = document.getElementById('algs-error');
    errEl.style.display = '';
    const cntEl = document.getElementById('algs-error-count');
    if (cntEl) cntEl.textContent = test.errors;
  }

  // Wire up 3BLD skill rows (row-exclusive)
  document.querySelectorAll('#algs-card .skill-checkboxes .parity-checkbox-row').forEach(row => {
    uiUtils.wireExclusiveGroup(row, cb => {
      if (cb.id === 'h-skill-fullfloat-parity' && cb.checked) {
        document.getElementById('h-skill-fullfloat-edge').checked = true;
        document.getElementById('h-skill-naive-edge').checked = false;
        document.getElementById('h-skill-basic-edge').checked = false;
        document.getElementById('h-skill-fullfloat-corner').checked = true;
        document.getElementById('h-skill-naive-corner').checked = false;
        document.getElementById('h-skill-basic-corner').checked = false;
      }
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

  // Wire up Big BLD skill + parity rows (row-exclusive)
  document.querySelectorAll('#bigbld .skill-checkboxes .parity-checkbox-row').forEach(row => {
    uiUtils.wireExclusiveGroup(row, () => updateWingAlgsTable());
  });

  // Static charts (non-algs). Skip mounts already rendered (Big BLD, etc.) and dynamic algs charts.
  document.querySelectorAll('.help-chart').forEach(mount => {
    if (mount.id) return;
    if (mount.querySelector('.chart-wrapper')) return;
    const table = mount.parentElement.querySelector('table');
    if (!table) return;
    const rows = chartUtils.parseProbabilityTable(table);
    const dataRows = Array.from(table.querySelectorAll('tr')).slice(1).filter(r => r.querySelectorAll('td').length > 0);
    const hasCumCol = dataRows[0] && dataRows[0].querySelectorAll('td').length >= 4;
    let cumulative;
    if (hasCumCol) {
      cumulative = dataRows.map(r => parseFloat(r.querySelectorAll('td')[3].textContent.replace(/,/g, '')));
    } else {
      let acc = 0;
      cumulative = rows.map(r => acc += r.value);
    }
    chartUtils.renderChartInMount(
      mount,
      rows.map(row => row.label),
      rows.map(row => row.value),
      mount.dataset.chartTitle || '',
      { spaced: mount.dataset.chartSpaced !== 'false' && rows.length <= 5, cumulative }
    );
  });

  updateAlgsSection();

  // Letter scheme setup
  loadLetterScheme();
  const lsEdge = document.getElementById('letter-scheme-edge');
  const lsCorner = document.getElementById('letter-scheme-corner');
  [lsEdge, lsCorner].forEach(input => {
    if (!input) return;
    const positions = input === lsEdge ? edgePositions : cornerPositions;
    input.addEventListener('input', () => {
      setTimeout(() => {
        // Sanitize
        if (input === lsEdge) {
          input.value = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
        } else {
          input.value = input.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
        }
        if (input.value.length > 24) input.value = input.value.substring(0, 24);
        updateInputHint(input, positions);
        validateSchemeInputs();
        persistLetterScheme();
        rollExample();
      }, 0);
    });
    input.addEventListener('focus', () => updateInputHint(input, positions));
  });
  if (lsEdge) updateInputHint(lsEdge, edgePositions);
  if (lsCorner) updateInputHint(lsCorner, cornerPositions);

  // Random worked example — fills static placeholders inside #worked-example-output
  function rollExample() {
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

    function setText(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
    function setHtml(id, value) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = value;
    }

    if (typeof scrambler.getScrambleAndCode !== 'function') return;
    const { scramble, edgeCode: edgeCodeStr, cornerCode: cornerCodeStr, edgeCC: eCC, cornerCC: cCC } = scrambler.getScrambleAndCode();

    setText('we-scramble', scramble);

    if (window.Example && typeof Example.generateFullMemoFromCode === 'function') {
      const scheme = getActiveScheme();
      const translatedEdge = Example.translateCodeStr(edgeCodeStr, Example.DEFAULT_EDGE_CODE, scheme.edge);
      const translatedCorner = Example.translateCodeStr(cornerCodeStr, Example.DEFAULT_CORNER_CODE, scheme.corner);
      Example.setLetterScheme(scheme.edge, scheme.corner);
      const memo = Example.generateFullMemoFromCode(translatedEdge, translatedCorner, eCC, cCC);

      setText('we-edge-config',  fmtConfig(eCC));
      setHtml('we-edge-raw',      memo.edges.rawMemo);
      setHtml('we-edge-basic',    memo.edges.basicExec);
      setHtml('we-edge-advanced', memo.edges.advancedExec);
      setHtml('we-edge-full',     memo.edges.floatingExec);

      setText('we-corner-config',  fmtConfig(cCC));
      setHtml('we-corner-raw',      memo.corners.rawMemo);
      setHtml('we-corner-basic',    memo.corners.basicExec);
      setHtml('we-corner-advanced', memo.corners.advancedExec);
      setHtml('we-corner-full',     memo.corners.floatingExec);
    }

    const tbl = document.querySelector('.worked-example-table');
    const evenLabel = tbl ? tbl.dataset.parityEven : 'even';
    const oddLabel  = tbl ? tbl.dataset.parityOdd  : 'odd';
    setText('we-edge-parity',   eCC.parity ? oddLabel : evenLabel);
    setText('we-corner-parity', cCC.parity ? oddLabel : evenLabel);
    setText('we-edge-breaks',   eCC.breaks);
    setText('we-corner-breaks', cCC.breaks);
    setText('we-edge-flip',     eCC.open1);
    setText('we-corner-flip',   cCC.open1);
    setText('we-edge-alg-basic',      fmtHalf(eCC.alg));
    setText('we-corner-alg-basic',    fmtHalf(cCC.alg));
    setText('we-edge-alg-naive',      fmtHalf(eCC.alg - eCC.closed3));
    setText('we-corner-alg-naive',    fmtHalf(cCC.alg - cCC.closed3));
    setText('we-edge-alg-fullfloat',  fmtHalf(eCC.algFullFloat));
    setText('we-corner-alg-fullfloat', fmtHalf(cCC.algFullFloat));
    setText('we-edge-alg-fullparity', fmtHalf(eCC.algFullParity));
    setText('we-corner-alg-fullparity', fmtHalf(cCC.algFullParity));
    setText('we-edge-count',   eCC.count.toLocaleString());
    setText('we-corner-count', cCC.count.toLocaleString());
  }

  document.getElementById('reroll-btn').addEventListener('click', rollExample);
  window._rollExample = rollExample;  // expose for applyLetterPreset
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
      { key: 'basic',      e: cc => cc.alg,                     c: cc => cc.alg },
      { key: 'naive',      e: cc => cc.alg - cc.closed3,        c: cc => cc.alg - cc.closed3 },
      { key: 'fullfloat',  e: cc => cc.algFullFloat,            c: cc => cc.algFullFloat },
      { key: 'fullparity', e: cc => cc.algFullParity,           c: cc => cc.algFullParity },
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

    const totalsByKey = {};
    const tbody = document.querySelector('#saved-algs-table tbody');
    const fmt = v => v.toFixed(2);
    const savedFmt = (cur, base) => (base - cur).toFixed(2);

    const baseE = avg(allE, levels[0].e, eT);
    const baseC = avg(allC, levels[0].c, cT);
    const baseT = totalAvg(levels[0].e, levels[0].c);

    function fillSavedRow(key, eM, cM, tM) {
      if (!tbody) return;
      const row = tbody.querySelector(`[data-skill="${key}"]`);
      if (!row) return;
      const set = (attr, val) => { const c = row.querySelector(`[${attr}]`); if (c) c.textContent = val; };
      set('data-edge-mean',    fmt(eM));
      set('data-edge-saved',   savedFmt(eM, baseE));
      set('data-corner-mean',  fmt(cM));
      set('data-corner-saved', savedFmt(cM, baseC));
      set('data-total-mean',   fmt(tM));
      set('data-total-saved',  savedFmt(tM, baseT));
    }

    for (const lv of levels) {
      const eM = avg(allE, lv.e, eT);
      const cM = avg(allC, lv.c, cT);
      const tM = totalAvg(lv.e, lv.c);
      totalsByKey[lv.key] = tM;
      fillSavedRow(lv.key, eM, cM, tM);
    }

    const savedFull = totalsByKey.basic - totalsByKey.fullfloat;
    const savedParity = totalsByKey.fullfloat - totalsByKey.fullparity;
    document.getElementById('saved-full-num').textContent = savedFull.toFixed(2);
    document.getElementById('saved-parity-num').textContent = savedParity.toFixed(2);

    // Saved-alg distribution per skill level (vs Basic). Column headers live in HTML.
    const distLevels = [
      { e: cc => cc.closed3,                  c: cc => cc.closed3 },
      { e: cc => cc.alg - cc.algFullFloat,    c: cc => cc.alg - cc.algFullFloat },
      { e: cc => cc.alg - cc.algFullParity,   c: cc => cc.alg - cc.algFullParity },
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

    function fillDistTbody(tableEl, html) {
      const tb = tableEl.querySelector('tbody');
      if (tb) tb.innerHTML = html;
    }

    function renderSavedDist(tableEl, configs, pick, total) {
      const dists = distLevels.map(lv => savedDist(configs, pick(lv), total));
      const keys = new Set();
      for (const d of dists) for (const k of d.keys()) keys.add(k);
      const sorted = [...keys].sort((a, b) => a - b);
      const fmtK = k => Number.isInteger(k) ? String(k) : k.toFixed(1);
      let html = '';
      for (const k of sorted) {
        html += `<tr><td>${fmtK(k)}</td>` +
          dists.map(d => `<td>${(d.get(k) || 0).toFixed(4)}</td>`).join('') + `</tr>`;
      }
      fillDistTbody(tableEl, html);
    }

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
      let html = '';
      for (const k of sorted) {
        html += `<tr><td>${fmtK(k)}</td>` +
          dists.map(d => `<td>${(d.get(k) || 0).toFixed(4)}</td>`).join('') + `</tr>`;
      }
      fillDistTbody(tableEl, html);
    }

    const edgeDistEl = document.getElementById('saved-algs-edge-dist-table');
    const cornerDistEl = document.getElementById('saved-algs-corner-dist-table');
    const totalDistEl = document.getElementById('saved-algs-total-dist-table');
    if (edgeDistEl)   renderSavedDist(edgeDistEl,   allE, lv => lv.e, eT);
    if (cornerDistEl) renderSavedDist(cornerDistEl, allC, lv => lv.c, cT);
    if (totalDistEl)  renderSavedTotalDist(totalDistEl);

    // Big BLD saved-alg statistics
    if (typeof cycler4 !== 'undefined') {
      const { wings } = cycler4;
      let wingTotal = 0n;
      for (const w of wings) wingTotal += w.count;
      const wingTotalNum = Number(wingTotal);

      const bigLevels = [
        { key: 'basic', fn: w => w.alg },
        { key: 'naive', fn: w => w.algF3 },
        { key: 'full',  fn: w => w.algFF },
      ];

      let baseMean = null;
      const bigBldTbody = document.querySelector('#bigbld-saved-algs-table tbody');
      if (bigBldTbody) {
        for (const lv of bigLevels) {
          let sum = 0;
          for (const w of wings) sum += lv.fn(w) * Number(w.count);
          const mean = sum / wingTotalNum;
          if (baseMean === null) baseMean = mean;
          const savedAmt = baseMean - mean;
          const row = bigBldTbody.querySelector(`[data-skill="${lv.key}"]`);
          if (row) {
            const m = row.querySelector('[data-mean]');  if (m) m.textContent = mean.toFixed(2);
            const sv = row.querySelector('[data-saved]'); if (sv) sv.textContent = savedAmt.toFixed(2);
          }
        }
      }

      // Saved distribution for Big BLD
      function bigBldSavedDist(fn) {
        const m = new Map();
        for (const w of wings) {
          const basic = w.alg;
          const k = basic - fn(w);
          m.set(k, (m.get(k) || 0n) + w.count);
        }
        const out = new Map();
        for (const [k, v] of m) out.set(k, Number(v) / wingTotalNum);
        return out;
      }

      const bigBldDistEl = document.getElementById('bigbld-saved-algs-dist-table');
      if (bigBldDistEl) {
        const dists = bigLevels.slice(1).map(lv => bigBldSavedDist(lv.fn));
        const keys = new Set();
        for (const d of dists) for (const k of d.keys()) keys.add(k);
        const sorted = [...keys].sort((a, b) => a - b);
        let html = '';
        for (const k of sorted) {
          html += `<tr><td>${k}</td>` +
            dists.map(d => `<td>${(d.get(k) || 0).toFixed(4)}</td>`).join('') + `</tr>`;
        }
        fillDistTbody(bigBldDistEl, html);
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
