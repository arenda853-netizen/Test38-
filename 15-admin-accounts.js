/* --- данные аккаунтов (только главный админ) --- */
function deviceLabel(){
  const u = navigator.userAgent || '';
  let os = 'Неизвестно';
  if(/iPhone/.test(u)) os='iPhone'; else if(/iPad/.test(u)) os='iPad'; else if(/Android/.test(u)) os='Android';
  else if(/Windows/.test(u)) os='Windows'; else if(/Mac OS X|Macintosh/.test(u)) os='macOS'; else if(/Linux/.test(u)) os='Linux';
  let br = 'браузер';
  if(/Edg\//.test(u)) br='Edge'; else if(/OPR\/|Opera/.test(u)) br='Opera'; else if(/YaBrowser/.test(u)) br='Яндекс'; else if(/CriOS|Chrome/.test(u)) br='Chrome'; else if(/FxiOS|Firefox/.test(u)) br='Firefox'; else if(/Safari/.test(u)) br='Safari';
  const m = u.match(/;\s*([^;)]+?)\s+Build/);
  return os + (m ? ' ('+m[1]+')' : '') + ' · ' + br;
}
function newAccUid(){ 
  return 'DP' + Math.floor(100000000 + Math.random() * 900000000); 
}
function userPwHash(pw, salt){ return sha256('dp1|'+salt+'|'+pw); }
function newPwSalt(){ return accGenPw(12); }
function setAccPassword(rec, pw){ rec.salt = newPwSalt(); rec.passHash = userPwHash(pw, rec.salt); delete rec.password; }
let __accCache = {};
function readAccDb(){
  // Данные аккаунтов держим только в памяти вкладки, они подтягиваются из Supabase.
  return __accCache;
}
try{ readAccDb(); }catch(e){}
function writeAccDb(db){
  __accCache = db;
  if (typeof schedule === 'function') schedule();
}
function accUsers(){
  const db = readAccDb(); 
  let changed = false;
  Object.keys(db).forEach(k=>{ 
    if(!db[k].uid){ 
      db[k].uid = 'DP' + Math.floor(100000000 + Math.random() * 900000000); 
      changed = true; 
    } 
  });
  if(changed) writeAccDb(db);
  return Object.keys(db).map(k=>Object.assign({key:k}, db[k])).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}
