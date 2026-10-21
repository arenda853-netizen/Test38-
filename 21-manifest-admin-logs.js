/* --- манифест приложения (установка на экран «Домой») --- */
(function(){
  try{
    const icon = document.getElementById('appIcon').href;
    const m = {name:'Dropplay', short_name:'Dropplay', description:'Безопасные P2P-сделки по цифровым товарам', start_url:'./', scope:'./', display:'standalone', orientation:'portrait', background_color:'#0F1115', theme_color:'#0F1115',
      icons:[{src:icon, sizes:'192x192', type:'image/jpeg', purpose:'any'}]};
    const l = document.createElement('link'); l.rel = 'manifest';
    l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], {type:'application/manifest+json'}));
    document.head.appendChild(l);
  }catch(e){}
})();
function toggleAdminMode(){
  if(!isOwner()) return;
  state.adminMode = !state.adminMode; logOp('Админ-режим в профилях', state.adminMode?'вкл':'выкл');
  saveState(); onRoute();
}
function pageAdminFinance(){
  if(!can('finance')) return adminGuard('Финансы');
  const frozenSum = state.deals.filter(d=>d.status==='frozen').reduce((a,d)=>a+(d.price||0),0);
  const done = state.deals.filter(d=>d.status==='completed');
  return `${topbar({title:'Финансы', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:18px;margin-bottom:12px;text-align:center;">
      <div class="faint" style="font-size:11px;">Баланс</div>
      <div class="h1" style="font-size:26px;color:var(--accent-2);margin-top:4px;">${fmtPrice(state.me.balance)}</div>
    </div>
    <div class="row gap8">
      <div class="card" style="flex:1;padding:14px;text-align:center;"><div class="h1" style="font-size:17px;color:var(--warning);">${fmtPrice(frozenSum)}</div><div class="faint" style="font-size:10.5px;margin-top:2px;">Заморожено в спорах</div></div>
      <div class="card" style="flex:1;padding:14px;text-align:center;"><div class="h1" style="font-size:17px;">${done.length}</div><div class="faint" style="font-size:10.5px;margin-top:2px;">Завершённых сделок</div></div>
    </div>
  </div>`;
}
const LOG_CATS = [
  {id:'messages', label:'Сообщения',        icon:'chat'},
  {id:'listings', label:'Публикации',       icon:'tag'},
  {id:'bans',     label:'Баны и заморозки', icon:'shield'},
  {id:'disputes', label:'Споры',            icon:'lock'},
  {id:'access',   label:'Входы и доступ',   icon:'clock'},
  {id:'views',    label:'Просмотры',        icon:'eye'}
];
function logCat(l){
  if(l.cat) return l.cat;
  const a = l.action||'';
  if(/Спор/.test(a)) return 'disputes';
  if(/публикац|Публикац/.test(a)) return 'listings';
  if(/Бан|Заморозка/.test(a)) return 'bans';
  return 'access';
}
function logTime(ts){ return new Date(ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function logActors(){
  ensureStaff();
  const map = {owner:{actor:'owner', role:'owner', count:0, last:0}};
  Object.keys(state.staff).forEach(id=>{ map[id] = {actor:id, role:state.staff[id].role, count:0, last:0}; });
  state.logs.forEach(l=>{
    const a = map[l.actor] || (map[l.actor] = {actor:l.actor, role:l.role, count:0, last:0});
    a.count++; if(l.ts>a.last) a.last = l.ts;
  });
  return Object.values(map).sort((x,y)=>y.last-x.last);
}
let logTab = 'players';
function pageAdminLogs(){
  if(!isOwner()) return adminGuard('Логи');
  const list = logActors();
  const tab = (id,label)=>`<span onclick="logTab='${id}';onRoute()" style="flex:1;text-align:center;padding:9px 0;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;background:${logTab===id?'var(--accent)':'var(--surface-2)'};color:${logTab===id?'#fff':'var(--text-dim)'};">${label}</span>`;
  const players = `<div class="faint" style="font-size:12px;margin-bottom:10px;line-height:1.5;">Нажмите на игрока: увидите всё, что он делал на сайте. Чаты, игры и товары разложены по отдельным сеткам, внутри записи по дням.</div>
    <div class="search-bar" style="margin-bottom:14px;">${icon('search',18,'var(--text-faint)')}<input class="input" placeholder="Ник или ID игрока" value="${esc(actQuery)}" oninput="actQuery=this.value; renderActPlayers();"></div>
    <div id="act-players" style="display:flex;flex-direction:column;gap:8px;"></div>`;
  const admins = `<div class="faint" style="font-size:12px;margin-bottom:12px;line-height:1.5;">Выберите администратора, чтобы увидеть все его действия по категориям. Раздел виден только главному админу.</div>
    <div style="display:flex;flex-direction:column;gap:8px;">${list.map(a=>`
      <div class="card" style="padding:13px 14px;cursor:pointer;" onclick="navigate('/admin/logs/${encodeURIComponent(a.actor)}')">
        <div class="row between"><span style="font-size:13.5px;font-weight:700;font-family:monospace;">${a.actor==='owner'?'Главный админ':esc(a.actor)}</span><span class="badge" style="background:var(--surface-2);color:var(--text-dim);">${a.count}</span></div>
        <div class="faint" style="font-size:11px;margin-top:3px;">${esc(ADMIN_ROLES[a.role]?ADMIN_ROLES[a.role].label:a.role)} · ${a.last?'последнее действие '+timeAgo(a.last):'действий пока нет'}</div>
      </div>`).join('')}</div>`;
  return `${topbar({title:'Логи', back:true, solid:true})}
  <div class="page">
    <div style="display:flex;gap:8px;margin-bottom:14px;">${tab('players','Игроки')}${tab('admins','Админы')}</div>
    ${logTab==='players' ? players : admins}
  </div>`;
}
function pageAdminLogsActor(parts){
  if(!isOwner()) return adminGuard('Логи');
  const actor = parts[0], cat = parts[1];
  if(!actor) return pageAdminLogs();
  ensureStaff();
  const mine = state.logs.filter(l=>l.actor===actor);
  const roleKey = actor==='owner' ? 'owner' : (state.staff[actor] ? state.staff[actor].role : (mine[0]?mine[0].role:'moderator'));
  const roleLabel = ADMIN_ROLES[roleKey] ? ADMIN_ROLES[roleKey].label : roleKey;
  const title = actor==='owner' ? 'Главный админ' : actor;
  if(!cat){
    return `${topbar({title:esc(title), subtitle:esc(roleLabel), back:true, solid:true})}
    <div class="page">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${LOG_CATS.map(c=>{
        const n = mine.filter(l=>logCat(l)===c.id).length;
        return `<div class="card" style="padding:16px 12px;cursor:pointer;text-align:center;" onclick="navigate('/admin/logs/${encodeURIComponent(actor)}/${c.id}')">
          <div style="display:flex;justify-content:center;margin-bottom:8px;">${icon(c.icon,24,'var(--accent-2)')}</div>
          <div style="font-size:13px;font-weight:700;line-height:1.3;">${c.label}</div>
          <div class="faint" style="font-size:11.5px;margin-top:4px;">${n}</div>
        </div>`; }).join('')}
      </div>
    </div>`;
  }
  const c = LOG_CATS.find(x=>x.id===cat) || LOG_CATS[0];
  const list = mine.filter(l=>logCat(l)===c.id).reverse();
  return `${topbar({title:c.label, subtitle:esc(title+' · '+roleLabel), back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon(c.icon,36,'var(--text-faint)')}<div class="h2">Пока пусто</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:8px;">${list.map(l=>logEntryHTML(l,c.id)).join('')}</div>`}
  </div>`;
}
function logEntryHTML(l, cat){
  const d = l.data || {};
  const head = (t, right)=>`<div class="row between" style="gap:8px;margin-bottom:4px;"><span style="font-size:12.5px;font-weight:700;">${t}</span><span class="faint" style="font-size:10.5px;white-space:nowrap;">${logTime(l.ts)}</span></div>`;
  const btn = (label, route)=>`<button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px;" onclick="navigate('${route}')">${label}</button>`;
  const line = (k,v)=>v?`<div class="faint" style="font-size:11.5px;line-height:1.5;"><span style="opacity:.7;">${k}:</span> ${esc(v)}</div>`:'';
  const whoRow = `<div style="margin-bottom:6px;">${whoAdminHTML(l.actor)}</div>`;
  let body = '';
  if(cat==='messages'){
    body = head('Сообщение игроку') + line('Кому', (d.toName||'')+(d.to?' ('+d.to+')':'')) + line('Сделка', d.title)
      + `<div style="margin-top:6px;background:var(--surface-2);border-radius:10px;padding:8px 10px;font-size:12.5px;line-height:1.45;word-break:break-word;">${esc(d.text||'')}</div>`
      + (d.supportKey ? btn('Открыть переписку','/admin/support/'+encodeURIComponent(d.supportKey)) : (d.dealId ? btn('Открыть чат','/chat/'+esc(d.dealId)) : ''));
  } else if(cat==='listings'){
    body = head(esc(d.result||l.action)) + line('Причина', d.reason) + line('Публикация', d.title) + line('Цена', d.price!=null?fmtPrice(d.price):'') + line('Продавец', (d.sellerName||'')+(d.sellerId?' ('+d.sellerId+')':''))
      + (d.listingId ? btn('Посмотреть публикацию','/item/'+esc(d.listingId)) : line('Публикация ID', l.details));
  } else if(cat==='bans'){
    body = head(esc(d.result||l.action)) + line('Аккаунт', (d.name||'')+(d.target?' ('+d.target+')':'')) + line('IP', d.ip) + line('Причина', d.reason) + (!d.target ? line('Данные', l.details) : '');
  } else if(cat==='disputes'){
    body = head(esc(d.result||l.action)) + line('Игрок', (d.playerName||'')+(d.playerId?' ('+d.playerId+')':'')) + line('Сделка', d.title) + line('Сумма', d.price!=null?fmtPrice(d.price):'')
      + (d.dealId ? btn('Открыть чат','/chat/'+esc(d.dealId)) : line('Сделка ID', l.details));
  } else if(cat==='views'){
    const tu = (()=>{ try{ return accUsers().find(u=>u.uid===d.target||u.key===String(d.target||'').toLowerCase()); }catch(e){ return null; } })();
    body = head(esc(l.action)) + line('Игрок', (d.name||(tu?tu.nickname:''))+(d.target?' (ID: '+d.target+')':''));
  } else {
    const tu = (()=>{ try{ return accUsers().find(u=>u.key===String(l.details||'').toLowerCase()||u.uid===l.details||String(u.nickname||'').toLowerCase()===String(l.details||'').toLowerCase()); }catch(e){ return null; } })();
    body = head(esc(l.action)) + (tu ? line('Игрок', tu.nickname+' (ID: '+tu.uid+')') : line('Подробности', l.details));
  }
  return `<div class="card" style="padding:11px 13px;">${whoRow}${body}</div>`;
}

/* --- профиль игрока: админ-режим (только главный админ + включено в настройках) --- */
function adminDots(id){
  if(!(isOwner() && state.adminMode)) return '';
  return `<div style="position:absolute;top:8px;right:10px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;cursor:pointer;color:var(--text-dim);" onclick="adminProfileMenu('${esc(id)}')">⋮</div>`;
}
function adminProfileMenu(id){
  if(!(isOwner() && state.adminMode)) return;
  const u = allUsers().find(x=>x.id===id); if(!u) return;
  const st = {active:'Активен', frozen:'Заморожен', banned:'Забанен'}[u.status||'active'];
  const n = state.deals.filter(d=>d.counterparty && d.counterparty.id===u.id).length;
  openModal(`<div class="row between" style="margin-bottom:6px;"><span class="h2">${esc(u.name||u.id)}</span><span class="badge">${st}</span></div>
  <div class="faint" style="font-size:11.5px;font-family:monospace;margin-bottom:12px;">ID: ${esc(u.id)} · IP: ${esc(u.ip||'—')}</div>
  <button class="btn btn-primary btn-block" style="margin-bottom:8px;" onclick="accImpersonate('seller','${encodeURIComponent(u.id)}')">Войти в аккаунт от имени администратора</button>
  <div class="row gap8" style="margin-bottom:8px;">
    <button class="btn btn-sm ${u.status==='frozen'?'btn-accent2':'btn-ghost'}" style="flex:1;" onclick="closeModal();toggleUserStatus('${esc(u.id)}','frozen')">${u.status==='frozen'?'Разморозить':'Заморозить'}</button>
    <button class="btn btn-sm ${u.status==='banned'?'btn-ghost':'btn-danger'}" style="flex:1;" onclick="closeModal();toggleUserStatus('${esc(u.id)}','banned')">${u.status==='banned'?'Разбанить':'Забанить'}</button>
  </div>
  <button class="btn btn-ghost btn-sm btn-block" style="margin-bottom:8px;" onclick="closeModal();navigate('/admin/user-chats/${esc(u.id)}')">${icon('chat',13)} Все чаты аккаунта (${n})</button>
  <button class="btn btn-ghost btn-block" onclick="closeModal()">Закрыть</button>`);
}
function adminProfileBox(u){
  if(!(isOwner() && state.adminMode)) return '';
  const st = {active:'Активен', frozen:'Заморожен', banned:'Забанен'}[u.status||'active'];
  const n = state.deals.filter(d=>d.counterparty && d.counterparty.id===u.id).length;
  return `<div class="card" style="padding:14px;margin-bottom:14px;border:1px solid var(--accent-2);">
    <div class="row between" style="margin-bottom:6px;"><span class="h3" style="font-size:13px;color:var(--accent-2);">Админ-режим</span><span class="badge">${st}</span></div>
    <div class="faint" style="font-size:11.5px;font-family:monospace;margin-bottom:10px;">ID: ${esc(u.id)} · IP: ${esc(u.ip||'—')}</div>
    <div class="row gap8" style="margin-bottom:8px;">
      <button class="btn btn-sm ${u.status==='frozen'?'btn-accent2':'btn-ghost'}" style="flex:1;" onclick="toggleUserStatus('${esc(u.id)}','frozen')">${u.status==='frozen'?'Разморозить':'Заморозить'}</button>
      <button class="btn btn-sm ${u.status==='banned'?'btn-ghost':'btn-danger'}" style="flex:1;" onclick="toggleUserStatus('${esc(u.id)}','banned')">${u.status==='banned'?'Разбанить':'Забанить'}</button>
    </div>
    <button class="btn btn-ghost btn-sm btn-block" onclick="navigate('/admin/user-chats/${esc(u.id)}')">${icon('chat',13)} Все чаты аккаунта (${n})</button>
  </div>`;
}
function pageAdminUserChats(id){
  if(!(isOwner() && state.adminMode)) return adminGuard('Чаты аккаунта');
  const list = state.deals.filter(d=>d.counterparty && d.counterparty.id===id).sort((a,b)=>b.updatedAt-a.updatedAt);
  logOp('Просмотрел чаты аккаунта', id, 'views', {target:id});
  const statusLabel = {active:'Переписка', paid:'Оплачено', frozen:'Спор', completed:'Завершена', cancelled:'Отменена'};
  return `${topbar({title:'Чаты: '+id, back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon('chat',36,'var(--text-faint)')}<div class="h2">Чатов нет</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:10px;">${list.map(d=>`
      <div class="card" style="padding:13px 14px;cursor:pointer;" onclick="navigate('/chat/${d.id}')">
        <div class="row between" style="margin-bottom:4px;"><span class="h3" style="font-size:13.5px;max-width:62%;">${esc(d.listingTitle)}</span>
        <span class="badge" style="background:var(--surface-2);color:var(--text-dim);">${statusLabel[d.status]||d.status}</span></div>
        <div class="faint" style="font-size:11.5px;">${timeAgo(d.updatedAt)}</div>
      </div>`).join('')}</div>`}
  </div>`;
}

