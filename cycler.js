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

            let float3 = otherCycles.filter(cycle => cycle.perm == 3 && cycle.ori == 0).length;
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
            this.float1 = otherCycles.filter(cycle => cycle.perm == 1 && cycle.ori == 0).length;
            this.bad1 = otherCycles.filter(cycle => cycle.perm == 1 && cycle.ori != 0).length;
            this.float2 = otherCycles.filter(cycle => cycle.perm == 2 && cycle.ori == 0).length;
            this.bad2 = otherCycles.filter(cycle => cycle.perm == 2 && cycle.ori != 0).length;
            this.float3 = float3;
            this.bad3 = otherCycles.filter(cycle => cycle.perm == 3 && cycle.ori != 0).length;
            this.float4 = otherCycles.filter(cycle => cycle.perm == 4 && cycle.ori == 0).length;
            this.bad4 = otherCycles.filter(cycle => cycle.perm == 4 && cycle.ori != 0).length;
            this.float5 = otherCycles.filter(cycle => cycle.perm == 5 && cycle.ori == 0).length;
            this.bad5 = otherCycles.filter(cycle => cycle.perm == 5 && cycle.ori != 0).length;
            this.algs = flipTwistAlgs - float3 + baseLength * 0.5;
            this.count = caseCount;
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
    // // Debug: print length and sum of counts
    // console.log(`Even Edges: ${evenEdges.length},     Total Count: ${sumArray(evenEdges.map(x => x.count))}`);
    // console.log(`Odd Edges: ${oddEdges.length},       Total Count: ${sumArray(oddEdges.map(x => x.count))}`);
    // console.log(`Even Corners: ${evenCorners.length}, Total Count: ${sumArray(evenCorners.map(x => x.count))}`);
    // console.log(`Odd Corners: ${oddCorners.length},   Total Count: ${sumArray(oddCorners.map(x => x.count))}`);
    return ({ evenEdges, oddEdges, evenCorners, oddCorners });
})();