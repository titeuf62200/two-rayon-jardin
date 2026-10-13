(() => {
  if (window.__twoPendingSaveGuardLoaded) return;
  window.__twoPendingSaveGuardLoaded = true;

  const SYNC_META_KEY = 'two_cloud_sync_meta_v1';
  const LOCAL_KEY = 'two_project_v2';
  const clone = value => JSON.parse(JSON.stringify(value));
  const startedAt = Date.now();

  let pendingSnapshot = null;
  try {
    const meta = JSON.parse(localStorage.getItem(SYNC_META_KEY) || 'null');
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (meta?.pending && local && Array.isArray(local.zones) && local.zones.length) {
      pendingSnapshot = clone(local);
      window.__twoPendingSaveSnapshot = clone(local);
      console.info('[TWO Safety] Sauvegarde locale en attente protégée avant synchro.');
    }
  } catch (error) {
    console.warn('[TWO Safety] Lecture de la sauvegarde en attente impossible.', error);
  }

  if (!pendingSnapshot) return;

  async function restorePendingSnapshot() {
    try {
      const cloudReady = !!(window.TWOCloud && typeof window.TWOCloud.saveNow === 'function');
      const status = cloudReady && typeof window.TWOCloud.status === 'function'
        ? window.TWOCloud.status()
        : null;

      if ((!cloudReady || !status?.initialSyncDone) && Date.now() - startedAt < 20000) {
        setTimeout(restorePendingSnapshot, 350);
        return;
      }

      // Important : ce script tourne dans la même fenêtre que app.html.
      // Les variables globales lexicales `project` et `selectedId` sont donc accessibles ici.
      project = clone(window.__twoPendingSaveSnapshot || pendingSnapshot);
      if (typeof selectedId !== 'undefined' && !project.zones?.some(z => z.id === selectedId)) {
        selectedId = project.zones?.[0]?.id || null;
      }

      if (cloudReady) await window.TWOCloud.saveNow();
      else if (typeof persist === 'function') await persist();

      try {
        if (typeof renderEditor === 'function') renderEditor();
        if (typeof renderPresentHotspots === 'function') renderPresentHotspots();
        if (typeof detailView !== 'undefined' && detailView && !detailView.classList.contains('hidden') && typeof renderDetail === 'function') {
          renderDetail();
        }
      } catch (renderError) {
        console.warn('[TWO Safety] Rendu après restauration incomplet.', renderError);
      }

      try {
        if (typeof toast === 'function') toast('Dernière sauvegarde restaurée et sécurisée');
      } catch (_) {}

      console.info('[TWO Safety] Sauvegarde locale en attente restaurée puis resynchronisée.');
      delete window.__twoPendingSaveSnapshot;
    } catch (error) {
      console.error('[TWO Safety] Restauration différée, nouvel essai.', error);
      setTimeout(restorePendingSnapshot, 1500);
    }
  }

  setTimeout(restorePendingSnapshot, 100);
})();
