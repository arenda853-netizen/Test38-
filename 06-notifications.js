function addNotification(title, sub, link){
  if(!Array.isArray(state.notifications)) state.notifications = [];
  state.notifications.unshift({id:uid('ntf'), title, sub:sub||'', link:link||'', ts:Date.now(), read:false});
  if(state.notifications.length>60) state.notifications.length = 60;
  saveState();
}
function unreadNotifs(){ return (state.notifications||[]).filter(n=>!n.read).length; }
function notifyDeal(d, kind){
  try{
    const t = {paid:'Оплата прошла', completed:'Сделка завершена', frozen:'Открыт спор', cancelled:'Сделка отменена'}[kind];
    const sub = {paid:'Ждите передачи товара', completed:'Можно оставить отзыв', frozen:'Деньги заморожены до решения администрации', cancelled:'Деньги возвращены'}[kind];
    if(t) addNotification(t, (d.listingTitle||'')+(sub?' · '+sub:''), '/chat/'+d.id);
  }catch(e){}
}
function openNotifs(){
  openModal(notifSheet());
  (state.notifications||[]).forEach(n=>n.read = true);
  saveState();
  const b = document.getElementById('notifBadge'); if(b) b.remove();
}
function notifGo(link){ closeModal(); if(link) navigate(link); }
function notifClear(){ state.notifications = []; saveState(); closeModal(); toast('Уведомления очищены'); }
function notifSheet(){
  const list = state.notifications || [];
  return `<div class="row between" style="margin-bottom:14px;"><div class="h2">Уведомления</div>${list.length?`<span class="faint" style="font-size:12px;cursor:pointer;" onclick="notifClear()">Очистить</span>`:''}</div>
  ${list.length===0 ? `<div class="faint" style="font-size:13px;padding:18px 0;text-align:center;">Пока нет уведомлений</div>` :
  `<div style="display:flex;flex-direction:column;max-height:55vh;overflow-y:auto;">${list.map(n=>`
    <div class="row gap12" style="padding:10px 0;border-bottom:1px solid #ffffff10;${n.link?'cursor:pointer;':''}" ${n.link?`onclick="notifGo('${n.link}')"`:''}>
      <div class="icon-btn ${n.read?'':'accent'}">${icon('bell',15,n.read?'currentColor':'#fff')}</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:700;">${esc(n.title)}</div><div class="faint" style="font-size:12px;">${esc(n.sub)}</div></div>
      <span class="faint" style="font-size:10.5px;">${timeAgo(n.ts)}</span>
    </div>`).join('')}</div>`}
  <button class="btn btn-ghost btn-block" style="margin-top:16px;" onclick="closeModal()">Закрыть</button>`;
}
