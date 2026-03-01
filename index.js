// Tab switching
const tabMini = document.getElementById('tab-mini');
const tabPro  = document.getElementById('tab-pro');
const tabDist = document.getElementById('tab-dist');
const tabHelp = document.getElementById('tab-help');
const panelMini = document.getElementById('panel-mini');
const panelPro  = document.getElementById('panel-pro');
const panelDist = document.getElementById('panel-dist');
const panelHelp = document.getElementById('panel-help');
const scrambleUI = document.getElementById('scramble-ui');

function switchTab(tab) {
  tabMini.classList.toggle('active', tab === 'basic');
  tabPro.classList.toggle('active',  tab === 'advanced');
  tabDist.classList.toggle('active', tab === 'stat');
  tabHelp.classList.toggle('active', tab === 'about');
  panelMini.style.display = tab === 'basic'        ? '' : 'none';
  panelPro.style.display  = tab === 'advanced'     ? '' : 'none';
  panelDist.style.display = tab === 'stat' ? '' : 'none';
  panelHelp.style.display = tab === 'about'        ? '' : 'none';
  scrambleUI.style.display = (tab === 'about' || tab === 'stat') ? 'none' : '';
  localStorage.setItem('scr.tab', tab);
  const params = new URLSearchParams(window.location.search);
  params.set('tab', tab);
  history.replaceState(null, '', '?' + params.toString());
  if (tab === 'basic' || tab === 'advanced') updateProbability();
  if (tab === 'stat') updateChart(document.getElementById('dist-input').value);
}

tabMini.addEventListener('click', () => switchTab('basic'));
tabPro.addEventListener('click',  () => switchTab('advanced'));
tabDist.addEventListener('click', () => switchTab('stat'));
tabHelp.addEventListener('click', () => switchTab('about'));

// DOM elements
const edgeInput    = document.getElementById('edge-input');
const cornerInput  = document.getElementById('corner-input');
const amountSlider = document.getElementById('amount-slider');
const sliderValue  = document.getElementById('slider-value');
const miniText     = document.getElementById('mini-text');
const scrambleButton = document.getElementById('scramble-button');
const outputPanel  = document.getElementById('output-panel');
const copyButton   = document.getElementById('copy-button');
const edgeHistory  = document.getElementById('edge-history');
const cornerHistory = document.getElementById('corner-history');

// History storage
const edgeHistoryItems   = JSON.parse(localStorage.getItem('scr.he') || '[]');
const cornerHistoryItems = JSON.parse(localStorage.getItem('scr.hc') || '[]');
let edgeSelectedIndex   = -1;
let cornerSelectedIndex = -1;

// ── Mini panel logic ──────────────────────────────────────────────────

function updateProbability() {
  if (panelMini.style.display !== 'none') {
    updateMiniProbability();
  } else {
    updateProProbability();
  }
}

