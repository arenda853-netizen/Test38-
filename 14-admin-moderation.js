function pageAdminDisputes(){
  if(!can('disputes')) return adminGuard('Заявки: споры');
  const list = adminAllDeals().filter(d=>d.status==='frozen').sort((a,b)=>b.updatedAt-a.updatedAt);
  return `${topbar({title:'Заявки: споры', back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon('shield',36,'var(--text-faint)')}<div class="h2">Споров нет</div><div class="muted" style="font-size:13px;">Открытых споров сейчас не найдено</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:10px;">
      ${list.map(d=>`
        <div class="card" style="padding:13px 14px;cursor:pointer;" onclick="navigate('/chat/${d.id}')">
          <div class="row between" style="margin-bottom:4px;">
            <span class="h3" style="font-size:13.5px;max-width:68%;">${d.listingTitle}</span>
            <span style="font-weight:800;color:var(--accent-2);">${fmtPrice(d.price)}</span>
          </div>
          <div class="faint" style="font-size:11.5px;">${d.counterparty ? d.counterparty.name : '—'} · ${d.disputeRole==='seller'?'спор открыл продавец':d.disputeRole==='buyer'?'спор открыл покупатель':'спор открыт'} · ${timeAgo(d.updatedAt)}</div>
        </div>`).join('')}
    </div>`}
  </div>`;
}
function pageAdminChats(){
  if(!can('chats')) return adminGuard('Все чаты');
  const list = adminAllDeals().sort((a,b)=>b.updatedAt-a.updatedAt);
  const statusLabel = {active:'Переписка', paid:'Оплачено', frozen:'Спор', completed:'Завершена', cancelled:'Отменена'};
  return `${topbar({title:'Все чаты', back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon('chat',36,'var(--text-faint)')}<div class="h2">Чатов нет</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:10px;">
      ${list.map(d=>`
        <div class="card" style="padding:13px 14px;cursor:pointer;" onclick="navigate('/chat/${d.id}')">
          <div class="row between" style="margin-bottom:4px;">
            <span class="h3" style="font-size:13.5px;max-width:62%;">${d.listingTitle}</span>
            <span class="badge" style="background:var(--surface-2);color:var(--text-dim);">${statusLabel[d.status]||d.status}</span>
          </div>
          <div class="faint" style="font-size:11.5px;">${d.counterparty ? d.counterparty.name : '—'} · ${timeAgo(d.updatedAt)}</div>
        </div>`).join('')}
    </div>`}
  </div>`;
}
function pageAdminListings(){
  if(!can('listings')) return adminGuard('Заявки на публикацию');
  const list = state.listings.filter(l=>l.moderation==='pending');
  return `${topbar({title:'Заявки на публикацию', back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon('tag',36,'var(--text-faint)')}<div class="h2">Заявок нет</div><div class="muted" style="font-size:13px;">Новые объявления появятся здесь на проверку</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:12px;">
      ${list.map(l=>{
        const seller = sellerOf(l);
        const game = GAMES.find(g=>g.id===l.gameId) || {};
        const imgs = (l.images||[]);
        return `
        <div class="card" style="padding:13px 14px;">
          ${imgs.length ? `<div class="scroll-x" style="gap:8px;margin-bottom:10px;">${imgs.map(im=>`<img src="${im}" style="height:110px;border-radius:12px;flex:0 0 auto;object-fit:cover;">`).join('')}</div>` :
            `<div style="height:70px;border-radius:12px;background:linear-gradient(145deg, ${l.color}, ${l.color}99);margin-bottom:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;">${esc(game.name||'')}</div>`}
          <div class="h3" style="font-size:13.5px;">${esc(l.title)}</div>
          <div class="faint" style="font-size:11px;margin:3px 0 8px;">${esc(seller.name)} · ${esc(game.name||'')} · ${esc(l.category||'')} · ${fmtPrice(l.price)}${l.autoDelivery?' · автовыдача':''}</div>
          ${specsHTML(l,true)}
          <div class="muted" style="font-size:12px;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;">${esc(l.description)}</div>
          <div class="row gap8" style="margin-bottom:8px;">
            <button class="btn btn-ghost btn-sm btn-block" onclick="navigate('/item/${l.id}')">${icon('eye',13)} Открыть как у покупателя</button>
          </div>
          <div class="row gap8">
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="openRejectSheet('${l.id}')">${icon('close',13)} Отказать</button>
            <button class="btn btn-accent2 btn-sm" style="flex:1;" onclick="approveListing('${l.id}')">${icon('check',13)} Одобрить</button>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}
let adminBanIdValue = '';
let adminBanIdReason = '';
let adminBanIpReason = '';
let adminBanIpValue = '';
function pageAdminCatalog(){
  if(!can('catalog')) return adminGuard('Каталог');
  const list = state.listings.filter(l=>!l.sold && (!l.moderation || l.moderation==='approved'));
  return `${topbar({title:'Каталог ('+list.length+')', back:true, solid:true})}
  <div class="page">
    ${list.length===0 ? `<div class="empty-state">${icon('grid',36,'var(--text-faint)')}<div class="h2">В каталоге пусто</div></div>` :
    `<div style="display:flex;flex-direction:column;gap:10px;">
      ${list.map(l=>{
        const seller = sellerOf(l);
        return `
        <div class="card" style="padding:13px 14px;cursor:pointer;" onclick="navigate('/admin/catalog/${encodeURIComponent(l.id)}')">
          <div class="row gap12">
            <div class="listing-thumb" style="width:48px;height:48px;background:${l.images && l.images.length ? `url('${l.images[0]}') center/cover` : `linear-gradient(145deg, ${l.color}, ${l.color}99)`};"></div>
            <div style="flex:1;min-width:0;">
              <div class="h3" style="font-size:13px;">${esc(l.title)}</div>
              <div class="faint" style="font-size:11px;margin-top:2px;">${esc(seller.name)} · ${fmtPrice(l.price)}</div>
            </div>
            ${icon('chev',16,'var(--text-faint)')}
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}
function pageAdminCatalogItem(id){
  if(!can('catalog')) return adminGuard('Каталог');
  const l = state.listings.find(x=>x.id===id);
  if(!l) return `${topbar({title:'Товар', back:true, solid:true})}<div class="page empty-state">${icon('search',36,'var(--text-faint)')}<div class="h2">Товар не найден</div></div>`;
  const seller = sellerOf(l);
  const game = GAMES.find(g=>g.id===l.gameId) || {};
  const imgs = (l.images||[]);
  const live = !l.sold && (!l.moderation || l.moderation==='approved');
  return `${topbar({title:'Товар в каталоге', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:13px 14px;">
      ${imgs.length ? `<div class="scroll-x" style="gap:8px;margin-bottom:10px;">${imgs.map(im=>`<img src="${im}" style="height:130px;border-radius:12px;flex:0 0 auto;object-fit:cover;">`).join('')}</div>` :
        `<div style="height:80px;border-radius:12px;background:linear-gradient(145deg, ${l.color}, ${l.color}99);margin-bottom:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;">${esc(game.name||'')}</div>`}
      <div class="h3" style="font-size:14px;">${esc(l.title)}</div>
      <div class="faint" style="font-size:11.5px;margin:4px 0 8px;">${esc(seller.name)}${l.sellerId?' (ID: '+esc(l.sellerId)+')':''} · ${esc(game.name||'')} · ${esc(l.category||'')} · ${fmtPrice(l.price)}</div>
      <div class="muted" style="font-size:12.5px;line-height:1.5;white-space:pre-wrap;">${esc(l.description||'')}</div>
    </div>
    <div style="margin-top:12px;">${specsHTML(l)}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:0;">
      <button class="btn btn-ghost btn-block" onclick="navigate('/item/${esc(l.id)}')">${icon('eye',15)} Открыть как у покупателя</button>
      ${live ? `<button class="btn btn-ghost btn-block" onclick="openModal(adminRemoveReasonSheet('${esc(l.id)}'))">${icon('close',15)} Убрать из каталога</button>` : `<div class="faint" style="font-size:12px;text-align:center;padding:8px;">Товар уже не в каталоге</div>`}
    </div>
  </div>`;
}
function adminRemoveReasonSheet(id){
  return `<div class="h2" style="margin-bottom:6px;">Причина</div>
  <div class="faint" style="font-size:12px;line-height:1.5;margin-bottom:10px;">Напишите, почему товар убирается из каталога. Причина сохранится в логах.</div>
  <textarea class="textarea" id="adminRemoveReason" placeholder="Например: нарушение правил площадки" oninput="adminRemoveReasonInput(this)"></textarea>
  <div class="row gap8" style="margin-top:12px;">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn btn-danger" id="adminRemoveBtn" style="flex:1;opacity:.45;pointer-events:none;" onclick="adminUnpublishListing('${esc(id)}')">Убрать</button>
  </div>`;
}
function adminRemoveReasonInput(el){
  const b = document.getElementById('adminRemoveBtn'); if(!b) return;
  const ok = (el.value||'').trim().length>=3;
  b.style.opacity = ok ? '1' : '.45'; b.style.pointerEvents = ok ? 'auto' : 'none';
}
function adminUnpublishListing(id){
  if(!can('catalog')) return;
  const l = state.listings.find(x=>x.id===id);
  if(!l) return;
  const el = document.getElementById('adminRemoveReason');
  const reason = ((el&&el.value)||'').trim();
  if(reason.length<3){ toast('Укажите причину','error'); return; }
  l.moderation = 'rejected';
  l.removeReason = reason;
  supportNotifySeller(l, 'Ваш товар «'+l.title+'» снят с публикации.\n\nПричина: '+reason);
  logOp('Снято с публикации', id, 'listings', Object.assign(listingSnap(l), {result:'Снято с публикации', reason}));
  saveState();
  closeModal();
  toast('Товар убран из каталога','success');
  navigate('/admin/catalog');
}
function pageAdminBan(){
  if(!can('ban')) return adminGuard('Бан по ID или IP');
  return `${topbar({title:'Бан по ID или IP', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:16px;margin-bottom:14px;">
      <div class="h3" style="font-size:13.5px;margin-bottom:4px;">Забанить по ID аккаунта</div>
      <div class="faint" style="font-size:11.5px;margin-bottom:10px;">Блокирует конкретный аккаунт игрока</div>
      <input class="input" id="banIdInput" placeholder="Например: seller_3" style="margin-bottom:10px;" value="${esc(adminBanIdValue)}" oninput="adminBanIdValue=this.value;">
      <textarea class="textarea" id="banIdReason" placeholder="Причина бана (обязательно)" style="margin-bottom:10px;min-height:70px;" oninput="adminBanIdReason=this.value;">${esc(adminBanIdReason)}</textarea>
      <button class="btn btn-danger btn-block" onclick="banById()">${icon('lock',15)} Забанить аккаунт</button>
    </div>
    <div class="card" style="padding:16px;">
      <div class="h3" style="font-size:13.5px;margin-bottom:4px;">Забанить по IP</div>
      <div class="faint" style="font-size:11.5px;margin-bottom:10px;">Блокирует сеть/провайдера — сразу все аккаунты с этим IP</div>
      <input class="input" id="banIpInput" placeholder="Например: 95.24.11.8" style="margin-bottom:10px;" value="${esc(adminBanIpValue)}" oninput="adminBanIpValue=this.value;">
      <textarea class="textarea" id="banIpReason" placeholder="Причина бана сети (обязательно)" style="margin-bottom:10px;min-height:70px;" oninput="adminBanIpReason=this.value;">${esc(adminBanIpReason)}</textarea>
      <button class="btn btn-danger btn-block" onclick="banByIp()">${icon('lock',15)} Забанить по IP</button>
    </div>
  </div>`;
}
let adminRestrQuery = '';
function pageAdminRestricted(){
  if(!(can('players')||can('freeze')||can('ban')||can('disputes'))) return adminGuard('Забанены и заморожены');
  return `${topbar({title:'Забанены и заморожены', back:true, solid:true})}
  <div class="page">
    <div class="search-bar" style="margin-bottom:16px;">
      ${icon('search',18,'var(--text-faint)')}
      <input class="input" placeholder="ID игрока, например seller_3" value="${esc(adminRestrQuery)}" oninput="adminRestrQuery=this.value; renderRestrictedList();">
    </div>
    <div id="restricted-list" style="display:flex;flex-direction:column;gap:10px;"></div>
  </div>`;
}
function userFrozenDeals(u){ return state.deals.filter(d=>d.counterparty && d.counterparty.id===u.id && d.status==='frozen'); }
function currentRestriction(u){
  const arr = u.restrictions || [];
  for(let i=arr.length-1;i>=0;i--){
    const r = arr[i];
    if(r.on && ((r.kind==='banned'&&u.status==='banned')||(r.kind==='frozen'&&u.status==='frozen'))) return r;
  }
  return null;
}
function restrictedCardHtml(u){
  const stMap = {active:{label:'Активен', color:'var(--accent-2)'}, frozen:{label:'Заморожен', color:'var(--warning)'}, banned:{label:'Забанен', color:'var(--danger)'}};
  const st = stMap[u.status] || stMap.active;
  const cur = currentRestriction(u);
  const who = r => (r.role && ADMIN_ROLES[r.role] ? ADMIN_ROLES[r.role].label : 'Админ') + (r.by && r.by!=='owner' ? ' · '+r.by : '');
  const line = (k,v)=>v?`<div class="faint" style="font-size:11.5px;line-height:1.5;"><span style="opacity:.7;">${k}:</span> ${esc(v)}</div>`:'';
  const frozen = userFrozenDeals(u);
  const past = adminAllDeals().filter(d=>d.counterparty && d.counterparty.id===u.id && d.status!=='frozen' && d.disputeRole);
  const hist = (u.restrictions||[]).slice().reverse().slice(0,6);
  const dealHtml = d => `<div style="background:var(--surface-2);border-radius:10px;padding:9px 11px;margin-top:6px;">
      <div class="row between" style="gap:8px;"><span style="font-size:12.5px;font-weight:700;">${esc(d.listingTitle)}</span><span style="font-size:12px;font-weight:700;color:var(--accent-2);">${fmtPrice(d.price)}</span></div>
      ${line('Спор открыл', d.disputeRole==='seller'?'продавец':(d.disputeRole==='buyer'?'покупатель':'—'))}
      ${line('Статус', d.status==='frozen'?'Заморожена, ждёт решения':(d.status==='completed'?'Спор завершён':(d.status==='cancelled'?'Возврат покупателю':d.status)))}
      <button class="btn btn-ghost btn-sm btn-block" style="margin-top:6px;" onclick="navigate('/chat/${esc(d.id)}')">${icon('chat',13)} Открыть чат</button>
    </div>`;
  return `<div class="card" style="padding:13px 14px;">
    <div class="row between" style="margin-bottom:4px;"><span class="h3" style="font-size:13.5px;">${esc(u.name)}</span><span class="badge" style="background:${st.color}22;color:${st.color};">${st.label}</span></div>
    <div class="faint" style="font-size:11px;font-family:monospace;margin-bottom:6px;">ID: ${esc(u.id)} · IP: ${esc(u.ip||'—')}</div>
    ${cur ? `<div style="border-left:3px solid ${st.color};padding:2px 0 2px 10px;margin:6px 0;">${line('Причина', cur.reason)}${line('Кто', who(cur))}${line('Когда', logTime(cur.ts))}${line('Как', cur.how)}</div>` : (u.status!=='active' ? `<div class="faint" style="font-size:11.5px;margin:6px 0;">Причина не указана (ограничение поставлено до появления этого поля)</div>` : '')}
    ${frozen.length ? `<div style="font-size:12px;font-weight:700;margin-top:8px;color:var(--warning);">Замороженные сделки (${frozen.length})</div>${frozen.map(dealHtml).join('')}` : ''}
    ${past.length ? `<div style="font-size:12px;font-weight:700;margin-top:10px;">Завершённые споры (${past.length})</div>${past.map(dealHtml).join('')}` : ''}
    ${hist.length ? `<div style="font-size:12px;font-weight:700;margin-top:10px;">История ограничений</div>${hist.map(r=>`<div class="faint" style="font-size:11.5px;line-height:1.5;margin-top:4px;">${logTime(r.ts)} · ${r.kind==='banned'?(r.on?'Бан':'Разбан'):(r.on?'Заморозка':'Разморозка')} · ${esc(who(r))}${r.reason?' · '+esc(r.reason):''}</div>`).join('')}` : ''}
  </div>`;
}
function renderRestrictedList(){
  const el = document.getElementById('restricted-list'); if(!el) return;
  const q = adminRestrQuery.trim().toLowerCase();
  let users = allUsers().filter(u=>u.id!=='me').concat(accUsers().map(a=>({id:a.uid||a.key, name:a.nickname||a.key, ip:a.ip||'', status:a.status||'active', restrictions:a.restrictions||[]})));
  if(q) users = users.filter(u=>u.id.toLowerCase().includes(q) || (u.name||'').toLowerCase().includes(q) || (u.ip||'').toLowerCase().includes(q));
  else users = users.filter(u=>u.status==='banned' || u.status==='frozen' || userFrozenDeals(u).length>0);
  if(users.length===0){
    el.innerHTML = `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">${q?'Никого не нашли':'Пока никого нет'}</div><div class="muted" style="font-size:13px;">${q?'Проверьте ID и попробуйте снова':'Забаненных и замороженных нет'}</div></div>`;
    return;
  }
  el.innerHTML = (q?'':`<div class="faint" style="font-size:12px;margin-bottom:2px;">Всего: ${users.length}</div>`) + users.map(restrictedCardHtml).join('');
}
