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

// Build maps from letter to piece index and orientation for quick lookup when processing code strings.
const edgeCodeIdxMap = {}, cornerCodeIdxMap = {};
// Edge cycle-head preference order: pick the next unsolved cycle whose head
// piece minimizes its index here (buffer A always handled first as cycle 0).
const EDGE_PREF_LETTERS = 'AGEDPITXKNQY'.split('');
const edgePrefIdxByPiece = Array(12).fill(999);
const edgePrefOriByPiece = Array(12).fill(0);
const edgePrefPieceByIdx = Array(EDGE_PREF_LETTERS.length).fill(-1);
function buildIndexMaps() {
  for (const k of Object.keys(edgeCodeIdxMap)) delete edgeCodeIdxMap[k];
  for (const k of Object.keys(cornerCodeIdxMap)) delete cornerCodeIdxMap[k];
  for (let i = 0; i < 24; i++) {
    edgeCodeIdxMap[edgeCode[i]] = [i >> 1, i & 1];
    cornerCodeIdxMap[cornerCode[i]] = [i / 3 | 0, i % 3];
  }
  edgePrefIdxByPiece.fill(999);
  edgePrefOriByPiece.fill(0);
  edgePrefPieceByIdx.fill(-1);
  EDGE_PREF_LETTERS.forEach((L, i) => {
    const e = edgeCodeIdxMap[L];
    if (e) {
      edgePrefIdxByPiece[e[0]] = i;
      edgePrefOriByPiece[e[0]] = e[1];
      edgePrefPieceByIdx[i] = e[0];
    }
  });
}
buildIndexMaps();

// Color palette for cycles - used to color-code different cycles in memo
const CYCLE_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
  '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#2c3e50'
];
const PARITY_COLOR = '#808080';

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

/**
 * Wrap text in color span for HTML output
 * @param {string} text - The text to color
 * @param {string} color - CSS color
 * @returns {string} HTML span element
 */
function colorSpan(text, colorIdx) {
  return `<span style="color: ${CYCLE_COLORS[colorIdx]};">${text}</span>`;
}

// Render corner twists as a space-separated string of 3-at-a-time groups,
// preferring pure-direction groups first then mixing the remainder. Matches
// cycler.algTw which counts ceil(twist_count / 3) algs regardless of direction.
function renderCornerTwistGroups(twists) {
  const cw = twists.filter(t => t.ori === 1);
  const ccw = twists.filter(t => t.ori === 2);
  const groups = [];
  const tok = t => colorSpan(`${t.letter}${t.ori === 1 ? '-' : '+'}`, t.cIdx);
  while (cw.length >= 3) groups.push(cw.splice(0, 3).map(tok).join(''));
  while (ccw.length >= 3) groups.push(ccw.splice(0, 3).map(tok).join(''));
  const rest = [...cw, ...ccw];
  for (let i = 0; i < rest.length; i += 3) {
    groups.push(rest.slice(i, i + 3).map(tok).join(''));
  }
  return groups.join(' ');
}

function swap(arr, i, j) {
  const temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
}

function swapEO(arr, i, j, flag) {
  const temp = arr[i]; arr[i] = arr[j] ^ flag; arr[j] = temp ^ flag;
}

function swapCO(arr, i, j, flag) {
  const temp = arr[i]; arr[i] = (arr[j] + flag) % 3; arr[j] = (temp + 3 - flag) % 3;
}

// Returns the cube state that codeStr (forward) solves: applies letters in
// reverse to identity ep/eo/cp/co, mirroring scrambler.genCube.
function generateCubeState(edgeCodeStr, cornerCodeStr) {
  const ep = Array.from({ length: 12 }, (_, i) => i), eo = Array(12).fill(0);
  const cp = Array.from({ length: 8 }, (_, i) => i), co = Array(8).fill(0);
  for (let i = edgeCodeStr.length - 1; i >= 0; i--) {
    const [pieceIdx, pieceOri] = edgeCodeIdxMap[edgeCodeStr[i]];
    swap(ep, 0, pieceIdx);
    swapEO(eo, 0, pieceIdx, pieceOri);
  }
  for (let i = cornerCodeStr.length - 1; i >= 0; i--) {
    const [pieceIdx, pieceOri] = cornerCodeIdxMap[cornerCodeStr[i]];
    swap(cp, 0, pieceIdx);
    swapCO(co, 0, pieceIdx, pieceOri);
  }
  return { ep, eo, cp, co };
}

