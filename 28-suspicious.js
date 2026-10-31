/* ============================================================
   ПОДОЗРИТЕЛЬНЫЕ АКТИВНОСТИ (админ: владелец и старший админ)
   • Кнопка появляется в админ-панели. Список, история и разморозка — через сервер.
   • Секретное слово не спрашивается: используется вход в админ-панель (ADMIN_CRED), только в памяти вкладки.
   Подключается последним, после 27-admin-credit.js.
   ============================================================ */
(function(){
  'use strict';
  const W = window;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function num(v){ return Number(v || 0).toLocaleString('ru-RU'); }
  function when(ts){ try{ return new Date(Number(ts)).toLocaleString('ru-RU'); }catch(e){ return ''; } }
  function canSee(){ return !!(typeof ADMIN !== 'undefined' && ADMIN && (ADMIN.role === 'owner' || ADMIN.role === 'senior')); }

  async function call(body){
    const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(Object.assign({ admin_nick: ADMIN_CRED && ADMIN_CRED.nick, admin_pass: ADMIN_CRED && ADMIN_CRED.pass }, body)) });
    let d = {}; try{ d = await r.json(); }catch(e){}
    return { status: r.status, d: d };
  }
  const ERR = {
    bad_admin: 'Неверный ник или пароль админа',
    not_allowed: 'Доступ только владельцу и старшему админу',
    locked: 'Слишком много попыток. Подождите немного',
    no_note: 'Напишите причину разморозки',
    no_target: 'Не выбран аккаунт',
    bad_input: 'Введите ник и пароль'
  };
  function errText(d, status){ return ERR[d && d.error] || ('Нет связи с сервером [код ' + status + ']'); }

  /* ---------- окно входа ---------- */
  /* кнопка открывает список сразу: секретное слово уже введено при входе в админ-панель */
  W.openSuspiciousLogin = function(){ suspiciousOpen(); };

  W.suspiciousOpen = async function(){
    if(!ADMIN_CRED){ toast('Войдите в админ-панель по секретному слову','error'); return; }
    const res = await call({ action:'sus_list' });
    if(!res.d.ok){
      if(res.d.error === 'bad_admin') ADMIN_CRED = null;
      toast(errText(res.d, res.status), 'error');
      return;
    }
    suspiciousList(res.d.rows || []);
  };

  function suspiciousList(rows){
    const body = rows.length ? rows.map(function(r){
      return `<div class="card" style="padding:12px;margin-bottom:10px;cursor:pointer;" onclick="suspiciousDetail('${esc(r.acc)}')">
        <div style="font-weight:700;">ID / ник: ${esc(r.acc)}</div>
        <div style="font-size:12px;margin-top:4px;color:var(--danger);">${esc(r.reason || 'причина не указана')}</div>
        <div style="font-size:12px;margin-top:6px;">Баланс на экране: ${num(r.wallet_balance)} ₽ · по партиям: ${num(r.lots_sum)} ₽</div>
        <div style="font-size:12px;">От продаж: ${num(r.from_sales)} · От админа: ${num(r.from_admin)} · Старый баланс: ${num(r.from_legacy)} · Списано всего: ${num(r.spent)}</div>
      </div>`;
    }).join('') : '<div class="muted" style="padding:20px;text-align:center;">Подозрительных аккаунтов нет</div>';
    openModal(`<div style="padding:18px;max-width:400px;max-height:80vh;overflow:auto;">
      <div class="h2" style="margin-bottom:10px;">Подозрительные активности</div>
      ${body}
      <button class="btn btn-ghost btn-block" onclick="closeModal()">Закрыть</button></div>`);
  }

  W.suspiciousDetail = async function(acc){
    const res = await call({ action:'sus_detail', target: acc });
    if(!res.d.ok){ toast(errText(res.d, res.status), 'error'); return; }
    const d = res.d.detail || {};
    const flag = d.flag || {};
    const lots = (d.lots || []).map(function(l){
      return `<div style="font-size:12px;padding:6px 0;border-bottom:1px solid var(--line,#333);">
        <b>${esc(l.origin_type)}</b> · номер: ${esc(l.id)} · происхождение: ${esc(l.origin_id)}<br>
        было ${num(l.balance_before)} → стало ${num(l.balance_after)} · сумма ${num(l.amount)} · остаток ${num(l.remaining)} · ${esc(l.status)}</div>`;
    }).join('') || '<div class="faint" style="font-size:12px;">партий нет</div>';
    const risk = (d.risk || []).map(function(r){
      return `<div style="font-size:12px;padding:4px 0;">${esc(when(Date.parse(r.created_at)))} · ${esc(r.kind)} · ${esc(r.detail || '')}</div>`;
    }).join('') || '<div class="faint" style="font-size:12px;">событий нет</div>';
    const tx = (Array.isArray(d.tx) ? d.tx : []).slice(0, 100).map(function(t){
      return `<div style="font-size:12px;padding:4px 0;">${esc(when(t.ts))} · ${esc(t.type)} · ${num(t.amount)} · ${esc(t.label || '')}</div>`;
    }).join('') || '<div class="faint" style="font-size:12px;">операций нет</div>';
    const problems = (d.check || []).map(function(x){ return '<div style="color:var(--danger);font-size:12px;">• ' + esc(x) + '</div>'; }).join('')
      || '<div style="font-size:12px;">связи сходятся</div>';

    openModal(`<div style="padding:18px;max-width:420px;max-height:82vh;overflow:auto;">
      <div class="h2" style="margin-bottom:8px;">${esc(acc)}</div>
      <div style="font-size:13px;margin-bottom:8px;"><b>Причина:</b> ${esc(flag.reason || '—')}</div>
      <div style="font-size:13px;margin-bottom:6px;"><b>Что не сходится:</b></div>${problems}
      <div style="font-size:13px;margin:12px 0 6px;"><b>Партии (откуда пришло):</b></div>${lots}
      <div style="font-size:13px;margin:12px 0 6px;"><b>События:</b></div>${risk}
      <div style="font-size:13px;margin:12px 0 6px;"><b>История операций:</b></div>${tx}
      ${flag.frozen || flag.withdraw_blocked ? `
      <div style="margin-top:14px;"><b style="font-size:13px;">Разморозка</b></div>
      <input id="susNote" class="input" placeholder="Причина проверки (обязательно)" maxlength="200" style="margin:6px 0 10px;width:100%;">
      <div id="susMsg2" style="font-size:13px;min-height:18px;margin-bottom:8px;"></div>
      <button class="btn btn-primary btn-block" onclick="suspiciousUnfreeze('${esc(acc)}')">Разморозить</button>` : ''}
      <button class="btn btn-ghost btn-block" style="margin-top:10px;" onclick="suspiciousOpenAgain()">Назад к списку</button>
    </div>`);
  };

  W.suspiciousOpenAgain = async function(){
    if(!ADMIN_CRED){ closeModal(); return; }
    const res = await call({ action:'sus_list' });
    if(res.d.ok) suspiciousList(res.d.rows || []); else { closeModal(); toast(errText(res.d, res.status), 'error'); }
  };

  W.suspiciousUnfreeze = async function(acc){
    const note = ((document.getElementById('susNote')||{}).value || '').trim();
    const msg = document.getElementById('susMsg2');
    if(!note){ if(msg){ msg.style.color='var(--danger)'; msg.textContent = 'Напишите причину разморозки'; } return; }
    const res = await call({ action:'sus_unfreeze', target: acc, note: note });
    if(!res.d.ok){ if(msg){ msg.style.color='var(--danger)'; msg.textContent = errText(res.d, res.status); } return; }
    toast('Аккаунт ' + acc + ' разморожен', 'success');
    suspiciousOpenAgain();
  };

  /* кнопка в админ-панели (владелец и старший админ) */
  setInterval(function(){
    try{
      if(!canSee()) return;
      const page = document.querySelector('.page');
      if(!page) return;
      if(document.body.innerText.indexOf('Админ-панель') < 0) return;
      if(document.getElementById('susCard')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = adminMenuRow('shield','Подозрительные активности','Заморозки, история денег, разморозка','openSuspiciousLogin()');
      const card = wrap.firstElementChild;
      card.id = 'susCard';
      page.insertBefore(card, page.firstChild);
    }catch(e){}
  }, 800);
})();
