(() => {
  if (window.__twoCloudShellLoaded) return;
  window.__twoCloudShellLoaded = true;

  const frame = document.querySelector('.two-app-frame');
  if (!frame) return;

  function purgeLegacyHighlights(doc) {
    try {
      doc.querySelectorAll('.two-plan-highlight-layer, .two-lens-highlight-viewport, .two-lens-highlight-canvas, .two-plan-highlight')
        .forEach(el => el.remove());
      doc.getElementById('two-plan-highlight-fix-style')?.remove();
    } catch (_) {}
  }

  function injectPresentationEnhancements(doc, win) {
    if (!doc || !win || !doc.head) return;
    purgeLegacyHighlights(doc);
    if (doc.getElementById('two-presentation-enhancements-v3')) return;

    const script = doc.createElement('script');
    script.id = 'two-presentation-enhancements-v3';
    script.src = 'presentation-enhancements.js?v=20261013-3';
    script.async = false;
    script.onload = () => purgeLegacyHighlights(doc);
    script.onerror = () => {
      console.error('[TWO Présentation] Les améliorations de lecture n’ont pas pu être chargées.');
      purgeLegacyHighlights(doc);
    };
    doc.head.appendChild(script);
  }

  function injectMainSync(doc, win) {
    if (!doc || !win || !doc.head) return;
    if (window.supabase) win.supabase = window.supabase;

    purgeLegacyHighlights(doc);

    if (!doc.getElementById('two-cloud-sync-frame')) {
      const script = doc.createElement('script');
      script.id = 'two-cloud-sync-frame';
      script.src = 'cloud-sync-frame.js?v=20261013-2';
      script.async = false;
      script.onerror = () => console.error('[TWO Cloud] Le module de sauvegarde n’a pas pu être chargé.');
      doc.head.appendChild(script);
    }

    injectPresentationEnhancements(doc, win);
    [50, 200, 600, 1500].forEach(ms => setTimeout(() => purgeLegacyHighlights(doc), ms));
  }

  async function continueAfterRecovery(doc, win) {
    try {
      const p = win.__twoDeepRecoveryPromise;
      if (p && typeof p.then === 'function') await p;
    } catch (error) {
      console.warn('[TWO Recovery] Le scan a rencontré une erreur, poursuite de la synchronisation.', error);
    }
    injectMainSync(doc, win);
  }

  function injectCloudSync() {
    try {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc || !win || !doc.head) return;
      if (window.supabase) win.supabase = window.supabase;
      purgeLegacyHighlights(doc);

      if (doc.getElementById('two-deep-recovery')) {
        continueAfterRecovery(doc, win);
        return;
      }

      const recovery = doc.createElement('script');
      recovery.id = 'two-deep-recovery';
      recovery.src = 'recovery-scan.js?v=20261013-3';
      recovery.async = false;
      recovery.onload = () => continueAfterRecovery(doc, win);
      recovery.onerror = () => {
        console.error('[TWO Recovery] Le scan approfondi n’a pas pu être chargé.');
        injectMainSync(doc, win);
      };
      doc.head.appendChild(recovery);
    } catch (error) {
      console.error('[TWO Cloud] Injection impossible', error);
    }
  }

  frame.addEventListener('load', () => setTimeout(injectCloudSync, 0));
  if (frame.contentDocument?.readyState === 'complete' || frame.contentDocument?.readyState === 'interactive') {
    setTimeout(injectCloudSync, 0);
  }
})();
