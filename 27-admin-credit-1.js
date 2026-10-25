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
      <input id="crNick" class="input" placeholder="Ваш ник (главный админ)" style="margin-bottom:8px;width:100%;" autocomplete="username">
      <input id="crPass" class="input" type="password" placeholder="Ваш пароль" style="margin-bottom:14px;width:100%;" autocomplete="current-password">
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
    const nick = v('crNick').trim(), pass = v('crPass');
    if(!target) return say('Укажите ID или ник игрока.');
    if(!(amount > 0 && amount <= 10000000)) return say('Сумма от 1 до 10 000 000 ₽.');
    if(!label) return say('Напишите причину начисления.');
    if(!nick || !pass) return say('Введите ваш ник и пароль.');
    const btn = document.getElementById('crBtn'); if(btn) btn.disabled = true;
    try{
      const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action:'credit', target: target, amount: amount, label: label, admin_nick: nick, admin_pass: pass }) });
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

  /* кнопка в админ-панели: видна только главному админу */
  const _pageAdmin = W.pageAdmin;
  if(typeof _pageAdmin === 'function'){
    W.pageAdmin = function(){
      const html = _pageAdmin.apply(this, arguments);
      if(!(typeof isOwner === 'function' && isOwner())) return html;
      const card = `<div class="card" style="padding:12px 14px;margin-bottom:14px;cursor:pointer;" onclick="openModal(adminCreditSheet())">
        <div style="font-size:14px;font-weight:700;">Начислить деньги</div>
        <div class="faint" style="font-size:11.5px;margin-top:2px;">По ID игрока. Только для главного админа</div></div>`;
      return String(html).replace('<div class="page">', '<div class="page">' + card);
    };
  }
})();
