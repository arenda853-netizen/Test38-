function normId(x){ return String(x||'').trim().replace(/^id\s*[:：]?\s*/i,'').trim(); }
/* единый поиск игрока по ID/нику: и старые продавцы, и реальные аккаунты (DP...) */
function findPlayerById(raw, exact){
  const id = normId(raw).toLowerCase(); if(!id) return null;
  const list = [];
  try{ allUsers().forEach(function(u){ list.push({id:u.id, name:u.name, ip:u.ip||'', ref:u, acc:false}); }); }catch(e){}
  try{ accUsers().forEach(function(a){ list.push({id:a.uid||a.key, name:a.nickname||a.key, ip:a.ip||'', key:a.key, ref:a, acc:true}); }); }catch(e){}
  let r = list.find(function(u){ return String(u.id).toLowerCase()===id || (u.key||'')===id || String(u.name||'').toLowerCase()===id; });
  if(!r && !exact) r = list.find(function(u){ return String(u.id).toLowerCase().indexOf(id)===0; });
  return r || null;
}
function searchPlayers(raw){
  const id = normId(raw).toLowerCase(); if(!id) return [];
  const out = [], seen = {};
  const add = function(o){ if(seen[o.id]) return; seen[o.id]=1; out.push(o); };
  try{ allUsers().forEach(function(u){ if(String(u.id).toLowerCase().includes(id) || String(u.name||'').toLowerCase().includes(id)) add({id:u.id, name:u.name}); }); }catch(e){}
  try{ accUsers().forEach(function(a){ const uid=a.uid||a.key; if(String(uid).toLowerCase().includes(id) || String(a.nickname||'').toLowerCase().includes(id)) add({id:uid, name:a.nickname||a.key}); }); }catch(e){}
  return out;
}
function listingsOfPlayer(uid){
  const p = findPlayerById(uid, true);
  const key = p && p.key ? p.key : '';
  return state.listings.filter(function(l){
    if(l.sold) return false;
    return l.sellerId===uid || l.sellerUid===uid || (p && (l.sellerId===p.id || l.sellerUid===p.id)) || (key && (l.sellerAcc===key || String(l.sellerName||'').trim().toLowerCase()===key));
  });
}
function adminGuard(title){ if(ADMIN) return adminGuardRole(title);
  return `${topbar({title:title||'Доступ запрещён', back:true})}
    <div class="page empty-state">
      ${icon('lock',40,'var(--danger)')}
      <div class="h2">Только для администрации</div>
      <div class="muted" style="font-size:13px;">У вашего аккаунта нет прав администратора.</div>
    </div>`;
}
function adminGuardRole(title){
  return `${topbar({title:title||'Нет доступа', back:true})}
    <div class="page empty-state">
      ${icon('lock',40,'var(--danger)')}
      <div class="h2">Недостаточно прав</div>
      <div class="muted" style="font-size:13px;">Роль «${ADMIN_ROLES[ADMIN.role].label}» не включает этот раздел.</div>
    </div>`;
}
function adminMenuRow(iconName, title, subtitle, onclick){
  return `<div class="card" style="padding:13px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="${onclick}">
    <div class="icon-btn" style="background:var(--surface-2);">${icon(iconName,18,'var(--accent-2)')}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13.5px;font-weight:700;">${title}</div>
      <div class="faint" style="font-size:11.5px;margin-top:1px;">${subtitle}</div>
    </div>
    ${icon('chev',16,'var(--text-faint)')}
  </div>`;
}
function pageAdmin(){
  if(!ADMIN){
    return adminGuard();
  }
  const users = allUsers();
  const bannedCount = users.filter(u=>u.status==='banned').length;
  const disputesCount = adminAllDeals().filter(d=>d.status==='frozen').length;
  const pendingCount = state.listings.filter(l=>l.moderation==='pending').length;
  const statCard = (v,l,c)=>`<div class="card" style="flex:1;min-width:76px;padding:12px;text-align:center;">
        <div class="h1" style="font-size:17px;${c?'color:'+c+';':''}">${v}</div>
        <div class="faint" style="font-size:10.5px;margin-top:2px;">${l}</div></div>`;
  const stats = [
    can('players') ? statCard(users.length,'Пользователей') : '',
    can('disputes') ? statCard(disputesCount,'Споров','var(--warning)') : '',
    can('listings') ? statCard(pendingCount,'На модерации','var(--accent-2)') : '',
    can('players') ? statCard(bannedCount,'Забанено','var(--danger)') : ''
  ].join('');
  const rows = [
    can('disputes') ? adminMenuRow('lock','Заявки (споры)', disputesCount+' в работе', "navigate('/admin/disputes')") : '',
    can('chats') ? adminMenuRow('chat','Все чаты', 'Доступ к любой переписке, даже вне спора', "navigate('/admin/chats')") : '',
    canSupport() ? adminMenuRow('support','Чат поддержки', supportUnreadAdmin()+' новых сообщений', "navigate('/admin/support')") : '',
    can('listings') ? adminMenuRow('tag','Заявки на публикацию', pendingCount+' ожидают проверки', "navigate('/admin/listings')") : '',
    can('catalog') ? adminMenuRow('grid','Каталог', 'Все товары в каталоге, можно снять с публикации', "navigate('/admin/catalog')") : '',
    can('players') ? adminMenuRow('search','Список игроков', can('ban')?'Имя, ID, IP':'Имя, ID, заморозка', "navigate('/admin/players')") : '',
    (window.canSeeIp && window.canSeeIp() && !window.__IPMAP) ? adminMenuRow('eye','Показать IP и устройства','Нужен ваш пароль. Открывается только на этой вкладке','openModal(ipUnlockSheet())') : '',
    can('ban') ? adminMenuRow('shield','Бан по ID или IP', 'Заблокировать аккаунт или сеть', "navigate('/admin/ban')") : '',
    (can('players')||can('freeze')||can('ban')||can('disputes')) ? adminMenuRow('lock','Забанены и заморожены', 'Поиск по ID: причины и замороженные споры', "navigate('/admin/restricted')") : '',
    (ADMIN && (ADMIN.role==='owner' || ADMIN.role==='senior')) ? adminMenuRow('shield','Подозрительные активности','Заморозки, история денег, разморозка','openSuspiciousLogin()') : '',
    can('finance') ? adminMenuRow('tag','Финансы', 'Баланс и замороженные средства', "navigate('/admin/finance')") : '',
    isOwner() ? adminMenuRow('tag','Начислить деньги','По ID игрока. Только для главного админа','openModal(adminCreditSheet())') : '',
    isOwner() ? adminMenuRow('clock','Логи', 'Игроки: что нажимали, по чатам и играм. Действия админов', "navigate('/admin/logs')") : '',
    can('logs') ? adminMenuRow('eye','Активность игроков', 'Что открывали и нажимали: по разделам и дням', "navigate('/admin/activity')") : '',
    isOwner() ? adminMenuRow('lock','Данные аккаунтов', 'Пароли, ID, IP и устройства. Только для вас', "navigate('/admin/accounts')") : '',
    can('vip') ? adminMenuRow('bolt','Выдать VIP статус', 'Поиск игрока по ID → его товар → выдать VIP', "navigate('/admin/vip')") : '',
    can('disputes') ? adminMenuRow('shield','Жалобы на отзывы', 'Удалить отзыв или отклонить жалобу', "navigate('/admin/reports')") : '',
    can('hold') ? adminMenuRow('clock','Отключить задержку денег', 'По ID игрока: деньги с продаж сразу на баланс', "navigate('/admin/hold')") : '',
    can('staff') ? adminMenuRow('edit','Выдача админки', 'Назначить роль по ID игрока', "navigate('/admin/staff')") : '',
    devAllowed() ? adminMenuRow('edit','Режим разработчика', 'Игры: названия, аватарки, цвета', "navigate('/dev')") : '',
    can('settings') ? adminMenuRow('lock','Настройки', 'Админ-режим в профилях игроков', "navigate('/admin/settings')") : ''
  ].join('');
  return `
  ${topbar({title:'Админ-панель', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
      ${icon('shield',18,'var(--accent-2)')}
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${ADMIN_ROLES[ADMIN.role].label}</div>
      <div class="faint" style="font-size:11px;">${ADMIN.staffId ? 'ID: '+esc(ADMIN.staffId) : 'Полный доступ'}</div></div>
      <button class="btn btn-ghost btn-sm" onclick="exitAdminMode()">Выйти</button>
    </div>
    ${stats ? `<div class="row gap8" style="margin-bottom:16px;flex-wrap:wrap;">${stats}</div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px;">${rows}</div>
  </div>`;
}
