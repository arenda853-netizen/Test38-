/* ================= ПОДДЕРЖКА ================= */
const SUPPORT_EMAIL = 'support.droppay@gmail.com';
const SUPPORT_URL = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/support';
window.__supUser = window.__supUser || { msgs: null, loaded: 0, busy: false };
window.__supAdmin = window.__supAdmin || { threads: null, msgs: {}, busy: false };
async function supportCall(body, url){
  try{ const r = await fetch(url || SUPPORT_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify(body) }); return await r.json(); }catch(e){ return null; }
}
function supportLoadMine(force){
  const u = window.__supUser; if(u.busy) return; if(!force && Date.now() - u.loaded < 10000) return;
  let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok) return;
  u.busy = true;
  supportCall({ action:'user_list', token: tok }).then(function(res){
    u.busy = false; u.loaded = Date.now();
    if(res && res.ok){
      const before = u.msgs ? u.msgs.length : -1;
      u.msgs = res.messages;
      if(before !== res.messages.length && currentHash().path.indexOf('/chat/support') === 0) onRoute();
    }
  });
}
function supportSeenId(){ try{ return +(localStorage.getItem('sup_seen') || 0); }catch(e){ return 0; } }
function supportMarkSeen(){
  const m = window.__supUser.msgs || []; if(!m.length) return;
  try{ localStorage.setItem('sup_seen', String(m[m.length-1].id)); }catch(e){}
}
function canSupport(){ return !!(ADMIN && ADMIN.role!=='logger'); }
function ensureSupport(){ if(!state.support) state.support = {threads:{}}; if(!state.support.threads) state.support.threads = {}; return state.support; }
/* ===== СТАТУС АККАУНТА: бан / заморозка ===== */
function accRecMe(){ try{ if(!state||!state.authed||!state.me) return null; return readAccDb()[String(state.me.name||'').toLowerCase()]||null; }catch(e){ return null; } }
function myAccStatus(){ try{ if(ADMIN||(state&&state.impersonation)) return 'active'; const a=accRecMe(); return (a&&a.status)||'active'; }catch(e){ return 'active'; } }
function isFrozenMe(){ return myAccStatus()==='frozen'; }
function frozenGuard(what){ if(isFrozenMe()){ toast('Аккаунт заморожен: '+(what||'действие недоступно'),'error'); return true; } return false; }
function accBanReason(a){ try{ const r=(a.restrictions||[]).slice().reverse().find(x=>x.on&&x.kind==='banned'); return r?r.reason:''; }catch(e){ return ''; } }
function enforceAccStatus(){
  try{
    const adm = !!(ADMIN||(state&&state.impersonation));
    let blk = null; try{ blk = JSON.parse(localStorage.getItem('dp_site_block')||'null'); }catch(e){}
    const db = readAccDb();
    if(!adm && state && state.authed && state.me){
      const k = String(state.me.name||'').toLowerCase(), a = db[k];
      if(a && a.status==='banned'){
        blk = {nick:k};
        try{ localStorage.setItem('dp_site_block', JSON.stringify(blk)); }catch(e){}
        state.authed = false; try{ dealsClear(); }catch(e){} try{ saveState(); }catch(e){}
      }
    }
    let blocked = false;
    if(blk && !adm){
      const a = db[blk.nick];
      if(a && a.status==='banned'){ blocked = true; showSiteBlock(a); }
      else { try{ localStorage.removeItem('dp_site_block'); }catch(e){} }
    }
    if(!blocked) hideSiteBlock();
    const fz = !blocked && !adm && state && state.authed && myAccStatus()==='frozen';
    let fb = document.getElementById('frozenBanner');
    if(fz && !fb){ fb = document.createElement('div'); fb.id='frozenBanner'; fb.style.cssText='position:fixed;left:8px;right:8px;bottom:76px;z-index:9000;background:#3a2a00;color:#ffcf66;border:1px solid #ffb020;border-radius:12px;padding:9px 12px;font-size:12px;line-height:1.4;text-align:center;pointer-events:none;'; fb.textContent='Аккаунт заморожен: вывод, пополнение, покупки и сообщения недоступны'; document.body.appendChild(fb); }
    else if(!fz && fb){ fb.remove(); }
  }catch(e){}
}
function showSiteBlock(a){
  let el = document.getElementById('siteBlock');
  const reason = accBanReason(a||{});
  const html = '<div style="max-width:340px;"><div style="font-size:46px;margin-bottom:10px;">⛔</div><div style="font-size:20px;font-weight:800;margin-bottom:8px;">Аккаунт заблокирован</div><div style="font-size:13.5px;line-height:1.5;opacity:.8;">Доступ к сайту закрыт администрацией.'+(reason?'<br><br>Причина: '+esc(reason):'')+'</div></div>';
  if(!el){ el = document.createElement('div'); el.id='siteBlock'; el.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0b0b10;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;'; document.body.appendChild(el); }
  if(el.__h !== html){ el.innerHTML = html; el.__h = html; }
  document.documentElement.style.overflow='hidden';
}
function hideSiteBlock(){ const el = document.getElementById('siteBlock'); if(el){ el.remove(); document.documentElement.style.overflow=''; } }
setInterval(function(){ try{ enforceAccStatus(); }catch(e){} }, 1200);
document.addEventListener('DOMContentLoaded', function(){ try{ enforceAccStatus(); }catch(e){} });
function supportKeyMe(){
  const n = ((state.me && state.me.name) || 'me').toLowerCase().replace(/[^a-z0-9а-яё]+/gi,'_') || 'me';
  return 'u_' + n;
}
function supportUidMe(){
  try{ const a = readAccDb()[((state.me&&state.me.name)||'').toLowerCase()]; if(a && a.uid) return a.uid; }catch(e){}
  return '';
}
function supportThreadMe(create){
  if(!state.authed) return null;
  const sp = ensureSupport(), k = supportKeyMe();
  if(!sp.threads[k] && create) sp.threads[k] = {key:k, userName:state.me.name||'Игрок', userId:supportUidMe(), messages:[], updatedAt:Date.now(), unreadAdmin:0, unreadUser:0};
  return sp.threads[k] || null;
}
function supportUnreadMe(){ if(!state.authed) return 0; try{ const seen = supportSeenId(); return (window.__supUser.msgs||[]).filter(function(x){ return x.from==='admin' && x.id>seen; }).length; }catch(e){ return 0; } }
function supportUnreadAdmin(){ try{ return (window.__supAdmin.threads||[]).reduce(function(a,t){ return a + (t.unread||0); }, 0); }catch(e){ return 0; } }
const SUPPORT_AVATAR = 'data:image/jpeg;base64,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';
function supportChatRowHtml(){
  supportLoadMine(false);
  const mm = window.__supUser.msgs || [];
  const last = mm.length ? mm[mm.length-1] : null;
  return `<div class="listing" style="margin-bottom:8px;" onclick="navigate('/chat/support')">
    <div class="avatar" style="width:52px;height:52px;background:#000;overflow:hidden;"><img src="${SUPPORT_AVATAR}" style="width:100%;height:100%;object-fit:cover;"></div>
    <div style="flex:1;min-width:0;">
      <div class="row between"><span class="h3" style="font-size:14px;">Поддержка</span><span class="faint" style="font-size:11px;">${last?timeAgo(last.ts):''}</span></div>
      <div class="muted" style="font-size:12.5px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${last ? (last.from==='user'?'Вы: ':'')+esc(last.text) : 'Напишите нам, если нужна помощь'}</div>
    </div>
    ${supportUnreadMe()>0?`<div style="width:9px;height:9px;border-radius:50%;background:var(--danger);align-self:flex-start;margin-top:6px;"></div>`:''}
  </div>`;
}
function pageSupportChat(){
  supportLoadMine(false);
  const msgs = window.__supUser.msgs || [];
  supportMarkSeen();
  const authed = !!state.authed;
  const news = Array.isArray(ensureSupport().news) ? ensureSupport().news : [];
  return `
  <div class="chat-page">
    ${topbar({back:true, title:`<span style="display:inline-flex;align-items:center;gap:9px;"><img src="${SUPPORT_AVATAR}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"><span>Поддержка</span></span>`, subtitle:'Ответим на ваши вопросы'})}
    <div id="msgScroll" class="chat-msgs">
      ${news.map(n=>`<div class="msg-row in"><div class="bubble">${esc(n.text||'')}</div></div>`).join('')}
      ${msgs.length===0 && news.length===0 ? `<div class="msg-row sys"><div class="bubble">${authed ? 'Опишите вопрос. Мы ответим в этом чате.' : 'Здесь будут новости, акции и публикации площадки. Писать в чат могут только игроки с аккаунтом.'}</div></div>` : ''}
      ${msgs.map(m=>msgWithTag(m.from==='user' ? whoUserHTML(supportUidMe()) : whoAdminHTML(m.by||'owner'), `<div class="bubble">${esc(m.text)}</div>`, m.from==='user')).join('')}
    </div>
  </div>
  <div class="chat-bottom-stack">
    ${authed ? `<div class="chat-input-bar">
      <input class="input" id="chatInputField" placeholder="Сообщение в поддержку..." style="flex:1;" value="${esc(window.__chatInputValue||'').replace(/"/g,'&quot;')}">
      <div class="icon-btn accent" onclick="sendMessage('support')">${icon('send',17,'#fff')}</div>
    </div>` : `<div style="padding:12px 14px;">
      <button class="btn btn-primary btn-block" onclick="requireAuth('Чтобы написать в поддержку, войдите в аккаунт')">${icon('lock',15,'#fff')} Войдите, чтобы написать</button>
    </div>`}
  </div>`;
}
async function sendSupportMessage(text, input){
  if(!state.authed){ requireAuth('Чтобы написать в поддержку, войдите в аккаунт'); return; }
  let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  const res = await supportCall({ action:'user_send', token: tok, text: String(text||'').slice(0,2000) });
  if(input) input.value = ''; window.__chatInputValue = '';
  if(!res || !res.ok){ toast(res && res.error === 'too_fast' ? 'Слишком часто, подождите минуту' : 'Не удалось отправить, попробуйте ещё раз','error'); return; }
  window.__supUser.msgs = res.messages; window.__supUser.loaded = Date.now();
  supportMarkSeen(); onRoute(); focusChatInput();
}
let adminSupportDraft = '';
function supportAdminLoadThreads(force){
  const A = window.__supAdmin; if(A.busy) return; if(A.threads && !force) return;
  A.busy = true;
  adminCall('admin_threads', {}, SUPPORT_URL).then(function(res){
    A.busy = false;
    A.threads = res && res.ok ? res.threads : (A.threads || []);
    onRoute();
  });
}
function supportAdminLoadThread(key){
  const A = window.__supAdmin; if(A.busy) return; A.busy = true;
  adminCall('admin_list', { thread: key }, SUPPORT_URL).then(function(res){
    A.busy = false;
    if(res && res.ok){ A.msgs[key] = res.messages; onRoute(); }
  });
}
function pageAdminSupport(parts){
  if(!canSupport()) return adminGuard('Чат поддержки');
  const A = window.__supAdmin, key = parts[0];
  if(!key){
    if(A.threads === null) supportAdminLoadThreads(false);
    const list = (A.threads || []).slice();
    return `${topbar({title:'Чат поддержки', back:true, solid:true})}
    <div class="page">
      <div class="row between" style="margin-bottom:12px;"><span class="faint" style="font-size:12px;">Переписки видны только владельцу</span><button class="btn btn-ghost btn-sm" onclick="supportAdminLoadThreads(true)">Обновить</button></div>
      ${list.length===0 ? `<div class="empty-state">${icon('support',36,'var(--text-faint)')}<div class="h2">Сообщений пока нет</div><div class="muted" style="font-size:13px;">Здесь появятся обращения игроков из чата «Поддержка»</div></div>` :
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${list.map(t=>{
        const last = t.last;
        return `<div class="card" style="padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:6px;" onclick="navigate('/admin/support/${encodeURIComponent(t.key)}')">
          <div class="row between" style="gap:6px;"><span style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.userName||'Игрок')}</span></div>
          <div class="faint" style="font-size:10.5px;font-family:monospace;">ID: ${esc(t.userId||'—')}</div>
          <div class="muted" style="font-size:12px;line-height:1.4;max-height:50px;overflow:hidden;word-break:break-word;">${esc(((last&&last.from==='user')?last.text:'').slice(0,90))}</div>
          <div class="faint" style="font-size:10.5px;">${last?timeAgo(last.ts):''}${last&&last.from==='admin'?' · вы ответили':''}</div>
        </div>`; }).join('')}</div>`}
    </div>`;
  }
  if(!A.msgs[key]){ supportAdminLoadThread(key); }
  const msgs = A.msgs[key] || [];
  const th = (A.threads||[]).find(x=>x.key===key) || { userName:'Игрок', userId:'' };
  return `${topbar({title:esc(th.userName||'Игрок'), subtitle:'ID: '+esc(th.userId||'—'), back:true, solid:true})}
  <div class="page">
    <div style="display:flex;flex-direction:column;margin-bottom:14px;">
      ${msgs.map(m=>`<div class="msg-row ${m.from==='admin'?'out':'in'}" style="flex-direction:column;align-items:${m.from==='admin'?'flex-end':'flex-start'};">
        <div class="bubble">${esc(m.text)}</div>
        <div class="faint" style="font-size:10px;margin:2px 4px 6px;">${m.from==='admin'?whoAdminHTML(m.by||'owner'):whoUserHTML(th.userId||'')} · ${logTime(m.ts)}</div>
      </div>`).join('')}
      <div id="supportThreadEnd"></div>
    </div>
    <div class="card" style="padding:12px;">
      <textarea class="textarea" id="supportReplyInput" placeholder="Ответ игроку..." style="min-height:70px;margin-bottom:8px;" oninput="adminSupportDraft=this.value;">${esc(adminSupportDraft)}</textarea>
      <button class="btn btn-accent2 btn-block" onclick="adminSupportReply('${esc(key)}')">${icon('send',15)} Ответить</button>
    </div>
  </div>`;
}
function adminSupportReply(key){
  if(!canSupport()) return;
  const el = document.getElementById('supportReplyInput');
  const text = (el ? el.value : adminSupportDraft).trim();
  if(!text){ toast('Введите ответ','error'); return; }
  adminCall('admin_send', { thread: key, text: text.slice(0,2000) }, SUPPORT_URL).then(function(res){
    if(!res) return;
    adminSupportDraft = '';
    logOp('Ответ в поддержке', key, 'messages', {supportKey:key, title:'Чат поддержки', text:text.slice(0,500)});
    saveState(); toast('Ответ отправлен','success');
    supportAdminLoadThread(key);
  });
}
/* --- письмо на почту поддержки (без сервера) --- */
function supportSheet(){
  const nm = (state.me && state.me.name && state.me.name!=='Вы') ? state.me.name : '';
  return `<div class="h2" style="margin-bottom:12px;">Поддержка</div>
  <input class="input" id="supId" placeholder="Ваш ID" value="${esc(supportUidMe())}" style="margin-bottom:8px;">
  <input class="input" id="supName" placeholder="Ваше имя" value="${esc(nm)}" style="margin-bottom:8px;">
  <textarea class="textarea" id="supText" placeholder="Опишите проблему" style="margin-bottom:8px;min-height:90px;"></textarea>
  <div class="faint" style="font-size:11px;margin-bottom:12px;line-height:1.5;">Сообщение будет отправлено на ${SUPPORT_EMAIL}</div>
  <button class="btn btn-accent2 btn-block" id="supSendBtn" onclick="sendSupportEmail()">${icon('send',16)} Отправить</button>`;
}
async function sendSupportEmail(){
  const g = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  const uid = g('supId'), name = g('supName'), msg = g('supText');
  if(!uid || !name || msg.length<5){ toast('Заполните ID, имя и описание','error'); return; }
  let last = 0; try{ last = +localStorage.getItem('obmenka_support_last') || 0; }catch(e){}
  if(Date.now()-last < 30000){ toast('Подождите немного перед повторной отправкой','error'); return; }
  const btn = document.getElementById('supSendBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Отправляем...'; }
  const subject = 'Обращение в поддержку';
  try{
    const res = await fetch('https://formsubmit.co/ajax/'+SUPPORT_EMAIL, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({'ID':uid, 'Имя':name, 'Описание':msg, _subject:subject, _template:'table', _captcha:'false'})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || String(data.success)==='false') throw new Error('send failed');
    try{ localStorage.setItem('obmenka_support_last', String(Date.now())); }catch(e){}
    closeModal(); toast('Обращение отправлено на почту поддержки','success');
  }catch(e){
    const body = 'ID: '+uid+'\nИмя: '+name+'\n\n'+msg;
    closeModal();
    toast('Откроется почтовое приложение, нажмите «Отправить»');
    location.href = 'mailto:'+SUPPORT_EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }
}

function pageAdminPlayers(){
  if(!can('players')) return adminGuard('Список игроков');
  return `${topbar({title:'Список игроков', back:true, solid:true})}
  <div class="page">
    <div class="search-bar" style="margin-bottom:16px;">
      ${icon('search',18,'var(--text-faint)')}
      <input class="input" placeholder="Поиск по ID, IP или имени..." value="${adminQuery}" oninput="adminQuery=this.value; renderAdminList();">
    </div>
    <div id="admin-list" style="display:flex;flex-direction:column;gap:10px;"></div>
  </div>`;
}
async function approveListing(id){
  if(!can('listings')) return;
  const l = state.listings.find(x=>x.id===id);
  if(!l) return;
  const srv = await adminCall('listing_moderate', { listing: id, decision: 'approved' });
  if(!srv) return;
  l.moderation = 'approved';
  logOp('Публикация одобрена', id, 'listings', Object.assign(listingSnap(l), {result:'Одобрено'}));
  saveState();
  toast('Объявление одобрено и опубликовано','success');
  onRoute();
}
/* --- отказ в публикации: причина обязательна, продавцу приходит в чат «Поддержка» --- */
function supportKeyByName(n){ return 'u_' + (String(n||'me').toLowerCase().replace(/[^a-z0-9а-яё]+/gi,'_') || 'me'); }
function supportNotifySeller(l){
  /* текст собирает сервер по уже сохранённому решению модерации */
  adminCall('listing_notice', { listing: l.id }, SUPPORT_URL);
}
let rejDraft = {id:'', clause:'', reason:'', warn:'', back:false};
function rejectText(l){
  const c = rejDraft.clause.trim().replace(/^п\.?\s*/i,'');
  let t = 'Ваш товар «'+(l ? l.title : '')+'» не прошёл модерацию и не опубликован.\n\n';
  if(c) t += 'Нарушен п. '+c+' оферты.\n';
  t += 'Причина: '+rejDraft.reason.trim();
  if(rejDraft.warn.trim()) t += '\n\nПредупреждение: '+rejDraft.warn.trim();
  return t;
}
function openRejectSheet(id, back){
  if(!can('listings')) return;
  rejDraft = {id, clause:'', reason:'', warn:'', back:!!back};
  openModal(rejectSheet());
}
function rejectSheet(){
  return `<div class="h2" style="margin-bottom:6px;">Отказ в публикации</div>
  <div class="faint" style="font-size:12px;line-height:1.5;margin-bottom:12px;">Продавец получит это сообщение в чате «Поддержка». Причина обязательна.</div>
  <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Пункт оферты <span style="font-weight:500;">(необязательно — оферты пока нет)</span></div>
  <input class="input" id="rejClause" maxlength="60" placeholder="Например: 2.38 или 2.38, 4.1" style="margin-bottom:10px;" oninput="rejInput('clause',this.value)">
  <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Причина — что нарушил товар</div>
  <textarea class="textarea" id="rejReason" placeholder="Например: в описании указаны контакты для сделки вне площадки" style="margin-bottom:10px;" oninput="rejInput('reason',this.value)"></textarea>
  <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Предупреждение <span style="font-weight:500;">(необязательно)</span></div>
  <input class="input" id="rejWarn" maxlength="140" placeholder="Например: при повторном нарушении аккаунт будет заблокирован" style="margin-bottom:12px;" oninput="rejInput('warn',this.value)">
  <div class="faint" style="font-size:11px;margin-bottom:4px;">Так увидит продавец:</div>
  <div class="card" id="rejPreview" style="padding:10px 12px;font-size:12px;line-height:1.5;white-space:pre-wrap;max-height:150px;overflow:auto;margin-bottom:12px;"></div>
  <div class="row gap8">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn btn-danger" id="rejBtn" style="flex:1;opacity:.45;pointer-events:none;" onclick="rejectListing()">Отказать</button>
  </div>`;
}
function rejInput(prop, val){
  rejDraft[prop] = val;
  const l = state.listings.find(x=>x.id===rejDraft.id);
  const pv = document.getElementById('rejPreview'); if(pv) pv.textContent = rejDraft.reason.trim().length>=3 ? rejectText(l) : 'Напишите причину — здесь появится сообщение продавцу.';
  const b = document.getElementById('rejBtn');
  if(b){ const ok = rejDraft.reason.trim().length>=3; b.style.opacity = ok ? '1' : '.45'; b.style.pointerEvents = ok ? 'auto' : 'none'; }
}
async function rejectListing(){
  if(!can('listings')) return;
  const l = state.listings.find(x=>x.id===rejDraft.id);
  if(!l) return;
  const reason = rejDraft.reason.trim();
  if(reason.length<3){ toast('Укажите причину отказа','error'); return; }
  const clause = rejDraft.clause.trim().replace(/^п\.?\s*/i,'');
  const srv = await adminCall('listing_moderate', { listing: l.id, decision: 'rejected', reason: reason, clause: clause, warn: rejDraft.warn.trim() });
  if(!srv) return;
  l.moderation = 'rejected';
  l.rejectReason = reason; l.rejectClause = clause; l.rejectWarn = rejDraft.warn.trim();
  supportNotifySeller(l, rejectText(l));
  logOp('Публикация отклонена', l.id, 'listings', Object.assign(listingSnap(l), {result:'Отклонено', reason: (clause?'п. '+clause+': ':'')+reason}));
  saveState();
  closeModal();
  toast('Отказано. Продавец увидит причину в чате «Поддержка»');
  if(rejDraft.back) navigate('/admin/listings'); else onRoute();
}
async function banById(){
  if(!can('ban')) return;
  let id = normId(adminBanIdValue);
  if(!id){ toast('Введите ID аккаунта','error'); return; }
  if(id==='me'){ toast('Нельзя забанить собственный аккаунт','error'); return; }
  { const _pl = findPlayerById(id, true); if(_pl) id = _pl.id; }
  { const au = accUsers().find(x=>String(x.uid||'').toLowerCase()===id.toLowerCase() || x.key===id.toLowerCase() || String(x.nickname||'').toLowerCase()===id.toLowerCase());
    if(au){
      const rs = (adminBanIdReason||'').trim();
      if(rs.length<3){ toast('Укажите причину бана','error'); return; }
      const a = readAccDb()[au.key] || {};
      const res = await adminDataCall('acc_status', { kind:'banned', keys:[au.key], on:true, reason:rs, how:'по ID' });
      if(!res || !res.ok){ toast('Не удалось забанить: '+((res&&res.error)||'нет связи'),'error'); return; }
      applyServerStatus(res);
      logOp('Бан по ID', id, 'bans', {target:id, name:a.nickname, ip:a.ip||'', result:'Забанен по ID', reason:rs});
      adminBanIdValue=''; adminBanIdReason=''; saveState();
      toast('Аккаунт '+id+' забанен','success'); onRoute(); enforceAccStatus(); return;
    } }
  const u = allUsers().find(x=>String(x.id).toLowerCase()===id.toLowerCase());
  if(!u){ toast('Аккаунт с таким ID не найден','error'); return; }
  const reason = (adminBanIdReason||'').trim();
  if(reason.length<3){ toast('Укажите причину бана','error'); return; }
  u.status = 'banned';
  recordRestriction(u, 'banned', true, reason, 'по ID');
  state.deals.forEach(d=>{
    if(d.counterparty && d.counterparty.id===id && (d.status==='active'||d.status==='paid')){
      d.status='frozen'; d.updatedAt=Date.now();
      d.messages.push({from:'sys', text:'Сделка заморожена автоматически: администрация заблокировала аккаунт продавца.', ts:Date.now()});
    }
  });
  adminBanIdValue=''; adminBanIdReason='';
  logOp('Бан по ID', id, 'bans', {target:id, name:u.name, ip:u.ip||'', result:'Забанен по ID', reason:reason});
  saveState();
  toast('Аккаунт '+id+' забанен','success');
  onRoute();
}
async function banByIp(){
  if(!can('ban')) return;
  const ip = (adminBanIpValue||'').trim();
  if(!ip){ toast('Введите IP','error'); return; }
  const targets = allUsers().filter(u=>u.ip===ip && u.id!=='me');
  const accTargets = accUsers().filter(a=>a.ip===ip && a.status!=='banned');
  if(targets.length===0 && accTargets.length===0){ toast('Пользователей с таким IP не найдено','error'); return; }
  const reason = (adminBanIpReason||'').trim();
  if(reason.length<3){ toast('Укажите причину бана','error'); return; }
  if(accTargets.length){
    const res = await adminDataCall('acc_status', { kind:'banned', keys: accTargets.map(x=>x.key), on:true, reason:reason, how:'по IP '+ip });
    if(res && res.ok) applyServerStatus(res); else toast('Аккаунты не забанены: '+((res&&res.error)||'нет связи'),'error');
  }
  targets.forEach(u=>{
    u.status='banned';
    recordRestriction(u, 'banned', true, reason, 'по IP '+ip);
    state.deals.forEach(d=>{
      if(d.counterparty && d.counterparty.id===u.id && (d.status==='active'||d.status==='paid')){
        d.status='frozen'; d.updatedAt=Date.now();
        d.messages.push({from:'sys', text:'Сделка заморожена автоматически: администрация заблокировала сеть продавца.', ts:Date.now()});
      }
    });
  });
  adminBanIpValue=''; adminBanIpReason='';
  logOp('Бан по IP', ip, 'bans', {target:ip, name:targets.map(t=>t.id).join(', '), ip:ip, result:'Забанена сеть, аккаунтов: '+targets.length, reason:reason});
  saveState();
  toast('Заблокирована сеть: '+(targets.length+accTargets.length)+' аккаунт(ов)','success');
  onRoute(); enforceAccStatus();
}
/* все игроки: демо-продавцы/я + реальные аккаунты с сервера (acc:*) */
function accAsUser(a){ return {id:String(a.uid||a.key), name:a.nickname||a.key, ip:a.ip||'', status:a.status||'active', restrictions:a.restrictions||[], color:a.color, _acc:a.key}; }
function adminAllRows(){
  const base = allUsers(); const seen = {}; base.forEach(u=>{ seen[String(u.id).toLowerCase()] = 1; });
  const extra = []; try{ accUsers().forEach(a=>{ const u = accAsUser(a); if(!seen[u.id.toLowerCase()]) extra.push(u); }); }catch(e){}
  return base.concat(extra);
}
function adminFindRow(id){ return adminAllRows().find(x=>String(x.id)===String(id)); }
function renderAdminList(){
  /* подтянуть всех игроков с сервера (не чаще раза в 15 с) */
  try{ if(window.__SYNC && window.__SYNC.loadAccounts && Date.now()-(window.__accLoadTs||0)>15000){ window.__accLoadTs=Date.now(); window.__SYNC.loadAccounts().then(function(n){ if(n>0 && document.getElementById('admin-list')) renderAdminListBody(); }); } }catch(e){}
  renderAdminListBody();
}
function renderAdminListBody(){
  const listEl = document.getElementById('admin-list');
  if(!listEl) return;
  const q = adminQuery.trim().toLowerCase();
  let users = adminAllRows();
  if(q){
    users = users.filter(u =>
      String(u.id).toLowerCase().includes(q) ||
      (u.ip||'').toLowerCase().includes(q) ||
      String(u.name).toLowerCase().includes(q)
    );
  }
  if(users.length===0){
    listEl.innerHTML = `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">Никого не нашли</div><div class="muted" style="font-size:13px;">Проверьте ID или IP и попробуйте снова</div></div>`;
    return;
  }
  listEl.innerHTML = users.map(adminUserRowHtml).join('');
}
function adminUserRowHtml(u){
  const statusMap = {
    active:{label:'Активен', color:'var(--accent-2)'},
    frozen:{label:'Заморожен', color:'var(--warning)'},
    banned:{label:'Забанен', color:'var(--danger)'}
  };
  const st = statusMap[u.status] || statusMap.active;
  const isSelf = u.id === 'me';
  return `<div class="card" style="padding:12px;">
    <div class="row gap12" style="margin-bottom:10px;">
      <div class="avatar" style="width:44px;height:44px;background:${u.color||'#6C5CE7'};font-size:15px;">${initials(u.name)}</div>
      <div style="flex:1;min-width:0;">
        <div class="row between">
          <span class="h3" style="font-size:13.5px;">${u.name}${isSelf?' <span class="faint">(вы)</span>':''}</span>
          <span class="badge" style="background:${st.color}22;color:${st.color};">${st.label}</span>
        </div>
        <div class="faint" style="font-size:11px;margin-top:3px;font-family:monospace;">ID: ${u.id} · IP: ${u.ip||'—'}</div>
      </div>
    </div>
    ${isSelf ? `<div class="faint" style="font-size:11.5px;">Нельзя ограничить собственный аккаунт</div>` : `
    <div class="row gap8">
      ${can('freeze') ? `<button class="btn btn-sm ${u.status==='frozen'?'btn-accent2':'btn-ghost'}" style="flex:1;" onclick="toggleUserStatus('${u.id}','frozen')">
        ${icon('lock',13)} ${u.status==='frozen' ? 'Разморозить' : 'Заморозить'}
      </button>` : ''}
      ${can('ban') ? `<button class="btn btn-sm ${u.status==='banned'?'btn-ghost':'btn-danger'}" style="flex:1;" onclick="toggleUserStatus('${u.id}','banned')">
        ${icon('close',13)} ${u.status==='banned' ? 'Разбанить' : 'Забанить'}
      </button>` : ''}
    </div>`}
  </div>`;
}
function recordRestriction(u, kind, on, reason, how){
  if(!Array.isArray(u.restrictions)) u.restrictions = [];
  u.restrictions.push({ts:Date.now(), kind:kind, on:!!on, reason:reason||'', by:(ADMIN?(ADMIN.staffId||'owner'):''), role:(ADMIN?ADMIN.role:''), how:how||''});
  if(u.restrictions.length>50) u.restrictions.splice(0, u.restrictions.length-50);
}
function toggleUserStatus(userId, kind){
  if(!can(kind==='frozen'?'freeze':'ban')){ toast('Недостаточно прав','error'); return; }
  if(userId === 'me'){ toast('Нельзя ограничить собственный аккаунт','error'); return; }
  const u = adminFindRow(userId);
  if(!u) return;
  openModal(statusReasonSheet(userId, kind));
}
function statusReasonSheet(userId, kind){
  const u = adminFindRow(userId) || {};
  const lifting = (kind==='frozen' && u.status==='frozen') || (kind==='banned' && u.status==='banned');
  const title = kind==='frozen' ? (lifting?'Разморозить аккаунт?':'Заморозить аккаунт?') : (lifting?'Разбанить аккаунт?':'Забанить аккаунт?');
  return `<div class="h2" style="margin-bottom:6px;">${title}</div>
  <div class="faint" style="font-size:12px;margin-bottom:10px;font-family:monospace;">ID: ${esc(userId)}</div>
  <textarea class="textarea" id="statusReasonInput" placeholder="Причина (обязательно)" style="margin-bottom:12px;min-height:80px;"></textarea>
  <div class="row gap8">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn ${lifting?'btn-accent2':'btn-danger'}" style="flex:1;" onclick="confirmUserStatus('${esc(userId)}','${kind}')">Подтвердить</button>
  </div>`;
}
function confirmUserStatus(userId, kind){
  const el = document.getElementById('statusReasonInput');
  const reason = el ? el.value.trim() : '';
  if(reason.length<3){ toast('Укажите причину','error'); return; }
  closeModal();
  applyUserStatus(userId, kind, reason);
}
async function applyUserStatus(userId, kind, reason){
  if(!can(kind==='frozen'?'freeze':'ban')){ toast('Недостаточно прав','error'); return; }
  if(userId === 'me'){ toast('Нельзя ограничить собственный аккаунт','error'); return; }
  const u = adminFindRow(userId);
  if(!u) return;
  if(u._acc){
    const a = readAccDb()[u._acc]; if(!a) return;
    const res = await adminDataCall('acc_status', { kind: kind==='frozen'?'frozen':'banned', keys:[u._acc], reason: reason, how:'из профиля/списка' });
    if(!res || !res.ok){ toast('Не удалось: '+((res&&res.error)||'нет связи'),'error'); return; }
    applyServerStatus(res);
    const st = (res.results[u._acc] && res.results[u._acc].status) || a.status;
    logOp(kind==='frozen'?'Заморозка/разморозка':'Бан/разбан', userId+' → '+st, 'bans', {target:userId, name:a.nickname, ip:a.ip||'', result:({active:'Активен (снято ограничение)', frozen:'Заморожен', banned:'Забанен'})[st]||st, reason:reason});
    saveState(); toast(st==='active' ? 'Ограничение снято' : (st==='frozen' ? 'Пользователь заморожен' : 'Пользователь забанен'), st==='active' ? 'success' : 'error');
    try{ enforceAccStatus(); }catch(e){}
    if(document.getElementById('admin-list')) renderAdminList(); else onRoute();
    return;
  }
  if(kind==='frozen'){
    u.status = (u.status==='frozen') ? 'active' : 'frozen';
    toast(u.status==='frozen' ? 'Пользователь заморожен' : 'Пользователь разморожен', u.status==='frozen' ? 'error' : 'success');
  }
  if(kind==='banned'){
    u.status = (u.status==='banned') ? 'active' : 'banned';
    toast(u.status==='banned' ? 'Пользователь забанен' : 'Пользователь разбанен', u.status==='banned' ? 'error' : 'success');
  }
  if(u.status==='banned' || u.status==='frozen'){
    state.deals.forEach(d=>{
      if(d.counterparty.id===userId && (d.status==='active' || d.status==='paid')){
        d.status = 'frozen';
        d.updatedAt = Date.now();
        d.messages.push({from:'sys', text:'Сделка заморожена автоматически: администрация ограничила аккаунт продавца.', ts:Date.now()});
      }
    });
  }
  recordRestriction(u, kind, u.status===(kind==='frozen'?'frozen':'banned'), reason, 'из профиля/списка');
  logOp(kind==='frozen'?'Заморозка/разморозка':'Бан/разбан', userId+' → '+u.status, 'bans', {target:userId, name:u.name, ip:u.ip||'', result:({active:'Активен (снято ограничение)', frozen:'Заморожен', banned:'Забанен'})[u.status]||u.status, reason:reason});
  saveState();
  if(document.getElementById('admin-list')) renderAdminList(); else onRoute();
}
