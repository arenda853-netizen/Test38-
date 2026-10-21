function pageAuthGate(path){
  const titles = { '/sell': 'Продажа', '/profile': 'Профиль', '/profile/listings': 'Профиль', '/profile/edit': 'Профиль', '/admin': 'Админ-панель' };
  const messages = {
    '/sell': 'Чтобы выставлять товары на продажу, нужно войти или зарегистрироваться.',
    '/profile': 'Чтобы открыть профиль, нужно войти или зарегистрироваться.',
    '/profile/listings': 'Чтобы открыть профиль, нужно войти или зарегистрироваться.',
    '/profile/edit': 'Чтобы открыть профиль, нужно войти или зарегистрироваться.',
    '/admin': 'Доступ только для администрации.'
  };
  return `
  ${topbar({title: titles[path] || 'Вход'})}
  <div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-top:56px;">
    <div class="avatar" style="width:64px;height:64px;background:var(--accent-soft);color:var(--accent);margin-bottom:18px;">${icon('lock',26)}</div>
    <div class="h2" style="margin-bottom:8px;">${titles[path] || 'Требуется вход'}</div>
    <div class="muted" style="font-size:13px;line-height:1.5;max-width:280px;margin-bottom:26px;">${messages[path] || 'Нужно войти или зарегистрироваться.'}</div>
    <button class="btn btn-primary btn-block" style="max-width:320px;" onclick="openAuthModal('login')">
      Войти / зарегистрироваться
    </button>
  </div>`;
}
function frozenFundsCard(me){
  if(!me.frozenFunds || !me.frozenFunds.length) return '';
  const total = me.frozenFunds.reduce((s,f)=>s+f.amount,0);
  const now = Date.now();
  return `
  <div class="card frost-card" style="padding:16px;margin-bottom:16px;">
    <div class="row gap10">
      <div class="frost-icon">${icon('clock',17,'#FFB020')}</div>
      <div style="flex:1;min-width:0;">
        <div class="row between">
          <span style="font-size:13px;font-weight:700;">Заморожено</span>
          <span style="font-size:15.5px;font-weight:800;color:#FFB020;">${fmtPrice(total)}</span>
        </div>
        <div class="faint" style="font-size:10.5px;margin-top:1px;">Зачислится на баланс автоматически после проверки</div>
      </div>
    </div>
    ${me.frozenFunds.map(f=>{
      const startedAt = f.startedAt||now;
      const dur = Math.max(1, f.unlockAt-startedAt);
      const pct = Math.min(100, Math.max(0, (now-startedAt)/dur*100));
      return `
      <div class="frost-row">
        <div class="row between" style="margin-bottom:7px;">
          <span style="font-size:11.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%;">${f.label}</span>
          <span style="font-size:12px;font-weight:700;">${fmtPrice(f.amount)}</span>
        </div>
        <div class="frost-track"><div class="frozen-bar-fill frost-fill" data-start="${startedAt}" data-unlock="${f.unlockAt}" style="width:${pct}%;"></div></div>
        <div class="row between" style="margin-top:5px;">
          <span class="faint" style="font-size:10px;">До разморозки</span>
          <span class="countdown frozen-timer" data-unlock="${f.unlockAt}" style="font-size:11px;color:#FFB020;">--:--:--</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
function pageProfile(){
  const me = state.me;
  const myListingsCount = state.myListings.length;
  const activeDeals = state.deals.filter(d=>d.status==='paid'||d.status==='frozen').length;
  return `
  ${topbar({title:'Профиль'})}
  <div class="page">
    <div class="card" style="padding:18px;margin-bottom:16px;background:linear-gradient(150deg, var(--accent-soft), var(--surface));">
      <div class="row gap12">
        <div class="avatar" style="width:58px;height:58px;font-size:19px;background:${me.photo ? 'transparent' : me.color};overflow:hidden;">${me.photo ? `<img src="${me.photo}" style="width:100%;height:100%;object-fit:cover;">` : initials(me.name)}</div>
        <div style="flex:1;min-width:0;">
          <div class="row gap8" style="flex-wrap:wrap;"><span class="h2" style="font-size:16px;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${me.name}</span>${me.verified?`<span class="badge badge-verified">${icon('shield',10)} Проверен</span>`:''}</div>
          ${me.email ? `<div class="faint" style="font-size:11px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${me.email}</div>` : ''}
          <div onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(supportUidMe()||me.id)}').catch(()=>{}); toast('ID скопирован','success');" style="display:inline-block;max-width:100%;margin-top:5px;padding:2px 8px;border-radius:7px;background:var(--surface-2);font-size:10.5px;font-family:monospace;color:var(--text-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;">ID: ${esc(supportUidMe()||me.id)}</div>
          <div class="row gap8" style="margin-top:4px;">${starsHtml(me.rating)} <span class="faint" style="font-size:12px;">· ${me.deals} сделок</span></div>
        </div>
        <div class="icon-btn" style="flex-shrink:0;" onclick="navigate('/profile/edit')">${icon('edit',16)}</div>
        <div class="icon-btn" style="flex-shrink:0;" onclick="openModal(settingsSheet())">${icon('settings',16)}</div>
      </div>
    </div>
    <div class="row gap12" style="margin-bottom:12px;">
      <div class="card" style="flex:1;padding:14px;text-align:center;">
        <div class="h1" style="font-size:19px;color:var(--accent-2);">${fmtPrice(me.balance)}</div>
        <div class="faint" style="font-size:11px;margin-top:2px;">Баланс</div>
      </div>
      <div class="card" style="flex:1;padding:14px;text-align:center;">
        <div class="h1" style="font-size:19px;">${activeDeals}</div>
        <div class="faint" style="font-size:11px;margin-top:2px;">Активных сделок</div>
      </div>
    </div>
    ${frozenFundsCard(me)}
    <div class="row gap8" style="margin-bottom:8px;">
      <button class="btn btn-primary" style="flex:1;" onclick="topUpBalance()">${icon('wallet',16,'#fff')} Пополнить</button>
      <button class="btn btn-ghost" style="flex:1;" onclick="openModal(withdrawSheet())">${icon('logout',16)} Вывести</button>
    </div>
    <div class="card" style="padding:0;margin-bottom:20px;overflow:hidden;">
      <div class="row between" style="padding:12px 14px;cursor:pointer;" onclick="toggleTxHistory()">
        <span style="font-size:12.5px;font-weight:700;">История операций</span>
        <div class="icon-btn" style="width:26px;height:26px;transform:rotate(${txHistoryOpen?'-90deg':'90deg'});transition:transform .15s;">${icon('chev',14)}</div>
      </div>
      ${txHistoryOpen ? `
      <div style="border-top:1px solid var(--border-soft);max-height:260px;overflow-y:auto;">
        ${me.transactions.length===0 ? `<div class="faint" style="font-size:12px;padding:14px;">Операций пока нет</div>` :
          me.transactions.map(t=>`
          <div class="row between" style="padding:11px 14px;border-bottom:1px solid var(--border-soft);">
            <div style="min-width:0;">
              <div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px;">${t.label}</div>
              <div class="faint" style="font-size:10.5px;margin-top:2px;">${timeAgo(t.ts)}</div>
            </div>
            <span style="font-size:13px;font-weight:700;color:${t.amount>=0?'var(--accent-2)':'var(--danger)'};white-space:nowrap;">${t.amount>=0?'+':''}${t.amount.toLocaleString('ru-RU')} ₽</span>
          </div>`).join('')}
      </div>` : ''}
    </div>
    ${myListingsCount>0 ? sellerStatsCard() : ''}
    <div style="display:flex;flex-direction:column;gap:2px;">
      ${profileRow('grid','Мои объявления', myListingsCount+' активно', "navigate('/profile/listings')")}
      ${profileRow('chat','Мои сделки', state.deals.length+' всего', "navigate('/chats')")}
      ${profileRow('star','Избранное', state.favorites.length+' товаров', "navigate('/catalog')")}
      ${profileRow('shield','Верификация', me.verified?'Пройдена':'Не пройдена', me.verified?"toast('Аккаунт уже верифицирован','success')":"openModal(verifySheet())")}
      ${profileRow('support','Поддержка', '', "openModal(supportSheet())")}
    </div>
    <div class="faint" style="text-align:center;font-size:10.5px;margin-top:14px;">Сборка ${BUILD_ID}</div>
  </div>`;
}
function sellerStatsCard(){
  const mine = state.listings.filter(l=>state.myListings.includes(l.id));
  const totalViews = mine.reduce((a,l)=>a+l.views,0);
  const completedSales = state.deals.filter(d=>d.status==='completed').length;
  const conversion = totalViews>0 ? ((completedSales/totalViews)*100).toFixed(1) : '0.0';
  const hist = state.statsHistory || [];
  const max = Math.max(...hist, 1);
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  return `<div class="card" style="padding:14px;margin-bottom:16px;">
    <div class="row between" style="margin-bottom:12px;">
      <div class="h3">Статистика продавца</div>
      <span class="faint" style="font-size:11px;">за 7 дней</span>
    </div>
    <div class="row gap12" style="margin-bottom:14px;">
      <div style="flex:1;text-align:center;">
        <div class="h2" style="font-size:16px;">${totalViews}</div>
        <div class="faint" style="font-size:10.5px;">просмотров</div>
      </div>
      <div style="flex:1;text-align:center;">
        <div class="h2" style="font-size:16px;color:var(--accent-2);">${conversion}%</div>
        <div class="faint" style="font-size:10.5px;">конверсия в продажу</div>
      </div>
      <div style="flex:1;text-align:center;">
        <div class="h2" style="font-size:16px;">${completedSales}</div>
        <div class="faint" style="font-size:10.5px;">продаж</div>
      </div>
    </div>
    <div class="stat-bar-wrap">
      ${hist.map((v,i)=>`<div style="flex:1;text-align:center;">
        <div class="stat-bar" style="height:${Math.max(6,(v/max)*56)}px;" title="${fmtPrice(v)}"></div>
        <div class="faint" style="font-size:9.5px;margin-top:4px;">${days[i]}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function withdrawSheet(){
  return `<div class="h2" style="margin-bottom:4px;">Вывод средств</div>
  <div class="faint" style="font-size:11.5px;margin-bottom:16px;">Доступно к выводу: ${fmtPrice(state.me.balance)}</div>
  <input class="input" type="number" min="1" id="withdrawAmount" placeholder="Сумма вывода, ₽" style="margin-bottom:12px;">
  <select class="select" id="withdrawMethod" style="margin-bottom:16px;">
    <option>На карту (СБП)</option>
    <option>На карту Visa/Mastercard</option>
    <option>Криптокошелёк</option>
  </select>
  <button class="btn btn-primary btn-block" onclick="confirmWithdraw()">Вывести</button>`;
}
function confirmWithdraw(){
  if(frozenGuard('вывод средств недоступен')) return;
  const amt = parseFloat((document.getElementById('withdrawAmount')||{}).value) || 0;
  if(amt<=0){ toast('Введите сумму','error'); return; }
  if(amt>state.me.balance){ toast('Недостаточно средств','error'); return; }
  const method = (document.getElementById('withdrawMethod')||{}).value || '';
  state.me.balance -= amt;
  state.me.transactions.unshift({type:'withdraw', amount:-amt, label:'Вывод средств'+(method?' · '+method:''), ts:Date.now()});
  saveState();
  closeModal();
  toast('Заявка на вывод '+fmtPrice(amt)+' отправлена','success');
  onRoute();
}
function verifySheet(){
  return `<div class="h2" style="margin-bottom:6px;">Верификация аккаунта</div>
  <div class="muted" style="font-size:13px;margin-bottom:14px;line-height:1.5;">
    Верификация повышает доверие покупателей и даёт значок «Проверен». В демо-режиме загрузка документа имитируется.
  </div>
  <div class="upload-tile" style="width:100%;height:80px;margin-bottom:16px;" onclick="toast('Демо: документ загружен')">${icon('image',22)}</div>
  <button class="btn btn-primary btn-block" onclick="confirmVerify()">Отправить на проверку</button>`;
}
function confirmVerify(){
  closeModal();
  toast('Документы отправлены на проверку','success');
  setTimeout(()=>{
    state.me.verified = true;
    saveState();
    toast('Аккаунт верифицирован!','success');
    if(currentHash().path==='/profile') onRoute();
  }, 1800);
}
function profileRow(ic,title,sub,onclick){
  return `<div class="row between" style="padding:13px 4px;cursor:pointer;border-bottom:1px solid var(--border-soft);" onclick="${onclick}">
    <div class="row gap12"><div class="icon-btn">${icon(ic,16)}</div><span style="font-size:14px;font-weight:600;">${title}</span></div>
    <div class="row gap8"><span class="faint" style="font-size:12px;">${sub}</span>${icon('chev',16,'var(--text-faint)')}</div>
  </div>`;
}
/* роль выдана этому аккаунту на сервере (state.staff синхронизируется через базу): ID игрока / ключ / ник / u_-ключ */
function myStaffIds(){
  const out = [];
  try{
    if(!state || !state.authed || !state.accKey) return out;
    const key = String(state.accKey).trim().toLowerCase();
    const db = readAccDb() || {};
    const acc = db[state.accKey] || db[key] || {};
    [key, acc.uid, acc.nickname, acc.key, state.me && state.me.name, supportKeyByName(key), supportKeyMe(), supportUidMe()].forEach(function(x){
      x = String(x||'').trim().toLowerCase(); if(x && out.indexOf(x) < 0) out.push(x);
    });
  }catch(e){}
  return out;
}
function staffMatch(staffObj){
  try{
    const mine = myStaffIds(); if(!mine.length || !staffObj || typeof staffObj !== 'object') return false;
    return Object.keys(staffObj).some(function(id){ return staffObj[id] && mine.indexOf(String(id).trim().toLowerCase()) >= 0; });
  }catch(e){ return false; }
}
function isStaffAccount(){ return staffMatch(state && state.staff); }
function adminUnlocked(){
  try{ if(localStorage.getItem('obmenka_admin_unlocked')==='1') return true; }catch(e){}
  return isStaffAccount();
}
/* принудительная проверка: читаем роли прямо с сервера (минуя очередь синхронизации) и сразу показываем пункт */
let __staffChecking = false;
async function staffForceCheck(){
  if(__staffChecking || !state || !state.authed) return;
  __staffChecking = true;
  try{
    const res = await fetch(SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/obmenka_kv?select=value&key=eq.' + encodeURIComponent('g:staff'), { cache:'no-store', headers:{ apikey: SUPABASE_PUBLISHABLE_KEY } });
    if(!res.ok) return;
    const rows = await res.json();
    const srv = (Array.isArray(rows) && rows[0] && rows[0].value && typeof rows[0].value === 'object') ? rows[0].value : null;
    if(!srv) return;
    const was = isStaffAccount();
    ensureStaff();
    Object.keys(srv).forEach(function(id){ if(srv[id] && !state.staff[id]) state.staff[id] = srv[id]; });
    if(staffMatch(srv)){
      try{ localStorage.setItem('obmenka_admin_unlocked','1'); }catch(e){}
      if(!was){
        const mr = document.getElementById('modal-root');
        if(mr && mr.innerHTML.indexOf('Выйти из аккаунта') >= 0 && !ADMIN) openModal(settingsSheet());
        try{ toast('Вам выдана роль администратора','success'); }catch(e){}
      }
    }
  }catch(e){}
  finally{ __staffChecking = false; }
}
setInterval(function(){ try{ if(state && state.authed && !document.hidden && !ADMIN && !isStaffAccount()) staffForceCheck(); }catch(e){} }, 4000);
function settingsSheet(){
  const me = state.me;
  try{ staffForceCheck(); }catch(e){}
  return `
  <div class="row gap12" style="margin-bottom:18px;">
    <div class="avatar" style="width:44px;height:44px;font-size:15px;background:${me.photo ? 'transparent' : me.color};overflow:hidden;">${me.photo ? `<img src="${me.photo}" style="width:100%;height:100%;object-fit:cover;">` : initials(me.name)}</div>
    <div style="flex:1;min-width:0;">
      <div class="h2" style="font-size:15.5px;">${me.name}</div>
      <div class="faint" style="font-size:11.5px;margin-top:1px;">Вы вошли в аккаунт</div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:18px;">
    ${profileRow('edit','Редактировать профиль','',"closeModal(); navigate('/profile/edit');")}
    ${profileRow('shield','Верификация', me.verified?'Пройдена':'Не пройдена', me.verified?"toast('Аккаунт уже верифицирован','success')":"closeModal(); openModal(verifySheet());")}
    ${profileRow('support','Поддержка', '', "closeModal(); openModal(supportSheet());")}
    ${ADMIN
      ? profileRow('lock','Админ-панель','',"closeModal(); navigate('/admin');") + profileRow('logout','Выйти из режима администратора','',"exitAdminMode();")
      : (adminUnlocked() ? profileRow('lock','Админ-панель','',"closeModal(); openModal(adminAccessSheet());") : '')}
  </div>
  <button class="btn btn-danger btn-block" onclick="logoutAccount()">${icon('logout',16)} Выйти из аккаунта</button>`;
}
function logoutAccount(){
  try{ actLog('account','session','Вышел из аккаунта','Сессии'); actDwell(); }catch(e){}
  if(ADMIN){ try{ logOp('Выход из админ-режима'); lockRelease(ADMIN.key); }catch(e){} ADMIN = null; persistAdminSess(); }
  try{ localStorage.removeItem('obmenka_admin_unlocked'); }catch(e){}
  state.authed = false;
  state.me = { id:'me', name:'Гость', balance:0, rating:0, deals:0, color:'#6C5CE7', ip:'', status:'active', isAdmin:false, verified:false, avgResponseMin:8, reviews:[], transactions:[], frozenFunds:[], photo:null };
  state.deals = [];
  state.myListings = [];
  state.favorites = [];
  state.notifications = [];
  dealsClear();
  saveState();
  closeModal();
  toast('Вы вышли из аккаунта');
  navigate('/');
}
function topUpBalance(){
  if(frozenGuard('пополнение недоступно')) return;
  openModal(topUpSheet());
}
function topUpSheet(){
  return `<div class="h2" style="margin-bottom:4px;">Пополнение баланса</div>
  <div class="faint" style="font-size:11.5px;margin-bottom:16px;">Комиссия площадки при пополнении: ${Math.round(TOPUP_FEE_RATE*100)}%</div>
  <input class="input" type="number" min="1" id="topupAmount" placeholder="Сумма пополнения, ₽" oninput="updateTopupCalc()" style="margin-bottom:14px;">
  <div class="row between" style="padding:8px 2px;">
    <span class="faint" style="font-size:12.5px;">Комиссия (${Math.round(TOPUP_FEE_RATE*100)}%)</span>
    <span id="topupFee" style="font-weight:700;">0 ₽</span>
  </div>
  <div class="divider" style="margin:6px 0;"></div>
  <div class="row between" style="padding:8px 2px;margin-bottom:18px;">
    <span style="font-size:13.5px;font-weight:700;">Зачислится на баланс</span>
    <span id="topupNet" class="h2" style="font-size:16px;color:var(--accent-2);">0 ₽</span>
  </div>
  <button class="btn btn-primary btn-block" onclick="confirmTopUp()">Пополнить</button>`;
}
function updateTopupCalc(){
  const el = document.getElementById('topupAmount');
  const amt = parseFloat(el.value) || 0;
  const fee = Math.round(amt * TOPUP_FEE_RATE);
  const net = amt - fee;
  document.getElementById('topupFee').textContent = (amt>0?fee.toLocaleString('ru-RU'):'0') + ' ₽';
  document.getElementById('topupNet').textContent = (amt>0?net.toLocaleString('ru-RU'):'0') + ' ₽';
}
function confirmTopUp(){
  if(frozenGuard('пополнение недоступно')) return;
  const el = document.getElementById('topupAmount');
  const amt = parseFloat(el.value) || 0;
  if(amt <= 0){ toast('Введите сумму пополнения','error'); return; }
  const fee = Math.round(amt * TOPUP_FEE_RATE);
  const net = amt - fee;
  state.me.balance += net;
  state.me.transactions.unshift({type:'topup', amount:net, label:'Пополнение баланса', ts:Date.now()});
  saveState();
  closeModal();
  toast('Зачислено '+net.toLocaleString('ru-RU')+' ₽ (комиссия '+fee.toLocaleString('ru-RU')+' ₽)','success');
  onRoute();
}
function resetDemo(){
  openModal(`<div class="h2" style="margin-bottom:6px;">Сбросить демо-данные?</div>
    <div class="muted" style="font-size:13px;margin-bottom:16px;">Все объявления, сделки и чаты вернутся к исходному состоянию.</div>
    <div class="row gap8">
      <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
      <button class="btn btn-danger" style="flex:1;" onclick="localStorage.removeItem('${STORAGE_KEY}'); location.hash='/'; location.reload();">Сбросить</button>
    </div>`);
}
function pageMyListings(){
  const mine = state.listings.filter(l=>state.myListings.includes(l.id));
  return `${topbar({title:'Мои объявления', back:true})}
  <div class="page">
    ${mine.length===0 ? `
      <div class="empty-state">${icon('tag',36,'var(--text-faint)')}<div class="h2">Пока нет объявлений</div><div class="muted" style="font-size:13px;">Создайте первое объявление на продажу</div>
      <a href="#/sell"><button class="btn btn-primary" style="margin-top:10px;">${icon('plus',16,'#fff')} Создать объявление</button></a>
      </div>
    ` : `<div style="display:flex;flex-direction:column;gap:10px;">
      ${mine.map(l=>{
        const isPromoted = l.promoted && l.promotedUntil > Date.now();
        return `
        <div class="listing" style="flex-direction:column;align-items:stretch;">
          <div class="row gap12">
            <div class="listing-thumb" style="background:${l.images && l.images.length ? `url('${l.images[0]}') center/cover` : `linear-gradient(145deg, ${l.color}, ${l.color}99)`};">${(l.images && l.images.length) ? '' : ((GAMES.find(g=>g.id===l.gameId)||{}).name?.[0]||'?')}</div>
            <div style="flex:1;min-width:0;" onclick="navigate('/item/${l.id}')">
              <div class="row between" style="align-items:flex-start;">
                <div class="h3" style="font-size:13.5px;max-width:76%;">${l.title}</div>
                ${isPromoted ? `<span class="badge badge-promo">${icon('bolt',10)} ТОП</span>` : ''}
              </div>
              <div class="faint" style="font-size:11.5px;margin-top:4px;">${l.views} просмотров · ${timeAgo(l.createdAt)}</div>
              <div class="h2" style="font-size:15px;color:var(--accent-2);margin-top:6px;">${fmtPrice(l.price)}</div>
            </div>
            <div class="icon-btn" onclick="deleteMyListing('${l.id}')">${icon('trash',15,'var(--danger)')}</div>
          </div>
          <div class="row gap8" style="margin-top:10px;align-items:center;">
            ${l.sold
              ? `<span class="badge" style="background:var(--surface-2);color:var(--text-faint);">${icon('check',11)} Продано</span>`
              : l.moderation==='pending'
                ? `<span class="badge" style="background:#ffcf7a22;color:var(--warning);">${icon('clock',11)} На модерации</span>`
                : l.moderation==='rejected'
                  ? `<span class="badge" style="background:#ff8fa122;color:var(--danger);">${icon('close',11)} Отклонено</span>`
                  : `<span class="badge" style="background:var(--accent-2-soft);color:var(--accent-2);">${icon('check',11)} Активно</span>`}
            ${(!l.sold && l.moderation!=='pending' && l.moderation!=='rejected') ? (isPromoted
              ? `<div class="faint" style="font-size:11.5px;flex:1;">${icon('bolt',12,'var(--warning)')} В топе до ${new Date(l.promotedUntil).toLocaleDateString('ru-RU')}</div>`
              : `<button class="btn btn-sm btn-accent2" style="flex:1;" onclick="openModal(promoteSheet('${l.id}'))">${icon('bolt',13)} Продвинуть</button>`) : ''}
          </div>
          ${(l.moderation==='rejected' && (l.rejectReason||l.removeReason)) ? `<div class="faint" style="font-size:11.5px;line-height:1.5;margin-top:8px;">${l.rejectClause?'Нарушен п. '+esc(l.rejectClause)+' оферты. ':''}Причина: ${esc(l.rejectReason||l.removeReason)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}
function promoteSheet(listingId){
  return `<div class="h2" style="margin-bottom:6px;">Продвижение объявления</div>
  <div class="muted" style="font-size:13px;margin-bottom:16px;line-height:1.5;">
    Объявление поднимется в начало выдачи каталога и получит отметку «ТОП» на ${PROMO_DAYS} дней. По статистике продвинутые объявления получают заметно больше просмотров.
  </div>
  <div class="row between" style="padding:10px 2px;">
    <span style="font-size:13.5px;">Стоимость</span>
    <span class="h2" style="font-size:16px;color:var(--warning);">${PROMO_PRICE} ₽</span>
  </div>
  <div class="row between" style="padding:10px 2px;margin-bottom:16px;">
    <span class="faint" style="font-size:12px;">Ваш баланс</span>
    <span class="faint" style="font-size:12px;">${fmtPrice(state.me.balance)}</span>
  </div>
  <div class="row gap8">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn btn-accent2" style="flex:1.3;" onclick="confirmPromote('${listingId}')">${icon('bolt',15)} Оплатить и продвинуть</button>
  </div>`;
}
function confirmPromote(listingId){
  if(state.me.balance < PROMO_PRICE){ toast('Недостаточно средств на балансе','error'); return; }
  const l = state.listings.find(x=>x.id===listingId);
  if(!l) return;
  state.me.balance -= PROMO_PRICE;
  state.me.transactions.unshift({type:'promo', amount:-PROMO_PRICE, label:'Продвижение объявления «'+l.title+'»', ts:Date.now()});
  l.promoted = true;
  l.promotedUntil = Date.now() + PROMO_DAYS*86400000;
  saveState();
  closeModal();
  toast('Объявление продвинуто на '+PROMO_DAYS+' дней','success');
  onRoute();
}
function deleteMyListing(id){
  state.myListings = state.myListings.filter(x=>x!==id);
  state.listings = state.listings.filter(x=>x.id!==id);
  state.deals = state.deals.filter(d=>!(d.listingId === id && d.status==='active'));
  saveState();
  toast('Объявление удалено');
  onRoute();
}
function finalizeListingSale(listingId, price, title){
  try{ addNotification('Товар продан', title+' · '+fmtPrice(price), '/profile'); }catch(e){}
  const idx = state.listings.findIndex(x=>x.id===listingId);
  if(idx>=0) state.listings.splice(idx,1);
  state.myListings = state.myListings.filter(x=>x!==listingId);
  if(holdOffForMe()){
    state.me.balance += price;
    state.me.transactions.unshift({type:'sale', amount:price, label:'Поступление от продажи «'+title+'»', ts:Date.now()});
    saveState();
    return;
  }
  const startedAt = Date.now();
  state.me.frozenFunds.push({
    id: uid('frz'),
    amount: price,
    label: title,
    startedAt,
    unlockAt: startedAt + FREEZE_MS
  });
  startFrozenTicker();
}
let frozenTickerInterval = null;
function startFrozenTicker(){
  if(frozenTickerInterval) return;
  frozenTickerInterval = setInterval(()=>{
    if(!state.me.frozenFunds || !state.me.frozenFunds.length) return;
    const now = Date.now();
    let unlocked = false;
    state.me.frozenFunds = state.me.frozenFunds.filter(f=>{
      if(f.unlockAt <= now || holdOffForMe()){
        state.me.balance += f.amount;
        state.me.transactions.unshift({type:'sale', amount:f.amount, label:'Поступление от продажи «'+f.label+'»', ts:now});
        unlocked = true;
        return false;
      }
      return true;
    });
    if(unlocked){
      saveState();
      if(currentHash().path==='/profile'){ toast('Средства разморожены и зачислены на баланс','success'); onRoute(); }
      return;
    }
    document.querySelectorAll('.frozen-timer').forEach(el=>{
      const left = Math.max(0, parseInt(el.dataset.unlock,10) - now);
      const totalSec = Math.floor(left/1000);
      const hh = String(Math.floor(totalSec/3600)).padStart(2,'0');
      const mm = String(Math.floor((totalSec%3600)/60)).padStart(2,'0');
      const ss = String(totalSec%60).padStart(2,'0');
      el.textContent = hh+':'+mm+':'+ss;
    });
    document.querySelectorAll('.frozen-bar-fill').forEach(el=>{
      const start = parseInt(el.dataset.start,10);
      const unlock = parseInt(el.dataset.unlock,10);
      const pct = Math.min(100, Math.max(0, (now-start)/(unlock-start)*100));
      el.style.width = pct+'%';
    });
  }, 1000);
}
function pageEditProfile(){
  const me = state.me;
  return `${topbar({title:'Редактировать профиль', back:true})}
  <form class="page" onsubmit="return saveProfile(event)">
    <label class="row" style="justify-content:center;margin-bottom:8px;cursor:pointer;">
      <div class="avatar" style="width:76px;height:76px;font-size:24px;background:${me.photo ? 'transparent' : me.color};overflow:hidden;">
        ${me.photo ? `<img src="${me.photo}" style="width:100%;height:100%;object-fit:cover;">` : initials(me.name)}
        <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;border:2px solid var(--bg);">${icon('image',11,'#fff')}</div>
      </div>
      <input type="file" accept="image/*" style="display:none;" onchange="handleAvatarUpload(event)">
    </label>
    <div class="faint" style="font-size:11px;text-align:center;margin-bottom:20px;">Нажмите на аватар, чтобы выбрать фото из галереи</div>
    <div class="section-title">Имя</div>
    <input class="input" id="editName" value="${me.name}" style="margin-bottom:16px;" required>
    <div class="section-title">О себе</div>
    <textarea class="textarea" id="editBio" placeholder="Расскажите немного о себе...">Продаю игровые аккаунты и валюту, работаю с 2022 года.</textarea>
    <button class="btn btn-primary btn-block" style="margin-top:20px;" type="submit">Сохранить</button>
  </form>`;
}
function handleAvatarUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  compressImage(file, 512, 0.85).then(url=>{
    state.me.photo = url;
    saveState();
    onRoute();
    toast('Фото профиля обновлено','success');
  }).catch(()=>toast('Не удалось обработать фото','error'));
}
function saveProfile(e){
  e.preventDefault();
  state.me.name = document.getElementById('editName').value.trim() || state.me.name;
  saveState();
  toast('Профиль обновлён','success');
  navigate('/profile');
  return false;
}


let adminQuery = '';
function cleanSellers(){
  if(state && Array.isArray(state.sellers)){
    const f = state.sellers.filter(s=>s && s.id!=='me');
    if(f.length !== state.sellers.length) state.sellers = f;
  }
}
function miniUser(key){
  try{
    const k = String(key||'').trim().toLowerCase();
    const a = accUsers().find(x=>x.key===k);
    if(a) return pseudoSeller(a);
    return { id: supportKeyByName(k), name: k || 'Игрок', color:'#6C5CE7', rating:0, deals:0, reviews:[], status:'active' };
  }catch(e){ return null; }
}
function allUsers(){
  cleanSellers();
  const list = [...state.sellers];
  if(!list.find(u=>u.id==='me')) list.push(state.me);
  return list;
}
