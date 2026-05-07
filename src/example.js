// Core logic for generating memo notation from code strings and cycle configurations
// This module converts the raw cycle representation (from scrambler.js) into
// human-readable BLD memo notation with execution breakdowns.

// ============================================================================
// LETTER SCHEMES (same as scrambler.js)
// ============================================================================
// edgeCode: 12 edge pieces * 2 orientations = 24 letters
//   Index 0,1 = piece 0 (UF), 2,3 = piece 1 (UL), ..., 22,23 = piece 11 (BR)
//   Even index (0,2,4,...) = orientation 0 of that piece
//   Odd index (1,3,5,...) = orientation 1 of that piece (flipped)
//
// cornerCode: 8 corner pieces * 3 orientations = 24 letters
//   Index 0,1,2 = piece 0 (UFR), 3,4,5 = piece 1 (UFL), ..., 21,22,23 = piece 7 (DFR)
//   Index % 3 == 0 = orientation 0 (correct)
//   Index % 3 == 1 = orientation 1 (CW twist)
//   Index % 3 == 2 = orientation 2 (CCW twist)
// ============================================================================
const DEFAULT_EDGE_CODE = 'ABCDEFGHIJKLMNOPQRSTWXYZ';   // Chichu edge
const DEFAULT_CORNER_CODE = 'ahqcbtedwgfzilsknxmpyojr';  // Speffz-expanded corner
let edgeCode = DEFAULT_EDGE_CODE;
let cornerCode = DEFAULT_CORNER_CODE;
let edgeCodeIdxMap = {}, cornerCodeIdxMap = {};

function buildIndexMaps() {
  edgeCodeIdxMap = {}; cornerCodeIdxMap = {};
  for (let i = 0; i < 24; i++) {
    edgeCodeIdxMap[edgeCode[i]] = [i >> 1, i & 1];
    cornerCodeIdxMap[cornerCode[i]] = [i / 3 | 0, i % 3];
  }
}
buildIndexMaps();

function setLetterScheme(newEdge, newCorner) {
  if (newEdge && newEdge.length === 24) edgeCode = newEdge;
  if (newCorner && newCorner.length === 24) cornerCode = newCorner;
  buildIndexMaps();
}

function translateCodeStr(codeStr, fromScheme, toScheme) {
  let out = '';
  for (let i = 0; i < codeStr.length; i++) {
    const idx = fromScheme.indexOf(codeStr[i]);
    out += idx >= 0 ? toScheme[idx] : codeStr[i];
  }
  return out;
}

// Color palette for cycles - used to color-code different cycles in memo
const CYCLE_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
  '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#2c3e50'
];
const PARITY_COLOR = '#808080';

/**
 * Wrap text in color span for HTML output
 * @param {string} text - The text to color
 * @param {string} color - CSS color
 * @returns {string} HTML span element
 */
function colorSpan(text, colorIdx) {
  return `<span style="color: ${CYCLE_COLORS[colorIdx]};">${text}</span>`;
}

/**
 * Generate full memo for a scramble from code strings and cycle configurations.
 *
 * INPUT:
 *   edgeCodeStr: Raw edge code string from scrambler
 *   cornerCodeStr: Raw corner code string from scrambler
 *   edgeCC: Edge cycle config object from cycler
 *   cornerCC: Corner cycle config object from cycler
 *
 * OUTPUT:
 *   Object with:
 *   - edges: { rawMemo, basicExec, floatingExec }
 *   - corners: { rawMemo, basicExec, floatingExec }
 */
