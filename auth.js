(() => {
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  (async () => {
    try {
      await load('auth-core.js?v=20261012-3');
      await load('cloud-sync-shell.js?v=20261013-1');
    } catch (error) {
      console.error('[TWO] Impossible de charger les modules de connexion/sauvegarde.', error);
    }
  })();
})();