function updateMiniProbability() {
  const allowParityEven = document.getElementById('parity-even').checked;
  const allowParityOdd  = document.getElementById('parity-odd').checked;

  const edgeFlipsMin  = Number(document.getElementById('edge-flips-min').value);
  const edgeFlipsMax  = Number(document.getElementById('edge-flips-max').value);
  const edgeBreaksMin = Number(document.getElementById('edge-breaks-min').value);
  const edgeBreaksMax = Number(document.getElementById('edge-breaks-max').value);
  const edgeFloat3Min = Number(document.getElementById('edge-float3-min').value);
  const edgeFloat3Max = Number(document.getElementById('edge-float3-max').value);
  const edgeAlgsMin   = Number(document.getElementById('edge-algs-min').value);
  const edgeAlgsMax   = Number(document.getElementById('edge-algs-max').value);

  const cornFlipsMin  = Number(document.getElementById('corner-flips-min').value);
  const cornFlipsMax  = Number(document.getElementById('corner-flips-max').value);
  const cornBreaksMin = Number(document.getElementById('corner-breaks-min').value);
  const cornBreaksMax = Number(document.getElementById('corner-breaks-max').value);
  const cornFloat3Min = Number(document.getElementById('corner-float3-min').value);
  const cornFloat3Max = Number(document.getElementById('corner-float3-max').value);
  const cornerAlgsMin = Number(document.getElementById('corner-algs-min').value);
  const cornerAlgsMax = Number(document.getElementById('corner-algs-max').value);

  const edgeCond = x =>
    x.bad1   >= edgeFlipsMin  && x.bad1   <= edgeFlipsMax  &&
    x.breaks >= edgeBreaksMin && x.breaks <= edgeBreaksMax &&
    x.float3 >= edgeFloat3Min && x.float3 <= edgeFloat3Max &&
    x.algs   >= edgeAlgsMin - 0.01 && x.algs <= edgeAlgsMax + 0.01 &&
    (x.parity === 0 ? allowParityEven : allowParityOdd);

  const cornerCond = x =>
    x.bad1   >= cornFlipsMin  && x.bad1   <= cornFlipsMax  &&
    x.breaks >= cornBreaksMin && x.breaks <= cornBreaksMax &&
    x.float3 >= cornFloat3Min && x.float3 <= cornFloat3Max &&
    x.algs   >= cornerAlgsMin - 0.01 && x.algs <= cornerAlgsMax + 0.01 &&
    (x.parity === 0 ? allowParityEven : allowParityOdd);

  const prob = scrambler.getProbabilityFromBoolFunction(edgeCond, cornerCond);
  miniText.textContent = `Probability: ${(prob * 100).toFixed(2)}%`;
}

// Range slider UI helpers
function updateRangeSlider(baseId, save = true) {
  const minSlider = document.getElementById(baseId + '-min');
  const maxSlider = document.getElementById(baseId + '-max');
  if (!minSlider || !maxSlider) return;

  const container = minSlider.parentElement;
  const selected  = container.querySelector('.range-selected');
  const thumbs    = container.querySelectorAll('.range-thumb');
  const min = parseFloat(minSlider.value);
  const max = parseFloat(maxSlider.value);

  const valueDisplay = document.getElementById(baseId + '-value');
  if (valueDisplay) valueDisplay.textContent = `${min}-${max}`;

  if (container.classList.contains('range-container') && selected && thumbs.length === 2) {
    const minPos = ((min - parseFloat(minSlider.min)) / (parseFloat(minSlider.max) - parseFloat(minSlider.min))) * 100;
    const maxPos = ((max - parseFloat(maxSlider.min)) / (parseFloat(maxSlider.max) - parseFloat(maxSlider.min))) * 100;
    if (min === max) {
      container.classList.add('single-value');
      selected.style.left = minPos + '%';
    } else {
      container.classList.remove('single-value');
      selected.style.left  = minPos + '%';
      selected.style.width = (maxPos - minPos) + '%';
    }
    thumbs[0].style.left = minPos + '%';
    thumbs[1].style.left = maxPos + '%';
  }

  if (save) saveMiniValues();
}

function initRangeThumbs(container) {
  container.querySelectorAll('.range-thumb').forEach(t => t.remove());
  container.appendChild(Object.assign(document.createElement('div'), { className: 'range-thumb' }));
  container.appendChild(Object.assign(document.createElement('div'), { className: 'range-thumb' }));
}

document.querySelectorAll('#panel-mini .range-container').forEach(initRangeThumbs);

const miniSliderIds = ['edge-flips', 'edge-breaks', 'edge-float3', 'edge-algs', 'corner-flips', 'corner-breaks', 'corner-float3', 'corner-algs'];
miniSliderIds.forEach(baseId => {
  const minEl = document.getElementById(baseId + '-min');
  const maxEl = document.getElementById(baseId + '-max');
  minEl.addEventListener('input', function() {
    if (parseFloat(maxEl.value) < parseFloat(this.value)) maxEl.value = this.value;
    minEl.style.zIndex = 2; maxEl.style.zIndex = 1;
    updateRangeSlider(baseId);
    updateProbability();
  });
  maxEl.addEventListener('input', function() {
    if (parseFloat(minEl.value) > parseFloat(this.value)) minEl.value = this.value;
    maxEl.style.zIndex = 2; minEl.style.zIndex = 1;
    updateRangeSlider(baseId);
    updateProbability();
  });
  updateRangeSlider(baseId, false);
});

