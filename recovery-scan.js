(() => {
  if (window.__twoDeepRecoveryLoaded) return;
  window.__twoDeepRecoveryLoaded = true;

  const SUPABASE_URL='https://oieknzurxeaiqjyzswqy.supabase.co';
  const SUPABASE_KEY='sb_publishable_aJBhD7OSkfMwMNGwZGii7A_-IfI0MO5';
  const AUTH_STORAGE_KEY='two-rayon-jardin-auth-v2';
  const PROJECT_KEY='rayon-jardin-2027';
  const TABLE='two_project_state',REVISIONS='two_project_revisions',SCANS='two_recovery_scans',BUCKET='two-project-images';
  const DB_NAME='two-rayon-jardin-mobile-v2',STORE_NAME='kv',LOCAL_KEY='two_project_v2';
  const IMAGE_KEYS=['currentImage','workImage','futureImage'];
  const PATH_KEY={currentImage:'currentImagePath',workImage:'workImagePath',futureImage:'futureImagePath'};

  if(!window.supabase?.createClient||!window.indexedDB)return;
  const cloud=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:AUTH_STORAGE_KEY}});
  const clone=v=>JSON.parse(JSON.stringify(v));
  let running=false,lastRun=0;

  function isProject(v){return !!(v&&typeof v==='object'&&Array.isArray(v.zones)&&v.zones.length)}
  function defs(){try{return Array.isArray(DEFAULT_ZONES)?DEFAULT_ZONES:[]}catch(_){return[]}}
  function defZone(id){return defs().find(z=>z.id===id)||null}
  function hasInline(p){return !!p?.zones?.some(z=>IMAGE_KEYS.some(k=>typeof z[k]==='string'&&z[k].startsWith('data:image/')))}
  function hasImages(p){return !!p?.zones?.some(z=>IMAGE_KEYS.some(k=>!!z[k]||!!z[PATH_KEY[k]]))}
  function hasUserContent(p){
    if(!isProject(p))return false;
    if(hasImages(p))return true;
    const d=defs(); if(!d.length||p.zones.length!==d.length)return true;
    for(const z of p.zones){
      const b=defZone(z.id); if(!b)return true;
      for(const k of ['title','summary','economic','client','steps'])if(String(z[k]??'')!==String(b[k]??''))return true;
      for(const k of ['x','y','w','h'])if(Number(z[k])!==Number(b[k]))return true;
    }
    return false;
  }
  function score(p){
    if(!isProject(p))return-1;
    let s=p.zones.length*10;
    for(const z of p.zones){
      const b=defZone(z.id);
      for(const k of IMAGE_KEYS){if(z[PATH_KEY[k]])s+=15000;else if(typeof z[k]==='string'&&z[k].startsWith('data:image/'))s+=14000;else if(z[k])s+=5000}
      for(const k of ['title','summary','economic','client','steps']){const a=String(z[k]??''),d=String(b?.[k]??'');if(!b||a!==d)s+=350+Math.min(1800,a.length)}
      if(b&&['x','y','w','h'].some(k=>Number(z[k])!==Number(b[k])))s+=120;
      if(!b)s+=1500;
    }
    return s;
  }
  function extract(v,source,out,depth=0){
    if(depth>4||v==null)return;
    if(isProject(v)){out.push({source,value:clone(v),score:score(v),hasImages:hasImages(v)});return}
    if(typeof v==='string'){
      if(v.startsWith('data:image/')||v.length>12000000)return;
      const c=v.trim()[0];if(c!=='{'&&c!=='[')return;
      try{extract(JSON.parse(v),source+':json',out,depth+1)}catch(_){}return;
    }
    if(typeof v!=='object')return;
    const pri=['project','state','data','value','snapshot','payload','backup'];
    for(const k of pri)if(Object.prototype.hasOwnProperty.call(v,k))extract(v[k],source+'.'+k,out,depth+1);
    if(depth<2)for(const [k,ch] of Object.entries(v))if(!pri.includes(k)&&ch&&typeof ch==='object')extract(ch,source+'.'+k,out,depth+1);
  }
  async function scanLocal(out){
    try{for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(!k)continue;let raw;try{raw=localStorage.getItem(k)}catch(_){continue}if(!raw)continue;
      if(!/two|rayon|jardin|project|zone|recovery|backup/i.test(k)&&!raw.includes('"zones"'))continue;
      extract(raw,'localStorage:'+k,out);
    }}catch(_){}
  }
  function openExisting(name){return new Promise(res=>{let r;try{r=indexedDB.open(name)}catch(_){res(null);return}r.onerror=()=>res(null);r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(_){}res(null)};r.onsuccess=()=>res(r.result)})}
  async function scanStore(db,storeName,dbName,out){await new Promise(res=>{try{
    const tx=db.transaction(storeName,'readonly'),store=tx.objectStore(storeName);let n=0;const r=store.openCursor();
    r.onerror=()=>res();r.onsuccess=()=>{const c=r.result;if(!c||n++>=250)return res();let kt;try{kt=typeof c.key==='string'?c.key:JSON.stringify(c.key)}catch(_){kt='key'}extract(c.value,`IndexedDB:${dbName}/${storeName}/${kt}`,out);c.continue()};
  }catch(_){res()}})}
  async function scanIdb(out){
    const names=new Set([DB_NAME]);
    if(typeof indexedDB.databases==='function')try{for(const info of await indexedDB.databases())if(info?.name)names.add(info.name)}catch(_){}
    for(const name of names){if(!name)continue;const db=await openExisting(name);if(!db)continue;try{for(const store of Array.from(db.objectStoreNames))await scanStore(db,store,name,out)}finally{try{db.close()}catch(_){}}}
  }
  function dedupe(list){
    const seen=new Set(),out=[];
    for(const c of list.sort((a,b)=>b.score-a.score)){
      let sig;try{sig=JSON.stringify(c.value,(k,v)=>IMAGE_KEYS.includes(k)&&typeof v==='string'&&v.startsWith('data:image/')?`__IMG_${v.length}__`:v)}catch(_){sig=c.source+':'+c.score}
      if(seen.has(sig))continue;seen.add(sig);out.push(c);
    }
    return out;
  }
  function dataBlob(url){const [h,b]=String(url).split(','),mime=(h.match(/^data:([^;]+)/)||[])[1]||'image/jpeg',bytes=atob(b||''),a=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)a[i]=bytes.charCodeAt(i);return new Blob([a],{type:mime})}
  function safe(v){return String(v||'zone').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'zone'}
  async function migrateImages(p){
    const t=Date.now();
    for(const z of p.zones||[])for(const k of IMAGE_KEYS){const v=z?.[k];if(typeof v!=='string'||!v.startsWith('data:image/'))continue;const blob=dataBlob(v),ext=blob.type.includes('png')?'png':blob.type.includes('webp')?'webp':'jpg',path=`${PROJECT_KEY}/recovered/${safe(z.id)}/${k}-${t}.${ext}`;const {error}=await cloud.storage.from(BUCKET).upload(path,blob,{upsert:false,contentType:blob.type||'image/jpeg',cacheControl:'3600'});if(error)throw error;z[PATH_KEY[k]]=path;z[k]=''}
    return p;
  }
  function cloudPayload(p){const o=clone(p);for(const z of o.zones||[])for(const k of IMAGE_KEYS)if(z[PATH_KEY[k]])z[k]='';return o}
  function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onabort=()=>rej(tx.error||new Error('IndexedDB aborted'));tx.onerror=()=>rej(tx.error||new Error('IndexedDB failed'))})}
  async function writeLocal(p){
    try{const r=indexedDB.open(DB_NAME,1),db=await new Promise((res,rej)=>{r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE_NAME))r.result.createObjectStore(STORE_NAME)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}),tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).put(clone(p),`recovery-deep-${Date.now()}`);tx.objectStore(STORE_NAME).put(clone(p),'project');await txDone(tx);db.close()}catch(e){console.warn('[TWO Recovery] sauvegarde IndexedDB impossible',e)}
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(p))}catch(_){}
  }
  async function restore(p,session,source){
    const migrated=await migrateImages(clone(p)),payload=cloudPayload(migrated),now=new Date().toISOString();
    const {error}=await cloud.from(TABLE).upsert({project_key:PROJECT_KEY,project:payload,updated_at:now,updated_by:session.user.id},{onConflict:'project_key'});if(error)throw error;
    const {error:re}=await cloud.from(REVISIONS).insert({project_key:PROJECT_KEY,project:payload,created_by:session.user.id,source});if(re)console.warn('[TWO Recovery] révision non enregistrée',re);
    await writeLocal(payload);return payload;
  }
  async function logScan(session,candidates,best,cloudScore,restored){
    const summary=candidates.slice(0,30).map(c=>({source:c.source,score:c.score,zones:c.value?.zones?.length||0,hasImages:!!c.hasImages,hasUserContent:hasUserContent(c.value)}));
    try{await cloud.from(SCANS).insert({user_id:session.user.id,project_key:PROJECT_KEY,selected_source:best?.source||null,selected_score:best?.score??null,cloud_score:cloudScore,restored,candidates:summary})}catch(e){console.warn('[TWO Recovery] journal indisponible',e)}
  }
  async function run(){
    if(running)return;running=true;
    try{
      const {data:sdata}=await cloud.auth.getSession(),session=sdata?.session;if(!session)return;
      const candidates=[];await scanLocal(candidates);await scanIdb(candidates);const unique=dedupe(candidates),best=unique[0]||null;
      const {data:row,error}=await cloud.from(TABLE).select('project,updated_at').eq('project_key',PROJECT_KEY).maybeSingle();if(error)throw error;
      const cloudScore=score(row?.project);let restored=false;
      if(best?.value&&hasUserContent(best.value)){
        const strong=hasInline(best.value)||best.hasImages||best.score>cloudScore+250;
        if(strong&&best.score>cloudScore){await restore(best.value,session,`deep-recovery:${best.source.slice(0,120)}`);restored=true;try{localStorage.setItem('two_deep_recovery_restored_v2',new Date().toISOString())}catch(_){}console.info('[TWO Recovery] ancienne session restaurée depuis',best.source)}
      }
      await logScan(session,unique,best,cloudScore,restored);lastRun=Date.now();
    }catch(e){console.error('[TWO Recovery] échec du scan approfondi',e)}finally{running=false}
  }

  window.__twoDeepRecoveryPromise=run();
  cloud.auth.onAuthStateChange((_event,session)=>{if(session&&Date.now()-lastRun>2000)setTimeout(()=>{window.__twoDeepRecoveryPromise=run()},120)});
})();