// Trace one cycle starting at (startPerm, startOri); returns visit pieces[] and oris[]
// (length = perm) and the running ori after returning to startPerm.
function traceCycle(ep, eo, startPerm, startOri) {
  const pieces = [], oris = [];
  let np = startPerm, no = startOri;
  do {
    pieces.push(np); oris.push(no);
    const nNp = ep[np], nNo = eo[np] ^ no;
    np = nNp; no = nNo;
  } while (np !== startPerm);
  return { pieces, oris, endOri: no };
}

// Pair-group a cycle list and append twist groups; mark the last single letter
// as parity. cycles entries shape: { letters, isTwist, ci }. fmt selects HTML.
function renderEdgeExec(cycles, fmt) {
  const regFrags = [];
  const twists = [];
  let baseLen = 0, virtSi = 0;
  for (const c of cycles) {
    if (c.isTwist) { twists.push({ letter: c.letters[0], ci: c.ci }); continue; }
    if (c.letters.length === 0) continue;
    baseLen += c.letters.length;
    if (virtSi % 2 === 0 && regFrags.length > 0) regFrags.push({ text: ' ', ci: -1 });
    let crtStart = virtSi;
    const cycleEnd = virtSi + c.letters.length;
    while (crtStart < cycleEnd) {
      const nextStart = Math.min(cycleEnd, ((crtStart >> 1) << 1) + 2);
      regFrags.push({ text: c.letters.slice(crtStart - virtSi, nextStart - virtSi), ci: c.ci });
      if (nextStart < cycleEnd) regFrags.push({ text: ' ', ci: -1 });
      crtStart = nextStart;
    }
    virtSi += c.letters.length;
  }
  if (fmt && baseLen % 2 === 1) {
    for (let i = regFrags.length - 1; i >= 0; i--) {
      if (regFrags[i].ci >= 0 && regFrags[i].text.length === 1) {
        const oc = regFrags[i].ci;
        const tagged = `<span style="color: ${PARITY_COLOR};">(Parity:)</span>${colorSpan(regFrags[i].text, oc)}`;
        regFrags[i] = { text: tagged, ci: -2 };
        break;
      }
    }
  }
  let out = regFrags.map(f => {
    if (f.ci === -1) return ' ';
    if (f.ci === -2) return f.text;
    return fmt ? colorSpan(f.text, f.ci) : f.text;
  }).join('');
  if (twists.length > 0) {
    if (out) out += ' ';
    const groups = [];
    for (let i = 0; i < twists.length; i += 4) {
      groups.push(twists.slice(i, i + 4).map(t =>
        fmt ? colorSpan(`${t.letter}+`, t.ci) : `${t.letter}+`
      ).join(''));
    }
    out += groups.join(' ');
  }
  return out;
}

