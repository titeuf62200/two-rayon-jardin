(() => {
  // Suppression totale des surcouches ajoutées par erreur sur le plan et dans la loupe.
  function removeGeneratedHighlights() {
    document
      .querySelectorAll('.two-plan-highlight-layer, .two-lens-highlight-canvas, .two-plan-highlight')
      .forEach(el => el.remove());

    const style = document.getElementById('two-plan-highlight-fix-style');
    if (style) style.remove();
  }

  removeGeneratedHighlights();
  requestAnimationFrame(removeGeneratedHighlights);
  [80, 180, 400, 900, 1800].forEach(ms => setTimeout(removeGeneratedHighlights, ms));

  const observer = new MutationObserver(() => requestAnimationFrame(removeGeneratedHighlights));
  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
