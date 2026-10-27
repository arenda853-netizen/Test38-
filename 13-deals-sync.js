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
  const H = { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
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
/* ---------- СПОРЫ: деньги двигает только сервер ---------- */
function askAdminCreds(){
  return new Promise(function(resolve){
    window.__dspSubmit = function(){
      const v = function(id){ return ((document.getElementById(id)||{}).value || '').trim(); };
      const nick = v('dspNick'), pass = (document.getElementById('dspPass')||{}).value || '', note = v('dspNote');
      const msg = document.getElementById('dspMsg');
      if(!nick || !pass || !note){ if(msg) msg.textContent = 'Заполните ник, пароль и причину решения'; return; }
      closeModal(); resolve({ nick: nick, pass: pass, note: note });
    };
    window.__dspCancel = function(){ resolve(null); };
    openModal(`<div style="padding:22px;max-width:340px;">
      <div class="h2" style="margin-bottom:6px;">Решение по спору</div>
      <div class="muted" style="font-size:13px;margin-bottom:12px;line-height:1.45;">Ник и пароль владельца или старшего админа. Ничего не сохраняется.</div>
      <input id="dspNick" class="input" placeholder="Ник админа" autocomplete="username" style="margin-bottom:8px;width:100%;">
      <input id="dspPass" class="input" type="password" placeholder="Пароль" autocomplete="current-password" style="margin-bottom:8px;width:100%;">
      <input id="dspNote" class="input" placeholder="Причина решения" maxlength="200" style="margin-bottom:12px;width:100%;">
      <div id="dspMsg" style="font-size:13px;min-height:18px;margin-bottom:10px;color:var(--danger);"></div>
      <div class="row gap8">
        <button class="btn btn-ghost" style="flex:1;" onclick="window.__dspCancel(); closeModal()">Отмена</button>
        <button class="btn btn-primary" style="flex:1.4;" onclick="window.__dspSubmit()">Подтвердить</button>
      </div></div>`);
  });
}

/* участник открыл спор: сервер проверяет 48 часов и статус, потом деньги замораживаются */
async function serverDisputeHold(d){
  if(!d || !d.escrowId) return true;
  let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok){ toast('Войдите в аккаунт заново','error'); return false; }
  try{
    const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action:'dispute_hold', token: tok, escrow: d.escrowId }) });
    let res = {}; try{ res = await r.json(); }catch(e){}
    if(res.ok) return true;
    const map = {
      window_closed: 'Спор можно открыть только в течение 48 часов после оплаты',
      not_held: 'Сделка уже закрыта: спор невозможен',
      no_escrow: 'Счёт сделки не найден на сервере',
      not_party: 'Спор может открыть участник сделки'
    };
    toast(map[res.error] || 'Спор не открыт: нет связи с сервером','error');
    return false;
  }catch(e){ toast('Нет связи с сервером. Спор не открыт','error'); return false; }
}

/* продавец подтвердил передачу или покупатель получение: сервер сам проверяет оба подтверждения */
async function serverDealConfirm(d){
  if(!d || !d.escrowId) return;
  let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok) return;
  try{
    await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action:'deal_confirm', token: tok, escrow: d.escrowId }) });
  }catch(e){}
}

/* админ принимает решение: 'seller' — выплата продавцу, 'buyer' — возврат покупателю */
async function serverDispute(d, decision){
  if(!d.escrowId){
    if(d.payMethod === 'internal'){ toast('У сделки нет серверного счёта: решение не проведено','error'); return false; }
    return true; /* внешняя оплата: деньги не проходят через сайт */
  }
  const creds = await askAdminCreds();
  if(!creds) return false;
  try{
    const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action:'dispute', escrow: d.escrowId, decision: decision, note: creds.note,
        admin_nick: creds.nick, admin_pass: creds.pass }) });
    let res = {}; try{ res = await r.json(); }catch(e){}
    const map = {
      bad_admin: 'Неверный ник или пароль админа',
      not_allowed: 'Решать споры может только владелец или старший админ',
      locked: 'Слишком много попыток. Подождите немного',
      no_escrow: 'Счёт сделки не найден на сервере',
      not_disputed: 'Спор не открыт в срок: решение невозможно',
      already_paid: 'Деньги уже выплачены: возврат после выплаты невозможен',
      no_note: 'Напишите причину решения',
      bad_decision: 'Неверное решение'
    };
    if(!res.ok){ toast(map[res.error] || ('Не удалось провести решение [код ' + r.status + ']'), 'error'); return false; }
    return true;
  }catch(e){ toast('Нет связи с сервером. Решение не проведено','error'); return false; }
}


