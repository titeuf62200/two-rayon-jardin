(() => {
  if (window.__twoCloudSyncLoaded) return;
  window.__twoCloudSyncLoaded = true;

  const SUPABASE_URL = 'https://oieknzurxeaiqjyzswqy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_aJBhD7OSkfMwMNGwZGii7A_-IfI0MO5';
  const AUTH_STORAGE_KEY = 'two-rayon-jardin-auth-v2';
  const PROJECT_KEY = 'rayon-jardin-2027';
  const TABLE = 'two_project_state';
  const REVISIONS = 'two_project_revisions';
  const BUCKET = 'two-project-images';
  const DB_NAME = 'two-rayon-jardin-mobile-v2';
  const STORE_NAME = 'kv';
  const LOCAL_KEY = 'two_project_v2';
  const MIGRATION_KEY = 'two_cloud_migration_done_v1';
  const SYNC_META_KEY = 'two_cloud_sync_meta_v1';
  const IMAGE_KEYS = ['currentImage', 'workImage', 'futureImage'];
  const PATH_KEY = {
    currentImage: 'currentImagePath',
    workImage: 'workImagePath',
    futureImage: 'futureImagePath'
  };

  if (!window.supabase?.createClient) {
    console.warn('[TWO Cloud] Supabase client indisponible. Conservation locale uniquement.');
    return;
  }

  const cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: AUTH_STORAGE_KEY
    }
  });

  let syncing = false;
  let initialSyncDone = false;
  let lastCloudUpdatedAt = null;
  const signedUrlCache = new Map();

  const clone = value => JSON.parse(JSON.stringify(value));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isProject(value) {
    return !!(value && Array.isArray(value.zones) && value.zones.length);
  }

  function defaultZone(id) {
    try { return DEFAULT_ZONES.find(z => z.id === id) || null; }
    catch (_) { return null; }
  }

  function hasInlineImage(p) {
    return !!p?.zones?.some(z => IMAGE_KEYS.some(k => typeof z[k] === 'string' && z[k].startsWith('data:image/')));
  }

  function hasAnyImage(p) {
    return !!p?.zones?.some(z => IMAGE_KEYS.some(k => !!z[k] || !!z[PATH_KEY[k]]));
  }

  function hasUserContent(p) {
    if (!isProject(p)) return false;
    if (hasAnyImage(p)) return true;
    if (p.zones.length !== DEFAULT_ZONES.length) return true;
    for (const z of p.zones) {
      const d = defaultZone(z.id);
      if (!d) return true;
      for (const key of ['title', 'summary', 'economic', 'client', 'steps']) {
        if (String(z[key] ?? '') !== String(d[key] ?? '')) return true;
      }
      for (const key of ['x', 'y', 'w', 'h']) {
        if (Number(z[key]) !== Number(d[key])) return true;
      }
    }
    return false;
  }

  function projectScore(p) {
    if (!isProject(p)) return -1;
    let score = p.zones.length * 10;
    for (const z of p.zones) {
      const d = defaultZone(z.id);
      for (const key of IMAGE_KEYS) {
        if (z[PATH_KEY[key]]) score += 12000;
        else if (typeof z[key] === 'string' && z[key].startsWith('data:image/')) score += 11000;
        else if (z[key]) score += 5000;
      }
      for (const key of ['title', 'summary', 'economic', 'client', 'steps']) {
        const now = String(z[key] ?? '');
        const before = String(d?.[key] ?? '');
        if (now !== before) score += 250 + Math.min(1000, now.length);
      }
      if (d && ['x', 'y', 'w', 'h'].some(k => Number(z[k]) !== Number(d[k]))) score += 80;
      if (!d) score += 1000;
    }
    return score;
  }

  function openKnownDb(name = DB_NAME) {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) { reject(error); }
    });
  }

  function txFinished(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Transaction IndexedDB annulée'));
      tx.onerror = () => reject(tx.error || new Error('Erreur IndexedDB'));
    });
  }

  async function writeLocal(value) {
    const snapshot = clone(value);
    try {
      const db = await openKnownDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(snapshot, 'project');
      await txFinished(tx);
      db.close();
    } catch (error) {
      console.warn('[TWO Cloud] IndexedDB write failed', error);
    }
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot)); }
    catch (_) { }
  }

  async function backupRecovery(value, label = 'recovery') {
    if (!isProject(value)) return;
    try {
      const db = await openKnownDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(clone(value), `recovery-${Date.now()}-${label}`);
      await txFinished(tx);
      db.close();
    } catch (error) {
      console.warn('[TWO Cloud] Recovery backup failed', error);
    }
  }

  async function readProjectFromDatabase(name) {
    return new Promise(resolve => {
      let request;
      try { request = indexedDB.open(name); }
      catch (_) { resolve(null); return; }
      request.onerror = () => resolve(null);
      request.onupgradeneeded = () => {
        try { request.transaction.abort(); } catch (_) {}
        resolve(null);
      };
      request.onsuccess = async () => {
        const db = request.result;
        try {
          const stores = Array.from(db.objectStoreNames);
          for (const storeName of stores) {
            const found = await new Promise(done => {
              try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const direct = store.get('project');
                direct.onsuccess = () => {
                  if (isProject(direct.result)) return done(direct.result);
                  let count = 0;
                  const cursor = store.openCursor();
                  cursor.onsuccess = () => {
                    const c = cursor.result;
                    if (!c || count++ > 30) return done(null);
                    if (isProject(c.value)) return done(c.value);
                    c.continue();
                  };
                  cursor.onerror = () => done(null);
                };
                direct.onerror = () => done(null);
              } catch (_) { done(null); }
            });
            if (found) { db.close(); return resolve(found); }
          }
        } catch (_) {}
        db.close();
        resolve(null);
      };
    });
  }

  async function localCandidates() {
    const candidates = [];
    try { if (isProject(project)) candidates.push({ label: 'mémoire active', value: clone(project) }); } catch (_) {}

    try {
      const p = await readProjectFromDatabase(DB_NAME);
      if (isProject(p)) candidates.push({ label: DB_NAME, value: clone(p) });
    } catch (_) {}

    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (isProject(p)) candidates.push({ label: LOCAL_KEY, value: p });
    } catch (_) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === LOCAL_KEY || !/two|rayon|jardin|project/i.test(key)) continue;
        try {
          const p = JSON.parse(localStorage.getItem(key));
          if (isProject(p)) candidates.push({ label: `localStorage:${key}`, value: p });
        } catch (_) {}
      }
    } catch (_) {}

    if (typeof indexedDB.databases === 'function') {
      try {
        const dbs = await indexedDB.databases();
        for (const info of dbs) {
          const name = info?.name;
          if (!name || name === DB_NAME || !/two|rayon|jardin|garden/i.test(name)) continue;
          const p = await readProjectFromDatabase(name);
          if (isProject(p)) candidates.push({ label: `IndexedDB:${name}`, value: clone(p) });
        }
      } catch (_) {}
    }

    candidates.sort((a, b) => projectScore(b.value) - projectScore(a.value));
    return candidates;
  }

  function dataUrlToBlob(dataUrl) {
    const [head, body] = String(dataUrl).split(',');
    const mime = (head.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bytes = atob(body || '');
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function safePart(value) {
    return String(value || 'zone').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'zone';
  }

  async function signedUrl(path) {
    if (!path) return '';
    const cached = signedUrlCache.get(path);
    if (cached && cached.expires > Date.now() + 60000) return cached.url;
    const { data, error } = await cloud.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
    if (error) throw error;
    const url = data?.signedUrl || '';
    if (url) signedUrlCache.set(path, { url, expires: Date.now() + 6.5 * 24 * 60 * 60 * 1000 });
    return url;
  }

  async function uploadInlineImage(zone, imageKey) {
    const value = zone?.[imageKey];
    if (typeof value !== 'string' || !value.startsWith('data:image/')) return false;
    const blob = dataUrlToBlob(value);
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const path = `${PROJECT_KEY}/${safePart(zone.id)}/${imageKey}.${ext}`;
    const { error } = await cloud.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600'
    });
    if (error) throw error;
    zone[PATH_KEY[imageKey]] = path;
    zone[imageKey] = await signedUrl(path);
    return true;
  }

  async function migrateAndHydrateImages(value) {
    if (!isProject(value)) return value;
    for (const zone of value.zones) {
      for (const imageKey of IMAGE_KEYS) {
        const pathKey = PATH_KEY[imageKey];
        if (typeof zone[imageKey] === 'string' && zone[imageKey].startsWith('data:image/')) {
          await uploadInlineImage(zone, imageKey);
        } else if (zone[pathKey]) {
          try { zone[imageKey] = await signedUrl(zone[pathKey]); }
          catch (error) {
            console.warn(`[TWO Cloud] Impossible de signer ${zone[pathKey]}`, error);
            zone[imageKey] = zone[imageKey] || '';
          }
        }
      }
    }
    return value;
  }

  function cloudPayload(value) {
    const out = clone(value);
    delete out.__twoSync;
    for (const zone of out.zones || []) {
      for (const imageKey of IMAGE_KEYS) {
        if (zone[PATH_KEY[imageKey]]) zone[imageKey] = '';
      }
    }
    return out;
  }

  async function currentSession() {
    try {
      const { data } = await cloud.auth.getSession();
      return data?.session || null;
    } catch (_) { return null; }
  }

  async function fetchCloudProject() {
    const session = await currentSession();
    if (!session) return { session: null, row: null };
    const { data, error } = await cloud.from(TABLE)
      .select('project,updated_at,updated_by')
      .eq('project_key', PROJECT_KEY)
      .maybeSingle();
    if (error) throw error;
    return { session, row: data || null };
  }

  async function saveCloudProject(value, source = 'app') {
    const session = await currentSession();
    if (!session) return false;
    await migrateAndHydrateImages(value);
    const payload = cloudPayload(value);
    const now = new Date().toISOString();
    const record = {
      project_key: PROJECT_KEY,
      project: payload,
      updated_at: now,
      updated_by: session.user.id
    };
    const { data, error } = await cloud.from(TABLE)
      .upsert(record, { onConflict: 'project_key' })
      .select('updated_at')
      .single();
    if (error) throw error;
    lastCloudUpdatedAt = data?.updated_at || now;

    const revision = {
      project_key: PROJECT_KEY,
      project: payload,
      created_by: session.user.id,
      source
    };
    const { error: revisionError } = await cloud.from(REVISIONS).insert(revision);
    if (revisionError) console.warn('[TWO Cloud] Révision non créée', revisionError);

    try {
      localStorage.setItem(SYNC_META_KEY, JSON.stringify({ pending: false, cloudUpdatedAt: lastCloudUpdatedAt, savedAt: now }));
    } catch (_) {}
    return true;
  }

  function setPending() {
    try {
      localStorage.setItem(SYNC_META_KEY, JSON.stringify({ pending: true, localUpdatedAt: new Date().toISOString(), cloudUpdatedAt: lastCloudUpdatedAt }));
    } catch (_) {}
  }

  function rerender() {
    try {
      if (!project.zones?.some(z => z.id === selectedId)) selectedId = project.zones?.[0]?.id || null;
      renderEditor();
      renderPresentHotspots();
      if (typeof detailView !== 'undefined' && !detailView.classList.contains('hidden')) renderDetail();
    } catch (error) { console.warn('[TWO Cloud] Rendu après synchro', error); }
  }

  function notify(message) {
    try { toast(message); }
    catch (_) { console.info('[TWO Cloud]', message); }
  }

  async function cloudPersist(source = 'app-save') {
    setPending();
    await writeLocal(project);
    const session = await currentSession();
    if (!session) return true;
    try {
      await saveCloudProject(project, source);
      await writeLocal(project);
      return true;
    } catch (error) {
      console.error('[TWO Cloud] Synchronisation différée', error);
      notify('Enregistré sur cet appareil · synchro cloud à reprendre');
      return false;
    }
  }

  async function chooseAndSync() {
    if (syncing) return;
    syncing = true;
    try {
      const { session, row } = await fetchCloudProject();
      if (!session) return;
      const candidates = await localCandidates();
      const best = candidates[0] || null;
      const migrationDone = localStorage.getItem(MIGRATION_KEY) === '1';

      if (!row?.project) {
        if (best?.value) {
          await backupRecovery(best.value, 'avant-cloud');
          project = clone(best.value);
          const recovered = hasUserContent(project);
          await saveCloudProject(project, recovered ? 'legacy-recovery' : 'first-cloud-save');
          await writeLocal(project);
          rerender();
          notify(recovered ? 'Ancienne session récupérée et sauvegardée dans le cloud' : 'Sauvegarde cloud TWO activée');
        } else {
          await saveCloudProject(project, 'first-cloud-save');
        }
      } else {
        const rawCloud = clone(row.project);
        const localIsRecoveryCandidate = !migrationDone && best?.value && hasUserContent(best.value)
          && (hasInlineImage(best.value) || projectScore(best.value) > projectScore(rawCloud) + 500);

        if (localIsRecoveryCandidate && projectScore(best.value) > projectScore(rawCloud)) {
          await backupRecovery(best.value, 'session-locale-recuperee');
          project = clone(best.value);
          await saveCloudProject(project, 'legacy-recovery');
          await writeLocal(project);
          notify('Session locale retrouvée et restaurée dans TWO');
        } else {
          project = rawCloud;
          await migrateAndHydrateImages(project);
          lastCloudUpdatedAt = row.updated_at || null;
          await writeLocal(project);
        }
        rerender();
      }

      try { localStorage.setItem(MIGRATION_KEY, '1'); } catch (_) {}
      initialSyncDone = true;
    } catch (error) {
      console.error('[TWO Cloud] Initial sync failed', error);
    } finally {
      syncing = false;
    }
  }

  try {
    persist = async function () { return cloudPersist('app-save'); };
  } catch (error) {
    console.error('[TWO Cloud] Impossible de remplacer persist()', error);
  }

  window.TWOCloud = {
    syncNow: chooseAndSync,
    saveNow: () => cloudPersist('manual-save'),
    status: () => ({ initialSyncDone, syncing, lastCloudUpdatedAt })
  };

  cloud.auth.onAuthStateChange((_event, session) => {
    if (session) setTimeout(chooseAndSync, 50);
  });

  (async () => {
    for (let attempt = 0; attempt < 80 && !initialSyncDone; attempt++) {
      const session = await currentSession();
      if (session) {
        await chooseAndSync();
        if (initialSyncDone) break;
      }
      await sleep(attempt < 10 ? 500 : 1500);
    }
  })();
})();