// INPUT: cubeState = { ep, eo, cp, co } with piece permutation and orientation arrays
// fmt=false: plain letters, fmt=true: colored HTML
// OUTPUT: { memo, execBasic, execCps, execCpsMwp, slotCps, slotMwp }
//   slotCps: 1-based pref index of the CPS slot, or -1 if none applies.
//   slotMwp: 1-based pref index of the MWP slot, or -1 if MWP didn't apply.
function readEdge(cubeState, fmt=false) {
  const { ep, eo } = cubeState;
  const BUFFER = 0;

  let remain = 0xfff & ~(1 << BUFFER);
  for (let i = 0; i < 12; i++) {
    if (ep[i] === i && eo[i] === 0) remain &= ~(1 << i);
  }
  if (remain === 0) return { memo: '', execBasic: '', execCps: '', execCpsMwp: '', slotCps: -1, slotMwp: -1 };

  // Trace cycles per C# ReadCode (flipSign=true, preserveOri=true).
  // Each entry tracks pieces[]/oris[] for CPS rotation/rebuild.
  const cycles = [];
  const pieceToCycle = new Array(12).fill(-1);
  const piecePosInCycle = new Array(12).fill(-1);
  let headPerm = BUFFER, headOri = 0, isFirst = true, endOri = 0;
  while (true) {
    const cycleHeadOri = headOri;
    let chunk = '';
    const pieces = [], oris = [];
    if (!isFirst) {
      chunk += edgeCode[headPerm * 2 + headOri];
      pieces.push(headPerm); oris.push(headOri);
    }
    let np = ep[headPerm], no = eo[headPerm] ^ headOri;
    let middleCount = 0;
    while (np !== headPerm) {
      chunk += edgeCode[np * 2 + no];
      pieces.push(np); oris.push(no);
      remain &= ~(1 << np);
      const nNp = ep[np], nNo = eo[np] ^ no;
      np = nNp; no = nNo;
      middleCount++;
    }
    let isTwist = false;
    if (!isFirst) {
      if (ep[np] === np) {
        chunk += '+';
        if (middleCount === 0) isTwist = true;
      } else {
        chunk += edgeCode[np * 2 + no];
      }
      pieces.push(np); oris.push(no);
    }
    const ci = cycles.length;
    cycles.push({
      letters: chunk, isTwist, pieces, oris,
      headOri: cycleHeadOri, endOri: no, isBuffer: isFirst, ci,
    });
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (pieceToCycle[p] === -1) {
        pieceToCycle[p] = ci;
        piecePosInCycle[p] = i;
      }
    }
    endOri = no;
    isFirst = false;
    if (remain === 0) break;
    // Pick next cycle head by EDGE_PREF_LETTERS rank (lowest pref index wins).
    let nextPerm = -1, bestPref = Infinity;
    for (let p = 0; p < 12; p++) {
      if (((remain >> p) & 1) === 0) continue;
      const pi = edgePrefIdxByPiece[p];
      if (pi < bestPref) { bestPref = pi; nextPerm = p; }
    }
    remain &= ~(1 << nextPerm);
    headPerm = nextPerm; headOri = endOri;
  }

  // Memo: cycle chunks separated by spaces, color-coded per cycle.
  const memo = cycles.map((c, i) => fmt ? colorSpan(c.letters, i) : c.letters).join(' ');

  const execBasic = renderEdgeExec(cycles, fmt);
  const cps = buildEdgeCps(ep, eo, cycles, pieceToCycle, piecePosInCycle, fmt);
  const execCps = cps.exec || execBasic;
  const slotCps = cps.slotIdx;
  const mwp = buildEdgeMwp(cycles, pieceToCycle, piecePosInCycle, fmt, execCps);
  const execCpsMwp = mwp.exec;
  // MWP falls back to execCps when it doesn't apply, so the slot the displayed
  // exec actually uses is slotCps in that case.
  const slotMwp = mwp.slotIdx >= 1 ? mwp.slotIdx : slotCps;

  return { memo, execBasic, execCps, execCpsMwp, slotCps, slotMwp };
}

