(() => {
  if (window.__twoDeepRecoveryLoaded) return;
  window.__twoDeepRecoveryLoaded = true;

  const SUPABASE_URL = 'https://oieknzurxeaiqjyzswqy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_aJBhD7OSkfMwMNGwZGii7A_-IfI0MO5';
  const AUTH_STORAGE_KEY = 'two-rayon-jardin-auth-v2';
  const PROJECT_KEY = 'rayon-jardin-2027';
  const TABLE = 'two_project_state';
  const REVISIONS = 'two_project_revisions';
  const SCANS = 'two_recovery_scans';
  const BUCKET = 'two-project-images';
  const DB_NAME = 'two-rayon-jardin-mobile-v2';
  const STORE_NAME = 'kv';
  const LOCAL_KEY = 'two_project_v2';
  const IMAGE_KEYS = ['currentImage', 'workImage', 'futureImage'];
  const PATH_KEY = {
    currentImage: 'currentImagePath',
    workImage: 'workImagePath',
    futureImage: 'futureImagePath'
  };

  if (!window.supabase?.createClient || !window.indexedDB) return;

  const cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: AUTH_STORAGE_KEY
    }
  });

  const clone = value => JSON.parse(JSON.stringify(value));

  function isProject(value) {
    return !!(value && typeof value === 'object' && Array.isArray(value.zones) && value.zones.length);
  }

  function defaults() {
    try { return Array.isArray(DEFAULT_ZONES) ? DEFAULT_ZONES : []; }
    catch (_) { return []; }
  }

  function defaultZone(id) {
    return defaults().find(z => z.id === id) || null;
  }

  function hasInlineImage(project) {
    return !!project?.zones?.some(z => IMAGE_KEYS.some(k => typeof z[k] === 'string' && z[k].startsWith('data:image/')));
  }

  function hasAnyImage(project) {
    return !!project?.zones?.some(z => IMAGE_KEYS.some(k => !!z[k] || !!z[PATH_KEY[k]]));
  }

  function hasUserContent(project) {
    if (!isProject(project)) return false;
    if (hasAnyImage(project)) return true;
    const defs = defaults();
    if (!defs.length) return true;
    if (project.zones.length !== defs.length) return true;
    for (const z of project.zones) {
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

  function projectScore(project) {
    if (!isProject(project)) return -1;
    let score = project.zones.length * 10;
    for (const z of project.zones) {
      const d = defaultZone(z.id);
      for (const key of IMAGE_KEYS) {
        if (z[PATH_KEY[key]]) score += 15000;
        else if (typeof z[key] === 'string' && z[key].startsWith('data:image/')) score += 14000;
        else if (z[key]) score += 5000;
      }
      for (const key of ['title', 'summary', 'economic', 'client', 'steps']) {
        const now = String(z[key] ?? '');
        const before = String(d?.[key] ?? '');
        if (!d || now !== before) score += 350 + Math.min(1800, now.length);
      }
      if (d && ['x', 'y', 'w', 'h'].some(k => Number(z[k]) !== Number(d[k]))) score += 120;
      if (!d) score += 1500;
    }
    return score;
  }

  function extractProjects(value, source, out, depth = 0) {
    if (depth > 4 || value == null) return;
    if (isProject(value)) {
      out.push({ source, value: clone(value), score: projectScore(value), hasImages: hasAnyImage(value) });
      return;
    }
    if (typeof value === 'string') {
      if (value.startsWith('data:image/') || value.length > 12_000_000) return;
      const first = value.trim()[0];
      if (first !== '{' && first !== '[') return;
      try { extractProjects(JSON.parse(value), `${source}:json`, out, depth + 1); }
      catch (_) {}
      return;
    }
    if (typeof value !== 'object') return;
    const priority = ['project', 'state', 'data', 'value', 'snapshot', 'payload', 'backup'];
    for (const key of priority) {
      if (Object.prototype.hasOwnProperty.call(value, key)) extractProjects(value[key], `${source}.${key}`, out, depth + 1);
    }
    if (depth < 2) {
      for (const [key, child] of Object.entries(value)) {
        if (priority.includes(key)) continue;
        if (child && typeof child === 'object') extractProjects(child, `${source}.${key}`, out, depth + 1);
      }
    }
  }

  async function scanLocalStorage(out) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        let raw;
        try { raw = localStorage.getItem(key); } catch (_) { continue; }
        if (!raw) continue;
        if (!/two|rayon|jardin|project|zone|recovery|backup/i.test(key) && !raw.includes('"zones"')) continue;
        extractProjects(raw, `localStorage:${key}`, out);
      }
    } catch (_) {}
  }

  function openExistingDb(name) {
    return new Promise(resolve => {
      let req;
      try { req = indexedDB.open(name); }
      catch (_) { resolve(null); return; }
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        try { req.transaction.abort(); } catch (_) {}
        resolve(null);
      };
      req.onsuccess = () => resolve(req.result);
    });
  }

  async function scanStore(db, storeName, dbName, out) {
    await new Promise(resolve => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        let seen = 0;
        const req = store.openCursor();
        req.onerror = () => resolve();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor || seen++ >= 250) return resolve();
          const keyText = typeof cursor.key === 'string' ? cursor.key : JSON.stringify(cursor.key);
          extractProjects(cursor.value, `IndexedDB:${dbName}/${storeName}/${keyText}`, out);
          cursor.continue();
        };
      } catch (_) { resolve(); }
    });
  }

  async function scanIndexedDb(out) {
    const names = new Set([DB_NAME]);
    if (typeof indexedDB.databases === 'function') {
      try {
        const dbs = await indexedDB.databases();
        for (const info of dbs || []) if (info?.name) names.add(info.name);
      } catch (_) {}
    }
    for (const name of names) {
      if (!name) continue;
      const db = await openExistingDb(name);
      if (!db) continue;
      try {
        for (const storeName of Array.from(db.objectStoreNames)) {
          await scanStore(db, storeName, name, out);
        }
      } finally {
        try { db.close(); } catch (_) {}
      }
    }
  }

  function dedupeCandidates(candidates) {
    const seen = new Set();
    const out = [];
    for (const c of candidates.sort((a, b) => b.score - a.score)) {
      let signature;
      try {
        signature = JSON.stringify(c.value, (key, val) => {
          if (IMAGE_KEYS.includes(key) && typeof val === 'string' && val.startsWith('data:image/')) return `__DATA_IMAGE_${val.length}__`;
          return val;
        });
      } catch (_) { signature = `${c.source}:${c.score}`; }
      if (seen.has(signature)) continue;
      seen.add(signature);
      out.push(c);
    }
    return out;
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

  async function migrateImages(project) {
    const recoveredAt = Date.now();
    for (const zone of project.zones || []) {
      for (const imageKey of IMAGE_KEYS) {
        const value = zone?.[imageKey];
        if (typeof value !== 'string' || !value.startsWith('data:image/')) continue;
        const blob = dataUrlToBlob(value);
        const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
        const path = `${PROJECT_KEY}/recovered/${safePart(zone.id)}/${imageKey}-${recoveredAt}.${ext}`;
        const { error } = await cloud.storage.from(BUCKET).upload(path, blob, {
          upsert: false,
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600'
        });
        if (error) throw error;
        zone[PATH_KEY[imageKey]] = path;
        zone[imageKey] = '';
      }
    }
    return project;
  }

  function cleanForCloud(project) {
    const out = clone(project);
    for (const zone of out.zones || []) {
      for (const key of IMAGE_KEYS) if (zone[PATH_KEY[key]]) zone[key] = '';
    }
    return out;
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    });
  }

  async function writeRecoveredLocal(project) {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      const db = await new Promise((resolve, reject) => {
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(clone(project), `recovery-deep-${Date.now()}`);
      tx.objectStore(STORE_NAME).put(clone(project), 'project');
      await txDone(tx);
      db.close();
    } catch (error) {
      console.warn('[TWO Recovery] sauvegarde IndexedDB impossible', error);
    }
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(project)); } catch (_) {}
  }

  async function saveRestoredProject(project, session, source) {
    const migrated = await migrateImages(clone(project));
    const payload = cleanForCloud(migrated);
    const now = new Date().toISOString();
    const { error } = await cloud.from(TABLE).upsert({
      project_key: PROJECT_KEY,
      project: payload,
      updated_at: now,
      updated_by: session.user.id
    }, { onConflict: 'project_key' });
    if (error) throw error;
    const { error: revisionError } = await cloud.from(REVISIONS).insert({
      project_key: PROJECT_KEY,
      project: payload,
      created_by: session.user.id,
      source
    });
    if (revisionError) console.warn('[TWO Recovery] révision non enregistrée', revisionError);
    await writeRecoveredLocal(payload);
    return payload;
  }

  async function logScan(session, candidates, best, cloudScore, restored) {
    const summary = candidates.slice(0, 30).map(c => ({
      source: c.source,
      score: c.score,
      zones: c.value?.zones?.length || 0,
      hasImages: !!c.hasImages,
      hasUserContent: hasUserContent(c.value)
    }));
    try {
      await cloud.from(SCANS).insert({
        user_id: session.user.id,
        project_key: PROJECT_KEY,
        selected_source: best?.source || null,
        selected_score: best?.score ?? null,
        cloud_score: cloudScore,
        restored,
        candidates: summary
      });
    } catch (error) {
      console.warn('[TWO Recovery] journal de récupération indisponible', error);
    }
  }

  async function run() {
    try {
      const { data: sessionData } = await cloud.auth.getSession();
      const session = sessionData?.session;
      if (!session) return;

      const candidates = [];
      await scanLocalStorage(candidates);
      await scanIndexedDb(candidates);
      const unique = dedupeCandidates(candidates);
      const best = unique[0] || null;

      const { data: cloudRow, error: cloudError } = await cloud.from(TABLE)
        .select('project,updated_at')
        .eq('project_key', PROJECT_KEY)
        .maybeSingle();
      if (cloudError) throw cloudError;

      const cloudScore = projectScore(cloudRow?.project);
      let restored = false;

      if (best?.value && hasUserContent(best.value)) {
        const strongRecovery = hasInlineImage(best.value) || best.hasImages || best.score > cloudScore + 250;
        if (strongRecovery && best.score > cloudScore) {
          await saveRestoredProject(best.value, session, `deep-recovery:${best.source.slice(0, 120)}`);
          restored = true;
          try { localStorage.setItem('two_deep_recovery_restored_v2', new Date().toISOString()); } catch (_) {}
          console.info('[TWO Recovery] ancienne session restaurée depuis', best.source);
        }
      }

      await logScan(session, unique, best, cloudScore, restored);
    } catch (error) {
      console.error('[TWO Recovery] échec du scan approfondi', error);
    }
  }

  run();
})();