function accAdmins(){
  ensureStaff();
  const list = [{id:'owner', role:'owner', last:state.ownerLast||null, ts:0}];
  Object.keys(state.staff).forEach(id=>list.push({id:id, role:state.staff[id].role, last:state.staff[id].last||null, ts:state.staff[id].ts}));
  return list;
}
let adminAccQuery = '';
let adminAccRevealed = {};
function pageAdminAccounts(parts){
  if(!isOwner()) return adminGuard('Данные аккаунтов');
  const sec = parts[0];
  if(sec!=='admins' && sec!=='users'){
    const tile = (route, label, n, ic)=>`<div class="card" style="padding:20px 12px;cursor:pointer;text-align:center;" onclick="navigate('${route}')">
        <div style="display:flex;justify-content:center;margin-bottom:8px;">${icon(ic,26,'var(--accent-2)')}</div>
        <div style="font-size:14px;font-weight:700;">${label}</div><div class="faint" style="font-size:11.5px;margin-top:4px;">${n}</div></div>`;
    return `${topbar({title:'Данные аккаунтов', back:true, solid:true})}
    <div class="page">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        ${tile('/admin/accounts/admins','Админы',accAdmins().length,'shield')}
        ${tile('/admin/accounts/users','Пользователи',accUsers().length,'search')}
      </div>
      <div class="faint" style="font-size:11.5px;line-height:1.55;">Раздел виден только главному админу. Здесь аккаунты, зарегистрированные в этом браузере. IP и устройство берутся из самого браузера, настоящий IP можно получить только на сервере.</div>
    </div>`;
  }
  if(window.__accSecPrev!==sec){ adminAccQuery=''; window.__accSecPrev=sec; }
  return `${topbar({title: sec==='admins'?'Админы':'Пользователи', back:true, solid:true})}
  <div class="page">
    <div class="search-bar" style="margin-bottom:14px;">
      ${icon('search',18,'var(--text-faint)')}
      <input class="input" placeholder="Поиск по ID" value="${esc(adminAccQuery)}" oninput="adminAccQuery=this.value; renderAccList();">
    </div>
    <div id="acc-list" style="display:flex;flex-direction:column;gap:10px;"></div>
  </div>`;
}
function accLine(k,v){ return `<div class="faint" style="font-size:11.5px;line-height:1.6;"><span style="opacity:.7;">${k}:</span> ${esc(v)}</div>`; }
function renderAccList(){
  const el = document.getElementById('acc-list'); if(!el || !isOwner()) return;
  const sec = currentHash().path.split('/')[3];
  const q = adminAccQuery.trim().toLowerCase();
  const fmt = ts => ts ? logTime(ts) : '—';
  let html = '';
  if(sec==='admins'){
    let list = accAdmins();
    if(q) list = list.filter(a=>a.id.toLowerCase().includes(q));
    html = list.map(a=>{
      const isO = a.id==='owner';
      const role = ADMIN_ROLES[a.role] ? ADMIN_ROLES[a.role].label : a.role;
      return `<div class="card" style="padding:13px 14px;">
        <div class="row between" style="margin-bottom:4px;"><span class="h3" style="font-size:13.5px;font-family:monospace;">${isO?'Главный админ':esc(a.id)}</span>${isO?'':`<span style="cursor:pointer;font-size:20px;line-height:1;padding:0 4px;margin-left:auto;margin-right:8px;" onclick="accMenu('admin','${encodeURIComponent(a.id)}')">⋮</span>`}<span class="badge" style="background:var(--surface-2);color:var(--text-dim);">${esc(role)}</span></div>
        ${accLine('ID', isO?'owner':a.id)}
        ${accLine('Устройство', a.last?a.last.device:'—')}
        ${accLine('IP', a.last?a.last.ip:'—')}
        ${accLine('Последний вход', fmt(a.last&&a.last.ts))}
        ${isO ? accLine('Пароль','основной, задан в коде сайта') : accLine('Выдан', fmt(a.ts)) + accLine('Пароль','хранится только как хэш, прочитать его нельзя')}
        ${isO ? '' : `<button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px;" onclick="accNewStaffPw('${esc(a.id)}')">Выдать новый пароль</button>`}
      </div>`;
    }).join('');
  } else {
    let list = accUsers();
    if(q) list = list.filter(u=>(u.uid||'').toLowerCase().includes(q) || (u.nickname||'').toLowerCase().includes(q));
    html = list.map(u=>{
      const shown = !!adminAccRevealed[u.key];
      const enc = encodeURIComponent(u.key);
      return `<div class="card" style="padding:13px 14px;">
        <div class="row between" style="margin-bottom:4px;"><span class="h3" style="font-size:13.5px;">${esc(u.nickname)}</span><span style="display:flex;align-items:center;gap:8px;"><span class="faint" style="font-size:11px;font-family:monospace;">${esc(u.uid)}</span><span style="cursor:pointer;font-size:20px;line-height:1;padding:0 4px;" onclick="accMenu('user','${enc}')">⋮</span></span></div>
        ${accLine('ID', u.uid)}
        ${accLine('Ник', u.nickname)}
        ${accLine('Устройство', u.device||'—')}
        ${accLine('IP', u.ip||'—')}
        ${accLine('Регистрация', fmt(u.createdAt))}
        ${accLine('Последний вход', fmt(u.lastLogin))}
        ${accLine('Пароль','хранится только как хэш, прочитать его нельзя')}
        ${accLine('Статус', ({frozen:'Заморожен', banned:'Забанен'})[u.status] || 'Активен')}

        <div class="row gap8" style="margin-top:8px;">
          ${can('freeze') ? `<button class="btn btn-sm ${u.status==='frozen'?'btn-accent2':'btn-ghost'}" style="flex:1;" onclick="openModal(accStatusSheet('${enc}','frozen'))">${u.status==='frozen'?'Разморозить':'Заморозить'}</button>` : ''}
          ${can('ban') ? `<button class="btn btn-sm ${u.status==='banned'?'btn-ghost':'btn-danger'}" style="flex:1;" onclick="openModal(accStatusSheet('${enc}','banned'))">${u.status==='banned'?'Разбанить':'Забанить'}</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  el.innerHTML = html || `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">${q?'Ничего не нашли':'Пока никого нет'}</div></div>`;
}
function accTogglePw(enc){
  if(!isOwner()) return;
  const key = decodeURIComponent(enc);
  if(!adminAccRevealed[key]) logOp('Просмотр пароля', key, 'access');
  adminAccRevealed[key] = !adminAccRevealed[key];
  saveState(); renderAccList();
}
function accGenPw(len){
  const ch='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r='';
  const a = new Uint32Array(len); (window.crypto||{getRandomValues:x=>x.forEach((_,i)=>x[i]=Math.random()*4e9)}).getRandomValues(a);
  for(let i=0;i<len;i++) r+=ch[a[i]%ch.length];
  return r;
}
function accShowNewPw(title, pw, extra){
  window.__accNewPw = pw;
  openModal(`<div class="h2" style="margin-bottom:8px;">${title}</div>
  <div class="faint" style="font-size:12px;margin-bottom:8px;">Показывается один раз. Отправьте его владельцу аккаунта.</div>
  <div style="background:var(--surface-2);border-radius:10px;padding:10px 12px;font-family:monospace;font-size:13px;word-break:break-all;margin-bottom:10px;">${esc(pw)}</div>
  ${extra||''}
  <div class="row gap8"><button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Закрыть</button>
  <button class="btn btn-primary" style="flex:1;" onclick="accCopy(window.__accNewPw)">Копировать</button></div>`);
}
function accCopy(t){ try{ navigator.clipboard.writeText(t).then(()=>toast('Скопировано','success'), ()=>prompt('Скопируйте:', t)); }catch(e){ prompt('Скопируйте:', t); } }
/* --- вход в аккаунт от имени администратора (только главный админ) --- */
function accMenu(kind, enc){
  if(!isOwner()) return;
  const name = decodeURIComponent(enc);
  openModal(`<div class="h2" style="margin-bottom:6px;">${esc(name)}</div>
  <div class="faint" style="font-size:12px;margin-bottom:14px;line-height:1.5;">Вы зайдёте в этот аккаунт как главный админ. Вернуться можно кнопкой «Выйти из аккаунта».</div>
  <button class="btn btn-primary btn-block" style="margin-bottom:8px;" onclick="accImpersonate('${kind}','${enc}')">Войти в аккаунт от имени администратора</button>
  ${kind==='user' ? `<button class="btn btn-ghost btn-block" style="margin-bottom:8px;" onclick="closeModal();navigate('/admin/activity/${enc}')">Активность аккаунта</button>` : ''}
  <button class="btn btn-ghost btn-block" onclick="closeModal()">Отмена</button>`);
}
function accImpersonate(kind, enc){
  if(!isOwner()) return;
  if(state.impersonation){ toast('Сначала выйдите из текущего аккаунта','error'); return; }
  const id = decodeURIComponent(enc);
  if(kind==='admin'){
    ensureStaff(); const st = state.staff[id]; if(!st){ toast('Админ не найден','error'); return; }
    state.impersonation = {kind:'admin', label:id, prevAdmin:{role:ADMIN.role, staffId:ADMIN.staffId, key:ADMIN.key}};
    logOp('Вход в аккаунт админа от имени администратора', id, 'access');
    ADMIN = {role:st.role, staffId:id, key:ADMIN.key}; persistAdminSess();
    saveState(); closeModal(); toast('Вы вошли как админ '+id,'success'); navigate('/admin'); renderImpBanner();
    return;
  }
  let acc = readAccDb()[id];
  if(!acc){ const sl = (state.sellers||[]).find(x=>x.id===id); if(sl) acc = {nickname:sl.name}; }
  if(!acc){ toast('Аккаунт не найден','error'); return; }

  state.impersonation = {
    kind: 'user',
    label: acc.nickname,
    returnTo: currentHash().path,
    prevMe: JSON.parse(JSON.stringify(state.me || {})),
    prevDeals: JSON.parse(JSON.stringify(state.deals || [])),
    prevTx: JSON.parse(JSON.stringify((state.me && state.me.transactions) || [])),
    prevNotif: JSON.parse(JSON.stringify(state.notifications || [])),
    prevMyListings: JSON.parse(JSON.stringify(state.myListings || [])),
    prevFavorites: JSON.parse(JSON.stringify(state.favorites || [])),
    prevAuthed: !!state.authed,
    prevAccKey: state.accKey || null
  };

  logOp('Вход в аккаунт от имени администратора', acc.nickname, 'access');

  dealsSwitchTo(acc.nickname);
  state.me = {
    id:'me', name:acc.nickname, balance:0, rating:0, deals:0,
    color:'#6C5CE7', ip:(acc.ip||''), status:acc.status||'active',
    isAdmin:false, verified:false, avgResponseMin:8,
    reviews:[], transactions:[], frozenFunds:[], photo:null
  };
  state.deals = [];
  state.myListings = [];
  state.favorites = [];
  state.notifications = [];
  state.authed = true;
  state.accKey = acc.nickname.toLowerCase();

  try{
    if(typeof applyLocalUser === 'function'){
      state.authed = false;
      applyLocalUser(acc.nickname);
    }
  }catch(e){}

  saveState();
  closeModal();
  toast('Вы вошли как '+acc.nickname,'success');
  navigate('/profile');
  renderImpBanner();
}
function accImpersonateExit(){
  const im = state.impersonation; if(!im) return;
  if(im.kind==='admin'){
    ADMIN = im.prevAdmin; persistAdminSess();
    delete state.impersonation; saveState(); toast('Вы вернулись в главного админа'); navigate('/admin/accounts/admins');
  } else {
    dealsStash();
    if(im.prevMe){ state.me = im.prevMe; }
    if(Array.isArray(im.prevDeals)) state.deals = im.prevDeals;
    if(state.me && Array.isArray(im.prevTx)) state.me.transactions = im.prevTx;
    if(Array.isArray(im.prevNotif)) state.notifications = im.prevNotif;
    if(Array.isArray(im.prevMyListings)) state.myListings = im.prevMyListings;
    if(Array.isArray(im.prevFavorites)) state.favorites = im.prevFavorites;
    state.accKey = im.prevAccKey;
    state.authed = im.prevAuthed;

    const back = im.returnTo || '/admin/accounts/users';
    delete state.impersonation;
    saveState();
    toast('Вы вышли из аккаунта');
    navigate(back);
  }
  renderImpBanner();
}
function renderImpBanner(){
  let el = document.getElementById('impBanner');
  const im = state && state.impersonation;
  if(!im){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('div'); el.id = 'impBanner'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:9999;background:#8e5cff;color:#fff;border-radius:12px;padding:9px 12px;display:flex;align-items:center;gap:10px;font-size:12px;box-shadow:0 6px 20px rgba(0,0,0,.35);';
  el.innerHTML = '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(im.kind==='admin'?'Админ ':'Аккаунт ')+esc(im.label)+' · от имени администратора</span><span style="background:rgba(255,255,255,.2);border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;flex-shrink:0;" onclick="accImpersonateExit()">Выйти из аккаунта</span>';
}
setInterval(function(){ try{ renderImpBanner(); }catch(e){} }, 600);
function accStatusSheet(enc, kind){
  const key = decodeURIComponent(enc), a = readAccDb()[key] || {};
  const lifting = (kind==='frozen' && a.status==='frozen') || (kind==='banned' && a.status==='banned');
  const title = kind==='frozen' ? (lifting?'Разморозить аккаунт?':'Заморозить аккаунт?') : (lifting?'Разбанить аккаунт?':'Забанить аккаунт?');
  const hint = kind==='frozen' ? 'Аккаунт останется доступным, но вывод, пополнение, покупки и сообщения будут заблокированы.' : 'Игрока не пустит в аккаунт, сайт на его устройстве будет закрыт.';
  return `<div class="h2" style="margin-bottom:6px;">${title}</div>
  <div class="faint" style="font-size:12px;margin-bottom:4px;font-family:monospace;">${esc(a.nickname||key)} · ${esc(a.uid||'')}</div>
  <div class="faint" style="font-size:12px;margin-bottom:10px;line-height:1.5;">${hint}</div>
  <textarea class="textarea" id="accStatusReason" placeholder="Причина (обязательно)" style="margin-bottom:12px;min-height:80px;"></textarea>
  <div class="row gap8"><button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
  <button class="btn ${lifting?'btn-accent2':'btn-danger'}" style="flex:1;" onclick="accApplyStatus('${enc}','${kind}')">Подтвердить</button></div>`;
}
/* статус аккаунта меняет только сервер (acc_status); здесь лишь обновляем копию в памяти вкладки */
function applyServerStatus(res){
  if(!res || !res.results) return;
  const db = readAccDb();
  Object.keys(res.results).forEach(k=>{ const r = res.results[k]; if(db[k]){ db[k].status = r.status; db[k].restrictions = r.restrictions; } });
  writeAccDb(db);
}
async function accApplyStatus(enc, kind){
  if(!can(kind==='frozen'?'freeze':'ban')){ toast('Недостаточно прав','error'); return; }
  const key = decodeURIComponent(enc);
  const reason = ((document.getElementById('accStatusReason')||{}).value||'').trim();
  if(reason.length<3){ toast('Укажите причину','error'); return; }
  const a0 = readAccDb()[key]; if(!a0) return;
  const res = await adminDataCall('acc_status', { kind: kind==='frozen'?'frozen':'banned', keys: [key], reason: reason, how: 'из списка аккаунтов' });
  if(!res || !res.ok){ toast('Не удалось: '+((res&&res.error)||'нет связи'),'error'); return; }
  applyServerStatus(res);
  const st = (res.results[key] && res.results[key].status) || a0.status;
  logOp(kind==='frozen'?'Заморозка/разморозка':'Бан/разбан', (a0.uid||key)+' → '+st, 'bans', {target:a0.uid||key, name:a0.nickname, ip:a0.ip||'', result:({active:'Активен (снято ограничение)', frozen:'Заморожен', banned:'Забанен'})[st], reason:reason});
  saveState(); closeModal();
  toast(st==='banned'?'Аккаунт забанен':(st==='frozen'?'Аккаунт заморожен':'Ограничение снято'), st==='active'?'success':'error');
  renderAccList(); enforceAccStatus();
}
function accNewStaffPw(id){
  if(!isOwner()) return;
  ensureStaff(); const st = state.staff[id]; if(!st) return;
  let pw, h, tries = 0;
  do{ pw = accGenPw(36); h = hashPw(pw); tries++; }while((h===MASTER_HASH || Object.keys(state.staff).some(k=>k!==id && state.staff[k].hash===h)) && tries<10);
  st.hash = h; st.ts = Date.now();
  logOp('Новый пароль админу', id, 'access'); saveState();
  accShowNewPw('Новый пароль для '+esc(id), pw, `<div class="faint" style="font-size:11.5px;margin-bottom:10px;line-height:1.5;">Старый пароль больше не подходит. Чтобы вход заработал, сотруднику нужно отправить в чат новый код (кнопка «Код» в «Выдача админки»).</div>`);
  renderAccList();
}

