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
const edgeCode = 'ABCDEFGHIJKLMNOPQRSTWXYZ';  // 12 pieces * 2 orientations
const cornerCode = 'ahqcbtedwgfzilsknxmpyojr';  // 8 pieces * 3 orientations
let edgeCodeIdxMap = {}, cornerCodeIdxMap = {};
for (let i = 0; i < 24; i++) {
  edgeCodeIdxMap[edgeCode[i]] = [i >> 1, i & 1];  // Map letter to [piece index (0-11), orientation (0 or 1)]
  cornerCodeIdxMap[cornerCode[i]] = [i / 3 | 0, i % 3];  // Map letter to [piece index (0-7), orientation (0, 1, or 2)]
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
      let rawMemoPart = p === 1 ? `${edgeCodeStr[si]}+` : edgeCodeStr.slice(si, si + cl);
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
        edgeTwists.push({ letter: edgeCodeStr[si], cIdx: ci });
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
      let rawMemoPart = `${cornerCodeStr[si]}${o === 1 ? '-' : '+'}`;
      cornerMemoParts.push(colorSpan(rawMemoPart, ci));
      cornerTwists.push({ letter: cornerCodeStr[si], ori: o, cIdx: ci });
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

  return {
    edges: {
      rawMemo: edgeMemoParts.join(' '),
      basicExec: edgeExecParts.join(''),
      advancedExec: 'TBD',
      floatingExec: 'TBD'
    },
    corners: {
      rawMemo: cornerMemoParts.join(' '),
      basicExec: cornerExecParts.join(''),
      advancedExec: 'TBD',
      floatingExec: 'TBD'
    }
  };
}

// Export minimal API for use in help.js
window.Example = {
  generateFullMemoFromCode
};