document.querySelectorAll('#panel-mini input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => updateProbability());
});

// Amount slider (shared, uses single-thumb range UI)
function updateAmountSlider() {
  const container = amountSlider.parentElement;
  const selected  = container.querySelector('.range-selected');
  const thumb     = container.querySelector('.range-thumb');
  if (parseInt(amountSlider.value) < 1) amountSlider.value = 1;
  const pos = (parseFloat(amountSlider.value) / parseFloat(amountSlider.max)) * 100;
  selected.style.width = pos + '%';
  thumb.style.left = pos + '%';
  sliderValue.textContent = amountSlider.value;
}

amountSlider.addEventListener('input', () => {
  if (parseInt(amountSlider.value) < 1) { amountSlider.value = 1; return; }
  updateAmountSlider();
});
updateAmountSlider();

// Mini localStorage
const miniSliderDefaults = {
  'edge-flips-min':'0','edge-flips-max':'11',
  'edge-breaks-min':'0','edge-breaks-max':'5',
  'edge-float3-min':'0','edge-float3-max':'3',
  'edge-algs-min':'0','edge-algs-max':'8.5',
  'corner-flips-min':'0','corner-flips-max':'7',
  'corner-breaks-min':'0','corner-breaks-max':'3',
  'corner-float3-min':'0','corner-float3-max':'2',
  'corner-algs-min':'0','corner-algs-max':'5.5'
};

function saveMiniValues() {
  Object.keys(miniSliderDefaults).forEach(id =>
    localStorage.setItem('scr.mini.' + id, document.getElementById(id).value));
  ['parity-even','parity-odd'].forEach(id =>
    localStorage.setItem('scr.mini.' + id, document.getElementById(id).checked));
}

function loadMiniValues() {
  Object.entries(miniSliderDefaults).forEach(([id, d]) =>
    document.getElementById(id).value = localStorage.getItem('scr.mini.' + id) || d);
  ['parity-even','parity-odd'].forEach(id =>
    document.getElementById(id).checked = localStorage.getItem('scr.mini.' + id) !== 'false');
  miniSliderIds.forEach(baseId => updateRangeSlider(baseId, false));
}

// ── Custom JS panel logic ─────────────────────────────────────────────

function updateProProbability() {
  const prob = scrambler.getProbabilityFromTextFilter(edgeInput.value, cornerInput.value);
  if (isNaN(prob)) {
    miniText.textContent = 'Probability: NaN';
  } else if (prob === 0) {
    miniText.textContent = 'Probability: 0 (Cannot scramble)';
  } else {
    miniText.textContent = `Probability: ${(prob * 100).toFixed(2)}%`;
  }
}

edgeInput.addEventListener('input', () => {
  updateProbability();
  edgeSelectedIndex = -1;
  updateHistoryUI('e');
  edgeHistory.classList.toggle('show-history', edgeHistory.children.length > 0);
});

cornerInput.addEventListener('input', () => {
  updateProbability();
  cornerSelectedIndex = -1;
  updateHistoryUI('c');
  cornerHistory.classList.toggle('show-history', cornerHistory.children.length > 0);
});

edgeInput.addEventListener('focus', () => { updateHistoryUI('e'); if (edgeHistory.children.length > 0) edgeHistory.classList.add('show-history'); });
edgeInput.addEventListener('blur',  () => setTimeout(() => edgeHistory.classList.remove('show-history'), 200));
cornerInput.addEventListener('focus', () => { updateHistoryUI('c'); if (cornerHistory.children.length > 0) cornerHistory.classList.add('show-history'); });
cornerInput.addEventListener('blur',  () => setTimeout(() => cornerHistory.classList.remove('show-history'), 200));

