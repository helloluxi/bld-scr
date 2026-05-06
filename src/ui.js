window.uiUtils = (() => {
  // Wire a row of mutually-exclusive checkbox/radio inputs so exactly one is always selected.
  // Clicking the already-active input is a no-op; clicking another transfers the selection.
  function wireExclusiveGroup(rowEl, onChange) {
    const inputs = rowEl.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    inputs.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          inputs.forEach(o => { if (o !== cb) o.checked = false; });
        } else {
          cb.checked = true;
        }
        if (onChange) onChange(cb);
      });
    });
  }

  return { wireExclusiveGroup };
})();
