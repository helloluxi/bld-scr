const cycler = (() => {
    const factorials = [1];
    for (let i = 1; i <= 11; i++) {
        factorials[i] = factorials[i - 1] * i;
    }

    function sumArray(arr) {
        return arr.reduce((sum, val) => sum + val, 0);
    }

    function* generatePerm(P) {
        for (let size = 0; size < P; size++) {
            let sizes = Array(size).fill(1);
            yield [...sizes];
            let restartLoop = true;
            while (restartLoop) {
                restartLoop = false;
                for (let head = 0; head < sizes.length; head++) {
                    sizes[head]++;
                    sizes.fill(sizes[head], 0, head);
                    if (sumArray(sizes) <= P - 1) {
                        yield [...sizes];
                        restartLoop = true;
                        break;
                    }
                }
            }
        }
    }

    function* generateOri(index, ps, os, indexes, O, P) {
        if (index === ps.length) {
            const otherCycles = ps.map((size, i) => ({ perm: size, ori: os[i] }));
            const firstCyclePerm = P - sumArray(ps);
            const firstCycleOri = (24 - sumArray(os)) % O;
            const cycles = [{ perm: firstCyclePerm, ori: firstCycleOri }, ...otherCycles];
            yield new CycleConfig(cycles, O, P);
        } else {
            const j = indexes.indexOf(index);
            const startOri = j >= 0 ? O - 1 : os[index - 1];
            for (let i = startOri; i >= 0; i--) {
                os[index] = i;
                yield* generateOri(index + 1, ps, os, indexes, O, P);
            }
        }
    }

    class CycleConfig {
        constructor(cycles, O, P) {
            const otherCycles = cycles.slice(1);

            let caseCount = factorials[P - 1];
            otherCycles.forEach(cycle => {
                caseCount /= cycle.perm;
            });
            caseCount *= Math.pow(O, (P - cycles.length));
            otherCycles.reduce((acc, cycle) => {
                const key = cycle.perm << 2 | cycle.ori;
                const val = acc.get(key) || 0;
                acc.set(key, val + 1);
                return acc;
            }, new Map()).forEach((count, _) => {
                caseCount /= factorials[count];
            });

            let closed1 = otherCycles.filter(cycle => cycle.perm == 1 && cycle.ori == 0).length;
            let open1 = otherCycles.filter(cycle => cycle.perm == 1 && cycle.ori != 0).length;
            let closed2 = otherCycles.filter(cycle => cycle.perm == 2 && cycle.ori == 0).length;
            let open2 = otherCycles.filter(cycle => cycle.perm == 2 && cycle.ori != 0).length;
            let closed3 = otherCycles.filter(cycle => cycle.perm == 3 && cycle.ori == 0).length;
            let open3 = otherCycles.filter(cycle => cycle.perm == 3 && cycle.ori != 0).length;
            let closed4 = otherCycles.filter(cycle => cycle.perm == 4 && cycle.ori == 0).length;
            let open4 = otherCycles.filter(cycle => cycle.perm == 4 && cycle.ori != 0).length;
            let closed5 = otherCycles.filter(cycle => cycle.perm == 5 && cycle.ori == 0).length;
            let open5 = otherCycles.filter(cycle => cycle.perm == 5 && cycle.ori != 0).length;
            let baseLength = otherCycles.reduce((sum, cycle) => sum + (cycle.perm > 1 ? cycle.perm + 1 : 0), 0) + cycles[0].perm - 1;
            let flipTwistAlgs = 0;
            let twist1Count = otherCycles.filter(cycle => cycle.perm == 1 && cycle.ori == 1).length;
            let twist2Count = otherCycles.filter(cycle => cycle.perm == 1 && cycle.ori == 2).length;
            if (O == 2) {
                flipTwistAlgs += Math.ceil(twist1Count / 4);
            }
            else {
                flipTwistAlgs += Math.floor(twist1Count / 3);
                flipTwistAlgs += Math.floor(twist2Count / 3);
                flipTwistAlgs += Math.ceil((twist1Count % 3 + twist2Count % 3) / 3);
            }

            this.cycles = cycles;
            this.parity = baseLength & 1;
            this.breaks = otherCycles.filter(cycle => cycle.perm > 1).length;
            this.closed1 = closed1;
            this.open1 = open1;
            this.closed2 = closed2;
            this.open2 = open2;
            this.closed3 = closed3;
            this.open3 = open3;
            this.closed4 = closed4;
            this.open4 = open4;
            this.closed5 = closed5;
            this.open5 = open5;
            this.alg = flipTwistAlgs + baseLength * 0.5;
            this.algs = flipTwistAlgs - closed3 + baseLength * 0.5;
            this.count = caseCount;

            // Full floating reduction
            const p0 = cycles[0].perm;
            let phase1Algs = 0, r20 = 0, r21 = 0, r22 = 0, r11f = 0, r12f = 0;
            for (const cycle of otherCycles) {
                let p = cycle.perm;
                const o = cycle.ori;
                if (p >= 3) {
                    phase1Algs += Math.floor((p - 1) / 2);
                    p = p % 2 === 0 ? 2 : 1;
                }
                if (p === 2) {
                    if (o === 0) r20++;
                    else if (o === 1) r21++;
                    else r22++;
                } else if (p === 1 && o !== 0) {
                    if (o === 1) r11f++;
                    else r12f++;
                }
            }

            let phase2Algs = 0;
            if (O === 2) {
                phase2Algs += Math.floor(r20 / 2) * 2;
                let a = r20 % 2;
                phase2Algs += Math.floor(r21 / 2) * 2;
                let b = r21 % 2;
                if (a === 1 && b === 1 && r11f >= 1) {
                    phase2Algs += 2;
                    a = 0; b = 0; r11f--;
                }
                const R = a + b;
                const tw = Math.ceil(r11f / 4);
                this.algFullFloat = (2 * (phase1Algs + phase2Algs + tw) + 3 * R + (p0 - 1)) / 2;
                if (this.parity === 1 && R >= 1) {
                    let nr11 = r11f;
                    if (a >= 1) { /* absorb (2,0)→(1,0)=solved */ }
                    else { nr11++; /* absorb (2,1)→(1,1) */ }
                    this.algFullParity = (2 * (phase1Algs + phase2Algs + Math.ceil(nr11 / 4)) + 3 * (R - 1) + 1 + (p0 - 1)) / 2;
                } else {
                    this.algFullParity = this.algFullFloat;
                }
            } else {
                phase2Algs += Math.floor(r20 / 2) * 2;
                let a = r20 % 2;
                const mp = Math.min(r21, r22);
                phase2Algs += mp * 2;
                let b = r21 - mp, c = r22 - mp;
                while (b >= 2 && r11f >= 1) { phase2Algs += 3; b -= 2; r11f--; }
                while (c >= 2 && r12f >= 1) { phase2Algs += 3; c -= 2; r12f--; }
                if (a >= 1 && b >= 1 && r12f >= 1) { phase2Algs += 3; a = 0; b--; r12f--; }
                else if (a >= 1 && c >= 1 && r11f >= 1) { phase2Algs += 3; a = 0; c--; r11f--; }
                const R = a + b + c;
                const tw = Math.floor(r11f / 3) + Math.floor(r12f / 3) + Math.ceil(((r11f % 3) + (r12f % 3)) / 3);
                this.algFullFloat = (2 * (phase1Algs + phase2Algs + tw) + 3 * R + (p0 - 1)) / 2;
                if (this.parity === 1 && R >= 1) {
                    let nr11 = r11f, nr12 = r12f;
                    if (a >= 1) { /* absorb (2,0)→(1,0)=solved */ }
                    else if (b >= 1) { nr11++; }
                    else { nr12++; }
                    const ntw = Math.floor(nr11 / 3) + Math.floor(nr12 / 3) + Math.ceil(((nr11 % 3) + (nr12 % 3)) / 3);
                    this.algFullParity = (2 * (phase1Algs + phase2Algs + ntw) + 3 * (R - 1) + 1 + (p0 - 1)) / 2;
                } else {
                    this.algFullParity = this.algFullFloat;
                }
            }
        }
    }

    function generateCycles(O, P, oddList, evenList) {
        const indices = [];

        for (const ps of generatePerm(P)) {
            let p = 0;
            indices.length = 0;

            for (let i = 0; i < ps.length; i++) {
                if (ps[i] !== p) {
                    p = ps[i];
                    indices.push(i);
                }
            }

            generateOri(0, ps, new Array(ps.length), indices, O, P).forEach(cc => {
                (cc.parity ? oddList : evenList).push(cc);
            });
        }

        return { oddList, evenList };
    }

    const evenEdges = [], oddEdges = [];
    generateCycles(2, 12, oddEdges, evenEdges);
    const evenCorners = [], oddCorners = [];
    generateCycles(3, 8, oddCorners, evenCorners);

    function selfTest() {
        const allConfigs = [...evenEdges, ...oddEdges, ...evenCorners, ...oddCorners];
        let errors = 0;
        const details = [];
        for (const cc of allConfigs) {
            const expectInt = cc.parity === 0;
            if (expectInt) {
                if (cc.algFullFloat !== Math.round(cc.algFullFloat)) { errors++; details.push({config: cc, field: 'algFullFloat', parity: cc.parity, got: cc.algFullFloat}); }
                if (cc.algFullParity !== Math.round(cc.algFullParity)) { errors++; details.push({config: cc, field: 'algFullParity', parity: cc.parity, got: cc.algFullParity}); }
            } else {
                if (cc.algFullFloat === Math.floor(cc.algFullFloat)) { errors++; details.push({config: cc, field: 'algFullFloat', parity: cc.parity, got: cc.algFullFloat}); }
                if (cc.algFullParity === Math.floor(cc.algFullParity)) { errors++; details.push({config: cc, field: 'algFullParity', parity: cc.parity, got: cc.algFullParity}); }
            }
        }
        return { errors, details };
    }

    return ({ evenEdges, oddEdges, evenCorners, oddCorners, selfTest });
})();