function updateHistoryUI(tag) {
  const histEl   = tag === 'e' ? edgeHistory : cornerHistory;
  const histArr  = tag === 'e' ? edgeHistoryItems : cornerHistoryItems;
  const inputEl  = tag === 'e' ? edgeInput : cornerInput;
  const userInput = inputEl.value.trim();
  histEl.innerHTML = '';
  histArr.filter(item => item.toLowerCase().startsWith(userInput)).forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    if ((tag === 'e' && index === edgeSelectedIndex) || (tag === 'c' && index === cornerSelectedIndex))
      div.classList.add('selected');
    const span = Object.assign(document.createElement('span'), { textContent: item });
    span.style.flexGrow = '1';
    span.addEventListener('click', e => {
      e.stopPropagation();
      inputEl.value = item;
      updateProbability();
      histEl.classList.remove('show-history');
    });
    const del = document.createElement('button');
    del.className = 'delete-history';
    del.addEventListener('click', () => {
      const i = histArr.indexOf(item);
      if (i > -1) { histArr.splice(i, 1); updateHistoryUI(tag); localStorage.setItem(`scr.h${tag}`, JSON.stringify(histArr)); }
    });
    div.append(span, del);
    histEl.appendChild(div);
  });
}

function updateHistorySelection(tag) {
  const histEl = tag === 'e' ? edgeHistory : cornerHistory;
  const sel    = tag === 'e' ? edgeSelectedIndex : cornerSelectedIndex;
  Array.from(histEl.children).forEach((c, i) => c.classList.toggle('selected', i === sel));
}

function tryAddToHistory(tag, value) {
  const arr = tag === 'e' ? edgeHistoryItems : cornerHistoryItems;
  if (!value || arr.includes(value)) return;
  arr.unshift(value);
  if (arr.length > 5) arr.pop();
  updateHistoryUI(tag);
  localStorage.setItem(`scr.h${tag}`, JSON.stringify(arr));
}

function makeKeydownHandler(tag) {
  const histEl   = tag === 'e' ? edgeHistory : cornerHistory;
  const inputEl  = tag === 'e' ? edgeInput : cornerInput;
  return e => {
    if (!histEl.classList.contains('show-history')) return;
    const items = Array.from(histEl.children);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (tag === 'e') edgeSelectedIndex   = Math.min(edgeSelectedIndex + 1,   items.length - 1);
      else             cornerSelectedIndex = Math.min(cornerSelectedIndex + 1, items.length - 1);
      updateHistorySelection(tag);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (tag === 'e') edgeSelectedIndex   = Math.max(edgeSelectedIndex - 1,   -1);
      else             cornerSelectedIndex = Math.max(cornerSelectedIndex - 1, -1);
      updateHistorySelection(tag);
    } else if (e.key === 'Enter') {
      const idx = tag === 'e' ? edgeSelectedIndex : cornerSelectedIndex;
      if (idx >= 0) {
        e.preventDefault();
        const text = items[idx].querySelector('span').textContent;
        inputEl.value = text;
        histEl.classList.remove('show-history');
        updateProbability();
        if (tag === 'e') edgeSelectedIndex = -1; else cornerSelectedIndex = -1;
      } else {
        e.preventDefault();
        generateScramble();
      }
    }
  };
}

edgeInput.addEventListener('keydown', makeKeydownHandler('e'));
cornerInput.addEventListener('keydown', makeKeydownHandler('c'));

edgeInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !edgeHistory.classList.contains('show-history')) { e.preventDefault(); generateScramble(); }
});
cornerInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !cornerHistory.classList.contains('show-history')) { e.preventDefault(); generateScramble(); }
});

// ── Distribution panel logic ──────────────────────────────────────────

