/* ================= ПОДДЕРЖКА ================= */
const SUPPORT_EMAIL = 'support.droppay@gmail.com';
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
function supportUnreadMe(){ if(!state.authed) return 0; try{ const t = ensureSupport().threads[supportKeyMe()]; return t ? (t.unreadUser||0) : 0; }catch(e){ return 0; } }
function supportUnreadAdmin(){ try{ return Object.values(ensureSupport().threads).reduce((a,t)=>a+(t.unreadAdmin||0),0); }catch(e){ return 0; } }
const SUPPORT_AVATAR = 'data:image/jpeg;base64,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';
function supportChatRowHtml(){
  const t = supportThreadMe(false);
  const last = t && t.messages.length ? t.messages[t.messages.length-1] : null;
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
  const t = supportThreadMe(false);
  if(t && t.unreadUser){ t.unreadUser = 0; saveState(); }
  const msgs = t ? t.messages : [];
  const authed = !!state.authed;
  const news = Array.isArray(ensureSupport().news) ? ensureSupport().news : [];
  return `
  <div class="chat-page">
    ${topbar({back:true, title:`<span style="display:inline-flex;align-items:center;gap:9px;"><img src="${SUPPORT_AVATAR}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"><span>Поддержка</span></span>`, subtitle:'Ответим на ваши вопросы'})}
    <div id="msgScroll" class="chat-msgs">
      ${news.map(n=>`<div class="msg-row in"><div class="bubble">${esc(n.text||'')}</div></div>`).join('')}
      ${msgs.length===0 && news.length===0 ? `<div class="msg-row sys"><div class="bubble">${authed ? 'Опишите вопрос. Мы ответим в этом чате.' : 'Здесь будут новости, акции и публикации площадки. Писать в чат могут только игроки с аккаунтом.'}</div></div>` : ''}
      ${msgs.map(m=>msgWithTag(m.from==='user' ? whoUserHTML((t&&t.userId)||'') : whoAdminHTML(m.by||'owner'), `<div class="bubble">${esc(m.text)}</div>`, m.from==='user')).join('')}
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
function sendSupportMessage(text, input){
  if(!state.authed){ requireAuth('Чтобы написать в поддержку, войдите в аккаунт'); return; }
  const t = supportThreadMe(true);
  t.userName = state.me.name || t.userName; t.userId = supportUidMe() || t.userId;
  t.messages.push({from:'user', text:text.slice(0,2000), ts:Date.now()});
  t.updatedAt = Date.now(); t.unreadAdmin = (t.unreadAdmin||0) + 1;
  if(input) input.value = ''; window.__chatInputValue = '';
  saveState(); onRoute(); focusChatInput();
}
let adminSupportDraft = '';
function pageAdminSupport(parts){
  if(!canSupport()) return adminGuard('Чат поддержки');
  const sp = ensureSupport(), key = parts[0];
  if(!key){
    const list = Object.values(sp.threads).sort((a,b)=>b.updatedAt-a.updatedAt);
    return `${topbar({title:'Чат поддержки', back:true, solid:true})}
    <div class="page">
      ${list.length===0 ? `<div class="empty-state">${icon('support',36,'var(--text-faint)')}<div class="h2">Сообщений пока нет</div><div class="muted" style="font-size:13px;">Здесь появятся обращения игроков из чата «Поддержка»</div></div>` :
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${list.map(t=>{
        const last = t.messages[t.messages.length-1];
        const lastUser = [...t.messages].reverse().find(m=>m.from==='user') || last;
        const unread = t.unreadAdmin||0;
        return `<div class="card" style="padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:6px;" onclick="navigate('/admin/support/${encodeURIComponent(t.key)}')">
          <div class="row between" style="gap:6px;"><span style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.userName)}</span>${unread>0?`<span class="badge" style="background:var(--danger);color:#fff;">${unread}</span>`:''}</div>
          <div class="faint" style="font-size:10.5px;font-family:monospace;">ID: ${esc(t.userId||'—')}</div>
          <div class="muted" style="font-size:12px;line-height:1.4;max-height:50px;overflow:hidden;word-break:break-word;">${esc((lastUser?lastUser.text:'').slice(0,90))}</div>
          <div class="faint" style="font-size:10.5px;">${last?timeAgo(last.ts):''}${last&&last.from==='admin'?' · вы ответили':''}</div>
          <button class="btn btn-accent2 btn-sm btn-block" style="margin-top:2px;" onclick="event.stopPropagation(); navigate('/admin/support/${encodeURIComponent(t.key)}')">${icon('send',13)} Ответить</button>
        </div>`; }).join('')}</div>`}
    </div>`;
  }
  const t = sp.threads[key];
  if(!t) return page404();
  if(t.unreadAdmin){ t.unreadAdmin = 0; saveState(); }
  return `${topbar({title:esc(t.userName), subtitle:'ID: '+esc(t.userId||'—'), back:true, solid:true})}
  <div class="page">
    <div style="display:flex;flex-direction:column;margin-bottom:14px;">
      ${t.messages.map(m=>`<div class="msg-row ${m.from==='admin'?'out':'in'}" style="flex-direction:column;align-items:${m.from==='admin'?'flex-end':'flex-start'};">
        <div class="bubble">${esc(m.text)}</div>
        <div class="faint" style="font-size:10px;margin:2px 4px 6px;">${m.from==='admin'?whoAdminHTML(m.by||'owner'):whoUserHTML(t.userId||'')} · ${logTime(m.ts)}</div>
      </div>`).join('')}
      <div id="supportThreadEnd"></div>
    </div>
    <div class="card" style="padding:12px;">
      <textarea class="textarea" id="supportReplyInput" placeholder="Ответ игроку..." style="min-height:70px;margin-bottom:8px;" oninput="adminSupportDraft=this.value;">${esc(adminSupportDraft)}</textarea>
      <button class="btn btn-accent2 btn-block" onclick="adminSupportReply('${esc(t.key)}')">${icon('send',15)} Ответить</button>
    </div>
  </div>`;
}
function adminSupportReply(key){
  if(!canSupport()) return;
  const el = document.getElementById('supportReplyInput');
  const text = (el ? el.value : adminSupportDraft).trim();
  if(!text){ toast('Введите ответ','error'); return; }
  const t = ensureSupport().threads[key]; if(!t) return;
  t.messages.push({from:'admin', text:text.slice(0,2000), ts:Date.now(), by:(ADMIN.staffId||'owner'), role:ADMIN.role});
  t.updatedAt = Date.now(); t.unreadUser = (t.unreadUser||0) + 1;
  adminSupportDraft = '';
  logOp('Ответ в поддержке', key, 'messages', {supportKey:key, to:t.userId, toName:t.userName, title:'Чат поддержки', text:text.slice(0,500)});
  saveState(); toast('Ответ отправлен','success'); onRoute();
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
function approveListing(id){
  if(!can('listings')) return;
  const l = state.listings.find(x=>x.id===id);
  if(!l) return;
  l.moderation = 'approved';
  logOp('Публикация одобрена', id, 'listings', Object.assign(listingSnap(l), {result:'Одобрено'}));
  saveState();
  toast('Объявление одобрено и опубликовано','success');
  onRoute();
}
/* --- отказ в публикации: причина обязательна, продавцу приходит в чат «Поддержка» --- */
function supportKeyByName(n){ return 'u_' + (String(n||'me').toLowerCase().replace(/[^a-z0-9а-яё]+/gi,'_') || 'me'); }
function supportNotifySeller(l, text){
  const sp = ensureSupport();
  let key = l.sellerKey, name = l.sellerName, uid = l.sellerUid || '';
  if(!key){
    if(l.sellerId==='me'){ key = supportKeyMe(); name = state.me && state.me.name; uid = supportUidMe(); }
    else { const sl = (state.sellers||[]).find(x=>x.id===l.sellerId); name = sl ? sl.name : 'Игрок'; key = supportKeyByName(name); }
  }
  let t = sp.threads[key];
  if(!t) t = sp.threads[key] = {key, userName:name||'Игрок', userId:uid, messages:[], updatedAt:Date.now(), unreadAdmin:0, unreadUser:0};
  t.messages.push({from:'admin', text:text.slice(0,2000), ts:Date.now(), by:(ADMIN && ADMIN.staffId) || 'owner'});
  t.updatedAt = Date.now(); t.unreadUser = (t.unreadUser||0) + 1;
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
function rejectListing(){
  if(!can('listings')) return;
  const l = state.listings.find(x=>x.id===rejDraft.id);
  if(!l) return;
  const reason = rejDraft.reason.trim();
  if(reason.length<3){ toast('Укажите причину отказа','error'); return; }
  const clause = rejDraft.clause.trim().replace(/^п\.?\s*/i,'');
  l.moderation = 'rejected';
  l.rejectReason = reason; l.rejectClause = clause; l.rejectWarn = rejDraft.warn.trim();
  supportNotifySeller(l, rejectText(l));
  logOp('Публикация отклонена', l.id, 'listings', Object.assign(listingSnap(l), {result:'Отклонено', reason: (clause?'п. '+clause+': ':'')+reason}));
  saveState();
  closeModal();
  toast('Отказано. Продавец увидит причину в чате «Поддержка»');
  if(rejDraft.back) navigate('/admin/listings'); else onRoute();
}
function banById(){
  if(!can('ban')) return;
  let id = normId(adminBanIdValue);
  if(!id){ toast('Введите ID аккаунта','error'); return; }
  if(id==='me'){ toast('Нельзя забанить собственный аккаунт','error'); return; }
  { const _pl = findPlayerById(id, true); if(_pl) id = _pl.id; }
  { const au = accUsers().find(x=>String(x.uid||'').toLowerCase()===id.toLowerCase() || x.key===id.toLowerCase() || String(x.nickname||'').toLowerCase()===id.toLowerCase());
    if(au){
      const rs = (adminBanIdReason||'').trim();
      if(rs.length<3){ toast('Укажите причину бана','error'); return; }
      const adb = readAccDb(), a = adb[au.key]; a.status = 'banned';
      recordRestriction(a, 'banned', true, rs, 'по ID');
      writeAccDb(adb);
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
function banByIp(){
  if(!can('ban')) return;
  const ip = (adminBanIpValue||'').trim();
  if(!ip){ toast('Введите IP','error'); return; }
  const targets = allUsers().filter(u=>u.ip===ip && u.id!=='me');
  const accTargets = accUsers().filter(a=>a.ip===ip && a.status!=='banned');
  if(targets.length===0 && accTargets.length===0){ toast('Пользователей с таким IP не найдено','error'); return; }
  const reason = (adminBanIpReason||'').trim();
  if(reason.length<3){ toast('Укажите причину бана','error'); return; }
  if(accTargets.length){ const adb = readAccDb(); accTargets.forEach(x=>{ const a = adb[x.key]; if(a){ a.status='banned'; recordRestriction(a,'banned',true,reason,'по IP '+ip); } }); writeAccDb(adb); }
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
function applyUserStatus(userId, kind, reason){
  if(!can(kind==='frozen'?'freeze':'ban')){ toast('Недостаточно прав','error'); return; }
  if(userId === 'me'){ toast('Нельзя ограничить собственный аккаунт','error'); return; }
  const u = adminFindRow(userId);
  if(!u) return;
  if(u._acc){
    const adb = readAccDb(), a = adb[u._acc]; if(!a) return;
    const want = kind==='frozen' ? 'frozen' : 'banned';
    a.status = (a.status===want) ? 'active' : want;
    recordRestriction(a, kind, a.status===want, reason, 'из профиля/списка');
    writeAccDb(adb);
    logOp(kind==='frozen'?'Заморозка/разморозка':'Бан/разбан', userId+' → '+a.status, 'bans', {target:userId, name:a.nickname, ip:a.ip||'', result:({active:'Активен (снято ограничение)', frozen:'Заморожен', banned:'Забанен'})[a.status]||a.status, reason:reason});
    saveState(); toast(a.status==='active' ? 'Ограничение снято' : (a.status==='frozen' ? 'Пользователь заморожен' : 'Пользователь забанен'), a.status==='active' ? 'success' : 'error');
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