// CPS slot search + rebuild. The slot letter is dropped from its source cycle
// and appended at the very end of the stream (after twists) — that's the final
// parity 2-swap. Returns { exec, slotIdx } where slotIdx is the 1-based pref
// index of the chosen slot, or -1 (with exec='') if no slot applies.
//
// Eligibility (iterate pref idx k = 1..pref-length):
//   - p_k in buf-cycle MID position → skip
//   - p_k in buf-cycle END position → Case 1 if (oris[last] ^ bufCycleOri) == prefOri
//   - p_k in non-buf perm>1 cycle    → Case 2 (rotate to start at p_k, drop end)
//   - p_k in (1,1) flip cycle        → Case 3 (emit non-slot ori letter only)
//   - p_k in (1,0) solved cycle      → skip
function buildEdgeCps(ep, eo, cycles, pieceToCycle, piecePosInCycle, fmt) {
  const buf = cycles[0];
  const bufLast = buf.pieces.length - 1;
  // Empty buffer cycle (e.g., (1,1) flipped-in-place buffer) still permits CPS:
  // there's just no buf-end Case 1 candidate.
  const bufEndPiece = bufLast >= 0 ? buf.pieces[bufLast] : -1;
  const bufEndLetterOri = bufLast >= 0 ? buf.oris[bufLast] : 0;
  const bufCycleOri = buf.endOri ^ buf.headOri;

  // Find slot — scan the full pref list. For k ≤ pref idx of bufEndPiece, hits
  // are typically Case 1 (buf-end ori-match) or skip-mid; for k beyond, hits
  // fall into Case 2/3 in non-buffer cycles.
  let slot = null;  // { piece, prefOri, slotLetter, kase: 1|2|3, ci, k }
  for (let k = 1; k < EDGE_PREF_LETTERS.length; k++) {
    const p = edgePrefPieceByIdx[k];
    if (p < 0) continue;
    const ci = pieceToCycle[p];
    if (ci < 0) continue;  // solved-in-place (1,0); not in any cycle
    const c = cycles[ci];
    const prefOri = edgePrefOriByPiece[p];
    const slotLetter = edgeCode[p * 2 + prefOri];
    if (ci === 0) {
      // In buffer cycle. Mid → skip. End → Case 1 with ori check.
      if (piecePosInCycle[p] !== bufLast) continue;
      if (((bufEndLetterOri ^ bufCycleOri) & 1) !== prefOri) continue;
      slot = { piece: p, prefOri, slotLetter, kase: 1, ci, k }; break;
    }
    if (c.isTwist) {
      slot = { piece: p, prefOri, slotLetter, kase: 3, ci, k }; break;
    }
    // Non-buffer perm>1
    slot = { piece: p, prefOri, slotLetter, kase: 2, ci, k }; break;
  }
  if (!slot) return { exec: '', slotIdx: -1 };

  // Drop the slot letter from its source cycle; slot letter is appended at the
  // very end of the stream as the parity 2-swap. For Case 2/3 the slot's
  // modified cycle is moved right after buf — that order keeps buffer at
  // slot.piece's home through the remaining cycles so the tail letter closes.
  const mod = cycles.map(c => ({ ...c }));
  if (slot.kase === 1) {
    mod[0].letters = mod[0].letters.slice(0, -1);
  } else if (slot.kase === 2) {
    // Re-trace slot's cycle starting at slot.piece with running ori = prefOri
    // (the slot letter's ori). Head visit yields the slot letter directly; the
    // natural end of this rotated cycle is the same piece with a different ori
    // and gets dropped — slot letter rejoins as the parity tail.
    const c = mod[slot.ci];
    const tr = traceCycle(ep, eo, slot.piece, slot.prefOri ^ bufCycleOri);
    let s = '';
    for (let i = 0; i < tr.pieces.length; i++) s += edgeCode[tr.pieces[i] * 2 + tr.oris[i]];
    c.letters = s;
  } else {
    const c = mod[slot.ci];
    c.letters = edgeCode[slot.piece * 2 + (slot.prefOri ^ bufCycleOri)];
    c.isTwist = false;
  }
  if (slot.kase !== 1) {
    // Move slot's cycle right after buf so it executes immediately, then its
    // last letter (replaced with slot letter) tails the entire stream.
    mod.splice(1, 0, mod.splice(slot.ci, 1)[0]);
  }
  let out = renderEdgeExec(mod, fmt);
  if (out) out += ' ';
  out += fmt
    ? `<span style="color: ${PARITY_COLOR};">(Parity:)</span>${colorSpan(slot.slotLetter, slot.ci)}`
    : slot.slotLetter;
  return { exec: out, slotIdx: slot.k };
}