function updateChart(input) {
  const edgeValues = [], cornerValues = [];
  let numberFunc = x => x.algs;
  const errorEl = document.getElementById('dist-error');
  if (input.trim() !== '') {
    try {
      const replaced = input.replace(/\b(parity|breaks|algs|(float|bad)[1-5])\b/g, 'x.$1');
      const parsed = new Function('x', `return ${replaced};`);
      const res = parsed(cycler.evenEdges[0]);
      if (typeof res === 'number') {
        numberFunc = parsed;
      } else {
        throw new Error('not a number');
      }
    } catch(e) {
      errorEl.textContent = 'Invalid JavaScript expression.';
      errorEl.style.display = 'block';
      return;
    }
  }
  errorEl.style.display = 'none';

  const edgeStat = cycler.evenEdges.concat(cycler.oddEdges).reduce((acc, item) => {
    const key = numberFunc(item);
    acc[key] = (acc[key] || 0) + item.count;
    return acc;
  }, {});
  const cornerStat = cycler.evenCorners.concat(cycler.oddCorners).reduce((acc, item) => {
    const key = numberFunc(item);
    acc[key] = (acc[key] || 0) + item.count;
    return acc;
  }, {});

  const edgeKeys   = Object.keys(edgeStat).map(Number).sort((a,b) => a-b);
  const cornerKeys = Object.keys(cornerStat).map(Number).sort((a,b) => a-b);

  if (edgeKeys.length > 20 || cornerKeys.length > 20) {
    errorEl.textContent = 'Too many distinct values (> 20) to display.';
    errorEl.style.display = 'block';
    return;
  }

  edgeKeys.forEach(k => edgeValues.push(edgeStat[k] / 980995276800));
  cornerKeys.forEach(k => cornerValues.push(cornerStat[k] / 88179840));

  // Stats
  let eSumXP = 0, eSumX2P = 0;
  edgeValues.forEach((v,i) => { eSumXP += v * edgeKeys[i]; eSumX2P += v * edgeKeys[i] * edgeKeys[i]; });
  const eExp = eSumXP, eStd = Math.sqrt(Math.max(0, eSumX2P - eExp * eExp));
  document.getElementById('edge-x-axis-label').textContent = `Edge (Mean=${eExp.toFixed(3)}, Std=${eStd.toFixed(3)})`;

  let cSumXP = 0, cSumX2P = 0;
  cornerValues.forEach((v,i) => { cSumXP += v * cornerKeys[i]; cSumX2P += v * cornerKeys[i] * cornerKeys[i]; });
  const cExp = cSumXP, cStd = Math.sqrt(Math.max(0, cSumX2P - cExp * cExp));
  document.getElementById('corner-x-axis-label').textContent = `Corner (Mean=${cExp.toFixed(3)}, Std=${cStd.toFixed(3)})`;

  renderChart('edge',   edgeValues,   edgeKeys);
  renderChart('corner', cornerValues, cornerKeys);
}

function renderChart(prefix, values, keys) {
  const chart     = document.getElementById(prefix + '-chart');
  const gridLines = document.getElementById(prefix + '-grid-lines');
  const xAxis     = document.getElementById(prefix + '-x-axis');
  chart.innerHTML = ''; gridLines.innerHTML = ''; xAxis.innerHTML = '';

  const maxVal = Math.ceil(Math.max(...values) * 10) / 10 || 0.1;
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const line = document.createElement('div');
    line.className = 'chart-grid-line';
    line.style.bottom = (i / gridCount * 100) + '%';
    const lbl = document.createElement('div');
    lbl.className = 'chart-grid-label';
    lbl.textContent = (maxVal * i / gridCount).toFixed(2);
    line.appendChild(lbl);
    gridLines.appendChild(line);
  }
  values.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (values.length <= 5 ? ' spaced' : '');
    bar.style.height = `${(v / maxVal) * 100}%`;
    bar.setAttribute('data-value', (v * 100).toFixed(2));
    chart.appendChild(bar);
  });
  keys.forEach(k => {
    const lbl = document.createElement('div');
    lbl.textContent = k;
    xAxis.appendChild(lbl);
  });
}

document.getElementById('dist-input').addEventListener('change', function() {
  updateChart(this.value);
});

// ── Shared logic ──────────────────────────────────────────────────────

