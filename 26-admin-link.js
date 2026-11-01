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
  /* роль админа проверяет сервер по пропуску игрока: таблица admin_links закрыта для чтения */
  const LOOKUP_URL = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/acc-lookup';
  let link = null, linkAcc = '', busy = false;

  async function check(force){
    if(!state || !state.authed || !state.accKey){ link = null; linkAcc = ''; return link; }
    if(busy && !force) return link;
    busy = true;
    try{
      const acc = state.accKey;
      const tok = (function(){ try{ return localStorage.getItem('dp_token') || ''; }catch(e){ return ''; } })();
      const res = await fetch(LOOKUP_URL, { method:'POST', cache:'no-store', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'my_role', token: tok }) });
      if(!res.ok) return link;                                 /* нет связи: ничего не меняем */
      const dd = await res.json();
      const row = dd && dd.role ? { acc: acc, role: dd.role } : null;
      if(state.accKey !== acc) return link;                    /* за время запроса сменили аккаунт */
      const was = !!link;
      link = row && ADMIN_ROLES[row.role] ? row : null;
      linkAcc = link ? acc : '';
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

  /* вход: сначала проверка привязки, затем одно окно с секретным словом (пароль выдачи админки) */
  W.adminLinkEnter = async function(){
    const l = await check(true);
    if(!l){ toast('Админ-доступ не привязан к этому аккаунту','error'); return; }
    openModal(`<div style="padding:22px;max-width:340px;">
      <div class="h2" style="margin-bottom:6px;">Секретное слово</div>
      <div class="muted" style="font-size:13px;margin-bottom:14px;line-height:1.5;">Введите пароль, который выдал вам главный админ. Он нужен один раз при входе и нигде не сохраняется.</div>
      <input id="secWord" class="input" type="password" autocomplete="current-password" placeholder="Секретное слово" style="margin-bottom:10px;width:100%;" onkeydown="if(event.key==='Enter')adminSecretSubmit()">
      <div id="secMsg" style="font-size:13px;min-height:18px;margin-bottom:10px;color:var(--danger);"></div>
      <div class="row gap8">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
        <button id="secBtn" class="btn btn-primary" style="flex:1.4;" onclick="adminSecretSubmit()">Войти</button>
      </div></div>`);
    setTimeout(function(){ const el = document.getElementById('secWord'); if(el) el.focus(); }, 50);
  };

  W.adminSecretSubmit = async function(){
    const el = document.getElementById('secWord'); const msg = document.getElementById('secMsg');
    const say = function(t){ if(msg) msg.textContent = t; };
    const pass = el ? el.value : '';
    const acc = linkAcc;
    if(!pass){ say('Введите секретное слово.'); return; }
    if(!acc || !link){ say('Админ-доступ не привязан. Закройте окно и попробуйте снова.'); return; }
    const btn = document.getElementById('secBtn'); if(btn) btn.disabled = true;
    let res = null;
    try{
      const r = await fetch(SUPPORT_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'admin_check', admin_nick: acc, admin_pass: pass }) });
      res = await r.json();
    }catch(e){ res = null; }
    if(btn) btn.disabled = false;
    if(el) el.value = '';
    if(!res || !res.ok){
      if(res && res.error === 'locked') say('Слишком много попыток. Подождите '+(res.minutes||1)+' мин.');
      else if(!res) say('Нет связи с сервером. Попробуйте ещё раз.');
      else say('Неверное секретное слово.');
      return;
    }
    const role = res.role; let staffId = null, key = 'owner';
    if(role !== 'owner'){
      ensureStaff();
      staffId = link.staff_id;
      const st = staffId && state.staff[staffId];
      if(!st || st.role !== role){ say('Права отозваны главным админом.'); return; }
      key = 'staff_' + staffId;
    }
    if(!lockAcquire(key)){ say('Этот доступ уже занят другим сеансом.'); return; }
    ADMIN_CRED = { nick: acc, pass: pass };
    ADMIN = { role: role, staffId: staffId, key: key, via: 'bot' };
    persistAdminSess();
    /* время входа и устройство записывает сервер (admin-data seen_set); IP браузер не отправляет */
    try{ adminDataCall('seen_set', { device: deviceLabel() }); }catch(e){}
    try{ if(typeof window.__adminReadNow === 'function') window.__adminReadNow(); }catch(e){}
    logOp('Вход в админ-режим (через Telegram-бота)'); saveState();
    closeModal(); toast('Вход выполнен: ' + ADMIN_ROLES[role].label, 'success'); navigate('/admin');
  };

  /* старый вход по паролю на сайте закрыт: пароли принимает только бот */
  W.adminLogin = function(){ toast('Вход по паролю отключён. Привяжите доступ через Telegram-бота','error'); };

  /* при выходе из аккаунта привязка сбрасывается из памяти */
  const _logout = W.logoutAccount;
  if(typeof _logout === 'function') W.logoutAccount = function(){ link = null; linkAcc = ''; return _logout.apply(this, arguments); };
})();
