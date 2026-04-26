// Enumerates 4x4x4 wing & x/t-center cycle configurations.
// Browser-style IIFE returning { wings, centers }, mirroring cycler.js.
// Wings have no orientation (O=1), so a configuration is just a partition
// of secondary-cycle lengths; the buffer cycle takes the rest.
const cycler4 = (() => {
  const fact = [1n];
  for (let i = 1; i <= 24; i++) fact.push(fact[i - 1] * BigInt(i));

  function* partitions(maxSum) {
    function* rec(remain, maxPart, cur) {
      yield cur;
      for (let p = Math.min(remain, maxPart); p >= 1; p--) {
        cur.push(p); yield* rec(remain - p, p, cur); cur.pop();
      }
    }
    yield* rec(maxSum, maxSum, []);
  }

  class WingConfig {
    constructor(ps, P) {
      const buf = P - ps.reduce((s, v) => s + v, 0);
      let den = 1n;
      const typeR = new Map();
      for (const p of ps) { den *= BigInt(p); typeR.set(p, (typeR.get(p) || 0) + 1); }
      for (const r of typeR.values()) den *= fact[r];
      this.count   = fact[P - 1] / den;
      this.closed1 = ps.filter(p => p === 1).length;
      this.closed2 = ps.filter(p => p === 2).length;
      this.closed3 = ps.filter(p => p === 3).length;
      this.breaks  = ps.filter(p => p > 1).length;
      const base = ps.reduce((s, p) => s + (p > 1 ? p + 1 : 0), 0) + buf - 1;
      this.algs2 = base - 2 * this.closed3; // 2 * algs, integer
    }
  }

  const wings = [];
  for (const ps of partitions(23)) wings.push(new WingConfig([...ps], 24));

  // x/t-Centers: 6 colour classes x 4 identical pieces.  Column-by-column DP.
  function centers() {
    const f = [1, 1, 2, 6, 24];
    const cvs = [];
    (function rec(i, rem, cur) {
      if (i === 6) { if (rem === 0) cvs.push(cur.slice()); return; }
      for (let n = 0; n <= Math.min(4, rem); n++) { cur.push(n); rec(i + 1, rem - n, cur); cur.pop(); }
    })(0, 4, []);

    let dp = new Map([['4,4,4,4,4,4,0', 1]]);
    for (let j = 0; j < 6; j++) {
      const next = new Map();
      for (const [key, w] of dp) {
        const parts = key.split(',').map(Number);
        const rem = parts.slice(0, 6), diag = parts[6];
        for (const cv of cvs) {
          let ok = true;
          for (let i = 0; i < 6; i++) if (cv[i] > rem[i]) { ok = false; break; }
          if (!ok) continue;
          const nr = rem.map((r, i) => r - cv[i]);
          const m  = 24 / cv.reduce((p, c) => p * f[c], 1);
          const nk = nr.join(',') + ',' + (diag + cv[j]);
          next.set(nk, (next.get(nk) || 0) + w * m);
        }
      }
      dp = next;
    }
    const out = new Map();
    for (const [key, w] of dp) {
      const parts = key.split(',').map(Number);
      if (parts.slice(0, 6).every(x => x === 0)) {
        const u = 24 - parts[6];
        out.set(u, (out.get(u) || 0) + w);
      }
    }
    return [...out].sort((a, b) => a[0] - b[0]);
  }

  return { wings, centers };
})();
