/* --- журнал активности игроков: что открывал и нажимал (для админов с правом «Логи») --- */
const ACT_KEY = 'dropplay_activity_v1';
const ACT_SECS = [
  {id:'home',label:'Главная',icon:'home'}, {id:'catalog',label:'Каталог',icon:'grid'}, {id:'games',label:'Игры',icon:'bolt'},
  {id:'item',label:'Товары',icon:'tag'}, {id:'seller',label:'Профили продавцов',icon:'user'}, {id:'chats',label:'Чаты',icon:'chat'},
  {id:'support',label:'Поддержка',icon:'support'}, {id:'profile',label:'Профиль',icon:'user'}, {id:'sell',label:'Продажа',icon:'plus'},
  {id:'wallet',label:'Кошелёк',icon:'wallet'}, {id:'fav',label:'Избранное',icon:'star'}, {id:'account',label:'Вход и сессии',icon:'clock'}, {id:'other',label:'Другое',icon:'note'}
];
const ACT_VERBS = {open:'Открыл', click:'Нажал', send:'Написал', search:'Искал', time:'Пробыл на странице:', field:'Заполнил', session:'Сессия', admin:'Админ'};
let actViewKey = '';
/* кто сделал: красный АДМИН + его ID, у обычных игроков только ID аккаунта */
function whoAdminHTML(id, noId){
  return '<span style="display:inline-block;background:#ff3b3022;color:#ff3b30;border-radius:6px;padding:1px 6px;font-size:10.5px;font-weight:800;font-family:monospace;letter-spacing:.3px;white-space:nowrap;">АДМИН'+(noId?'':' · '+esc(id||'owner'))+'</span>';
}
/* синяя метка в чате сделки: Продавец / Покупатель и ID */
function whoRoleHTML(role, id){
  return '<span style="display:inline-block;background:#3b82f622;color:#4da3ff;border-radius:6px;padding:1px 6px;font-size:10.5px;font-weight:800;font-family:monospace;white-space:nowrap;">'+esc(role)+' · '+esc(id||'—')+'</span>';
}
function msgWithTag(tagHtml, bubbleHtml, out){
  return '<div class="msg-row '+(out?'out':'in')+'" style="flex-direction:column;align-items:'+(out?'flex-end':'flex-start')+';"><div style="margin:0 4px 3px;">'+tagHtml+'</div>'+bubbleHtml+'</div>';
}
function whoUserHTML(id){
  return '<span style="display:inline-block;background:var(--surface-2);color:var(--text-dim);border-radius:6px;padding:1px 6px;font-size:10.5px;font-weight:700;font-family:monospace;white-space:nowrap;">ID: '+esc(id||'—')+'</span>';
}
function actUidByKey(key){
  if(!key || key==='guest') return 'гость';
  try{ const u = accUsers().find(x=>x.key===key); if(u && u.uid) return u.uid; }catch(e){}
  return key;
}
/* ищем аккаунт игрока по ID / нику / имени */
function actKeyByRef(ref){
  ref = String(ref||'').trim(); if(!ref) return '';
  const low = ref.toLowerCase();
  try{
    const u = accUsers().find(x=>x.uid===ref || x.key===low || String(x.nickname||'').toLowerCase()===low);
    if(u) return u.key;
  }catch(e){}
  return low;
}
/* то, что сделал админ, дублируем в ленту игрока: видно, кто именно вмешался */
function actPushAdmin(userKey, sec, info, sub){
  try{
    if(!userKey || !ADMIN) return;
    const st = actLoad(), arr = st[userKey] || (st[userKey] = []), now = Date.now();
    const who = ADMIN.staffId||'owner', text = String(info||'').slice(0,300), sb = String(sub||'').slice(0,70);
    const last = arr[arr.length-1];
    if(last && last[2]==='admin' && last[3]===text && last[6]===who && now-last[0]<30000) return;
    arr.push([now, sec, 'admin', text, sb, 0, who]);
    if(arr.length>3000) arr.splice(0, arr.length-3000);
    clearTimeout(actTimer); actTimer = setTimeout(actFlush, 1000);
  }catch(e){}
}
function actMirrorLog(e){
  try{
    const d = e.data || {}, a = e.action || '', cat = e.cat || logCat(e);
    const targets = [];
    const add = (ref, sec, info, sub)=>{ const k = actKeyByRef(ref); if(k) targets.push([k, sec, info, sub||'']); };
    if(cat==='messages'){
      const t = '«'+String(d.text||'').replace(/\s+/g,' ').slice(0,200)+'»';
      if(d.supportKey) add(d.supportKey, 'support', 'Ответил в чате поддержки: '+t, '');
      else add(d.toName || d.to, 'chats', 'Вмешался в чат'+(d.title?' «'+d.title+'»':'')+': '+t, d.title?'Чат: '+(d.toName||'')+' · '+String(d.title).slice(0,26):'');
    } else if(cat==='listings'){
      add(d.sellerName || d.sellerId, 'sell', (d.result||a)+': '+(d.title||'')+(d.reason?' · причина: '+d.reason:''), 'Мои объявления');
    } else if(cat==='bans'){
      const res = (d.result||a)+(d.reason?' · '+d.reason:'');
      if(/^(\d{1,3}\.){3}\d{1,3}$/.test(String(d.target||''))) String(d.name||'').split(/,\s*/).forEach(id=>add(id,'account',res,'Сессии'));
      else add(d.name || d.target, 'account', res, 'Сессии');
    } else if(cat==='disputes'){
      add(d.playerName || d.playerId, 'chats', (d.result||a)+(d.title?' · '+d.title:''), d.title?'Чат: '+(d.playerName||'')+' · '+String(d.title).slice(0,26):'');
    } else if(cat==='views'){
      add(d.target || e.details, 'account', a, 'Сессии');
    } else if(/пароля|от имени администратора/.test(a)){
      add(e.details, 'account', a, 'Сессии');
    }
    /* если админ сидит под аккаунтом игрока, то всё в чатах от его имени тоже на него */
    if(state && state.impersonation && state.impersonation.kind==='user' && cat==='messages' && !d.supportKey)
      add(state.impersonation.label, 'chats', 'Написал от имени аккаунта'+(d.title?' в чате «'+d.title+'»':'')+': «'+String(d.text||'').replace(/\s+/g,' ').slice(0,200)+'»', d.title?'Чат: '+(d.toName||'')+' · '+String(d.title).slice(0,26):'');
    targets.forEach(t=>actPushAdmin(t[0], t[1], t[2], t[3]));
  }catch(err){}
}
let actStore = null, actTimer = null, actQuery = '', actView = 'grids', actCur = null;
function actEnc(s){ return encodeURIComponent(String(s)).replace(/'/g,'%27'); }
function actLoad(){
  if(actStore) return actStore;
  actStore = {};
  const limit = Date.now() - 60*86400000;
  Object.keys(actStore).forEach(k=>{ actStore[k] = (actStore[k]||[]).filter(e=>e[0]>limit); });
  return actStore;
}
function actFlush(){}
function actKey(){ return state && state.authed ? (state.accKey || String((state.me||{}).name||'').trim().toLowerCase() || 'guest') : 'guest'; }
/* запись: [время, раздел, действие, текст, сетка (чат / игра / товар), секунды] */
function actPush(key, sec, act, info, sub, num){
  const st = actLoad(), arr = st[key] || (st[key] = []), now = Date.now(), last = arr[arr.length-1];
  if(last && last[1]===sec && last[2]===act && last[3]===String(info||'').slice(0,300) && now-last[0]<400) return;
  arr.push([now, sec, act, String(info||'').slice(0,300), String(sub||'').slice(0,70), num||0]);
  if(arr.length>3000) arr.splice(0, arr.length-3000);
  clearTimeout(actTimer); actTimer = setTimeout(actFlush, 1000);
}
function actLog(sec, act, info, sub){
  try{
    if(!state || state.impersonation) return;
    const p = currentHash().path;
    if(p.startsWith('/admin') || p.startsWith('/dev')) return;
    actPush(actKey(), sec, act, info, sub);
  }catch(e){}
}
function actChatSub(d, id){ return d ? 'Чат: '+d.counterparty.name+' · '+String(d.listingTitle||'').slice(0,26) : 'Чат: '+id; }
function actDescribe(path, params){
  const gname = id => { const g = GAMES.find(x=>x.id===id); return g ? g.name : id; };
  if(path==='/') return {sec:'home', label:'Главная', sub:''};
  if(path==='/catalog') return params.game ? {sec:'games', label:'Каталог игры «'+gname(params.game)+'»', sub:gname(params.game)} : {sec:'catalog', label:'Каталог', sub:''};
  if(path==='/games') return {sec:'games', label:'Список игр', sub:'Список игр'};
  if(path.startsWith('/item/')){ const l = state.listings.find(x=>x.id===path.split('/')[2]); const g = l ? GAMES.find(x=>x.id===l.gameId) : null; return {sec:'item', label:'Товар: '+(l?l.title:path.split('/')[2])+(g?' · '+g.name:'')+(l&&l.price!=null?' · '+fmtPrice(l.price):''), sub:l?l.title.slice(0,50):''}; }
  if(path.startsWith('/seller/')){ const u = allUsers().find(x=>x.id===path.split('/')[2]); return {sec:'seller', label:'Профиль продавца: '+(u?u.name:path.split('/')[2]), sub:u?u.name:''}; }
  if(path==='/chats') return {sec:'chats', label:'Список чатов', sub:'Список чатов'};
  if(path==='/chat/support') return {sec:'support', label:'Чат поддержки', sub:''};
  if(path.startsWith('/chat/')){ const id = path.split('/')[2], d = findDealAny(id); const nm = d ? d.counterparty.name : id; return {sec:'chats', label:'Чат с '+nm+(d?' — '+d.listingTitle:''), sub:actChatSub(d,id)}; }
  if(path==='/sell') return {sec:'sell', label:'Создание объявления', sub:'Создание объявления'};
  if(path==='/profile/listings') return {sec:'sell', label:'Мои объявления', sub:'Мои объявления'};
  if(path==='/profile/edit') return {sec:'profile', label:'Редактирование профиля', sub:'Редактирование профиля'};
  if(path.startsWith('/profile')) return {sec:'profile', label:'Профиль', sub:'Профиль'};
  return {sec:'other', label:path, sub:path.slice(0,40)};
}
function actFmtDur(s){
  s = Math.round(s||0);
  if(s<60) return s+' сек';
  if(s<3600) return Math.floor(s/60)+' мин '+(s%60)+' сек';
  return Math.floor(s/3600)+' ч '+Math.floor((s%3600)/60)+' мин';
}
/* сколько игрок пробыл на странице (пишем при уходе с неё) */
function actDwell(){
  try{
    if(!actCur) return;
    const c = actCur; actCur = null;
    const secs = Math.round((Date.now()-c.ts)/1000);
    if(secs>=3 && secs<7200) actPush(c.key, c.sec, 'time', c.label+' — '+actFmtDur(secs), c.sub, secs);
  }catch(e){}
}
function actStartCur(){
  try{
    const h = currentHash();
    if(h.path.startsWith('/admin') || h.path.startsWith('/dev') || (state && state.impersonation)){ actCur = null; return; }
    const d = actDescribe(h.path, h.params);
    actCur = {ts:Date.now(), key:actKey(), sec:d.sec, sub:d.sub||'', label:d.label};
  }catch(e){ actCur = null; }
}
function actTrackOpen(){
  try{
    actDwell();
    const h = currentHash(); const d = actDescribe(h.path, h.params);
    actLog(d.sec, 'open', d.label, d.sub);
    actStartCur();
  }catch(e){}
}
function actOnClick(e){
  try{
    const el = e.target.closest && e.target.closest('[onclick],button,a,.btn,.chip,label');
    if(!el || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const oc = el.getAttribute('onclick')||'';
    let label = (el.getAttribute('aria-label') || el.innerText || el.title || '').replace(/\s+/g,' ').trim().slice(0,80);
    if(!label){ const m = /^\s*([A-Za-z_]\w*)/.exec(oc); label = m ? 'Кнопка ('+m[1]+')' : 'Кнопка'; }
    const nav = /navigate\(\s*['"`]([^'"`]+)/.exec(oc);
    if(nav){ let to = nav[1]; try{ to = decodeURIComponent(to); }catch(_){} label += ' → '+to.slice(0,60); }
    const h = currentHash(), d = actDescribe(h.path, h.params);
    let sec = d.sec, sub = d.sub||'';
    if(h.path==='/catalog'){
      const gm = GAMES.find(g=>label===g.name || label.indexOf(g.name+' →')===0);
      if(gm){ sec = 'games'; sub = gm.name; }
      else if(catalogFilters && catalogFilters.game){ const g2 = GAMES.find(g=>g.id===catalogFilters.game); if(g2){ sec = 'games'; sub = g2.name; } }
    }
    if(/пополн|вывест|вывод|баланс|кошел/i.test(label)){ sec = 'wallet'; sub = /пополн/i.test(label) ? 'Пополнение' : (/вывест|вывод/i.test(label) ? 'Вывод' : 'Баланс'); }
    else if(/избран/i.test(label)){ sec = 'fav'; sub = 'Избранное'; }
    actLog(sec, 'click', label, sub);
  }catch(err){}
}
function actLogSend(id, text){
  const t = '«'+String(text||'').replace(/\s+/g,' ').trim().slice(0,250)+'»';
  if(id==='support') actLog('support','send',t,'');
  else { const d = state.deals.find(x=>x.id===id); actLog('chats','send',t, actChatSub(d,id)); }
}
(function(){
  let t = null;
  document.addEventListener('click', actOnClick, true);
  document.addEventListener('input', function(e){
    const el = e.target; if(!el || !el.closest || !el.closest('.search-bar')) return;
    clearTimeout(t); t = setTimeout(function(){ const v = (el.value||'').trim(); if(v.length>=2){ const d = actDescribe(currentHash().path, currentHash().params); actLog(d.sec,'search','Поиск: «'+v.slice(0,60)+'»',d.sub); } }, 1200);
  }, true);
  /* заполнение полей и фильтров (сами значения не пишем, кроме чисел и выбора из списка; пароли не пишем вообще) */
  document.addEventListener('change', function(e){
    try{
      const el = e.target; if(!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.type==='password') return;
      if(el.id==='chatInputField' || (el.closest && el.closest('.search-bar'))) return;
      const lb = el.closest && el.closest('label');
      const name = (el.getAttribute('aria-label') || el.placeholder || (lb ? lb.innerText : '') || el.name || el.id || 'поле').replace(/\s+/g,' ').trim().slice(0,40);
      let val;
      if(el.type==='checkbox') val = el.checked ? 'включено' : 'выключено';
      else if(el.tagName==='SELECT') val = (el.options[el.selectedIndex]||{}).text || el.value;
      else if(el.type==='number' || el.type==='radio') val = el.value;
      else val = (el.value||'').length+' симв.';
      const d = actDescribe(currentHash().path, currentHash().params);
      actLog(d.sec, 'field', 'Поле «'+name+'»: '+val, d.sub);
    }catch(err){}
  }, true);
  window.addEventListener('hashchange', actTrackOpen);
  document.addEventListener('visibilitychange', function(){
    try{
      if(document.hidden){ actDwell(); actLog('account','session','Свернул сайт или ушёл с вкладки','Сессии'); }
      else { actLog('account','session','Вернулся на сайт','Сессии'); actStartCur(); }
    }catch(e){}
  });
  window.addEventListener('pagehide', function(){ actDwell(); });
  setTimeout(function(){ actLog('account','session','Зашёл на сайт · '+deviceLabel(),'Сессии'); actTrackOpen(); }, 400);
})();
function actPlayers(){
  const st = actLoad(), map = {}, d0 = new Date(); d0.setHours(0,0,0,0);
  Object.keys(st).forEach(k=>{ if(st[k].length) map[k] = {key:k, name:k==='guest'?'Гости (без аккаунта)':k, uid:'', count:st[k].length, today:st[k].filter(e=>e[0]>=d0.getTime()).length, last:st[k][st[k].length-1][0]}; });
  accUsers().forEach(u=>{ const k = u.key; if(map[k]){ map[k].name = u.nickname||k; map[k].uid = u.uid||''; } });
  return Object.values(map).sort((a,b)=>b.last-a.last);
}
function renderActPlayers(){
  const el = document.getElementById('act-players'); if(!el) return;
  const q = actQuery.trim().toLowerCase();
  const list = actPlayers().filter(p=>!q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || (p.uid||'').toLowerCase().includes(q));
  if(list.length===0){ el.innerHTML = `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">Активности пока нет</div><div class="muted" style="font-size:13px;">Записи появятся, когда игроки начнут пользоваться сайтом</div></div>`; return; }
  el.innerHTML = list.map(p=>`<div class="card" style="padding:13px 14px;cursor:pointer;" onclick="navigate('/admin/activity/${actEnc(p.key)}')">
    <div class="row between"><span style="font-size:13.5px;font-weight:700;">${esc(p.name)}</span><span class="badge" style="background:var(--surface-2);color:var(--text-dim);">${p.count}</span></div>
    <div class="faint" style="font-size:11px;margin-top:3px;${p.uid?'font-family:monospace;':''}">${p.uid?'ID: '+esc(p.uid)+' · ':''}сегодня ${p.today} · последнее действие ${timeAgo(p.last)}</div>
  </div>`).join('');
}
function actDayTitle(ts){ return new Date(ts).toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'}); }
function actStats(arr){
  const d0 = new Date(); d0.setHours(0,0,0,0);
  const days = {}, chats = {}, items = {};
  let today = 0, dwell = 0, msgs = 0, searches = 0, clicks = 0;
  arr.forEach(e=>{
    if(e[0]>=d0.getTime()) today++;
    days[actDayTitle(e[0])] = 1;
    if(e[2]==='time') dwell += (e[5]||0);
    if(e[2]==='send') msgs++;
    if(e[2]==='search') searches++;
    if(e[2]==='click') clicks++;
    if(e[1]==='chats' && e[4] && e[4]!=='Список чатов') chats[e[4]] = 1;
    if(e[1]==='item' && e[4]) items[e[4]] = 1;
  });
  return {total:arr.length, today, days:Object.keys(days).length, dwell, msgs, searches, clicks, chats:Object.keys(chats).length, items:Object.keys(items).length};
}
function actEntryHTML(e, badge){
  const verb = ACT_VERBS[e[2]]||e[2];
  const col = e[2]==='send' ? 'var(--accent-2)' : ((e[2]==='time'||e[2]==='session') ? 'var(--text-dim)' : 'inherit');
  let tag = '';
  if(badge){
    const s = ACT_SECS.find(x=>x.id===e[1]), parts = [];
    if(badge==='sec' && s) parts.push(s.label);
    if(e[4]) parts.push(e[4]);
    if(parts.length) tag = `<div class="faint" style="font-size:10.5px;margin-top:2px;">${esc(parts.join(' › '))}</div>`;
  }
  const isAdm = !!e[6] || e[2]==='admin';
  const who = isAdm ? whoAdminHTML(e[6]) : whoUserHTML(actUidByKey(actViewKey));
  const vcol = isAdm ? '#ff3b30' : col;
  return `<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #ffffff10;${isAdm?'background:#ff3b3010;margin:0 -12px;padding-left:12px;padding-right:12px;':''}">
    <span class="faint" style="font-size:11px;font-family:monospace;flex-shrink:0;padding-top:1px;">${new Date(e[0]).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
    <span style="font-size:12.5px;line-height:1.4;min-width:0;word-break:break-word;"><div style="margin-bottom:3px;">${who}</div><b style="color:${vcol};">${isAdm?'Сделал':verb}</b> ${esc(e[3])}${tag}</span>
  </div>`;
}
function actDaysHTML(list, badge){
  if(!list.length) return `<div class="empty-state">${icon('note',34,'var(--text-faint)')}<div class="h2">Записей нет</div></div>`;
  const days = []; list.forEach(e=>{ const t = actDayTitle(e[0]); let g = days[days.length-1]; if(!g || g.t!==t){ g = {t, items:[]}; days.push(g); } g.items.push(e); });
  return days.map(g=>`<div class="h3" style="font-size:12.5px;margin:6px 0 8px;color:var(--text-dim);">${g.t} · ${g.items.length}</div>
    <div class="card" style="padding:4px 12px;margin-bottom:14px;">${g.items.map(e=>actEntryHTML(e,badge)).join('')}</div>`).join('');
}
function actSummary(list){
  if(!list.length) return '';
  const dw = list.reduce((s,e)=>s+(e[2]==='time'?(e[5]||0):0),0);
  return `<div class="faint" style="font-size:12px;margin-bottom:12px;line-height:1.5;">Записей: ${list.length}${dw?' · на страницах: '+actFmtDur(dw):''}</div>`;
}
function actTile(onclick, ic, title, sub, dim, full){
  return `<div class="card" style="padding:14px 10px;cursor:pointer;text-align:center;${full?'grid-column:1/-1;':''}${dim?'opacity:.55;':''}" onclick="${onclick}">
    <div style="display:flex;justify-content:center;margin-bottom:7px;">${icon(ic,22,'var(--accent-2)')}</div>
    <div style="font-size:13px;font-weight:700;line-height:1.3;word-break:break-word;">${esc(title)}</div>
    <div class="faint" style="font-size:11.5px;margin-top:4px;">${sub}</div></div>`;
}
function pageAdminActivity(parts){
  if(!can('logs')) return adminGuard('Активность игроков');
  const key = parts[0], secId = parts[1], subId = parts[2];
  if(!key){
    return `${topbar({title:'Активность игроков', back:true, solid:true})}
    <div class="page">
      <div class="faint" style="font-size:12px;margin-bottom:10px;line-height:1.5;">Всё, что игроки открывали и нажимали на сайте. Записи разложены по разделам, у каждого чата, игры и товара своя сетка, внутри всё по дням.</div>
      <div class="search-bar" style="margin-bottom:14px;">${icon('search',18,'var(--text-faint)')}<input class="input" placeholder="Ник или ID игрока" value="${esc(actQuery)}" oninput="actQuery=this.value; renderActPlayers();"></div>
      <div id="act-players" style="display:flex;flex-direction:column;gap:8px;"></div>
    </div>`;
  }
  actViewKey = key;
  const all = (actLoad()[key]||[]);
  const acc = accUsers().find(u=>u.key===key);
  if(!secId && key!=='guest'){ try{ logOp('Просмотрел активность игрока', acc?acc.uid:key, 'views', {target:acc?acc.uid:key, name:acc?acc.nickname:key}); }catch(e){} }
  const title = key==='guest' ? 'Гости (без аккаунта)' : (acc ? acc.nickname : key);
  const subtitle = acc && acc.uid ? 'ID: '+acc.uid : '';
  const encKey = actEnc(key);

  /* страница игрока: вся информация и разделы */
  if(!secId){
    const st = actStats(all);
    const fmt = ts => ts ? logTime(ts) : '—';
    const lines = [];
    if(acc){
      lines.push(accLine('ID', acc.uid||'—'));
      if(isOwner()){ lines.push(accLine('IP', acc.ip||'—')); lines.push(accLine('Устройство', acc.device||'—')); }
      lines.push(accLine('Регистрация', fmt(acc.createdAt))); lines.push(accLine('Последний вход', fmt(acc.lastLogin)));
    } else if(key==='guest') lines.push(accLine('Статус','Гость, без аккаунта'));
    lines.push(accLine('Первое действие', fmt(all.length?all[0][0]:0))); lines.push(accLine('Последнее действие', fmt(all.length?all[all.length-1][0]:0)));
    const box = (n,l)=>`<div style="background:var(--surface-2);border-radius:12px;padding:10px 6px;text-align:center;"><div style="font-size:15px;font-weight:800;">${n}</div><div class="faint" style="font-size:10.5px;margin-top:2px;">${l}</div></div>`;
    return `${topbar({title:esc(title), subtitle:esc(subtitle), back:true, solid:true})}
    <div class="page">
      <div class="card" style="padding:13px 14px;margin-bottom:12px;">${lines.join('')}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">
          ${box(st.total,'действий')}${box(st.today,'сегодня')}${box(st.days,'дней на сайте')}
          ${box(st.clicks,'нажатий')}${box(st.msgs,'сообщений')}${box(st.chats,'чатов')}
          ${box(st.items,'товаров')}${box(st.searches,'поисков')}${box(st.dwell?actFmtDur(st.dwell):'—','на страницах')}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${actTile("navigate('/admin/activity/"+encKey+"/__feed')", 'eye', 'Вся лента', st.total+(all.length?' · '+timeAgo(all[all.length-1][0]):''), !st.total, true)}
        ${ACT_SECS.map(c=>{
          const ev = all.filter(e=>e[1]===c.id), last = ev.length ? ev[ev.length-1][0] : 0;
          return actTile("navigate('/admin/activity/"+encKey+"/"+c.id+"')", c.icon, c.label, ev.length+(last?' · '+timeAgo(last):''), !ev.length);
        }).join('')}
      </div>
      ${isOwner() ? `<button class="btn btn-ghost btn-block" style="margin-top:16px;" onclick="actClear('${encKey}')">Очистить журнал игрока</button>` : ''}
    </div>`;
  }

  /* вся лента игрока по дням */
  if(secId==='__feed'){
    const list = all.slice().reverse().slice(0,800);
    return `${topbar({title:'Вся лента', subtitle:esc(title), back:true, solid:true})}
    <div class="page">${actSummary(all)}${actDaysHTML(list,'sec')}${all.length>800?'<div class="faint" style="font-size:11.5px;text-align:center;">Показаны последние 800 записей</div>':''}</div>`;
  }

  const c = ACT_SECS.find(x=>x.id===secId) || ACT_SECS[0];
  const ev = all.filter(e=>e[1]===c.id);
  const subs = {}; ev.forEach(e=>{ const s = e[4]||''; const o = subs[s] || (subs[s] = {n:0, last:0}); o.n++; if(e[0]>o.last) o.last = e[0]; });
  const names = Object.keys(subs).filter(Boolean).sort((a,b)=>subs[b].last-subs[a].last);
  const base = '/admin/activity/'+encKey+'/'+c.id;

  /* одна сетка (например, конкретный чат): записи по дням */
  if(subId){
    const none = subId==='__none', whole = subId==='__all';
    const list = (whole ? ev : ev.filter(e=>(e[4]||'')===(none?'':subId))).slice().reverse();
    const name = whole ? 'Все записи' : (none ? 'Общее' : subId);
    return `${topbar({title:esc(name), subtitle:esc(c.label+' · '+title), back:true, solid:true})}
    <div class="page">${actSummary(list)}${actDaysHTML(list.slice(0,800), whole?'sub':'')}${list.length>800?'<div class="faint" style="font-size:11.5px;text-align:center;">Показаны последние 800 записей</div>':''}</div>`;
  }

  /* раздел без сеток: сразу по дням */
  if(names.length===0){
    const list = ev.slice().reverse();
    return `${topbar({title:c.label, subtitle:esc(title), back:true, solid:true})}
    <div class="page">${actSummary(list)}${actDaysHTML(list.slice(0,800),'')}</div>`;
  }

  /* раздел с сетками: у каждого чата / игры / товара своя сетка */
  const seg = (id,label)=>`<span onclick="actView='${id}';onRoute()" style="flex:1;text-align:center;padding:9px 0;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;background:${actView===id?'var(--accent)':'var(--surface-2)'};color:${actView===id?'#fff':'var(--text-dim)'};">${label}</span>`;
  let body;
  if(actView==='days'){
    body = actSummary(ev) + actDaysHTML(ev.slice().reverse().slice(0,800), 'sub');
  } else {
    const shownName = n => c.id==='chats' ? n.replace(/^Чат:\s*/,'') : n;
    body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${actTile("navigate('"+base+"/__all')", 'eye', 'Все записи', ev.length, false, true)}
      ${names.map(n=>actTile("navigate('"+base+"/"+actEnc(n)+"')", c.icon, shownName(n), subs[n].n+' · '+timeAgo(subs[n].last))).join('')}
      ${subs[''] ? actTile("navigate('"+base+"/__none')", 'note', 'Общее', subs[''].n+' · '+timeAgo(subs[''].last)) : ''}
    </div>`;
  }
  return `${topbar({title:c.label, subtitle:esc(title), back:true, solid:true})}
  <div class="page">
    <div style="display:flex;gap:8px;margin-bottom:14px;">${seg('grids','Сетки')}${seg('days','По дням')}</div>
    ${body}
  </div>`;
}
function actClear(enc){
  if(!isOwner()) return;
  const key = decodeURIComponent(enc), encKey = actEnc(key);
  openModal(`<div class="h2" style="margin-bottom:8px;">Очистить журнал?</div><div class="faint" style="font-size:12.5px;margin-bottom:14px;line-height:1.5;">Все записи этого игрока будут удалены без возможности восстановления.</div>
  <button class="btn btn-danger btn-block" style="margin-bottom:8px;" onclick="actClearConfirm('${encKey}')">Очистить</button><button class="btn btn-ghost btn-block" onclick="closeModal()">Отмена</button>`);
}
function actClearConfirm(enc){
  if(!isOwner()) return;
  const key = decodeURIComponent(enc);
  const st = actLoad(); delete st[key]; actFlush(); closeModal(); logOp('Очищен журнал активности', key, 'logs'); toast('Журнал очищен'); navigate('/admin/logs');
}