// CPS+MWP: same as CPS, but if a pref letter (in pref order) lands at an EVEN
// index inside the buffer cycle (with matching ori), tag IT as parity in-place
// and pair the remaining letters contiguously around it. If MWP doesn't apply
// (pref letter at odd index → "fails"; first not-in-buf pref letter → stop
// scan), fall back to execCps. Returns { exec, slotIdx }: slotIdx is the
// 1-based pref index when MWP applies, else -1.
function buildEdgeMwp(cycles, pieceToCycle, piecePosInCycle, fmt, execCps) {
  const buf = cycles[0];
  if (!buf || buf.pieces.length === 0) return { exec: execCps, slotIdx: -1 };

  let mwp = null;
  for (let k = 1; k < EDGE_PREF_LETTERS.length; k++) {
    const p = edgePrefPieceByIdx[k];
    if (p < 0) continue;
    if (pieceToCycle[p] !== 0) break;  // not in buf cycle → scan stops
    const pos = piecePosInCycle[p];
    const prefOri = edgePrefOriByPiece[p];
    if ((pos & 1) === 0 && buf.oris[pos] === prefOri) {
      mwp = { piece: p, pos, k };
      break;
    }
    // odd index or ori mismatch → fail, try next pref letter
  }
  if (!mwp) return { exec: execCps, slotIdx: -1 };

  const slotLetter = edgeCode[mwp.piece * 2 + edgePrefOriByPiece[mwp.piece]];
  const pre = buf.letters.slice(0, mwp.pos);
  // Letters after the parity slot — buffer's tail concatenated with subsequent
  // non-twist cycles' letters, paired contiguously across cycle boundaries.
  const rest = [];  // [{ ch, ci }]
  for (const ch of buf.letters.slice(mwp.pos + 1)) rest.push({ ch, ci: 0 });
  const twists = [];
  for (let i = 1; i < cycles.length; i++) {
    const c = cycles[i];
    if (c.isTwist) { twists.push({ letter: c.letters[0], ci: c.ci }); continue; }
    for (const ch of c.letters) rest.push({ ch, ci: c.ci });
  }

  const tokens = [];
  for (let i = 0; i < pre.length; i += 2) {
    const seg = pre.slice(i, i + 2);
    tokens.push(fmt ? colorSpan(seg, 0) : seg);
  }
  tokens.push(fmt
    ? `<span style="color: ${PARITY_COLOR};">(Parity:)</span>${colorSpan(slotLetter, 0)}`
    : slotLetter);
  for (let i = 0; i < rest.length; i += 2) {
    const a = rest[i], b = i + 1 < rest.length ? rest[i + 1] : null;
    if (!fmt) { tokens.push(b ? a.ch + b.ch : a.ch); continue; }
    if (!b) { tokens.push(colorSpan(a.ch, a.ci)); continue; }
    tokens.push(a.ci === b.ci
      ? colorSpan(a.ch + b.ch, a.ci)
      : colorSpan(a.ch, a.ci) + colorSpan(b.ch, b.ci));
  }
  let out = tokens.join(' ');
  if (twists.length > 0) {
    if (out) out += ' ';
    const groups = [];
    for (let i = 0; i < twists.length; i += 4) {
      groups.push(twists.slice(i, i + 4).map(t =>
        fmt ? colorSpan(`${t.letter}+`, t.ci) : `${t.letter}+`
      ).join(''));
    }
    out += groups.join(' ');
  }
  return { exec: out, slotIdx: mwp.k };
}

