/* --- жалобы на отзывы --- */
const REPORT_REASONS = ['Оскорбления или мат','Спам или реклама','Фейковый или накрученный отзыв','Другое'];
function reviewReportSheet(sellerId, idx){
  if(!state.authed){ requireAuth('Чтобы пожаловаться на отзыв, войдите в аккаунт'); return; }
  openModal(`<div class="h2" style="margin-bottom:6px;">Пожаловаться на отзыв</div>
  <div class="faint" style="font-size:12px;margin-bottom:12px;">Выберите причину, жалобу рассмотрит администрация.</div>
  <div style="display:flex;flex-direction:column;gap:8px;">${REPORT_REASONS.map((r,i)=>`<button class="btn btn-ghost btn-block" onclick="submitReviewReport('${sellerId}',${idx},${i})">${r}</button>`).join('')}</div>
  <button class="btn btn-ghost btn-block" style="margin-top:10px;" onclick="closeModal()">Отмена</button>`);
}
const ACCOUNT_STATE_URL = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/account-state';
/* жалоба уходит на сервер: сервер проверяет, что отзыв существует, и сам ставит автора жалобы */
function sendReviewReport(sellerKey, r, reason, sellerName){
  let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok){ closeModal(); toast('Войдите в аккаунт, чтобы пожаловаться','error'); return; }
  fetch(ACCOUNT_STATE_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'report_add', token: tok, seller: sellerKey, ts: r.ts, text: r.text, reason: reason }) })
    .then(function(x){ return x.json(); }).then(function(res){
      if(res && res.ok){ closeModal(); toast('Жалоба отправлена','success'); try{ addNotification('Жалоба отправлена', 'Администрация рассмотрит отзыв продавца '+(sellerName||sellerKey), ''); }catch(e){} return; }
      closeModal();
      toast(res && res.error==='duplicate' ? 'Вы уже жаловались на этот отзыв' : (res && res.error==='no_review' ? 'Отзыв не найден' : 'Не удалось отправить жалобу'), 'error');
    }).catch(function(){ closeModal(); toast('Нет связи с сервером','error'); });
}
function submitReviewReport(sellerId, idx, reasonIdx){
  const seller = allUsers().find(x=>x.id===sellerId);
  const r = seller && (seller.reviews||[])[idx];
  if(!r){ closeModal(); toast('Отзыв не найден','error'); return; }
  const sk = String(seller.key || '').toLowerCase();
  if(!sk){ closeModal(); toast('Не удалось определить продавца','error'); return; }
  sendReviewReport(sk, r, REPORT_REASONS[reasonIdx], seller.name);
}
function pageAdminReports(){
  if(!can('disputes')) return adminGuard('Жалобы');
  const list = (state.reports||[]).filter(x=>x.status==='new');
  return `${topbar({title:'Жалобы на отзывы', back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon('check',36,'var(--text-faint)')}<div class="h2">Новых жалоб нет</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:10px;">${list.map(x=>`
      <div class="card" style="padding:14px;">
        <div class="row between" style="margin-bottom:6px;"><span class="h3" style="font-size:13px;">${esc(x.sellerName||x.sellerId)}</span><span class="badge">${esc(x.reason)}</span></div>
        <div class="review-card" style="margin-bottom:8px;"><div style="font-size:12px;font-weight:700;margin-bottom:3px;">${esc(x.author||'')}</div><div class="muted" style="font-size:12.5px;line-height:1.5;">${esc(x.text||'')}</div></div>
        <div class="faint" style="font-size:11px;margin-bottom:10px;">От: ${esc(x.by)} · ${timeAgo(x.ts)}</div>
        <div class="row gap8">
          <button class="btn btn-danger btn-sm" style="flex:1;" onclick="reportResolve('${x.id}',true)">Удалить отзыв</button>
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="reportResolve('${x.id}',false)">Отклонить</button>
        </div>
      </div>`).join('')}</div>`}
  </div>`;
}
function reportResolve(id, remove){
  if(!can('disputes')) return;
  const x = (state.reports||[]).find(r=>r.id===id); if(!x) return;
  if(remove){
    const seller = allUsers().find(u=>u.id===x.sellerId);
    if(seller && Array.isArray(seller.reviews)){ const k = seller.reviews.findIndex(r=>r.ts===x.reviewTs && r.text===x.text); if(k>=0) seller.reviews.splice(k,1); }
  }
  x.status = remove ? 'removed' : 'rejected';
  logOp(remove?'Отзыв удалён по жалобе':'Жалоба на отзыв отклонена', x.sellerId, 'reports', {sellerId:x.sellerId, reason:x.reason, by:x.by, text:String(x.text||'').slice(0,300)});
  saveState(); toast(remove?'Отзыв удалён':'Жалоба отклонена','success'); onRoute();
}
/* --- отключение задержки денег по ID (только главный админ) --- */
function holdOffForMe(){
  if(!state.noHold) return false;
  const keys = ['me', supportUidMe()].filter(Boolean);
  return keys.some(k=>state.noHold[k]);
}
function pageAdminHold(){
  if(!can('hold')) return adminGuard('Задержка денег');
  const ids = Object.keys(state.noHold||{}).filter(k=>state.noHold[k]);
  const nameOf = id => { const u = allUsers().find(x=>x.id===id); if(u) return u.name; const a = accUsers().find(x=>x.uid===id); return a ? (a.name||a.key||id) : id; };
  return `${topbar({title:'Задержка денег', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:16px;margin-bottom:16px;">
      <div class="h3" style="font-size:13.5px;margin-bottom:6px;">Отключить задержку</div>
      <div class="faint" style="font-size:11.5px;line-height:1.5;margin-bottom:12px;">После сделки деньги этого игрока сразу зачисляются на баланс, без заморозки, и их можно сразу вывести.</div>
      <input class="input" id="holdIdInput" placeholder="ID игрока, например seller_3" style="margin-bottom:10px;">
      <button class="btn btn-accent2 btn-block" onclick="adminSetNoHold(document.getElementById('holdIdInput').value, true)">${icon('check',16)} Отключить задержку</button>
    </div>
    <div class="h3" style="font-size:13px;margin-bottom:8px;">Без задержки (${ids.length})</div>
    ${ids.length===0 ? `<div class="faint" style="font-size:12px;">Пока никого нет</div>` :
    `<div style="display:flex;flex-direction:column;gap:8px;">${ids.map(id=>`
      <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;min-width:0;">
          <div class="h3" style="font-size:13px;">${esc(nameOf(id))}</div>
          <div class="faint" style="font-size:11px;font-family:monospace;margin-top:2px;">ID: ${esc(id)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="adminSetNoHold('${esc(id)}', false)">Включить обратно</button>
      </div>`).join('')}</div>`}
  </div>`;
}
function adminSetNoHold(id, on){
  if(!can('hold')) return;
  id = (id||'').trim();
  if(!id){ toast('Введите ID игрока','error'); return; }
  const known = allUsers().some(x=>x.id===id) || accUsers().some(x=>x.uid===id);
  if(!known){ toast('Игрок с таким ID не найден','error'); return; }
  if(!state.noHold) state.noHold = {};
  if(on) state.noHold[id] = true; else delete state.noHold[id];
  logOp(on?'Отключена задержка денег':'Включена задержка денег', id);
  saveState();
  toast(on?'Задержка отключена: деньги будут сразу на балансе':'Задержка снова включена','success');
  onRoute();
}
/* --- VIP статус товару (только главный админ) --- */
let adminVipQuery = '';
function pageAdminVip(parts){
  if(!can('vip')) return adminGuard('VIP статус');
  parts = parts || [];
  const uid = parts[0], lid = parts[1];
  if(!uid){
    return `${topbar({title:'Выдать VIP статус', back:true, solid:true})}
    <div class="page">
      <div class="faint" style="font-size:12px;margin-bottom:10px;">Найдите игрока по ID, откройте его каталог и выберите товар.</div>
      <div class="search-bar" style="margin-bottom:16px;">
        ${icon('search',18,'var(--text-faint)')}
        <input class="input" placeholder="ID игрока, например seller_3" value="${esc(adminVipQuery)}" oninput="adminVipQuery=this.value; renderVipPlayers();">
      </div>
      <div id="vip-players" style="display:flex;flex-direction:column;gap:10px;"></div>
    </div>`;
  }
  const _p = findPlayerById(uid, true);
  const u = _p ? {id:_p.id, name:_p.name} : null;
  if(!u) return `${topbar({title:'VIP статус', back:true, solid:true})}<div class="page empty-state">${icon('search',36,'var(--text-faint)')}<div class="h2">Игрок не найден</div></div>`;
  const mine = listingsOfPlayer(u.id);
  if(!lid){
    return `${topbar({title:'Каталог игрока', back:true, solid:true})}
    <div class="page">
      <div class="card" style="padding:12px 14px;margin-bottom:14px;">
        <div class="h3" style="font-size:13.5px;">${esc(u.name)}</div>
        <div class="faint" style="font-size:11px;font-family:monospace;margin-top:3px;">ID: ${esc(u.id)}</div>
      </div>
      ${mine.length===0 ? `<div class="empty-state">${icon('grid',36,'var(--text-faint)')}<div class="h2">В каталоге игрока пусто</div></div>` :
      `<div style="display:flex;flex-direction:column;gap:10px;">${mine.map(l=>`
        <div class="card" style="padding:13px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="navigate('/admin/vip/${encodeURIComponent(uid)}/${encodeURIComponent(l.id)}')">
          <div class="listing-thumb" style="width:48px;height:48px;background:${l.images && l.images.length ? `url('${l.images[0]}') center/cover` : `linear-gradient(145deg, ${l.color}, ${l.color}99)`};"></div>
          <div style="flex:1;min-width:0;">
            <div class="h3" style="font-size:13px;">${l.title}</div>
            <div class="faint" style="font-size:11px;margin-top:2px;">${fmtPrice(l.price)}</div>
          </div>
          ${l.vip ? `<span class="badge badge-vip">${icon('bolt',10)} VIP</span>` : ''}
          ${icon('chev',16,'var(--text-faint)')}
        </div>`).join('')}</div>`}
    </div>`;
  }
  const l = mine.find(x=>x.id===lid) || state.listings.find(x=>x.id===lid);
  if(!l) return `${topbar({title:'VIP статус', back:true, solid:true})}<div class="page empty-state">${icon('search',36,'var(--text-faint)')}<div class="h2">Товар не найден</div></div>`;
  return `${topbar({title:'Настройки товара', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:14px;margin-bottom:14px;">
      <div class="row gap12">
        <div class="listing-thumb" style="width:52px;height:52px;background:${l.images && l.images.length ? `url('${l.images[0]}') center/cover` : `linear-gradient(145deg, ${l.color}, ${l.color}99)`};"></div>
        <div style="flex:1;min-width:0;">
          <div class="h3" style="font-size:13.5px;">${l.title}</div>
          <div class="faint" style="font-size:11.5px;margin-top:2px;">${esc(u.name)} · ${fmtPrice(l.price)}</div>
        </div>
        ${l.vip ? `<span class="badge badge-vip">${icon('bolt',10)} VIP</span>` : ''}
      </div>
    </div>
    <div class="card" style="padding:16px;">
      <div class="h3" style="font-size:13.5px;margin-bottom:6px;">VIP статус</div>
      <div class="faint" style="font-size:11.5px;line-height:1.5;margin-bottom:12px;">${l.vip ? 'У товара сейчас есть VIP статус: бейдж в карточке, товар выше в каталоге.' : 'Товар получит бейдж VIP и будет показываться выше в каталоге.'}</div>
      ${l.vip
        ? `<button class="btn btn-danger btn-block" onclick="adminSetVip('${esc(l.id)}', false)">${icon('close',16)} Снять VIP статус</button>`
        : `<button class="btn btn-accent2 btn-block" onclick="adminSetVip('${esc(l.id)}', true)">${icon('bolt',16)} Выдать VIP статус</button>`}
    </div>
  </div>`;
}
function renderVipPlayers(){
  const el = document.getElementById('vip-players'); if(!el) return;
  const q = adminVipQuery.trim().toLowerCase();
  if(!q){
    el.innerHTML = `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">Введите ID игрока</div></div>`;
    return;
  }
  const users = searchPlayers(q);
  if(users.length===0){
    el.innerHTML = `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">Никого не нашли</div><div class="muted" style="font-size:13px;">Проверьте ID и попробуйте снова</div></div>`;
    return;
  }
  el.innerHTML = users.map(u=>{
    const n = listingsOfPlayer(u.id).length;
    return `<div class="card" style="padding:13px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="navigate('/admin/vip/${encodeURIComponent(u.id)}')">
      <div style="flex:1;min-width:0;">
        <div class="h3" style="font-size:13.5px;">${esc(u.name)}</div>
        <div class="faint" style="font-size:11px;font-family:monospace;margin-top:2px;">ID: ${esc(u.id)} · товаров: ${n}</div>
      </div>
      ${icon('chev',16,'var(--text-faint)')}
    </div>`;
  }).join('');
}
function adminSetVip(id, on){
  if(!can('vip')) return;
  const l = state.listings.find(x=>x.id===id);
  if(!l) return;
  l.vip = !!on;
  logOp(on?'Выдан VIP статус':'Снят VIP статус', id, 'listings', Object.assign(listingSnap(l), {result: on?'VIP выдан':'VIP снят'}));
  saveState();
  toast(on?'VIP статус выдан товару':'VIP статус снят','success');
  onRoute();
}

/* ---------- галочка «проверен»: только владелец, по ID или нику ---------- */
function adminDataCall(action, payload){
  return fetch(ADMIN_DATA_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(Object.assign({ action: action, admin_nick: ADMIN_CRED ? ADMIN_CRED.nick : '', admin_pass: ADMIN_CRED ? ADMIN_CRED.pass : '' }, payload)) })
    .then(function(r){ return r.json(); }).catch(function(){ return { ok:false, error:'network' }; });
}
function pageAdminVerify(){
  if(!isOwner()) return adminGuard('Верификация');
  return `${topbar({title:'Верификация', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:14px;">
      <div class="muted" style="font-size:13px;line-height:1.5;margin-bottom:12px;">Введите ID игрока (например DP123456789) или ник. Галочка действует 6 месяцев. Документы сюда не загружаются.</div>
      <input class="input" id="verifyTarget" type="text" autocomplete="off" placeholder="ID или ник" style="margin-bottom:10px;">
      <div class="row gap8">
        <button class="btn btn-primary" style="flex:1;" onclick="verifyAction(true)">Выдать</button>
        <button class="btn btn-ghost" style="flex:1;" onclick="verifyAction(false)">Снять</button>
        <button class="btn btn-ghost" style="flex:1;" onclick="verifyListShow()">Кто проверен</button>
      </div>
    </div>
    <div id="verifyList" style="margin-top:14px;"></div>
  </div>`;
}
function verifyAction(on){
  if(!isOwner() || !ADMIN_CRED){ toast('Войдите как владелец','error'); return; }
  const el = document.getElementById('verifyTarget'); const t = (el ? el.value : '').trim();
  if(!t){ toast('Введите ID или ник','error'); return; }
  adminDataCall('verify_set', { target: t, value: !!on }).then(function(res){
    if(!res || !res.ok){
      toast(res && res.error==='no_account' ? 'Игрок не найден' : (res && res.error==='bad_admin' ? 'Неверный пароль владельца' : 'Не удалось выполнить'), 'error');
      return;
    }
    if(el) el.value = '';
    toast(on ? 'Галочка выдана' : 'Галочка снята', 'success');
    if(!on) verifyListShow();
  });
}
/* список проверенных: берётся с сервера, у каждого кнопка «Снять» */
function verifyListShow(){
  const box = document.getElementById('verifyList');
  if(!isOwner() || !ADMIN_CRED){ toast('Войдите как владелец','error'); return; }
  if(box) box.innerHTML = '<div class="muted" style="font-size:13px;">Загрузка…</div>';
  adminDataCall('verify_list', {}).then(function(res){
    if(!box) return;
    if(!res || !res.ok){ box.innerHTML = '<div class="muted" style="font-size:13px;">Не удалось загрузить список</div>'; return; }
    const items = res.items || [];
    if(!items.length){ box.innerHTML = '<div class="muted" style="font-size:13px;">Проверенных игроков нет</div>'; return; }
    box.innerHTML = '<div class="muted" style="font-size:12px;margin-bottom:8px;">Проверенных: ' + items.length + '</div>' +
      items.map(function(x){
        const until = x.until ? new Date(x.until).toLocaleDateString('ru-RU') : '—';
        return '<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<div style="min-width:0;"><div style="font-weight:600;font-size:14px;">' + esc(x.name) + '</div>' +
          '<div class="muted" style="font-size:12px;">' + esc(x.nick) + ' · до ' + until + '</div></div>' +
          '<button class="btn btn-ghost" style="flex:0 0 auto;padding:6px 12px;" onclick="verifyRemoveNick(\'' + esc(x.nick) + '\')">Снять</button></div>';
      }).join('');
  });
}
function verifyRemoveNick(nick){
  adminDataCall('verify_set', { target: nick, value: false }).then(function(res){
    if(!res || !res.ok){ toast('Не удалось снять галочку','error'); return; }
    toast('Галочка снята','success');
    verifyListShow();
  });
}