function generateFullMemoFromCode(edgeCodeStr, cornerCodeStr, edgeCC, cornerCC) {
  // --- Edges ---
  let edgeCycleIdxMap = Array(12).fill(-1);
  let edgeMemoParts = [];
  let edgeRegFrags = [];   // {text, cIdx} from perm>1 cycles (pairs and spaces)
  let edgeTwists = [];     // {letter, cIdx} from edge flips
  let edgeBaseCodeLen = 0;

  for (let ci = 0, si = 0; ci < edgeCC.cycles.length; ci++) {
    const p = edgeCC.cycles[ci].perm, o = edgeCC.cycles[ci].ori;
    const cl = p + (ci === 0 ? -1 : 1);
    for (let i = 0; i < edgeCC.cycles[ci].length; i++) {
      edgeCycleIdxMap[edgeCodeIdxMap[edgeCC.cycles[ci][i]][0]] = ci;
    }
    if (!(p === 1 && o === 0)) {
      // Buffer (ci=0) with p=1 has cl=0, so its twist letter isn't in edgeCodeStr;
      // pull it from the scheme at orientation index o instead.
      const twistLetter = p === 1 ? (ci === 0 ? edgeCode[o] : edgeCodeStr[si]) : null;
      let rawMemoPart = p === 1 ? `${twistLetter}+` : edgeCodeStr.slice(si, si + cl);
      edgeMemoParts.push(colorSpan(rawMemoPart, ci));
      if (p > 1) {
        edgeBaseCodeLen += cl;
        let crtStart = si, execText = [];
        while (crtStart < si + cl) {
          let nextStart = Math.min(si + cl, (crtStart >> 1 << 1) + 2);
          execText.push(edgeCodeStr.slice(crtStart, nextStart));
          crtStart = nextStart;
        }
        if (si % 2 === 0 && edgeRegFrags.length > 0) edgeRegFrags.push({ text: ' ', cIdx: -1 });
        for (let j = 0; j < execText.length; j++) {
          edgeRegFrags.push({ text: execText[j], cIdx: ci });
          if (j < execText.length - 1) edgeRegFrags.push({ text: ' ', cIdx: -1 });
        }
      } else {
        edgeTwists.push({ letter: twistLetter, cIdx: ci });
      }
    }
    si += cl;
  }

  // Mark edge parity letter
  if (edgeBaseCodeLen % 2 === 1) {
    for (let i = edgeRegFrags.length - 1; i >= 0; i--) {
      if (edgeRegFrags[i].cIdx >= 0 && edgeRegFrags[i].text.length === 1) {
        const origCIdx = edgeRegFrags[i].cIdx;
        edgeRegFrags[i] = { text: `<span style="color: ${PARITY_COLOR};">(Parity:)</span>${colorSpan(edgeRegFrags[i].text, origCIdx)}`, cIdx: -2 };
        break;
      }
    }
  }

  // Render edge exec
  let edgeExecParts = edgeRegFrags.map(f => {
    if (f.cIdx === -1) return ' ';
    if (f.cIdx === -2) return f.text;
    return colorSpan(f.text, f.cIdx);
  });

  // Group edge flips in chunks of 4
  if (edgeTwists.length > 0) {
    if (edgeExecParts.length > 0) edgeExecParts.push(' ');
    let groups = [];
    for (let i = 0; i < edgeTwists.length; i += 4) {
      groups.push(edgeTwists.slice(i, Math.min(i + 4, edgeTwists.length))
        .map(t => colorSpan(`${t.letter}+`, t.cIdx)).join(''));
    }
    edgeExecParts.push(groups.join(' '));
  }

  // --- Corners ---
  let cornerCycleIdxMap = Array(8).fill(-1);
  let cornerMemoParts = [];
  let cornerRegFrags = [];
  let cornerTwists = [];   // {letter, ori, cIdx}
  let cornerBaseCodeLen = 0;

  for (let ci = 0, si = 0; ci < cornerCC.cycles.length; ci++) {
    const p = cornerCC.cycles[ci].perm, o = cornerCC.cycles[ci].ori;
    const cl = p + (ci === 0 ? -1 : 1);
    for (let i = 0; i < cornerCC.cycles[ci].length; i++) {
      cornerCycleIdxMap[cornerCodeIdxMap[cornerCC.cycles[ci][i]][0]] = ci;
    }
    if (p > 1) {
      cornerBaseCodeLen += cl;
      let rawMemoPart = cornerCodeStr.slice(si, si + cl);
      cornerMemoParts.push(colorSpan(rawMemoPart, ci));
      let crtStart = si, execText = [];
      while (crtStart < si + cl) {
        let nextStart = Math.min(si + cl, (crtStart >> 1 << 1) + 2);
        execText.push(cornerCodeStr.slice(crtStart, nextStart));
        crtStart = nextStart;
      }
      if (si % 2 === 0 && cornerRegFrags.length > 0) cornerRegFrags.push({ text: ' ', cIdx: -1 });
      for (let j = 0; j < execText.length; j++) {
        cornerRegFrags.push({ text: execText[j], cIdx: ci });
        if (j < execText.length - 1) cornerRegFrags.push({ text: ' ', cIdx: -1 });
      }
    } else if (o !== 0) {
      // Buffer (ci=0) with p=1 has cl=0; pull twist letter from scheme at orientation o.
      const twistLetter = ci === 0 ? cornerCode[o] : cornerCodeStr[si];
      let rawMemoPart = `${twistLetter}${o === 1 ? '-' : '+'}`;
      cornerMemoParts.push(colorSpan(rawMemoPart, ci));
      cornerTwists.push({ letter: twistLetter, ori: o, cIdx: ci });
    }
    si += cl;
  }

  // Mark corner parity letter
  if (cornerBaseCodeLen % 2 === 1) {
    for (let i = cornerRegFrags.length - 1; i >= 0; i--) {
      if (cornerRegFrags[i].cIdx >= 0 && cornerRegFrags[i].text.length === 1) {
        const origCIdx = cornerRegFrags[i].cIdx;
        cornerRegFrags[i] = { text: `<span style="color: ${PARITY_COLOR};">(Parity:)</span>${colorSpan(cornerRegFrags[i].text, origCIdx)}`, cIdx: -2 };
        break;
      }
    }
  }

  // Render corner exec
  let cornerExecParts = cornerRegFrags.map(f => {
    if (f.cIdx === -1) return ' ';
    if (f.cIdx === -2) return f.text;
    return colorSpan(f.text, f.cIdx);
  });

  // Group corner twists: 3 CW, 3 CCW, paired CW+CCW, then remaining
  if (cornerTwists.length > 0) {
    if (cornerExecParts.length > 0) cornerExecParts.push(' ');
    let cw = cornerTwists.filter(t => t.ori === 1);
    let ccw = cornerTwists.filter(t => t.ori === 2);
    let twistGroups = [];

    while (cw.length >= 3) {
      twistGroups.push(cw.splice(0, 3).map(t => colorSpan(`${t.letter}-`, t.cIdx)).join(''));
    }
    while (ccw.length >= 3) {
      twistGroups.push(ccw.splice(0, 3).map(t => colorSpan(`${t.letter}+`, t.cIdx)).join(''));
    }
    while (cw.length > 0 && ccw.length > 0) {
      let t1 = cw.shift(), t2 = ccw.shift();
      twistGroups.push(colorSpan(`${t1.letter}-`, t1.cIdx) + colorSpan(`${t2.letter}+`, t2.cIdx));
    }
    let remaining = [...cw.map(t => colorSpan(`${t.letter}-`, t.cIdx)), ...ccw.map(t => colorSpan(`${t.letter}+`, t.cIdx))];
    if (remaining.length > 0) twistGroups.push(remaining.join(''));

    cornerExecParts.push(twistGroups.join(' '));
  }

  const edgeBasic = edgeExecParts.join('');
  const cornerBasic = cornerExecParts.join('');
  return {
    edges: {
      rawMemo: edgeMemoParts.join(' '),
      basicExec: edgeBasic,
      advancedExec: 'TBD',
      floatingExec: generateFloatingExec(edgeCodeStr, edgeCC, true, edgeBasic)
    },
    corners: {
      rawMemo: cornerMemoParts.join(' '),
      basicExec: cornerBasic,
      advancedExec: 'TBD',
      floatingExec: generateFloatingExec(cornerCodeStr, cornerCC, false, cornerBasic)
    }
  };
}

