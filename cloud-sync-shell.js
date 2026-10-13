(() => {
  if (window.__twoCloudShellLoaded) return;
  window.__twoCloudShellLoaded = true;

  const frame = document.querySelector('.two-app-frame');
  if (!frame) return;

  function injectCloudSync() {
    try {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc || !win || !doc.head || doc.getElementById('two-cloud-sync-frame')) return;
      if (window.supabase) win.supabase = window.supabase;
      const script = doc.createElement('script');
      script.id = 'two-cloud-sync-frame';
      script.src = 'cloud-sync-frame.js?v=20261013-1';
      script.async = false;
      script.onerror = () => console.error('[TWO Cloud] Le module de sauvegarde n’a pas pu être chargé.');
      doc.head.appendChild(script);
    } catch (error) {
      console.error('[TWO Cloud] Injection impossible', error);
    }
  }

  frame.addEventListener('load', () => setTimeout(injectCloudSync, 0));
  if (frame.contentDocument?.readyState === 'complete' || frame.contentDocument?.readyState === 'interactive') {
    setTimeout(injectCloudSync, 0);
  }
})();
