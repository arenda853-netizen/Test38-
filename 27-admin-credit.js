/* ============================================================
   НАЧИСЛЕНИЕ ДЕНЕГ ИГРОКУ (только главный админ)
   • Баланс меняет только серверная функция: браузер деньги сам не выдаёт.
   • Пополнения из профиля больше нет: кнопка и код удалены из 11-profile-wallet.js.
   Подключается последним, после 26-admin-link.js.
   ============================================================ */
(function(){
  'use strict';
  const W = window;

  function creditSheet(){
    return `<div style="padding:22px;max-width:340px;">
      <div class="h2" style="margin-bottom:4px;">Начислить деньги</div>
      <div class="muted" style="font-size:13px;margin-bottom:14px;line-height:1.45;">Игрок по ID (DP…) или нику. Пароль главного админа проверяет сервер.</div>
      <input id="crTarget" class="input" placeholder="ID или ник игрока" style="margin-bottom:8px;width:100%;">
      <input id="crAmount" class="input" type="number" min="1" placeholder="Сумма, ₽" style="margin-bottom:8px;width:100%;">
      <input id="crLabel" class="input" placeholder="Причина (видна игроку)" maxlength="120" style="margin-bottom:12px;width:100%;">
      <div id="crMsg" style="font-size:13px;margin-bottom:10px;min-height:18px;"></div>
      <div class="row gap8">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
        <button id="crBtn" class="btn btn-primary" style="flex:1.4;" onclick="doAdminCredit()">Начислить</button>
      </div>
    </div>`;
  }
  W.adminCreditSheet = creditSheet;

  W.doAdminCredit = async function(){
    const v = id => (document.getElementById(id) || {}).value || '';
    const msg = document.getElementById('crMsg');
    const say = t => { if(msg){ msg.style.color = 'var(--danger)'; msg.textContent = t; } };
    const target = v('crTarget').trim(), amount = Math.round(Number(v('crAmount'))), label = v('crLabel').trim();
    if(!ADMIN_CRED) return say('Войдите в админ-панель по секретному слову.');
    if(!target) return say('Укажите ID или ник игрока.');
    if(!(amount > 0 && amount <= 10000000)) return say('Сумма от 1 до 10 000 000 ₽.');
    if(!label) return say('Напишите причину начисления.');
    const btn = document.getElementById('crBtn'); if(btn) btn.disabled = true;
    try{
      const r = await adminFetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action:'credit', target: target, amount: amount, label: label, admin_nick: ADMIN_CRED.nick, admin_pass: ADMIN_CRED.pass,
          ref: (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g,'') : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)) }) });
      let d = {}; try{ d = await r.json(); }catch(e){}
      const map = {
        no_target: 'Игрок с таким ID или ником не найден.',
        no_wallet: 'У игрока ещё нет кошелька: пусть один раз зайдёт в игру.',
        bad_admin: 'Неверный ник или пароль главного админа.',
        not_owner: 'Этот аккаунт не главный админ.',
        locked: 'Слишком много неверных попыток. Подождите ' + (d.minutes || 10) + ' мин.',
        bad_amount: 'Сумма от 1 до 10 000 000 ₽.',
        no_label: 'Напишите причину начисления.'
      };
      if(!d.ok){ return say(map[d.error] || ('Нет связи с сервером [код ' + (r.status || '—') + ']')); }
      try{ logOp('Начисление денег игроку ' + d.nick + ': ' + amount + ' ₽ (' + label + ')'); saveState(); }catch(e){}
      if(typeof closeModal === 'function') closeModal();
      toast('Начислено ' + amount.toLocaleString('ru-RU') + ' ₽ игроку ' + d.nick, 'success');
    }catch(e){
      say('Нет связи с сервером. Попробуйте ещё раз.');
    }finally{ if(btn) btn.disabled = false; }
  };


  /* ---------- IP И УСТРОЙСТВА: только роли с доступом, только в памяти вкладки ---------- */
  const IP_ROLES = ['owner','admin','senior','logger'];
  W.canSeeIp = function(){ return !!(ADMIN && IP_ROLES.indexOf(ADMIN.role) >= 0); };

  /* подставляем IP в список аккаунтов, но только после разблокировки на этой вкладке */
  const _readAccDb = W.readAccDb;
  if(typeof _readAccDb === 'function'){
    W.readAccDb = function(){
      const db = _readAccDb.apply(this, arguments);
      const m = W.__IPMAP;
      if(m && db){
        Object.keys(db).forEach(function(k){
          const x = m[k];
          if(x && db[k] && typeof db[k] === 'object'){ db[k].ip = x.ip; db[k].device = x.device; }
        });
      }
      return db;
    };
  }
  const _exitAdmin = W.exitAdminMode;
  if(typeof _exitAdmin === 'function'){
    W.exitAdminMode = function(){ W.__IPMAP = null; return _exitAdmin.apply(this, arguments); };
  }

  W.ipUnlockSheet = function(){
    return `<div style="padding:22px;max-width:320px;">
      <div class="h2" style="margin-bottom:4px;">Показать IP и устройства</div>
      <div class="muted" style="font-size:13px;margin-bottom:14px;line-height:1.45;">Введите ник и пароль вашего аккаунта. Данные открываются только на этой вкладке и не сохраняются.</div>
      <input id="ipNick" class="input" placeholder="Ваш ник" style="margin-bottom:8px;width:100%;" autocomplete="username">
      <input id="ipPass" class="input" type="password" placeholder="Пароль" style="margin-bottom:12px;width:100%;" autocomplete="current-password">
      <div id="ipMsg" style="font-size:13px;margin-bottom:10px;min-height:18px;color:var(--danger);"></div>
      <div class="row gap8">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
        <button id="ipBtn" class="btn btn-primary" style="flex:1.4;" onclick="doIpUnlock()">Открыть</button>
      </div>
    </div>`;
  };

  W.doIpUnlock = async function(){
    const nick = ((document.getElementById('ipNick')||{}).value || '').trim().toLowerCase();
    const pass = (document.getElementById('ipPass')||{}).value || '';
    const msg = document.getElementById('ipMsg');
    const say = function(t){ if(msg) msg.textContent = t; };
    if(!nick || !pass) return say('Введите ник и пароль.');
    const btn = document.getElementById('ipBtn'); if(btn) btn.disabled = true;
    try{
      const r = await adminFetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action:'ipinfo', nick: nick, pass: pass }) });
      let d = {}; try{ d = await r.json(); }catch(e){}
      const map = {
        bad_pass: 'Неверный ник или пароль.',
        locked: 'Слишком много попыток. Подождите ' + (d.minutes || 10) + ' мин.',
        no_access: 'У этого аккаунта нет доступа к IP.'
      };
      if(!d.ok) return say(map[d.error] || ('Нет связи с сервером [код ' + (r.status || '—') + ']'));
      W.__IPMAP = d.map || {};
      if(typeof closeModal === 'function') closeModal();
      toast('IP открыты на этой вкладке', 'success');
      if(typeof onRoute === 'function') onRoute();
    }catch(e){ say('Нет связи с сервером. Попробуйте ещё раз.'); }
    finally{ if(btn) btn.disabled = false; }
  };

  /* кнопка разблокировки на главной админки: только для ролей с доступом и только если ещё не открыто */

})();

/* ---------- ЗАПАСНАЯ КАРТОЧКА: добавляется прямо в открытую страницу админки (только главный админ) ---------- */
