(() => {
  if (window.__twoCloudShellLoaded) return;
  window.__twoCloudShellLoaded = true;

  const frame = document.querySelector('.two-app-frame');
  if (!frame) return;

  function injectPlanHighlightFix(doc) {
    if (!doc || !doc.head || doc.getElementById('two-plan-highlight-fix')) return;
    const script = doc.createElement('script');
    script.id = 'two-plan-highlight-fix';
    script.src = 'plan-highlight-fix.js?v=20261013-2';
    script.async = false;
    script.onerror = () => console.error('[TWO Plan] La correction de surlignage n’a pas pu être chargée.');
    doc.head.appendChild(script);
  }

  function injectPresentationEnhancements(doc, win) {
    if (!doc || !win || !doc.head) return;
    if (doc.getElementById('two-presentation-enhancements-v2')) {
      injectPlanHighlightFix(doc);
      return;
    }
    const script = doc.createElement('script');
    script.id = 'two-presentation-enhancements-v2';
    script.src = 'presentation-enhancements.js?v=20261013-1';
    script.async = false;
    script.onload = () => injectPlanHighlightFix(doc);
    script.onerror = () => {
      console.error('[TWO Présentation] Les améliorations de lecture n’ont pas pu être chargées.');
      injectPlanHighlightFix(doc);
    };
    doc.head.appendChild(script);
  }

  function injectMainSync(doc, win) {
    if (!doc || !win || !doc.head) return;
    if (window.supabase) win.supabase = window.supabase;

    if (!doc.getElementById('two-cloud-sync-frame')) {
      const script = doc.createElement('script');
      script.id = 'two-cloud-sync-frame';
      script.src = 'cloud-sync-frame.js?v=20261013-2';
      script.async = false;
      script.onerror = () => console.error('[TWO Cloud] Le module de sauvegarde n’a pas pu être chargé.');
      doc.head.appendChild(script);
    }

    injectPresentationEnhancements(doc, win);
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
