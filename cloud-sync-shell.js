(() => {
  if (window.__twoCloudShellLoaded) return;
  window.__twoCloudShellLoaded = true;

  const frame = document.querySelector('.two-app-frame');
  if (!frame) return;

  function injectMainSync(doc, win) {
    if (!doc || !win || !doc.head || doc.getElementById('two-cloud-sync-frame')) return;
    if (window.supabase) win.supabase = window.supabase;
    const script = doc.createElement('script');
    script.id = 'two-cloud-sync-frame';
    script.src = 'cloud-sync-frame.js?v=20261013-2';
    script.async = false;
    script.onerror = () => console.error('[TWO Cloud] Le module de sauvegarde n’a pas pu être chargé.');
    doc.head.appendChild(script);
  }

  function injectCloudSync() {
    try {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc || !win || !doc.head) return;
      if (window.supabase) win.supabase = window.supabase;

      if (doc.getElementById('two-deep-recovery')) {
        injectMainSync(doc, win);
        return;
      }

      const recovery = doc.createElement('script');
      recovery.id = 'two-deep-recovery';
      recovery.src = 'recovery-scan.js?v=20261013-2';
      recovery.async = false;
      recovery.onload = () => injectMainSync(doc, win);
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
