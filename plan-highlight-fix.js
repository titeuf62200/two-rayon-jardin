(() => {
  if (window.__twoPlanHighlightFix) return;
  window.__twoPlanHighlightFix = true;

  function installStyle() {
    if (document.getElementById('two-plan-highlight-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'two-plan-highlight-fix-style';
    style.textContent = `
      /* Les trois zones ne doivent pas apparaître comme de nouvelles cases.
         On colore uniquement l'emprise des cellules déjà présentes sur le plan. */
      .two-plan-highlight-layer .two-plan-highlight,
      .two-lens-highlight-canvas .two-plan-highlight{
        background:rgba(31,111,178,.68)!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        color:transparent!important;
        font-size:0!important;
        line-height:0!important;
        padding:0!important;
        overflow:hidden!important;
      }
      .two-plan-highlight-layer{z-index:5!important;mix-blend-mode:multiply!important}
      .two-lens-highlight-canvas{mix-blend-mode:multiply!important}
    `;
    document.head.appendChild(style);
  }

  function stripGeneratedLabels() {
    document.querySelectorAll('.two-plan-highlight').forEach(el => {
      if (el.textContent) el.textContent = '';
      el.removeAttribute('title');
      el.setAttribute('aria-hidden', 'true');
    });
  }

  function apply() {
    installStyle();
    stripGeneratedLabels();
  }

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 100);
  setTimeout(apply, 400);

  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(document.documentElement, {subtree:true, childList:true});
})();
