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

    let evenEdgeCDF, oddEdgeCDF, evenCornerCDF, oddCornerCDF, oddProb;
    let evenEdgeCount = 0, oddEdgeCount = 0, evenCornerCount = 0, oddCornerCount = 0;

    function parseCond(text) {
        try {
            const regex = /\b(parity|breaks|algs|(float|bad)[1-5])\b/g;
            const replacedInput = text.replace(regex, 'x.$1');
            const parsedFunc = new Function('x', `return ${replacedInput};`);
            if (typeof parsedFunc(cycler.evenEdges[0]) === 'boolean') {
                return parsedFunc;
            }
            throw new Error('Invalid function');
        } catch (e) {
            return x => false;
        }
    }

    function getProbabilityFromTextFilter(edgeText, cornerText) {
        let edgeCond = x => true;
        let cornerCond = x => true;
        evenEdgeCount = 0;
        oddEdgeCount = 0;
        evenCornerCount = 0;
        oddCornerCount = 0;
        
        if (edgeText.trim() != '') {
            edgeCond = parseCond(edgeText);
            if (typeof edgeCond(cycler.evenEdges[0]) !== 'boolean') {
                edgeCond = x => false;
                return NaN;
            }
        }
        
        if (cornerText.trim() != '') {
            cornerCond = parseCond(cornerText);
            if (typeof cornerCond(cycler.evenCorners[0]) !== 'boolean') {
                cornerCond = x => false;
                return NaN;
            }
        }
        return getProbabilityFromBoolFunction(edgeCond, cornerCond);
    }

    function getProbabilityFromBoolFunction(edgeCond, cornerCond){
        evenEdgeCDF = [];
        oddEdgeCDF = [];
        evenCornerCDF = [];
        oddCornerCDF = [];
        evenEdgeCount = 0;
        oddEdgeCount = 0;
        evenCornerCount = 0;
        oddCornerCount = 0;

        cycler.evenEdges.forEach(x => {
            evenEdgeCDF.push((evenEdgeCount += edgeCond(x) ? x.count : 0));
        });
        let evenEdgeProbability = evenEdgeCDF[evenEdgeCDF.length - 1] / 980995276800;

        cycler.oddEdges.forEach(x => {
            oddEdgeCDF.push((oddEdgeCount += edgeCond(x) ? x.count : 0));
        });
        let oddEdgeProbability = oddEdgeCDF[oddEdgeCDF.length - 1] / 980995276800;

        cycler.evenCorners.forEach(x => {
            evenCornerCDF.push((evenCornerCount += cornerCond(x) ? x.count : 0));
        });
        let evenCornerProbability = evenCornerCDF[evenCornerCDF.length - 1] / 88179840;

        cycler.oddCorners.forEach(x => {
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
            parity == 0 ? cycler.evenEdges[edgeIdx].cycles : cycler.oddEdges[edgeIdx].cycles,
            edgeCode, 12, 2
        ) + genCode(
            parity == 0 ? cycler.evenCorners[cornerIdx].cycles : cycler.oddCorners[cornerIdx].cycles,
            cornerCode, 8, 3
        )));
        return scr.length === 0 ? 'Seriously? You are not even trying.' : scr;
    }

    return {
        isValid,
        getProbabilityFromBoolFunction,
        getProbabilityFromTextFilter,
        getScramble,
    };
})();