/* ============================================================
   ВХОД В АДМИН-ПАНЕЛЬ ЧЕРЕЗ TELEGRAM-БОТА
   Пункт «Админ-панель» в настройках показывается только аккаунту, который привязан ботом
   (таблица admin_links в Supabase: писать в неё может только бот). Пароль вводить на сайте не нужно:
   оба пароля (обычный и секретный) проверяет бот.
   Подключается последним, после 25-reviews-appeals.js.
   ============================================================ */
(function(){
  'use strict';
  const W = window;
  const URL_ = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/admin_links';
  let link = null, linkAcc = '', busy = false;

  /* временная диагностика: до 3 раз показывает, почему пункт не появился */
  let diagN = 0, diagLast = '';
  function diag(acc, why){
    const t = 'Админ-привязка: аккаунт «' + acc + '», ' + why;
    if(diagN >= 3 || t === diagLast) return;
    diagN++; diagLast = t;
    try{ toast(t, 'error'); }catch(e){}
  }
  async function check(force){
    if(!state || !state.authed || !state.accKey){ link = null; linkAcc = ''; return link; }
    if(busy && !force) return link;
    busy = true;
    try{
      const acc = state.accKey;
      const res = await fetch(URL_ + '?select=acc,role,staff_id&acc=eq.' + encodeURIComponent(acc), { cache:'no-store', headers:{ apikey: SUPABASE_PUBLISHABLE_KEY } });
      if(!res.ok){ diag(acc, 'ответ сервера ' + res.status); return link; }   /* нет связи: ничего не меняем */
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if(state.accKey !== acc) return link;                    /* за время запроса сменили аккаунт */
      const was = !!link;
      link = row && ADMIN_ROLES[row.role] ? row : null;
      if(!link) diag(acc, row ? ('роль «' + row.role + '» не распознана') : 'в базе нет привязки для этого ника');
      linkAcc = link ? acc : '';
      /* индикатор «общая база онлайн» виден только привязанному админу */
      try{ if(link) localStorage.setItem('obmenka_admin_unlocked','1'); else localStorage.removeItem('obmenka_admin_unlocked'); }catch(e){}
      if(link && !was){
        const mr = document.getElementById('modal-root');
        if(mr && mr.innerHTML.indexOf('Выйти из аккаунта') >= 0 && !ADMIN) openModal(settingsSheet());   /* обновить открытые настройки */
      }
      if(!link && ADMIN && ADMIN.via === 'bot') forceExitAdmin('Админ-доступ отвязан в Telegram');
    }catch(e){} finally{ busy = false; }
    return link;
  }
  setInterval(function(){ try{ if(!document.hidden) check(false); }catch(e){} }, 4000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) check(false); });

  /* пункт в настройках — только для привязанного аккаунта (старые способы открытия больше не работают) */
  W.adminUnlocked = function(){ return !!(link && state && state.authed && linkAcc === state.accKey); };
  W.isStaffAccount = function(){ return false; };
  W.staffForceCheck = function(){ return check(true); };

  W.adminAccessSheet = function(){
    const lbl = link && ADMIN_ROLES[link.role] ? ADMIN_ROLES[link.role].label : '';
    return `<div class="h2" style="margin-bottom:6px;">Админ-панель</div>
    <div class="muted" style="font-size:13px;margin-bottom:14px;line-height:1.5;">Доступ привязан через Telegram-бота${lbl ? '. Ваша роль: <b>' + lbl + '</b>' : ''}. Пароль вводить не нужно.</div>
    <div class="row gap8">
      <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" style="flex:1.4;" onclick="adminLinkEnter()">Войти</button>
    </div>`;
  };

  W.adminLinkEnter = async function(){
    const l = await check(true);
    if(!l){ toast('Админ-доступ не привязан к этому аккаунту','error'); return; }
    const role = l.role; let staffId = null, key = 'owner';
    if(role !== 'owner'){
      ensureStaff();
      staffId = l.staff_id;
      const st = staffId && state.staff[staffId];
      if(!st || st.role !== role){ toast('Права отозваны главным админом','error'); return; }
      key = 'staff_' + staffId;
    }
    if(!lockAcquire(key)){ toast('Этот доступ уже занят другим сеансом','error'); return; }
    ADMIN = { role: role, staffId: staffId, key: key, via: 'bot' };
    persistAdminSess();
    try{
      const info = { ts:Date.now(), device:deviceLabel(), ip:(state.me && state.me.ip) || '' };
      if(role === 'owner'){
        const o = Object.assign({}, state.ownerLast || {}, info);
        o.acc = state.accKey;
        try{ const u = supportUidMe(); if(u) o.uid = u; }catch(e){}
        o.accs = (Array.isArray(o.accs) ? o.accs : []).filter(v=>v !== state.accKey).concat([state.accKey]).slice(-5);
        state.ownerLast = o;
      } else if(state.staff[staffId]) state.staff[staffId].last = info;
    }catch(e){}
    logOp('Вход в админ-режим (через Telegram-бота)'); saveState();
    closeModal(); toast('Вход выполнен: ' + ADMIN_ROLES[role].label, 'success'); navigate('/admin');
  };

  /* старый вход по паролю на сайте закрыт: пароли принимает только бот */
  W.adminLogin = function(){ toast('Вход по паролю отключён. Привяжите доступ через Telegram-бота','error'); };

  /* при выходе из аккаунта привязка сбрасывается из памяти */
  const _logout = W.logoutAccount;
  if(typeof _logout === 'function') W.logoutAccount = function(){ link = null; linkAcc = ''; return _logout.apply(this, arguments); };
})();
