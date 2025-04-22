const scrambler = (() => {
    const edgeIdxOnCube = [7, 19, 3, 37, 1, 46, 5, 10, 28, 25, 30, 43, 34, 52, 32, 16, 23, 12, 21, 41, 50, 39, 48, 14],
        cornerIdxOnCube = [8, 9, 20, 6, 18, 38, 0, 36, 47, 2, 45, 11, 27, 44, 24, 33, 53, 42, 35, 17, 51, 29, 26, 15],
        edgeCode = 'ABCDEFGHIJKLMNOPQRSTWXYZ', cornerCode = 'ahqcbtedwgfzilsknxmpyojr';
    const edgeCodeIdx = {}, cornerCodeIdx = {}, fullIdx = {};
    for (let i = 0; i < 24; i++) {
        fullIdx[edgeCode[i]] = edgeCodeIdx[edgeCode[i]] = i>>1;
        fullIdx[cornerCode[i]] = (cornerCodeIdx[cornerCode[i]] = (i/3)|0) + 12;
    }

    function swap(arr, i, j){
        let temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    function isUpperCase(c){
        return c >= 'A' && c <= 'Z';
    }

    function genCube(bfCode){
        let cube = 'uuuuuuuuurrrrrrrrrfffffffffdddddddddlllllllllbbbbbbbbb'.split('');
        bfCode.split('').reverse().forEach(c => {
            if (isUpperCase(c)) {
                let i = edgeCode.indexOf(c);
                swap(cube, edgeIdxOnCube[0], edgeIdxOnCube[i]);
                swap(cube, edgeIdxOnCube[1], edgeIdxOnCube[i^1]);
            } else {
                let i = cornerCode.indexOf(c);
                swap(cube, cornerIdxOnCube[0], cornerIdxOnCube[i]);
                swap(cube, cornerIdxOnCube[1], cornerIdxOnCube[((i/3)|0)*3+(i+1)%3]);
                swap(cube, cornerIdxOnCube[2], cornerIdxOnCube[((i/3)|0)*3+(i+2)%3]);
            }
        });
        return cube.join('');
    }

    let ee_ls = [], ec_ls = [], oe_ls = [], oc_ls = [];
    document.addEventListener('DOMContentLoaded', async function() {
        const factorials = [];
        for (let i = 0; i <= 11; i++) {
            factorials[i] = i === 0 ? 1 : factorials[i - 1] * i;
        }

        const fileNames = ['ee.txt', 'ec.txt', 'oe.txt', 'oc.txt'];
        const fetchData = fileName => fetch(`assets/${fileName}`)
            .then(response => response.text())
            .then(text => {
                const lines = text.trim().split('\n');
                const data = lines.map(line => {
                    const numbers = line.split(',').map(Number);
                    const grouped = [];
                    for (let i = 0; i < numbers.length; i += 2) {
                        grouped.push({ perm: numbers[i], ori: numbers[i + 1] });
                    }
                    const _Perm = fileName[1] === 'e' ? 12 : 8;
                    const _Ori = fileName[1] === 'e' ? 2 : 3;

                    let Count = factorials[_Perm - 1];
                    grouped.slice(1).forEach(cycle => {
                        Count /= cycle.perm;
                    });
                    Count *= Math.pow(_Ori, (_Perm - grouped.length));
                    grouped.slice(1).reduce((acc, cycle) => {
                        const count = acc.get(cycle.perm<<2|cycle.ori) || 0;
                        acc.set(cycle.perm<<2|cycle.ori, count + 1);
                        return acc;
                    }, new Map()).forEach((count, cycle) => {
                        Count /= factorials[count];
                    });

                    let float3 = grouped.slice(1).filter(cycle => cycle.perm == 3 && cycle.ori == 0).length;
                    let baseLength = grouped.slice(1).reduce((sum, cycle) => sum + (cycle.perm > 1 ? cycle.perm + 1 : 0), 0) + grouped[0].perm - 1;
                    let twistAlgs = 0;
                    let twistOris = grouped.slice(1).filter(cycle => cycle.perm == 1 && cycle.ori > 0).map(cycle => cycle.ori);
                    if (_Ori == 2){
                        twistAlgs += Math.ceil(twistOris.length / 4);
                    }
                    else{
                        for (let i = 0; i < twistOris.length - 2; i++) {
                            if (twistOris[i] == twistOris[i + 1] && twistOris[i] == twistOris[i + 2]) {
                                twistOris.splice(i, 3);
                                twistAlgs += 1;
                                i -= 1;
                            }
                        }
                        for (let i = 0; i < twistOris.length - 1; i++) {
                            if (twistOris[i] != twistOris[i + 1]) {
                                twistOris.splice(i, 2);
                                twistAlgs += 1;
                                i -= 1;
                            }
                        }
                        if (twistOris.length > 0) {
                            twistAlgs += 1;
                        }
                    }

                    return {
                        group: grouped,
                        parity: fileName[0] === 'e' ? 0 : 1,
                        cycles: grouped.slice(1).filter(cycle => cycle.perm > 1).length,
                        float1: grouped.slice(1).filter(cycle => cycle.perm == 1 && cycle.ori == 0).length,
                        bad1: grouped.slice(1).filter(cycle => cycle.perm == 1 && cycle.ori != 0).length,
                        float2: grouped.slice(1).filter(cycle => cycle.perm == 2 && cycle.ori == 0).length,
                        bad2: grouped.slice(1).filter(cycle => cycle.perm == 2 && cycle.ori != 0).length,
                        float3: float3,
                        bad3: grouped.slice(1).filter(cycle => cycle.perm == 3 && cycle.ori != 0).length,
                        float4: grouped.slice(1).filter(cycle => cycle.perm == 4 && cycle.ori == 0).length,
                        bad4: grouped.slice(1).filter(cycle => cycle.perm == 4 && cycle.ori != 0).length,
                        float5: grouped.slice(1).filter(cycle => cycle.perm == 5 && cycle.ori == 0).length,
                        bad5: grouped.slice(1).filter(cycle => cycle.perm == 5 && cycle.ori != 0).length,
                        algs: twistAlgs - float3 + baseLength * 0.5,
                        count: Count
                    };
                });
                if (fileName === 'ee.txt') ee_ls = data;
                if (fileName === 'ec.txt') ec_ls = data;
                if (fileName === 'oe.txt') oe_ls = data;
                if (fileName === 'oc.txt') oc_ls = data;
            })
            .catch(error => console.error('Error reading file:', fileName, error));

        await Promise.all(fileNames.map(fetchData));
    });

    let evenEdgeCDF, oddEdgeCDF, evenCornerCDF, oddCornerCDF, oddProb;
    let evenEdgeCount = 0, oddEdgeCount = 0, evenCornerCount = 0, oddCornerCount = 0;

    function parseCond(text) {
        try {
            const regex = /\b(group|parity|cycles|algs|(float|bad)[1-5])\b/g;
            const replacedInput = text.replace(regex, 'x.$1');
            const parsedFunc = new Function('x', `return ${replacedInput};`);
            if (typeof parsedFunc(ee_ls[0]) === 'boolean') {
                return parsedFunc;
            }
            throw new Error('Invalid function');
        } catch (e) {
            return x => false;
        }
    }

    function getProbabilityFromFilter(edgeText, cornerText) {
        let edgeCond = x => true;
        let cornerCond = x => true;
        evenEdgeCount = 0;
        oddEdgeCount = 0;
        evenCornerCount = 0;
        oddCornerCount = 0;
        
        if (edgeText.trim() != '') {
            edgeCond = parseCond(edgeText);
            if (typeof edgeCond(ee_ls[0]) !== 'boolean') {
                edgeCond = x => false;
                return NaN;
            }
        }
        
        if (cornerText.trim() != '') {
            cornerCond = parseCond(cornerText);
            if (typeof cornerCond(ec_ls[0]) !== 'boolean') {
                cornerCond = x => false;
                return NaN;
            }
        }
        return getProbability(edgeCond, cornerCond);
    }

    function getProbability(edgeCond, cornerCond){
        evenEdgeCDF = [];
        oddEdgeCDF = [];
        evenCornerCDF = [];
        oddCornerCDF = [];
        evenEdgeCount = 0;
        oddEdgeCount = 0;
        evenCornerCount = 0;
        oddCornerCount = 0;

        ee_ls.forEach(x => {
            evenEdgeCDF.push((evenEdgeCount += edgeCond(x) ? x.count : 0));
        });
        let evenEdgeProbability = evenEdgeCDF[evenEdgeCDF.length - 1] / 980995276800;

        oe_ls.forEach(x => {
            oddEdgeCDF.push((oddEdgeCount += edgeCond(x) ? x.count : 0));
        });
        let oddEdgeProbability = oddEdgeCDF[oddEdgeCDF.length - 1] / 980995276800;

        ec_ls.forEach(x => {
            evenCornerCDF.push((evenCornerCount += cornerCond(x) ? x.count : 0));
        });
        let evenCornerProbability = evenCornerCDF[evenCornerCDF.length - 1] / 88179840;

        oc_ls.forEach(x => {
            oddCornerCDF.push((oddCornerCount += cornerCond(x) ? x.count : 0));
        });
        let oddCornerProbability = oddCornerCDF[oddCornerCDF.length - 1] / 88179840;
        
        const prob = (evenEdgeProbability * evenCornerProbability + oddEdgeProbability * oddCornerProbability) * 2;
        oddProb = oddEdgeProbability * oddCornerProbability * 2 / prob;
        return prob;
    }

    function isValid(){
        return evenEdgeCount != 0 && evenCornerCount != 0 || oddEdgeCount != 0 && oddCornerCount != 0;
    }

    function genCode(whichCC, whichCode, p, o) {
        let code = [], remain = Array.from({length: p-1}, (_, i) => i + 1);
        for (let ccIdx = 0; ccIdx < whichCC.length; ccIdx++) {
            const cycle = whichCC[ccIdx];
            let head = 0;
            if (ccIdx != 0) {
                const headIdx = Math.random() * remain.length | 0;
                head = remain[headIdx];
                remain.splice(headIdx, 1);
                code.push(whichCode[head * o]);
            }
            for (let i = 1; i < cycle.perm; i++) {
                const midIdx = Math.random() * remain.length | 0;
                const mid = remain[midIdx];
                remain.splice(midIdx, 1);
                code.push(whichCode[mid * o + (Math.random() * o | 0)]);
            }
            if (ccIdx != 0) {
                code.push(whichCode[head * o + cycle.ori]);
            }
        }
        return code.join('');
    }

    function getScramble() {
        const parity = Math.random() < oddProb ? 1 : 0;
        const edgeCDF = parity == 0 ? evenEdgeCDF : oddEdgeCDF, cornerCDF = parity == 0 ? evenCornerCDF : oddCornerCDF;
        const edgeRand = Math.random() * edgeCDF[edgeCDF.length - 1], cornerRand = Math.random() * cornerCDF[cornerCDF.length - 1];
        let edgeIdx = 0, cornerIdx = 0;
        while (edgeIdx < edgeCDF.length && edgeCDF[edgeIdx] < edgeRand) edgeIdx++;
        while (cornerIdx < cornerCDF.length && cornerCDF[cornerIdx] < cornerRand) cornerIdx++;
        const scr = min2phase.scramble(genCube(genCode(
            parity == 0 ? ee_ls[edgeIdx].group : oe_ls[edgeIdx].group,
            edgeCode, 12, 2
        ) + genCode(
            parity == 0 ? ec_ls[cornerIdx].group : oc_ls[cornerIdx].group,
            cornerCode, 8, 3
        )));
        return scr.length === 0 ? 'Seriously? You are not even trying.' : scr;
    }

    return {
        isValid,
        getProbability,
        getProbabilityFromFilter,
        getScramble,
    };
})();