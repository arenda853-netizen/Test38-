/* ---------- сделки всех аккаунтов (для админки и синхронизации сторон) ---------- */
window.__ALL_DEALS = window.__ALL_DEALS || {};
function adminAllDeals(){
  const by = {};
  (state.deals||[]).forEach(function(d){ if(d && d.id) by[d.id] = d; });
  Object.keys(window.__ALL_DEALS).forEach(function(acc){
    (window.__ALL_DEALS[acc]||[]).forEach(function(d){
      if(!d || !d.id) return;
      const cur = by[d.id];
      if(!cur || (d.updatedAt||0) > (cur.updatedAt||0)) by[d.id] = d;
    });
  });
  return Object.keys(by).map(function(k){ return by[k]; });
}
function findDealAny(id){
  const own = state.deals.find(x=>x.id===id);
  if(!(typeof ADMIN!=='undefined' && ADMIN)) return own;
  const any = adminAllDeals().find(x=>x.id===id);
  if(own && any && (any.updatedAt||0) > (own.updatedAt||0)) return any;
  return own || any || undefined;
}
function kvUpdate(key, fn){
  const base = SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/obmenka_kv';
  const H = Object.assign({ apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, (typeof adminHdr==='function' ? adminHdr() : {}));
  return fetch(base + '?key=eq.' + encodeURIComponent(key) + '&select=value', { headers: H })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data)) throw new Error('kvUpdate: ошибка чтения '+key);   /* не затираем строку, если чтение не удалось */
      const cur = (data && data[0]) ? data[0].value : null;
      const val = fn(cur);
      if(val === undefined) return;
      return fetch(base + '?on_conflict=key', { method:'POST', headers: Object.assign({ Prefer:'resolution=merge-duplicates,return=minimal' }, H), body: JSON.stringify([{ key:key, value:val }]) });
    }).catch(function(e){ console.error(e); window.__peerRetry = true; });
}
let __kvQueue = Promise.resolve();
function kvQueued(key, fn){
  __kvQueue = __kvQueue.then(function(){ return kvUpdate(key, fn); }).catch(console.error);
  return __kvQueue;
}
function deliverPeer(peer, deals){
  const myKey = state.accKey;
  return kvQueued('a:' + peer + ':deals', function(arr){
    arr = Array.isArray(arr) ? arr.filter(function(x){ return x && typeof x === 'object'; }) : [];
    let changed = false;
    deals.forEach(function(d){
      const mirror = dealMirror(d, myKey);
      mirror.messages = window.__msgSrv ? [] : (mirror.messages || []).filter(function(m){ return !m.local; });
      const it = arr.find(function(x){ return x.id === d.id; });
      if(!it){ mirror.unread = 1; arr.unshift(mirror); changed = true; return; }
      it.messages = Array.isArray(it.messages) ? it.messages : [];
      const have = {}; it.messages.forEach(function(m){ have[m.ts + '|' + m.text] = 1; });
      let added = 0;
      mirror.messages.forEach(function(m){ if(!have[m.ts + '|' + m.text]){ it.messages.push(m); added++; } });
      if(added){ it.messages.sort(function(x,y){ return (x.ts||0) - (y.ts||0); }); it.unread = (it.unread||0) + added; changed = true; }
      ['sellerConfirmed','buyerConfirmed'].forEach(function(k){ if(d[k] && !it[k]){ it[k] = true; changed = true; } });
      const closed = (it.status === 'completed' || it.status === 'cancelled');
      if(!closed && d.status !== 'completed' && (d.updatedAt||0) >= (it.updatedAt||0)){
        ['status','disputeRole','disputeDecision'].forEach(function(k){
          if(d[k] !== undefined && JSON.stringify(it[k]) !== JSON.stringify(d[k])){ it[k] = d[k]; changed = true; }
        });
      }
      if(changed && (d.updatedAt||0) > (it.updatedAt||0)) it.updatedAt = d.updatedAt;
    });
    return changed ? arr : undefined;
  });
}
let __peerBusy = false, __peerAgain = false;
function peerSyncDeals(){
  try{
    if(!state || !state.authed || !state.accKey) return;
    if(__peerBusy){ __peerAgain = true; return; }
    const by = {};
    (state.deals || []).forEach(function(d){
      if(!d || !d.peerKey || d.peerKey === state.accKey || !Array.isArray(d.messages)) return;
      (by[d.peerKey] = by[d.peerKey] || []).push(d);
    });
    const peers = Object.keys(by);
    if(!peers.length) return;
    __peerBusy = true;
    Promise.all(peers.map(function(k){ return deliverPeer(k, by[k]); }))
      .catch(console.error)
      .then(function(){ __peerBusy = false; if(__peerAgain){ __peerAgain = false; setTimeout(peerSyncDeals, 300); } });
  }catch(e){ __peerBusy = false; console.error(e); }
}
function autoCompleteDeals(){
  try{
    (state.deals || []).slice().forEach(function(d){
      if(d && d.status === 'paid' && d.sellerConfirmed && d.buyerConfirmed){ tryCompleteDeal(d.id); return; }
      if(d && d.status === 'completed' && Array.isArray(d.messages) && !d.messages.some(function(m){ return m.done; })){
        const last = d.messages.reduce(function(a,m){ return Math.max(a, m.ts||0); }, 0);
        d.messages.push({from:'sys', text:'✅ Сделка совершена. Обе стороны подтвердили сделку.', ts:last+1, local:true, done:true});
        saveState();
        if(currentHash().path === '/chat/'+d.id) onRoute();
      }
    });
  }catch(e){ console.error(e); }
}
function fixDealCounterparties(){
  try{
    (state.deals || []).forEach(function(d){
      if(!d || !d.counterparty || d.counterparty.id !== 'me') return;
      let cp = null;
      if(d.role === 'seller' && d.peerKey) cp = miniUser(d.peerKey);
      else { const l = state.listings.find(function(x){ return x.id === d.listingId; }); if(l && !isMineListing(l)) cp = sellerOf(l); }
      if(cp && cp.id !== 'me') d.counterparty = cp;
    });
  }catch(e){}
}
function dealParties(d){
  let buyer = null, seller = null;
  const all = window.__ALL_DEALS || {};
  Object.keys(all).forEach(function(acc){
    const it = (all[acc]||[]).find(x=>x && x.id===d.id); if(!it) return;
    if(it.role==='seller') seller = acc; else if(it.role==='buyer') buyer = acc;
  });
  if(!seller && buyer){ const it = all[buyer].find(x=>x && x.id===d.id); if(it && it.peerKey) seller = it.peerKey; }
  return {buyer:buyer, seller:seller};
}
function syncDealRows(d){
  if(!d) return;
  const me = (state.authed && state.accKey) ? state.accKey : null;
  const all = window.__ALL_DEALS || {};
  Object.keys(all).forEach(function(acc){
    if(acc === me) return;
    if(!(all[acc]||[]).some(x=>x && x.id===d.id)) return;
    kvUpdate('a:' + acc + ':deals', function(arr){
      arr = Array.isArray(arr) ? arr : [];
      const it = arr.find(x=>x && x.id===d.id); if(!it) return undefined;
      ['status','disputeRole','disputeDecision','updatedAt'].forEach(function(k){ if(d[k] !== undefined) it[k] = d[k]; });
      it.messages = it.messages || [];
      (window.__msgSrv ? [] : (d.messages||[])).forEach(function(m){
        if(m.from !== 'sys' && !m.adm) return;
        if(it.messages.some(x=>x.ts===m.ts && x.text===m.text)) return;
        it.messages.push((m.adm && m.from==='me') ? Object.assign({}, m, {from:'them'}) : m);
      });
      return arr;
    });
  });
}
function adminPayParty(acc, amount, label, type){
  if(!acc || !amount) return;
  kvUpdate('a:' + acc + ':me', function(cur){
    if(!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur.balance = (Number(cur.balance)||0) + amount; return cur;
  });
  kvUpdate('a:' + acc + ':tx', function(cur){
    const t = Array.isArray(cur) ? cur : [];
    t.unshift({type:type, amount:amount, label:label, ts:Date.now()}); return t;
  });
}
