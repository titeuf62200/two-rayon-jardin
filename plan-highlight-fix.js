(() => {
  if (window.__twoPlanHighlightFixV2) return;
  window.__twoPlanHighlightFixV2 = true;

  const CELLS = [
    { label: 'Pulvérisateur', x: 56.1, y: 8.3, w: 8.3, h: 3.2 },
    { label: 'Tuyau PVC',     x: 65.0, y: 8.3, w: 8.4, h: 3.2 },
    { label: 'Tuyau',         x: 69.9, y: 19.0, w: 2.9, h: 2.5 }
  ];

  function installStyle() {
    let style = document.getElementById('two-plan-highlight-fix-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'two-plan-highlight-fix-style';
      document.head.appendChild(style);
    }
    style.textContent = `
      /* Les aplats épousent exactement les cellules déjà présentes sur le plan. */
      .two-plan-highlight-layer{z-index:6!important;mix-blend-mode:normal!important;pointer-events:none!important}
      .two-plan-highlight-layer .two-plan-highlight,
      .two-lens-highlight-canvas .two-plan-highlight{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        box-sizing:border-box!important;
        background:#1f6fb2!important;
        border:1px solid #184f7d!important;
        border-radius:0!important;
        box-shadow:none!important;
        color:#fff!important;
        font-family:Arial,Helvetica,sans-serif!important;
        font-weight:700!important;
        line-height:1!important;
        text-align:center!important;
        letter-spacing:0!important;
        padding:1px 2px!important;
        overflow:hidden!important;
        white-space:nowrap!important;
        pointer-events:none!important;
      }
      #planShell>.two-plan-highlight-layer .two-plan-highlight,
      #editPlanShell>.two-plan-highlight-layer .two-plan-highlight{
        font-size:clamp(6px,.55vw,10px)!important;
      }
      .two-lens-highlight-canvas{mix-blend-mode:normal!important}
      .two-lens-highlight-canvas .two-plan-highlight{
        font-size:12px!important;
        border-width:1px!important;
      }
    `;
  }

  function alignHighlights(root) {
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll(':scope > .two-plan-highlight'));
    CELLS.forEach((cell, index) => {
      const el = nodes[index];
      if (!el) return;
      el.textContent = cell.label;
      el.style.setProperty('left', `${cell.x}%`, 'important');
      el.style.setProperty('top', `${cell.y}%`, 'important');
      el.style.setProperty('width', `${cell.w}%`, 'important');
      el.style.setProperty('height', `${cell.h}%`, 'important');
      el.removeAttribute('title');
      el.setAttribute('aria-hidden', 'true');
    });
    nodes.slice(CELLS.length).forEach(el => el.remove());
  }

  function apply() {
    installStyle();
    document.querySelectorAll('.two-plan-highlight-layer').forEach(alignHighlights);
    document.querySelectorAll('.two-lens-highlight-canvas').forEach(alignHighlights);
  }

  apply();
  requestAnimationFrame(apply);
  [80, 180, 400, 900, 1800].forEach(ms => setTimeout(apply, ms));

  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
