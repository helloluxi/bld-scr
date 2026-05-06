window.chartUtils = (() => {
  function resolveTarget(target) {
    if (typeof target === 'string') {
      return {
        chart: document.getElementById(target + '-chart'),
        gridLines: document.getElementById(target + '-grid-lines'),
        xAxis: document.getElementById(target + '-x-axis'),
        xAxisLabel: document.getElementById(target + '-x-axis-label')
      };
    }
    return target || {};
  }

  function renderChart(target, values, labels, options = {}) {
    const { chart, gridLines, xAxis } = resolveTarget(target);
    if (!chart || !gridLines || !xAxis || !Array.isArray(values) || values.length === 0) return false;

    const numericValues = values.map(value => Number(value) || 0);
    const chartLabels = labels.map(label => String(label));
    const hasCumulative = Array.isArray(options.cumulative) && options.cumulative.length === numericValues.length;
    chart.innerHTML = '';
    gridLines.innerHTML = '';
    xAxis.innerHTML = '';

    const defaultMax = hasCumulative ? 1 : (Math.ceil(Math.max(...numericValues) * 10) / 10 || 0.1);
    const maxVal = options.maxValue || defaultMax;
    const gridCount = options.gridCount || 5;
    const gridDigits = options.gridDigits ?? (hasCumulative ? 1 : 2);
    const spaced = options.spaced ?? chartLabels.length <= 5;
    const tooltipScale = options.tooltipScale ?? 100;
    const tooltipDigits = options.tooltipDigits ?? 2;

    for (let i = 0; i <= gridCount; i++) {
      const line = document.createElement('div');
      line.className = 'chart-grid-line';
      line.style.bottom = (i / gridCount * 100) + '%';
      const lbl = document.createElement('div');
      lbl.className = 'chart-grid-label';
      lbl.textContent = (maxVal * i / gridCount).toFixed(gridDigits);
      line.appendChild(lbl);
      gridLines.appendChild(line);
    }

    numericValues.forEach((value, index) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar' + (spaced ? ' spaced' : '');
      bar.style.height = `${maxVal === 0 ? 0 : (value / maxVal) * 100}%`;
      bar.setAttribute('data-value', ((options.tooltipValues?.[index] ?? value) * tooltipScale).toFixed(tooltipDigits));
      chart.appendChild(bar);
    });

    if (hasCumulative) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'chart-cum-line');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      const N = numericValues.length;
      const points = options.cumulative.map((c, i) => {
        const x = ((i + 0.5) / N) * 100;
        const y = (1 - c) * 100;
        return `${x.toFixed(3)},${y.toFixed(3)}`;
      }).join(' ');
      const polyline = document.createElementNS(ns, 'polyline');
      polyline.setAttribute('points', points);
      polyline.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(polyline);
      chart.appendChild(svg);

      options.cumulative.forEach((c, i) => {
        const dot = document.createElement('div');
        dot.className = 'chart-cum-dot';
        dot.style.left = (((i + 0.5) / N) * 100) + '%';
        dot.style.bottom = (c * 100) + '%';
        dot.setAttribute('data-value', (c * tooltipScale).toFixed(tooltipDigits));
        chart.appendChild(dot);
      });
    }

    chartLabels.forEach(label => {
      const lbl = document.createElement('div');
      lbl.textContent = label;
      xAxis.appendChild(lbl);
    });

    return true;
  }

  function setAxisLabel(target, text) {
    const { xAxisLabel } = resolveTarget(target);
    if (xAxisLabel) xAxisLabel.textContent = text;
  }

  function computeStats(keys, values) {
    let sumXP = 0;
    let sumX2P = 0;
    values.forEach((value, index) => {
      sumXP += value * keys[index];
      sumX2P += value * keys[index] * keys[index];
    });
    const mean = sumXP;
    return {
      mean,
      std: Math.sqrt(Math.max(0, sumX2P - mean * mean))
    };
  }

  function renderChartInMount(mount, labels, values, axisLabel, options = {}) {
    if (!mount) return false;

    mount.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';

    const yAxisLabel = document.createElement('div');
    yAxisLabel.className = 'y-axis-label';
    yAxisLabel.textContent = options.yAxisLabel || 'Prob.';

    const gridLines = document.createElement('div');
    gridLines.className = 'grid-lines';

    const chart = document.createElement('div');
    chart.className = 'chart-container';

    const xAxis = document.createElement('div');
    xAxis.className = 'x-axis';

    const xAxisLabel = document.createElement('div');
    xAxisLabel.className = 'x-axis-label';
    xAxisLabel.textContent = axisLabel;

    wrapper.append(yAxisLabel, gridLines, chart, xAxis, xAxisLabel);
    mount.appendChild(wrapper);

    return renderChart({ chart, gridLines, xAxis, xAxisLabel }, values, labels, options);
  }

  function parseProbabilityTable(table, options = {}) {
    const labelColumn = options.labelColumn ?? 0;
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);

    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      const probabilityColumn = options.probabilityColumn ?? Math.min(2, cells.length - 1);
      const label = cells[labelColumn]?.textContent.trim() || '';
      const rawValue = cells[probabilityColumn]?.textContent.trim().replace(/,/g, '') || '';
      const value = parseFloat(rawValue);
      return {
        label,
        value: Number.isFinite(value) ? value : 0
      };
    }).filter(entry => entry.label !== '');
  }

  return {
    renderChart,
    setAxisLabel,
    computeStats,
    renderChartInMount,
    parseProbabilityTable
  };
})();