/* ---------- ТАЙМЕР СДЕЛКИ: срок и «сейчас» берутся с сервера, часы телефона не влияют на срок ---------- */
window.__dealTimers = window.__dealTimers || {};
window.__dealTimerBusy = window.__dealTimerBusy || {};
function fmtLeft(ms){
  if(ms <= 0) return 'время вышло';
  const s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  const p = n => String(n).padStart(2,'0');
  return p(h)+':'+p(m)+':'+p(sec);
}
/* сколько осталось по серверному времени; null — сервер ещё не закрыл сделку */
function serverLeft(escrowId){
  const t = window.__dealTimers && window.__dealTimers[escrowId];
  if(!t || !t.completed || !t.end_ms) return null;
  return t.end_ms - (Date.now() + t.offset);
}
/* сколько осталось до автоподтверждения покупателем (до закрытия сделки) */
function serverAutoLeft(escrowId){
  const t = window.__dealTimers && window.__dealTimers[escrowId];
  if(!t || t.completed || !t.auto_end_ms) return null;
  return t.auto_end_ms - (Date.now() + t.offset);
}
async function loadDealTimer(d){
  if(!d || !d.escrowId) return;
  const cur = window.__dealTimers[d.escrowId];
  if(cur && Date.now() - cur.fetchedAt < 15000) return;
  if(window.__dealTimerBusy[d.escrowId]) return;
  let tok=''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok) return;
  window.__dealTimerBusy[d.escrowId] = true;
  try{
    const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action:'deal_timer', token: tok, escrow: d.escrowId }) });
    const res = await r.json();
    if(res.ok){
      const prev = window.__dealTimers[d.escrowId];
      window.__dealTimers[d.escrowId] = { completed: res.completed, end_ms: res.end_ms, auto_end_ms: res.auto_end_ms || null,
        offset: res.server_now - Date.now(), fetchedAt: Date.now() };
      const changed = !prev || prev.completed !== res.completed || prev.end_ms !== res.end_ms || prev.auto_end_ms !== (res.auto_end_ms || null);
      if(changed && typeof onRoute === 'function') onRoute();
    }
  }catch(e){}
  finally{ window.__dealTimerBusy[d.escrowId] = false; }
}
function dealTimerBanner(d){
  if(!d) return '';
  if(!d.escrowId){
    return '';  /* старые сделки без серверного счёта: таймера нет */
  }
  loadDealTimer(d);
  const left = serverLeft(d.escrowId);
  if(left !== null){
    if(left <= 0 || d.status === 'frozen' || d.status === 'cancelled') return '';
    return `<div class="card" style="margin:10px 16px 0;padding:10px 12px;font-size:12.5px;line-height:1.45;border:1px solid var(--accent-2,#f5a);">
      <b>Спор можно открыть ещё:</b> <span data-timer-escrow="${d.escrowId}" style="font-weight:800;font-variant-numeric:tabular-nums;">${fmtLeft(left)}</span><br>
      По окончании таймера деньги переходят продавцу, и возврат будет невозможен.</div>`;
  }
  const autoLeft = serverAutoLeft(d.escrowId);
  if(autoLeft !== null && autoLeft > 0){
    return `<div class="card" style="margin:10px 16px 0;padding:10px 12px;font-size:12.5px;line-height:1.45;">
      <b>Покупатель может подтвердить получение.</b> Если не подтвердит, сделка закроется сама через: <span data-auto-escrow="${d.escrowId}" style="font-weight:800;font-variant-numeric:tabular-nums;">${fmtLeft(autoLeft)}</span><br>
      После этого начнутся 48 часов на спор.</div>`;
  }
  if(d.status === 'paid'){
    return `<div class="card" style="margin:10px 16px 0;padding:10px 12px;font-size:12.5px;line-height:1.45;">
      <b>Таймер 48 часов ещё не запущен.</b><br>Он начнётся, когда и продавец, и покупатель подтвердят сделку. До этого спор можно открыть в любой момент.</div>`;
  }
  return '';
}
/* короткая строка для мини-карточки и верхнего меню чата */
function dealAutoShort(d){
  if(!d || !d.escrowId) return '';
  loadDealTimer(d);
  const endLeft = serverLeft(d.escrowId);
  if(endLeft !== null && endLeft > 0) return 'Спор: ' + fmtLeft(endLeft);
  const autoLeft = serverAutoLeft(d.escrowId);
  if(autoLeft !== null && autoLeft > 0) return 'Автоподтв.: <span data-auto-escrow="' + d.escrowId + '">' + fmtLeft(autoLeft) + '</span>';
  return '';
}
setInterval(function(){
  try{
    document.querySelectorAll('[data-timer-escrow]').forEach(function(el){
      const left = serverLeft(el.getAttribute('data-timer-escrow'));
      if(left !== null) el.textContent = fmtLeft(left);
    });
    document.querySelectorAll('[data-auto-escrow]').forEach(function(el){
      const left = serverAutoLeft(el.getAttribute('data-auto-escrow'));
      if(left !== null && left > 0) el.textContent = fmtLeft(left);
    });
  }catch(e){}
}, 1000);