// INPUT: cubeState = { ep, eo, cp, co } with piece permutation and orientation arrays
// code: any one of output from readEdge function shall work, will be called in unit tests
function verifyEdge(cubeState, code) {
  const ep = [...cubeState.ep], eo = [...cubeState.eo];
  const text = code.replace(/<[^>]+>/g, '').replace(/\(Parity:\)/g, '');
  let last = null;
  for (const c of text) {
    let p, o;
    if (c === '+') {
      const [pp, oo] = edgeCodeIdxMap[last];
      p = pp; o = oo ^ 1;
      last = edgeCode[p * 2 + o];
    } else if (edgeCodeIdxMap[c]) {
      [p, o] = edgeCodeIdxMap[c];
      last = c;
    } else continue;
    swap(ep, 0, p);
    swapEO(eo, 0, p, o);
  }
  for (let i = 0; i < 12; i++) if (ep[i] !== i || eo[i] !== 0) return false;
  return true;
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
    // Buffer (1, ori≠0) — flipped-in-place buffer — emits no letter to memo or
    // execution. The flip is solved out of band by a separate alg.
    if (!(p === 1 && o === 0) && !(ci === 0 && p === 1)) {
      const twistLetter = p === 1 ? edgeCodeStr[si] : null;
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
    } else if (o !== 0 && ci !== 0) {
      const twistLetter = cornerCodeStr[si];
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

  // Group corner twists 3-at-a-time, preferring pure-direction groups first;
  // any remainder (mixed CW/CCW) merges into chunks of up to 3. Matches
  // cycler.algTw which counts 3 twists per alg regardless of direction.
  if (cornerTwists.length > 0) {
    if (cornerExecParts.length > 0) cornerExecParts.push(' ');
    cornerExecParts.push(renderCornerTwistGroups(cornerTwists));
  }

  const edgeBasic = edgeExecParts.join('');
  const cornerBasic = cornerExecParts.join('');
  return {
    edges: {
      rawMemo: edgeMemoParts.join(' '),
      basicExec: edgeBasic,
      floatingExec: generateFloatingExec(edgeCodeStr, edgeCC, true, edgeBasic)
    },
    corners: {
      rawMemo: cornerMemoParts.join(' '),
      basicExec: cornerBasic,
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
    // Buffer (1, ori≠0): no codeStr letters and no token in any exec stream;
    // the in-place flip/twist is solved out of band.
    if (ci === 0) continue;
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
    // Both x and y dropPrime'd: chunks lose both heads' closing ori. Each lost
    // ori must be restored by an explicit twist on that head's piece.
    while (buckets[1].length && buckets[2].length) {
      const x = buckets[1].shift(), y = buckets[2].shift();
      emitPair(dropPrime(x), dropPrime(y));
      phase2Twists.push({ letter: x.a, ori: 1, cIdx: x.cIdx });
      phase2Twists.push({ letter: y.a, ori: 2, cIdx: y.cIdx });
    }
    while (buckets[1].length >= 2) {
      const x = buckets[1].shift(), y = buckets[1].shift();
      emitPair(dropPrime(x), dropPrime(y));
      phase2Twists.push({ letter: x.a, ori: 1, cIdx: x.cIdx });
      phase2Twists.push({ letter: y.a, ori: 1, cIdx: y.cIdx });
    }
    while (buckets[2].length >= 2) {
      const x = buckets[2].shift(), y = buckets[2].shift();
      emitPair(dropPrime(x), dropPrime(y));
      phase2Twists.push({ letter: x.a, ori: 2, cIdx: x.cIdx });
      phase2Twists.push({ letter: y.a, ori: 2, cIdx: y.cIdx });
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
      twistOut = renderCornerTwistGroups(allTwists);
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

// ============================================================================
// ORI-PRESERVING EDGE CODE
// ----------------------------------------------------------------------------
// Rewrites an edge codeStr so that each non-buffer perm cycle's letters are
// flipped (ori XOR 1) when the cumulative letter ori entering the cycle is 1.
// This keeps the head letter aligned with the AGEDPITXKQYN preference list when
// cumul=0 and with the flipped BHFDOKJTXRZM list when cumul=1, propagating the
// flip through the rest of the cycle so the deferred parity-end letter remains
// correct relative to the executor's running orientation state.
//
// Buffer cycle and 1-cycle (solved/flipped) letters are passed through
// unchanged; only non-buffer perm>1 cycles can be ori-flipped.
// ============================================================================
function generateOriPreservingEdgeCodeStr(edgeCC, edgeCodeStr) {
  let cumul = 0;
  let result = '';
  let si = 0;
  for (let ci = 0; ci < edgeCC.cycles.length; ci++) {
    const { perm } = edgeCC.cycles[ci];
    const cl = perm + (ci === 0 ? -1 : 1);
    if (ci === 0) {
      for (let i = 0; i < cl; i++) {
        const letter = edgeCodeStr[si + i];
        cumul ^= edgeCodeIdxMap[letter][1];
        result += letter;
      }
    } else if (perm === 1) {
      for (let i = 0; i < cl; i++) result += edgeCodeStr[si + i];
    } else {
      const flipAll = cumul === 1;
      for (let i = 0; i < cl; i++) {
        const letter = edgeCodeStr[si + i];
        const [piece, lori] = edgeCodeIdxMap[letter];
        const newOri = flipAll ? (lori ^ 1) : lori;
        result += edgeCode[piece * 2 + newOri];
        cumul ^= newOri;
      }
    }
    si += cl;
  }
  return result;
}

// Export minimal API for use in help.js
window.Example = {
  generateCubeState,
  generateFullMemoFromCode,
  generateOriPreservingEdgeCodeStr,
  readEdge,
  verifyEdge,
  setLetterScheme,
  translateCodeStr,
  DEFAULT_EDGE_CODE,
  DEFAULT_CORNER_CODE
};