// ============================================================================
// FULL FLOATING (with parity absorption)
// ----------------------------------------------------------------------------
// Greedy reduction matching the Phase 1/2/3 logic described in help.html.
// Floating algs are rendered as `(X:)YZ` where X is the anchor letter and
// YZ are the two letters cycled in that alg. Letters keep their source-cycle
// color; `(Parity:)` is gray. May be sub-optimal vs. true minimum.
//
// A cycle is reduced to floating only when its reduction can fully resolve —
// i.e. its Phase-1 (2,o) residual gets paired in Phase 2 or absorbed by parity.
// Otherwise it reverts to Basic execution; orphan single letters can then merge
// with adjacent Basic cycles via the standard si-alignment rule.
// ============================================================================
function generateFloatingExec(codeStr, cc, isEdge, basicExec) {
  // Skip reduction entirely if it wouldn't save any algs — display matches Basic.
  if (cc.algFullParity === cc.alg) return basicExec;

  const cycles = cc.cycles;
  const parity = cc.parity;
  const PARITY_HTML = `<span style="color: ${PARITY_COLOR};">(Parity:)</span>`;

  const renderFloat = (a, aC, p1, p1C, p2, p2C) =>
    `${colorSpan(`(${a}:)`, aC)}${colorSpan(p1, p1C)}${colorSpan(p2, p2C)}`;

  // Slice each cycle's letters
  const cycleData = [];
  let si = 0;
  for (let ci = 0; ci < cycles.length; ci++) {
    const p = cycles[ci].perm, o = cycles[ci].ori;
    const cl = ci === 0 ? p - 1 : p + 1;
    cycleData.push({ ci, cl, slc: codeStr.slice(si, si + cl), p, o });
    si += cl;
  }

  // Phase 1: emit floating chunks for ≥3 non-buffer cycles; collect (2,o) and twists
  const phase1Plans = new Map();   // ci → { chunks: [string], twist: entry|null }
  const allEntries = [];           // (2,o) pool: orig 2-cycles + Phase-1 residuals
  const initialTwists = [];        // {letter, ori, cIdx} from p=1 cycles

  for (const cd of cycleData) {
    const { ci, slc, p, o } = cd;
    if (ci === 0) {
      // Buffer twisted-in-place: cl=0, twist letter comes from scheme at orientation o.
      if (p === 1 && o !== 0) {
        initialTwists.push({ letter: isEdge ? edgeCode[o] : cornerCode[o], ori: o, cIdx: ci });
      }
      continue;
    }
    if (p === 1) {
      if (o !== 0) initialTwists.push({ letter: slc[0], ori: o, cIdx: ci });
      continue;
    }
    if (p === 2) {
      allEntries.push({ a: slc[0], t: slc[1], c: slc[2], o, cIdx: ci, source: 'orig' });
      continue;
    }
    const chunks = [];
    const numChunks = (p - 1) >> 1;
    for (let k = 0; k < numChunks; k++) {
      chunks.push(renderFloat(slc[0], ci, slc[1 + 2*k], ci, slc[2 + 2*k], ci));
    }
    const plan = { chunks, twist: null };
    if (p & 1) {
      if (o !== 0) plan.twist = { letter: slc[0], ori: o, cIdx: ci };
    } else {
      allEntries.push({ a: slc[0], t: slc[p - 1], c: slc[p], o, cIdx: ci, source: 'phase1' });
    }
    phase1Plans.set(ci, plan);
  }

  // Phase 2: greedy pairing (order matches help.html documented sequence)
  const buckets = [[], [], []];
  for (const e of allEntries) buckets[e.o].push(e);

  const pairChunks = [];
  const phase2Twists = [];
  const reducedCycles = new Set(phase1Plans.keys());

  const dropPrime = e => ({ a: e.a, t: e.t, c: e.a, cIdx: e.cIdx, source: e.source });
  function emitPair(x, y, yEffective) {
    const ye = yEffective || y;
    pairChunks.push(renderFloat(x.a, x.cIdx, x.t, x.cIdx, ye.a, ye.cIdx));
    pairChunks.push(renderFloat(x.a, x.cIdx, ye.t, ye.cIdx, ye.c, ye.cIdx));
    if (x.source === 'orig') reducedCycles.add(x.cIdx);
    if (y.source === 'orig') reducedCycles.add(y.cIdx);
  }

  if (isEdge) {
    while (buckets[0].length >= 2) emitPair(buckets[0].shift(), buckets[0].shift());
    while (buckets[1].length >= 2) emitPair(buckets[1].shift(), buckets[1].shift());
    while (buckets[0].length && buckets[1].length) {
      const x = buckets[0].shift(), y = buckets[1].shift();
      emitPair(x, y, dropPrime(y));
      phase2Twists.push({ letter: y.a, ori: 1, cIdx: y.cIdx });
    }
  } else {
    while (buckets[0].length >= 2) emitPair(buckets[0].shift(), buckets[0].shift());
    while (buckets[1].length && buckets[2].length) {
      const x = buckets[1].shift(), y = buckets[2].shift();
      emitPair(dropPrime(x), dropPrime(y));   // 1+2 ≡ 0 — twists cancel
    }
    while (buckets[1].length >= 2) {
      const x = buckets[1].shift(), y = buckets[1].shift();
      emitPair(dropPrime(x), dropPrime(y));
      phase2Twists.push({ letter: x.a, ori: 2, cIdx: x.cIdx });
    }
    while (buckets[2].length >= 2) {
      const x = buckets[2].shift(), y = buckets[2].shift();
      emitPair(dropPrime(x), dropPrime(y));
      phase2Twists.push({ letter: x.a, ori: 1, cIdx: x.cIdx });
    }
    while (buckets[0].length && buckets[1].length) {
      const x = buckets[0].shift(), y = buckets[1].shift();
      emitPair(x, y, dropPrime(y));
      phase2Twists.push({ letter: y.a, ori: 1, cIdx: y.cIdx });
    }
    while (buckets[0].length && buckets[2].length) {
      const x = buckets[0].shift(), y = buckets[2].shift();
      emitPair(x, y, dropPrime(y));
      phase2Twists.push({ letter: y.a, ori: 2, cIdx: y.cIdx });
    }
  }

  // Residual decision: parity-absorb (only for unpaired (2,0) + odd parity), else revert
  let residualEntry = null;
  for (let oo = 0; oo <= (isEdge ? 1 : 2); oo++) {
    if (buckets[oo].length === 1) { residualEntry = buckets[oo][0]; break; }
  }
  let absorbedResidualOut = '';
  let absorbed = false;
  if (residualEntry) {
    if (parity === 1 && residualEntry.o === 0) {
      absorbed = true;
      const aPart = colorSpan(`(${residualEntry.a}:)`, residualEntry.cIdx);
      const tPart = colorSpan(residualEntry.t, residualEntry.cIdx);
      absorbedResidualOut = `${PARITY_HTML}${aPart}${tPart}`;
      if (residualEntry.source === 'orig') reducedCycles.add(residualEntry.cIdx);
    } else if (residualEntry.source === 'phase1') {
      // Revert ≥3 cycle to Basic — drop Phase 1 chunks and the twist they produced
      phase1Plans.delete(residualEntry.cIdx);
      reducedCycles.delete(residualEntry.cIdx);
    }
    // 'orig' unabsorbed: cycle naturally falls into Basic stream
  }

  // Basic stream: render unreduced cycles with si-aware alignment so adjacent
  // single letters across cycle boundaries merge into proper pairs.
  const regFrags = [];
  let virtSi = 0;
  let basicCl = 0;
  for (const cd of cycleData) {
    const { ci, cl, slc, p } = cd;
    if (cl === 0) continue;
    if (ci !== 0 && (p === 1 || reducedCycles.has(ci))) continue;
    if (virtSi % 2 === 0 && regFrags.length > 0) regFrags.push({ text: ' ', cIdx: -1 });
    let crtStart = virtSi;
    const cycleEnd = virtSi + cl;
    while (crtStart < cycleEnd) {
      const nextStart = Math.min(cycleEnd, ((crtStart >> 1) << 1) + 2);
      regFrags.push({ text: slc.slice(crtStart - virtSi, nextStart - virtSi), cIdx: ci });
      if (nextStart < cycleEnd) regFrags.push({ text: ' ', cIdx: -1 });
      crtStart = nextStart;
    }
    virtSi += cl;
    basicCl += cl;
  }

  // Parity marker: last single letter in basic stream, only when odd parity is
  // not already absorbed by a residual.
  if (parity === 1 && !absorbed && basicCl % 2 === 1) {
    for (let i = regFrags.length - 1; i >= 0; i--) {
      const f = regFrags[i];
      if (f.cIdx >= 0 && f.text.length === 1) {
        regFrags[i] = { text: `${PARITY_HTML}${colorSpan(f.text, f.cIdx)}`, cIdx: -2 };
        break;
      }
    }
  }

  const basicStream = regFrags.map(f => {
    if (f.cIdx === -1) return ' ';
    if (f.cIdx === -2) return f.text;
    return colorSpan(f.text, f.cIdx);
  }).join('');

  // Twists: order by source cycle index for natural placement
  const allTwists = [...initialTwists];
  for (const plan of phase1Plans.values()) if (plan.twist) allTwists.push(plan.twist);
  allTwists.push(...phase2Twists);
  allTwists.sort((a, b) => a.cIdx - b.cIdx);

  let twistOut = '';
  if (allTwists.length) {
    if (isEdge) {
      const groups = [];
      for (let i = 0; i < allTwists.length; i += 4) {
        const grp = allTwists.slice(i, Math.min(i + 4, allTwists.length));
        groups.push(grp.map(t => colorSpan(`${t.letter}+`, t.cIdx)).join(''));
      }
      twistOut = groups.join(' ');
    } else {
      let cw = allTwists.filter(t => t.ori === 1);
      let ccw = allTwists.filter(t => t.ori === 2);
      const groups = [];
      while (cw.length >= 3) groups.push(cw.splice(0, 3).map(t => colorSpan(`${t.letter}-`, t.cIdx)).join(''));
      while (ccw.length >= 3) groups.push(ccw.splice(0, 3).map(t => colorSpan(`${t.letter}+`, t.cIdx)).join(''));
      while (cw.length && ccw.length) {
        const t1 = cw.shift(), t2 = ccw.shift();
        groups.push(colorSpan(`${t1.letter}-`, t1.cIdx) + colorSpan(`${t2.letter}+`, t2.cIdx));
      }
      const rest = [...cw.map(t => colorSpan(`${t.letter}-`, t.cIdx)),
                    ...ccw.map(t => colorSpan(`${t.letter}+`, t.cIdx))];
      if (rest.length) groups.push(rest.join(''));
      twistOut = groups.join(' ');
    }
  }

  const out = [];
  if (basicStream) out.push(basicStream);
  for (const ci of [...phase1Plans.keys()].sort((a, b) => a - b)) {
    out.push(...phase1Plans.get(ci).chunks);
  }
  out.push(...pairChunks);
  if (absorbedResidualOut) out.push(absorbedResidualOut);
  if (twistOut) out.push(twistOut);
  return out.join(' ');
}

// Export minimal API for use in help.js
window.Example = {
  generateFullMemoFromCode,
  setLetterScheme,
  translateCodeStr,
  DEFAULT_EDGE_CODE,
  DEFAULT_CORNER_CODE
};