function generateScramble() {
  updateProbability();
  if (scrambler.isValid()) {
    if (panelPro.style.display !== 'none') {
      const params = new URLSearchParams();
      params.set('tab', 'advanced');
      if (edgeInput.value.trim())  params.set('e', edgeInput.value.trim());
      if (cornerInput.value.trim()) params.set('c', cornerInput.value.trim());
      if (amountSlider.value > 1)  params.set('n', amountSlider.value);
      history.replaceState(null, '', '?' + params.toString());
      tryAddToHistory('e', edgeInput.value.trim());
      tryAddToHistory('c', cornerInput.value.trim());
    } else {
      saveMiniValues();
      const params = new URLSearchParams();
      params.set('tab', 'basic');
      const bools = { pe:'parity-even', po:'parity-odd' };
      Object.entries(bools).forEach(([k, id]) => { if (!document.getElementById(id).checked) params.set(k, '0'); });
      const urlSliderKeys = {
        'ef-mn':'edge-flips-min','ef-mx':'edge-flips-max',
        'eb-mn':'edge-breaks-min','eb-mx':'edge-breaks-max',
        'e3-mn':'edge-float3-min','e3-mx':'edge-float3-max',
        'ea-mn':'edge-algs-min','ea-mx':'edge-algs-max',
        'cf-mn':'corner-flips-min','cf-mx':'corner-flips-max',
        'cb-mn':'corner-breaks-min','cb-mx':'corner-breaks-max',
        'c3-mn':'corner-float3-min','c3-mx':'corner-float3-max',
        'ca-mn':'corner-algs-min','ca-mx':'corner-algs-max'
      };
      Object.entries(urlSliderKeys).forEach(([k, id]) => {
        const v = document.getElementById(id).value;
        if (v !== miniSliderDefaults[id]) params.set(k, v);
      });
      if (amountSlider.value > 1) params.set('n', amountSlider.value);
      history.replaceState(null, '', '?' + params.toString());
    }
    outputPanel.value = Array.from({ length: amountSlider.value }, () => scrambler.getScramble()).join('\n');
  } else {
    miniText.textContent = 'No valid scrambles.';
  }
}

copyButton.addEventListener('click', () => {
  outputPanel.select();
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
  copyButton.classList.add('copied');
  setTimeout(() => copyButton.classList.remove('copied'), 1500);
});

scrambleButton.addEventListener('click', generateScramble);

// ── Init ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadMiniValues();
  updateAmountSlider();

  // Restore URL params (set values before switchTab so probability is correct on first paint)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'advanced' || urlParams.has('e') || urlParams.has('c')) {
    if (urlParams.has('e')) edgeInput.value = decodeURIComponent(urlParams.get('e'));
    if (urlParams.has('c')) cornerInput.value = decodeURIComponent(urlParams.get('c'));
    if (urlParams.has('n')) { amountSlider.value = urlParams.get('n'); updateAmountSlider(); }
    switchTab('advanced');
  } else if (urlParams.get('tab') === 'basic') {
    const bools = { pe:'parity-even', po:'parity-odd' };
    Object.entries(bools).forEach(([k, id]) => { document.getElementById(id).checked = urlParams.get(k) !== '0'; });
    const urlSliderKeys = {
      'ef-mn':'edge-flips-min','ef-mx':'edge-flips-max',
      'eb-mn':'edge-breaks-min','eb-mx':'edge-breaks-max',
      'e3-mn':'edge-float3-min','e3-mx':'edge-float3-max',
      'ea-mn':'edge-algs-min','ea-mx':'edge-algs-max',
      'cf-mn':'corner-flips-min','cf-mx':'corner-flips-max',
      'cb-mn':'corner-breaks-min','cb-mx':'corner-breaks-max',
      'c3-mn':'corner-float3-min','c3-mx':'corner-float3-max',
      'ca-mn':'corner-algs-min','ca-mx':'corner-algs-max'
    };
    Object.entries(urlSliderKeys).forEach(([k, id]) => {
      const v = urlParams.get(k);
      document.getElementById(id).value = v !== null ? v : miniSliderDefaults[id];
    });
    miniSliderIds.forEach(baseId => updateRangeSlider(baseId, false));
    if (urlParams.has('n')) { amountSlider.value = urlParams.get('n'); updateAmountSlider(); }
    switchTab('basic');
  } else {
    // No URL params — restore last tab from localStorage (safe here: all consts initialized)
    const savedTab = localStorage.getItem('scr.tab');
    if (savedTab === 'advanced' || savedTab === 'stat' || savedTab === 'about') switchTab(savedTab);
  }

  setTimeout(() => updateProbability(), 100);
});
