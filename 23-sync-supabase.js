
/* ============================================================
   ОБЩАЯ БАЗА (синхронизация между всеми устройствами)
   Работает на Supabase (бесплатно). Один раз выполните SQL
   из блока ниже в Supabase → SQL Editor, больше ничего не нужно.

   create table if not exists public.obmenka_kv (
     key text primary key,
     value jsonb,
     updated_at timestamptz not null default now()
   );
   create index if not exists obmenka_kv_upd on public.obmenka_kv(updated_at);
   create or replace function public.obmenka_touch() returns trigger
   language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
   drop trigger if exists obmenka_touch on public.obmenka_kv;
   create trigger obmenka_touch before insert or update on public.obmenka_kv
     for each row execute function public.obmenka_touch();
   alter table public.obmenka_kv enable row level security;
   drop policy if exists kv_all on public.obmenka_kv;
   create policy kv_all on public.obmenka_kv for all using (true) with check (true);
   ============================================================ */
(function(){
  'use strict';
  const CFG = { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY, table: 'obmenka_kv' };
  /* функции, которые вызывает код вне этого блока (доставка сделок, чат с продавцом) */
  window.dealMirror = dealMirror; window.mirrorRows = mirrorRows; window.sellerAccKey = sellerAccKey;
  const SQL_HELP = "create table if not exists public.obmenka_kv (key text primary key, value jsonb, updated_at timestamptz not null default now());\ncreate index if not exists obmenka_kv_upd on public.obmenka_kv(updated_at);\ncreate or replace function public.obmenka_touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;\ndrop trigger if exists obmenka_touch on public.obmenka_kv;\ncreate trigger obmenka_touch before insert or update on public.obmenka_kv for each row execute function public.obmenka_touch();\nalter table public.obmenka_kv enable row level security;\ndrop policy if exists kv_all on public.obmenka_kv;\ncreate policy kv_all on public.obmenka_kv for all using (true) with check (true);";
  const API = CFG.url.replace(/\/$/,'') + '/rest/v1/' + CFG.table;
  const GLOBAL_KEYS = ['sellers','staff','gameEdits','specEdits','customGames','noHold','support','statsHistory','ownerLast','logs'];

  let ready = false, status = 'init', cursor = '', pushTimer = null, pushing = false, pushAgain = false, pullBusy = false, uiDirty = false;
  const base = {};   /* key -> JSON последнего синхронизированного значения */
  const seen = {};   /* key -> updated_at уже применённой версии */

  /* ---------- утилиты ---------- */
  const J = x => JSON.stringify(x === undefined ? null : x);
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const parse = s => { try{ return s === undefined ? undefined : JSON.parse(s); }catch(e){ return undefined; } };

  function mergeById(b, l, r){
    const bm = {}, lm = {}, rm = {}, ids = [];
    (Array.isArray(b)?b:[]).forEach(x=>bm[x.id]=x);
    l.forEach(x=>{ lm[x.id]=x; ids.push(x.id); });
    r.forEach(x=>{ rm[x.id]=x; if(!(x.id in lm)) ids.push(x.id); });
    const out = [];
    ids.forEach(id=>{
      const bi = bm[id], li = lm[id], ri = rm[id];
      if(li === undefined){ if(bi !== undefined && J(ri) === J(bi)) return; if(ri !== undefined) out.push(ri); return; }
      if(ri === undefined){ if(bi !== undefined && J(li) === J(bi)) return; out.push(li); return; }
      out.push(merge3(bi, li, ri));
    });
    return out;
  }
  /* трёхсторонняя склейка: base — что было при последней синхронизации */
  function merge3(b, l, r){
    if(r === undefined) return l;
    if(J(l) === J(b)) return r;
    if(J(r) === J(b) || J(r) === J(l)) return l;
    if(Array.isArray(l) && Array.isArray(r)){
      const all = l.concat(r);
      if(all.length && all.every(x=>isObj(x) && x.id !== undefined)) return mergeById(b, l, r);
      if(all.length && all.every(x=>isObj(x) && typeof x.ts === 'number')){
        const m = {}; all.forEach(x=>{ m[J(x)] = x; });
        return Object.keys(m).map(k=>m[k]).sort((p,q)=>p.ts-q.ts);
      }
      return l;
    }
    if(isObj(l) && isObj(r)){
      const out = {}, bb = isObj(b) ? b : {};
      Object.keys(l).concat(Object.keys(r)).forEach(k=>{
        if(k in out) return;
        const inL = k in l, inR = k in r, inB = k in bb;
        if(inL && inR) out[k] = merge3(bb[k], l[k], r[k]);
        else if(inL){ if(inB && J(l[k]) === J(bb[k])) return; out[k] = l[k]; }
        else { if(inB && J(r[k]) === J(bb[k])) return; out[k] = r[k]; }
      });
      return out;
    }
    return l;
  }

  /* ---------- сеть ---------- */
  async function http(method, qs, body, headers){
    const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 20000);
    try{
      const res = await fetch(API + qs, { method, headers: Object.assign({ apikey: CFG.key, 'Content-Type':'application/json' }, headers||{}), body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
      let data = null; const txt = await res.text(); try{ data = txt ? JSON.parse(txt) : null; }catch(e){}
      return { ok: res.ok, status: res.status, data };
    }catch(e){ return { ok:false, status:0, data:null }; }
    finally{ clearTimeout(t); }
  }
  const q = s => '"' + String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"';
  function setStatus(s){
    status = s; updatePill();
  }
  function failStatus(res){
    if(res.status === 404 || (res.data && (res.data.code === 'PGRST205' || res.data.code === '42P01'))) setStatus('notable');
    else if(res.status === 401 || res.status === 403) setStatus('denied');
    else setStatus('offline');
  }
  function updatePill(){
    let el = document.getElementById('syncPill');
    let show = false; try{ show = localStorage.getItem('obmenka_admin_unlocked') === '1'; }catch(e){}
    if(!show){ if(el) el.remove(); return; }
    if(!el){
      el = document.createElement('div'); el.id = 'syncPill';
      el.style.cssText = 'position:fixed;left:8px;bottom:76px;z-index:9999;font:600 10.5px/1 system-ui,sans-serif;padding:6px 9px;border-radius:99px;background:rgba(20,20,28,.88);color:#fff;border:1px solid rgba(255,255,255,.15);cursor:pointer;';
      el.onclick = function(){
        if(status === 'notable'){ window.prompt('Таблицы нет. Скопируйте SQL, вставьте в Supabase → SQL Editor → Run, затем обновите сайт:', SQL_HELP); }
        else if(status === 'denied'){ alert('Сервер отклонил доступ. Проверьте SUPABASE_URL и ключ, а также что в SQL выполнена строка с policy.'); }
        else if(status === 'offline'){ alert('Нет связи с сервером. Сайт работает локально и синхронизируется, когда связь появится.'); }
        else { forceSync(); }
      };
      document.body.appendChild(el);
    }
    const map = { ok:['#2fb59a','● общая база онлайн'], init:['#e0a840','◌ подключение…'], notable:['#ff4d5e','● нет таблицы (нажмите)'], denied:['#ff4d5e','● доступ запрещён'], offline:['#ff4d5e','● нет связи'] };
    const m = map[status] || map.offline;
    el.innerHTML = '<span style="color:'+m[0]+'">'+m[1]+'</span>';
  }

  /* ---------- снимок общих данных из state ---------- */
  function dealMirror(d, me){
  const c = JSON.parse(JSON.stringify(d));
  c.peerKey = me;
  c.role = (d.role === 'buyer') ? 'seller' : 'buyer';
  c.unread = 0;
  const mu = (typeof miniUser === 'function') ? miniUser(me) : null;
  if(mu) c.counterparty = mu;
  c.messages = (d.messages||[]).map(function(m){
    if(m.from === 'me') return Object.assign({}, m, {from:'them'});
    if(m.from === 'them') return Object.assign({}, m, {from:'me'});
    return m;
  });
  return c;
}
function mirrorRows(rows, me){
  if(!me) return;
  const by = {};
  (state.deals||[]).forEach(function(d){
    if(!d || !d.peerKey || d.peerKey === me) return;
    (by[d.peerKey] = by[d.peerKey] || []).push(dealMirror(d, me));
  });
  Object.keys(by).forEach(function(k){ rows['a:' + k + ':deals'] = by[k]; });
}
function sellerAccKey(l){
  try{
    if(!l) return '';
    const us = accUsers();
    if(l.sellerAcc && us.find(x=>x.key===l.sellerAcc)) return l.sellerAcc;
    if(l.sellerUid){ const a = us.find(x=>x.uid===l.sellerUid); if(a) return a.key; }
    if(l.sellerName){ const a = us.find(x=>x.key===String(l.sellerName).trim().toLowerCase()); if(a) return a.key; }
    if(l.sellerKey){
      const raw = String(l.sellerKey);
      let a = us.find(x=>x.key===raw); if(a) return a.key;
      a = us.find(x=>supportKeyByName(x.key)===raw); if(a) return a.key;
    }
  }catch(e){}
  return '';
}
  function accName(){ return (state && state.authed && state.accKey) ? state.accKey : null; }
  function snapshot(){
    const rows = {};
    if(!state) return rows;
    GLOBAL_KEYS.forEach(k=>{ if(state[k] !== undefined) rows['g:'+k] = state[k]; });
    if(Array.isArray(rows['g:sellers'])) rows['g:sellers'] = rows['g:sellers'].filter(x=>x && x.id!=='me');
    (state.listings||[]).forEach(l=>{ if(l && l.id) rows['l:'+l.id] = l; });
    (state.reports||[]).forEach(r=>{ if(r && r.id) rows['r:'+r.id] = r; });
    const a = accName();
    if(a){
      rows['a:'+a+':deals'] = msgStripDeals(state.deals || []);
      rows['a:'+a+':tx'] = (state.me && state.me.transactions) || [];
      rows['a:'+a+':notif'] = state.notifications || [];
      if(state.me){ const m = Object.assign({}, state.me); delete m.transactions; delete m.isAdmin; delete m.ip; rows['a:'+a+':me'] = m; }
      rows['a:'+a+':my'] = state.myListings || [];
      rows['a:'+a+':fav'] = state.favorites || [];
    }
    let db = {}; try{ db = readAccDb(); }catch(e){}
    /* хэши паролей никогда не уходят в общую запись аккаунта (они лежат в pw:<ник>) */
    const stripPw = function(a){ if(!a || typeof a !== 'object') return a; const o = Object.assign({}, a); delete o.passHash; delete o.salt; delete o.password; delete o.ip; delete o.device; return o; };
    Object.keys(db).forEach(k=>{ rows['acc:'+k] = stripPw(db[k]); });
    /* удалённые локально объекты → надгробия */
    Object.keys(base).forEach(k=>{
      if(rows[k] !== undefined) return;
      if(base[k] === 'null') return;
      if(k.startsWith('l:') || k.startsWith('r:') || k.startsWith('acc:')) rows[k] = null;
    });
    return rows;
  }

  /* ---------- отправка ---------- */
  function schedule(delay){
    if(!ready) return;
    clearTimeout(pushTimer); pushTimer = setTimeout(flush, delay === undefined ? 800 : delay);
  }
  async function flush(){
    if(!ready) return;
    if(pushing){ pushAgain = true; return; }
    pushing = true;
    try{
      const rows = snapshot();
      const changed = Object.keys(rows).filter(k=>J(rows[k]) !== base[k]);
      if(!changed.length){ return; }
      /* 1) читаем текущие значения на сервере для склейки */
      const remote = {};
      for(let i=0;i<changed.length;i+=15){
        const part = changed.slice(i,i+15);
        const res = await http('GET', '?select=key,value&key=in.(' + part.map(q).map(encodeURIComponent).join(',') + ')');
        if(!res.ok){ failStatus(res); return; }
        (res.data||[]).forEach(r=>{ remote[r.key] = r.value; });
      }
      /* 2) склеиваем и пишем пачками */
      const out = [], sentJson = {};
      changed.forEach(k=>{
        const loc = rows[k];
        let val = loc;
        if(k in remote && remote[k] !== null && loc !== null){ val = merge3(parse(base[k]), loc, remote[k]); }
        else if(k in remote && remote[k] !== null && loc === null){ val = (base[k] !== undefined && J(remote[k]) === base[k]) ? null : remote[k]; }
        out.push({ key:k, value: val });
        sentJson[k] = J(loc);
      });
      let batch = [], size = 0;
      const sendBatch = async ()=>{
        if(!batch.length) return true;
        const res = await http('POST', '?on_conflict=key', batch, { Prefer:'resolution=merge-duplicates,return=minimal' });
        if(!res.ok){ failStatus(res); return false; }
        batch = []; size = 0; return true;
      };
      for(const row of out){
        const sz = J(row).length;
        if(batch.length && (size + sz > 900000 || batch.length >= 25)){ if(!(await sendBatch())) return; }
        batch.push(row); size += sz;
      }
      if(!(await sendBatch())) return;
      /* 3) запоминаем и подтягиваем результат склейки в локальный state */
      out.forEach(row=>{
        base[row.key] = J(row.value);
        const nowLocal = snapshot()[row.key];
        if(row.value !== null && J(nowLocal) === sentJson[row.key] && J(row.value) !== sentJson[row.key]) applyRemote(row.key, row.value, true);
      });
      setStatus('ok');
      if(uiDirty) refreshUI();
    }finally{
      pushing = false;
      if(pushAgain){ pushAgain = false; schedule(300); }
    }
  }
  async function forceSync(){ await flush(); await pull(); }

  /* ---------- применение удалённых данных ---------- */
  function persistLocal(){}
  function applyRemote(key, val, force){
    if(!state) return false;
    const rj = J(val);
    { const fm = key.match(/^a:(.*):(deals|me)$/);
      if(fm && fm[1] !== accName()){
        if(fm[2] === 'me'){
          const oldMe = J(window.__ALL_ME[fm[1]]);
          if(isObj(val)) window.__ALL_ME[fm[1]] = val; else delete window.__ALL_ME[fm[1]];
          base[key] = rj;
          if(oldMe !== J(window.__ALL_ME[fm[1]])){ uiDirty = true; return true; }
          return false;
        }
        if(Array.isArray(val)){
          if(window.__msgSrv){
            const prevAll = window.__ALL_DEALS[fm[1]] || [];
            val.forEach(function(d){
              if(!d || typeof d !== 'object') return;
              const o = prevAll.find(function(x){ return x && x.id === d.id; });
              if(o && Array.isArray(o.messages) && o.messages.length) d.messages = o.messages;
              else if(Array.isArray(d.messages)) markLegacy(d.messages);
              else d.messages = [];
            });
          }
          window.__ALL_DEALS[fm[1]] = val;
        } else delete window.__ALL_DEALS[fm[1]];
        base[key] = rj;
        if(typeof ADMIN !== 'undefined' && ADMIN){ uiDirty = true; return true; }
        return false;
      }
    }
    const sameAsLocal = () => J(snapshot()[key]) === base[key];  /* у меня нет несинхронизированных правок */
    let changed = false;
    if(key.startsWith('acc:')){
      const k = key.slice(4); let db = {}; try{ db = readAccDb(); }catch(e){}
      if(val === null){ if(db[k]){ delete db[k]; changed = true; } }
      else if(J(db[k]) !== rj){ const loc = db[k]; db[k] = (loc && base[key] !== undefined && J(loc) !== base[key]) ? merge3(parse(base[key]), loc, val) : val; changed = true; }
      base[key] = rj; return changed;
    }
    const __loc = snapshot()[key];
    const pending = !force && (base[key] !== undefined ? !sameAsLocal() : (Array.isArray(__loc) && __loc.length > 0));
    const newVal = pending ? merge3(parse(base[key]), snapshot()[key], val) : val;
    if(key.startsWith('l:') || key.startsWith('r:')){
      const field = key[0] === 'l' ? 'listings' : 'reports', id = key.slice(2);
      if(!Array.isArray(state[field])) state[field] = [];
      const idx = state[field].findIndex(x=>x && x.id === id);
      if(val === null){ if(idx >= 0){ state[field].splice(idx,1); changed = true; } }
      else if(idx >= 0){ if(J(state[field][idx]) !== J(newVal)){ state[field][idx] = newVal; changed = true; } }
      else { state[field].unshift(newVal); changed = true; if(field==='listings') state.listings.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); }
    } else if(key.startsWith('g:')){
      const f = key.slice(2);
      if(J(state[f]) !== J(newVal)){ state[f] = newVal; changed = true; }
    } else if(key.startsWith('a:')){
      const m = key.match(/^a:(.*):(deals|tx|notif|me|my|fav)$/);
      if(!m) return false;
      const acc = m[1], part = m[2];
      if(acc === accName()){
        if(part === 'deals'){
          const nv = Array.isArray(newVal) ? newVal.filter(function(x){ return x && typeof x === 'object'; }) : [];
          (state.deals || []).forEach(function(d){ if(d && d.id && !nv.some(function(x){ return x.id === d.id; })) nv.push(d); });
          if(window.__msgSrv){
            nv.forEach(function(d){
              const loc = (state.deals || []).find(function(x){ return x && x.id === d.id; });
              const lm = (loc && Array.isArray(loc.messages)) ? loc.messages : null;
              if(lm && lm.length) d.messages = lm;
              else if(Array.isArray(d.messages)) markLegacy(d.messages);
              else d.messages = lm || [];
            });
          }
          if(J(state.deals) !== J(nv)){ state.deals = nv; changed = true; }
        }
        else if(part === 'tx'){ if(state.me && J(state.me.transactions) !== J(newVal)){ state.me.transactions = newVal; changed = true; } }
        else if(part === 'notif'){ if(J(state.notifications) !== J(newVal)){ state.notifications = newVal; changed = true; } }
        else if(part === 'my'){ if(J(state.myListings) !== J(newVal)){ state.myListings = newVal; changed = true; } }
        else if(part === 'fav'){ if(J(state.favorites) !== J(newVal)){ state.favorites = newVal; changed = true; } }
        else if(part === 'me' && state.me && isObj(newVal)){
          const keep = { transactions: state.me.transactions, isAdmin: state.me.isAdmin, ip: state.me.ip };
          const merged = Object.assign({}, state.me, newVal, keep);
          if(J(merged) !== J(state.me)){ state.me = merged; changed = true; }
        }
      }
    }
    base[key] = rj;
    if(changed){ uiDirty = true; }
    return changed;
  }
  function modalOpen(){ const m = document.getElementById('modal-root'); return !!(m && m.children.length); }
  function typing(){ const a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)); }
  function refreshUI(){
    if(!uiDirty) return;
    persistLocal();
    if(modalOpen()) return;
    const __a = document.activeElement;
    const __inChat = !!(__a && __a.id === 'chatInputField');
    if(typing() && !__inChat) return;   /* другие поля не трогаем; поле чата — обновляем с сохранением текста и фокуса */
    uiDirty = false;
    try{ autoCompleteDeals(); }catch(e){}
    try{
      if(__inChat){ if(!(typeof chatPatch === 'function' && chatPatch()) && typeof rerenderChat === 'function') rerenderChat(); }
      else if(typeof onRoute === 'function') onRoute();
    }catch(e){}
  }

  /* ---------- получение ---------- */
  async function fetchAll(){
    const rows = []; let off = 0;
    for(;;){
      const res = await http('GET', '?select=key,value,updated_at&order=updated_at.asc&limit=100&offset=' + off);
      if(!res.ok){ failStatus(res); return null; }
      rows.push.apply(rows, res.data || []);
      if(!res.data || res.data.length < 100) break;
      off += 100;
    }
    return rows;
  }
  async function pull(){
    if(!ready || pullBusy) return;
    pullBusy = true;
    try{
      const since = cursor ? new Date(Date.parse(cursor) - 3000).toISOString() : '';
      const res = await http('GET', '?select=key,value,updated_at&order=updated_at.asc&limit=100' + (since ? '&updated_at=gte.' + encodeURIComponent(since) : ''));
      if(!res.ok){ failStatus(res); return; }
      setStatus('ok');
      if (typeof onRoute === 'function' && currentHash().path === '/chats') onRoute();
      (res.data||[]).forEach(r=>{
        if(seen[r.key] === r.updated_at) return;
        seen[r.key] = r.updated_at;
        if(!cursor || r.updated_at > cursor) cursor = r.updated_at;
        if(String(r.key).startsWith('p:')){ presFromRow(r, false); return; }
        if(base[r.key] === J(r.value)) return;
        applyRemote(r.key, r.value, false);
      });
      if(res.data && res.data.length >= 100){ pullBusy = false; return pull(); }
      refreshUI();
    }finally{ pullBusy = false; }
  }

  /* ---------- отдельные серверные таблицы: сообщения и присутствие ---------- */
  const REST = CFG.url.replace(/\/$/,'') + '/rest/v1/';
  async function httpT(table, method, qs, body, headers){
    const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 15000);
    try{
      const res = await fetch(REST + table + qs, { method, cache:'no-store', headers: Object.assign({ apikey: CFG.key, 'Content-Type':'application/json' }, headers||{}), body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
      let data = null; const txt = await res.text(); try{ data = txt ? JSON.parse(txt) : null; }catch(e){}
      return { ok: res.ok, status: res.status, data };
    }catch(e){ return { ok:false, status:0, data:null }; }
    finally{ clearTimeout(t); }
  }
  function newMid(){
    try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){ const r = Math.random()*16|0; return (c==='x' ? r : (r&3|8)).toString(16); });
  }
  /* старые сообщения (пришли из строк сделок) помечаем как уже существующие — повторно в таблицу не отправляем */
  function markLegacy(arr){
    (arr||[]).forEach(function(m){ if(m && !m.mid){ m.mid = 'L:' + (m.ts||0) + '|' + String(m.text||'').slice(0,30); m.sent = true; } });
    return arr;
  }
  window.markLegacy = markLegacy;
  function msgStripDeals(arr){
    if(!window.__msgSrv) return arr;
    return arr.map(function(d){ if(!d || typeof d !== 'object') return d; const c = Object.assign({}, d); delete c.messages; return c; });
  }
  window.msgStripDeals = msgStripDeals;
  function msgEnable(){
    (state.deals||[]).forEach(function(d){ if(d){ d.messages = Array.isArray(d.messages) ? d.messages : []; markLegacy(d.messages); } });
    Object.keys(window.__ALL_DEALS||{}).forEach(function(k){ (window.__ALL_DEALS[k]||[]).forEach(function(d){ if(d){ d.messages = Array.isArray(d.messages) ? d.messages : []; markLegacy(d.messages); } }); });
    window.__msgStart = Date.now();
    window.__msgSrv = true;
  }
  async function msgDetect(){
    if(window.__msgSrv) return true;
    const res = await httpT('obmenka_msgs', 'GET', '?select=id&limit=1');
    if(res.ok && Array.isArray(res.data)){ msgEnable(); return true; }
    return false;
  }
  /* что нужно отправить в таблицу: новые сообщения, созданные в этой сессии */
  function msgCollect(){
    const out = [], seenIds = {};
    const add = function(d){
      if(!d || !d.id || seenIds[d.id] || !Array.isArray(d.messages)) return;
      seenIds[d.id] = 1;
      d.messages.forEach(function(m){
        if(!m || m.local || m.sent) return;
        if(m.mid || (m.ts||0) >= (window.__msgStart||0) - 2000) out.push({ d:d, m:m });
      });
    };
    (state.deals||[]).forEach(add);
    if(typeof ADMIN !== 'undefined' && ADMIN){ try{ adminAllDeals().forEach(add); }catch(e){} }
    return out;
  }
  let msgBusy = false, msgAgain = false, msgFailUntil = 0;
  async function msgPush(){
    if(!window.__msgSrv || !state) return;
    if(msgBusy){ msgAgain = true; return; }
    if(Date.now() < msgFailUntil) return;
    msgBusy = true;
    try{
      const items = msgCollect();
      if(!items.length) return;
      items.forEach(function(it){ if(!it.m.mid) it.m.mid = newMid(); });
      const me = accName() || '?';
      const rows = items.map(function(it){
        return { id: it.m.mid, deal_id: it.d.id, sender: it.m.adm ? ('adm:' + it.m.adm) : me, kind: it.m.from === 'sys' ? 'sys' : 'msg', text: String(it.m.text||''), adm: it.m.adm || null, confirm: !!it.m.confirm };
      });
      const res = await httpT('obmenka_msgs', 'POST', '?on_conflict=id', rows, { Prefer:'resolution=ignore-duplicates,return=representation' });
      if(!res.ok){ msgFailUntil = Date.now() + 4000; return; }
      const got = {}; (Array.isArray(res.data) ? res.data : []).forEach(function(r){ got[r.id] = r; });
      items.forEach(function(it){
        it.m.sent = true;
        const r = got[it.m.mid];
        if(r){ const t = Date.parse(r.created_at); if(t) it.m.ts = t; }
      });
      items.forEach(function(it){ it.d.messages.sort(function(a,b){ return (a.ts||0) - (b.ts||0); }); });
      uiDirty = true; refreshUI();
    }catch(e){ console.error(e); msgFailUntil = Date.now() + 4000; }
    finally{ msgBusy = false; if(msgAgain){ msgAgain = false; setTimeout(msgPush, 100); } }
  }
  function msgApply(rows){
    let changed = false;
    const open = currentHash().path;
    rows.forEach(function(r){
      let d = null; try{ d = findDealAny(r.deal_id); }catch(e){}
      if(!d) return;
      if(!Array.isArray(d.messages)) d.messages = [];
      const ts = Date.parse(r.created_at) || Date.now();
      const ex = d.messages.find(function(m){ return m && m.mid === r.id; });
      if(ex){ if(!ex.sent || ex.ts !== ts){ ex.sent = true; ex.ts = ts; changed = true; } return; }
      const mine = r.adm ? (typeof ADMIN !== 'undefined' && !!ADMIN && r.adm === (ADMIN.staffId || 'owner')) : (r.sender === accName());
      const m = { from: r.kind === 'sys' ? 'sys' : (mine ? 'me' : 'them'), text: r.text, ts: ts, mid: r.id, sent: true };
      if(r.adm) m.adm = r.adm;
      if(r.confirm) m.confirm = true;
      d.messages.push(m);
      if(m.from === 'them' && open !== '/chat/' + d.id) d.unread = (d.unread||0) + 1;
      if((d.updatedAt||0) < ts) d.updatedAt = ts;
      changed = true;
    });
    if(changed){
      (state.deals||[]).forEach(function(d){ if(d && Array.isArray(d.messages)) d.messages.sort(function(a,b){ return (a.ts||0) - (b.ts||0); }); });
      uiDirty = true; schedule();
    }
    return changed;
  }
  async function msgFetch(ids, since){
    const out = []; let cur = since || '';
    for(let g = 0; g < 20; g++){
      const inList = ids.map(q).map(encodeURIComponent).join(',');
      const qs = '?select=*&deal_id=in.(' + inList + ')' + (cur ? '&created_at=gte.' + encodeURIComponent(cur) : '') + '&order=created_at.asc&limit=500';
      const res = await httpT('obmenka_msgs', 'GET', qs);
      if(!res.ok || !Array.isArray(res.data)) return null;
      out.push.apply(out, res.data);
      if(res.data.length < 500) break;
      cur = res.data[res.data.length - 1].created_at;
    }
    return out;
  }
  let msgCursor = 0, msgLoaded = {}, msgAcc = null, msgPullBusy = false, msgTick = 0;
  async function msgPull(){
    if(!window.__msgSrv || msgPullBusy || !state) return;
    const acc = accName();
    if(acc !== msgAcc){ msgAcc = acc; msgLoaded = {}; msgCursor = 0; }
    const path = currentHash().path;
    const ids = (state.deals||[]).map(function(d){ return d && d.id; }).filter(Boolean);
    if(path.indexOf('/chat/') === 0){
      const id = path.split('/')[2];
      if(id && id !== 'support' && ids.indexOf(id) < 0) ids.push(id);          /* админ открыл чужой чат */
      if(id && msgTick % 20 === 0) delete msgLoaded[id];                         /* изредка перечитываем открытый чат целиком */
    }
    if(!ids.length) return;
    msgPullBusy = true;
    try{
      const fresh = ids.filter(function(id){ return !msgLoaded[id]; });
      const known = ids.filter(function(id){ return msgLoaded[id]; });
      let maxTs = msgCursor;
      const take = function(rows){ rows.forEach(function(r){ const t = Date.parse(r.created_at) || 0; if(t > maxTs) maxTs = t; }); };
      for(let i = 0; i < fresh.length; i += 30){
        const part = fresh.slice(i, i + 30);
        const rows = await msgFetch(part, '');
        if(rows === null) continue;
        part.forEach(function(id){ msgLoaded[id] = 1; });
        msgApply(rows); take(rows);
      }
      if(known.length){
        const since = msgCursor ? new Date(msgCursor - 5000).toISOString() : '';
        for(let i = 0; i < known.length; i += 30){
          const rows = await msgFetch(known.slice(i, i + 30), since);
          if(rows === null) continue;
          msgApply(rows); take(rows);
        }
      }
      msgCursor = maxTs;
      if(uiDirty) refreshUI();
    }catch(e){ console.error(e); }
    finally{ msgPullBusy = false; }
  }

  /* ---------- присутствие на сервере: «в сети» и «печатает» (таблица obmenka_presence) ---------- */
  let presHb = 0, presTn = Date.now(), presTy = '', presLastWrite = 0, presLastAcc = null, presLastTyping = 0, presPollBusy = false, presSigKey = '', presPollTick = 0;
  function presFromRow(r, initial){
    const acc = String(r.key || r.acc || '').replace(/^p:/, '');
    if(!acc || acc === accName()) return;
    presUpdate(acc, r.value || { hb:r.hb, tn:r.tn, ty:r.ty, off:r.off }, r.updated_at, initial);
  }
  async function presWrite(){
    const acc = (state && state.authed) ? accName() : null;
    if(!ready || !acc) return;
    presLastWrite = Date.now(); presLastAcc = acc;
    const res = await httpT('obmenka_presence', 'POST', '?on_conflict=acc', [{ acc: acc, hb: Date.now(), tn: presTn, ty: presTy, off: false }], { Prefer:'resolution=merge-duplicates,return=representation' });
    if(res.ok && Array.isArray(res.data) && res.data[0] && res.data[0].updated_at){
      const sk = Date.parse(res.data[0].updated_at) - Date.now();
      if(!isNaN(sk) && Math.abs(sk) < 6*3600*1000) window.__presSkew = sk;
    }
  }
  function presOfflineFor(acc){
    if(!ready || !acc) return;
    try{ fetch(REST + 'obmenka_presence?on_conflict=acc', { method:'POST', keepalive:true, headers:{ apikey: CFG.key, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ acc: acc, hb: Date.now(), tn: presTn, ty: '', off: true }]) }); }catch(e){}
  }
  window.presTyping = function(dealId){
    const n = Date.now(); if(n - presLastTyping < 1500) return;
    presLastTyping = n; presTn = n; presTy = String(dealId||''); presWrite();
  };
  window.presStopTyping = function(){
    if(!presTy) return;
    presTy = ''; presTn = Date.now(); presLastTyping = 0; presWrite();
  };
  function presTick(){
    if(!ready) return;
    const acc = (state && state.authed) ? accName() : null;
    if(presLastAcc && presLastAcc !== acc){ presOfflineFor(presLastAcc); presLastAcc = null; }
    if(!acc || document.hidden) return;
    if(acc !== presLastAcc || Date.now() - presLastWrite > 15000) presWrite();
  }
  async function presPoll(){
    if(!ready || presPollBusy || document.hidden || !state) return;
    presPollTick++;
    const path = currentHash().path;
    const inChat = path.indexOf('/chat/') === 0;
    if(!inChat){ presSigKey = ''; if(presPollTick % 4 !== 0) return; }
    let d = null, peers = [];
    if(inChat){
      try{ d = findDealAny(path.split('/')[2]); }catch(e){}
      if(d){ const p = peerKeyOf(d); if(p) peers.push(p); }
    }
    if(!inChat || presPollTick % 4 === 0){
      const set = {}; (state.deals||[]).forEach(function(x){ const p = peerKeyOf(x); if(p) set[p] = 1; });
      Object.keys(set).forEach(function(p){ if(peers.indexOf(p) < 0 && peers.length < 40) peers.push(p); });
    }
    peers = peers.filter(function(p){ return p !== accName(); });
    if(peers.length){
      presPollBusy = true;
      try{
        const res = await httpT('obmenka_presence', 'GET', '?select=acc,hb,tn,ty,off,updated_at&acc=in.(' + peers.map(q).map(encodeURIComponent).join(',') + ')');
        if(res.ok && Array.isArray(res.data)) res.data.forEach(function(r){ presFromRow(r, false); });
      }catch(e){} finally{ presPollBusy = false; }
    }
    if(inChat && d){
      const id = d.id;
      const sig = id + '|' + (peerOnline(d)?1:0) + '|' + (peerTyping(d)?1:0);
      if(presSigKey && presSigKey !== sig && presSigKey.split('|')[0] === id){ presSigKey = sig; uiDirty = true; refreshUI(); }
      else presSigKey = sig;
    }
  }
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) presOfflineFor(presLastAcc); else { presLastWrite = 0; presTick(); msgPull(); }
  });
  window.addEventListener('pagehide', function(){ presOfflineFor(presLastAcc); });

  /* ---------- первый запуск ---------- */
  async function init(){
    if(!state) return;
    const rows = await fetchAll();
    if(rows === null){ setTimeout(init, 8000); return; }
    const listings = [], reports = []; let hasL = false, hasR = false;
    const accDb = (function(){ try{ return readAccDb(); }catch(e){ return {}; } })();
    let accChanged = false;
    const cur = accName();
    rows.forEach(r=>{
      seen[r.key] = r.updated_at; if(!cursor || r.updated_at > cursor) cursor = r.updated_at;
      const k = r.key, v = r.value;
      if(k.startsWith('p:')){ presFromRow(r, true); }
      else if(k.startsWith('g:')){ if(v !== null){ state[k.slice(2)] = v; base[k] = J(v); } }
      else if(k.startsWith('l:')){ hasL = true; base[k] = J(v); if(v !== null) listings.push(v); }
      else if(k.startsWith('r:')){ hasR = true; base[k] = J(v); if(v !== null) reports.push(v); }
      else if(k.startsWith('acc:')){ base[k] = J(v); if(v === null) delete accDb[k.slice(4)]; else accDb[k.slice(4)] = v; accChanged = true; }
      else if(k.startsWith('a:') && cur && k.startsWith('a:'+cur+':')){ applyRemote(k, v, true); }
      else if(/^a:.*:(deals|me)$/.test(k)){ applyRemote(k, v, false); }
    });
    if(hasL){ listings.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); state.listings = listings; }
    if(hasR){ state.reports = reports; }
    persistLocal();
    try{ await msgDetect(); }catch(e){}
    ready = true; setStatus('ok');
    uiDirty = true; refreshUI();
    schedule(100);                    /* всё, чего нет на сервере, отправляем туда */
    setInterval(()=>{ if(!document.hidden) pull(); }, 3000);
    setInterval(()=>{ if(document.hidden) pull(); }, 20000);
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) pull(); });
    setInterval(()=>{ if(ready){ flush(); } }, 10000);
    setInterval(()=>{ if(ready){ autoCompleteDeals(); peerSyncDeals(); } }, 4000);
    setInterval(()=>{ if(uiDirty) refreshUI(); }, 1500);
    presTick(); setInterval(presTick, 5000);
    setInterval(presPoll, 1500);
    setInterval(msgPush, 2000);
    setInterval(function(){ msgTick++; if(currentHash().path.indexOf('/chat/') === 0 || msgTick % 3 === 0) msgPull(); }, 1500);
    setInterval(function(){ if(!window.__msgSrv) msgDetect(); }, 20000);
  }

  /* ---------- вход в аккаунт: подтянуть данные аккаунта с сервера ---------- */
  async function loadAccount(key){
    if(!ready) return false;
    try{ await flush(); }catch(e){}
    const names = ['deals','tx','notif','me','my','fav'];
    const keys = names.map(n=>'a:'+key+':'+n);
    const res = await http('GET', '?select=key,value&key=in.(' + keys.map(q).map(encodeURIComponent).join(',') + ')');
    if(!res.ok){ failStatus(res); return false; }
    const got = {}; (res.data||[]).forEach(r=>{ got[r.key] = r.value; });
    if(!state.dealsByAcc) state.dealsByAcc = {}; if(!state.txByAcc) state.txByAcc = {}; if(!state.notifByAcc) state.notifByAcc = {};
    const d = got['a:'+key+':deals'], t = got['a:'+key+':tx'], n = got['a:'+key+':notif'];
    state.dealsByAcc[key] = Array.isArray(d) ? d : [];
    if(window.__msgSrv && Array.isArray(d)) d.forEach(function(x){ if(x){ x.messages = Array.isArray(x.messages) ? x.messages : []; markLegacy(x.messages); } }); state.txByAcc[key] = Array.isArray(t) ? t : []; state.notifByAcc[key] = Array.isArray(n) ? n : [];
    if(!Array.isArray(d)) delete state.dealsByAcc[key]; if(!Array.isArray(t)) delete state.txByAcc[key]; if(!Array.isArray(n)) delete state.notifByAcc[key];
    keys.forEach(k=>{ base[k] = (k in got && got[k] !== null) ? J(got[k]) : undefined; if(base[k] === undefined) delete base[k]; });
    window.__syncRemoteMe = got['a:'+key+':me']; window.__syncRemoteMy = got['a:'+key+':my']; window.__syncRemoteFav = got['a:'+key+':fav'];
    return true;
  }
  function freshMe(name, prev){
    return { id:'me', name:name, balance:0, rating:4.9, deals:27, color:'#6C5CE7', ip:(prev&&prev.ip)||'', status:'active', isAdmin:false, verified:false, avgResponseMin:8, reviews:[], transactions:[], frozenFunds:[], photo:null };
  }

  /* ---------- подмена функций сайта ---------- */
  const _save = saveState;
  saveState = function(){ _save.apply(this, arguments); schedule(); setTimeout(peerSyncDeals, 50); setTimeout(msgPush, 30); };

  const _writeAcc = writeAccDb;
  writeAccDb = function(db){ _writeAcc.apply(this, arguments); schedule(300); };
  const _writeLocal = writeLocalAccounts;
  writeLocalAccounts = function(db){ _writeLocal.apply(this, arguments); schedule(300); };

  const _find = ACCOUNTS_DB.find.bind(ACCOUNTS_DB);
  ACCOUNTS_DB.find = async function(nickname){
    const key = (nickname||'').trim().toLowerCase();
    if(ready){
      const res = await http('GET', '?select=key,value,updated_at&key=eq.' + encodeURIComponent(q('acc:'+key)));
      if(res.ok){
        const row = (res.data||[])[0];
        if(row && row.value){ let db = readAccDb(); db[key] = row.value; base['acc:'+key] = J(row.value); }
        else if(base['acc:'+key] !== undefined && base['acc:'+key] !== 'null'){ let db = readAccDb(); delete db[key]; }
      } else { failStatus(res); }
    }
    return _find(nickname);
  };
  const _saveAcc = ACCOUNTS_DB.save.bind(ACCOUNTS_DB);
  ACCOUNTS_DB.save = async function(nickname, password){
    const key = (nickname||'').trim().toLowerCase();
    if(ready){
      /* защита от одновременной регистрации одного ника на двух устройствах */
      const chk = await http('GET', '?select=key&key=eq.' + encodeURIComponent(q('acc:'+key)));
      if(chk.ok && (chk.data||[]).length){ throw new Error('nick_taken'); }
    }
    const r = await _saveAcc(nickname, password);
    if(ready){ await flush(); }
    return r;
  };

  const _apply = applyLocalUser;
  applyLocalUser = function(nickname){
    const key = String(nickname||'').trim().toLowerCase();
    (async function(){
      try{ await loadAccount(key); }catch(e){}
      
      // ПРИНУДИТЕЛЬНО сбрасываем старое состояние
      state.me = { id:'me', name:nickname, balance:0, rating:0, deals:0, color:'#6C5CE7', ip:'', status:'active', isAdmin:false, verified:false, avgResponseMin:8, reviews:[], transactions:[], frozenFunds:[], photo:null };
      state.deals = [];
      state.myListings = [];
      state.favorites = [];
      state.notifications = [];
      state.authed = true;
      state.accKey = key;
      /* подтянуть то, что loadAccount скачал с сервера (dealsSwitchTo ниже выйдет раньше из-за accKey/authed) */
      state.deals = (state.dealsByAcc && state.dealsByAcc[key]) || [];
      state.me.transactions = (state.txByAcc && state.txByAcc[key]) || [];
      state.notifications = (state.notifByAcc && state.notifByAcc[key]) || [];
      
      _apply(nickname);
      
      try{
        if(state && state.me && ready){
          const rm = window.__syncRemoteMe;
          if(isObj(rm)){
            const keep = { transactions: state.me.transactions, isAdmin: state.me.isAdmin, ip: state.me.ip };
            state.me = Object.assign({}, state.me, rm, keep, { name: nickname });
            base['a:'+key+':me'] = J(rm);
          }
          if(Array.isArray(window.__syncRemoteMy)){ state.myListings = window.__syncRemoteMy; base['a:'+key+':my'] = J(window.__syncRemoteMy); } else { state.myListings = []; }
          if(Array.isArray(window.__syncRemoteFav)){ state.favorites = window.__syncRemoteFav; base['a:'+key+':fav'] = J(window.__syncRemoteFav); } else { state.favorites = []; }
          _save(); schedule(200);
          if(typeof onRoute === 'function') onRoute();
        }
      }catch(e){}
    })();
  };

  /* ---------- запуск ---------- */
  window.__SYNC = { flush: forceSync, status: ()=>status, sql: SQL_HELP };
  window.addEventListener('DOMContentLoaded', function(){
    updatePill();
    setInterval(updatePill, 4000);
    init();
  });
})();
