(() => {
  if (window.__twoPlanHighlightCleanupV3) return;
  window.__twoPlanHighlightCleanupV3 = true;

  function purge() {
    try {
      document.querySelectorAll('.two-plan-highlight-layer, .two-lens-highlight-viewport, .two-lens-highlight-canvas, .two-plan-highlight')
        .forEach(el => el.remove());
      document.getElementById('two-plan-highlight-fix-style')?.remove();
    } catch (_) {}
  }

  const style = document.createElement('style');
  style.id = 'two-plan-highlight-cleanup-v3';
  style.textContent = '.two-plan-highlight-layer,.two-lens-highlight-viewport,.two-lens-highlight-canvas,.two-plan-highlight{display:none!important;visibility:hidden!important;opacity:0!important}';
  document.head.appendChild(style);

  purge();
  requestAnimationFrame(purge);
  [50,150,350,800,1500,3000].forEach(ms => setTimeout(purge, ms));

  const observer = new MutationObserver(() => requestAnimationFrame(purge));
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
