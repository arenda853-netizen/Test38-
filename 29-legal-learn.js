/* ============================================================
   СОГЛАШЕНИЕ, ДОКУМЕНТЫ, COOKIE-БАННЕР, ОБУЧЕНИЕ ПЕРЕД ПРОДАЖЕЙ
   1) cookie-баннер при первом визите (только информирование: сайт не использует рекламные и аналитические cookie)
   2) соглашение: галочка при регистрации; существующим аккаунтам — одно окно после обновления
   3) документы: соглашение, правила, политика cookie, политика конфиденциальности
   4) обучение: перед первым объявлением человек отмечает «можно / нельзя» по примерам и только потом попадает к анкете
   5) в настройках — кнопки «Обучение и правила» и «Документы и соглашение»
   Подключается после 28-suspicious.js.
   ============================================================ */
(function(){
  'use strict';
  const W = window;
  const AGREE_KEY = 'dp_agree';     /* принятая версия соглашения (на этом устройстве) */
  const AGREE_VER = 'v1';
  const COOKIE_KEY = 'dp_cookies';
  const CONSENT_URL = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/consent-log';

  function lsGet(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function accKey(){ return (typeof state !== 'undefined' && state && state.accKey) || 'guest'; }
  function learnKey(){ return 'dp_learn_' + accKey(); }
  function agreed(){ return lsGet(AGREE_KEY) === AGREE_VER && lsGet('dp_pd_consent') === 'v1'; }

  ICONS.info = '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>';

  /* ---------- ТЕКСТЫ ДОКУМЕНТОВ (черновик: перед запуском проверьте у юриста и впишите реквизиты) ---------- */
  /* реквизиты оператора: пустой шаблон, заполняется владельцем площадки до публикации */
  const OPERATOR = 'Оператор площадки: ____________________ (ФИО ИП или наименование ОсОО), ИНН: ____________, адрес: ____________________________.';
  const LAW_PD = 'Цифровым кодексом Кыргызской Республики (ст. 1, 25, 37) и Законом Кыргызской Республики «Об информации персонального характера» № 58 от 14.04.2008 в части, не отменённой Цифровым кодексом';
  const DOCS = {
    agreement: { title: 'Пользовательское соглашение (публичная оферта)', items: [
      '<b>1. Общие положения.</b> Настоящее соглашение — публичная оферта в смысле Гражданского кодекса Кыргызской Республики. Dropplay — онлайн-площадка, где пользователи размещают объявления о продаже цифровых игровых товаров и заключают между собой сделки. Регистрация или продолжение использования сайта означает принятие соглашения.',
      '<b>2. Статус площадки.</b> Dropplay предоставляет техническую возможность заключить сделку и обеспечивает безопасность расчётов (эскроу). Продавец самостоятельно отвечает за описание и передачу товара, покупатель — за оплату. Площадка не является стороной сделки между пользователями.',
      '<b>3. Аккаунт.</b> Вы отвечаете за сохранность ника и пароля и не передаёте их третьим лицам. Один человек — один аккаунт. Если вы ведёте торговлю на регулярной основе, вы обязаны быть зарегистрированы в установленном порядке (как индивидуальный предприниматель или ОсОО).',
      '<b>4. Расчёты и эскроу.</b> Оплата покупателя удерживается площадкой до подтверждения получения товара или до истечения установленного срока, после чего переводится продавцу за вычетом комиссии. Спорные сделки рассматривает поддержка площадки.',
      '<b>5. Комиссия.</b> Размер комиссии показан при публикации объявления. Продавец получает сумму за вычетом комиссии.',
      '<b>6. Информация о товаре и возврат.</b> Продавец обязан указать характеристики товара, полную цену, условия передачи и гарантии. Права покупателя, предусмотренные законодательством о защите прав потребителей, не отменяются условиями площадки. Поэтому запрет возврата в объявлении не действует.',
      '<b>7. Запрещено.</b> Мошенничество, продажа чужих или краденых аккаунтов, обход площадки для оплаты, спам, оскорбления, накрутка отзывов, нарушение законодательства Кыргызской Республики.',
      '<b>8. Ответственность.</b> За нарушения аккаунт может быть ограничен или заблокирован. Споры решаются через поддержку площадки, а затем в судах Кыргызской Республики по месту нахождения оператора.',
      '<b>9. Изменения.</b> Соглашение можно обновлять. О существенных изменениях сообщим в приложении, понадобится повторное принятие.',
      '<b>10. Законодательство.</b> Соглашение регулируется законодательством Кыргызской Республики, включая Закон «Об электронной торговле» и Гражданский кодекс.',
      OPERATOR
    ]},
    rules: { title: 'Правила площадки', items: [
      '<b>Правильно:</b>',
      '• Указывайте честные характеристики: ранг, уровень, скины — как в игре, и полную цену без скрытых платежей.',
      '• Описывайте состояние аккаунта, включая баны и привязки.',
      '• Данные для входа передавайте только в разделе «Данные аккаунта»: покупатель увидит их после оплаты.',
      '• Общайтесь и подтверждайте сделку внутри площадки.',
      '• Если вы торгуете регулярно, будьте зарегистрированы как ИП или ОсОО.',
      '<b>Нельзя:</b>',
      '• Просить оплату или общение вне площадки, в обход сделки.',
      '• Писать контакты, ссылки и игровые ID в названии и описании объявления.',
      '• Выставлять товар, которого нет, или чужой аккаунт.',
      '• Указывать характеристики, которых на самом деле нет.',
      '• Писать «возврат не предусмотрен»: это не отменяет прав покупателя по закону.',
      'Нарушения разбирает поддержка. За повторные нарушения аккаунт блокируется.'
    ]},
    cookies: { title: 'Политика cookie', items: [
      'Сайт хранит в браузере (localStorage, аналог cookie) только то, без чего он не работает:',
      '• токен входа — чтобы вы оставались в аккаунте до выхода (срок до 30 дней);',
      '• выбранную тему оформления;',
      '• отметки о принятом соглашении, согласии на обработку данных, пройденном обучении и показанном баннере.',
      'Рекламных и аналитических cookie на сайте нет, данные для рекламы не передаются.',
      'Удалить эти данные можно в настройках браузера. Тогда вход придётся выполнить заново, а тема и отметки сбросятся.'
    ]},
    privacy: { title: 'Политика конфиденциальности и согласие на обработку персональных данных', items: [
      'Обработка персональных данных осуществляется в соответствии с ' + LAW_PD + '.',
      '<b>Какие данные.</b> Ник, пароль (хранится только в виде хеша, открытым не хранится), объявления, сделки и сообщения в чатах, данные устройства при входе.',
      '<b>Цели.</b> Вход в аккаунт, проведение сделок и расчётов, поддержка, защита от мошенничества. Собираем только то, что нужно для этих целей.',
      '<b>Кому видно.</b> Другим пользователям — ник, объявления и отзывы. Администрации площадки — данные для разбора споров и безопасности. Государственным органам — в случаях, предусмотренных законом.',
      '<b>Передача за пределы Кыргызской Республики.</b> Если ваши данные будут переданы за пределы Кыргызской Республики, мы заранее сообщим вам об этом.',
      '<b>Сроки.</b> Данные хранятся, пока аккаунт активен, и дольше, если это нужно для разбора споров или по закону.',
      '<b>Ваши права.</b> Вы вправе получить доступ к своим данным и участвовать в определении правил доступа к ним (ст. 37 Цифрового кодекса), потребовать их уточнения или удаления и отозвать согласие. Запрос направляется в поддержку площадки.',
      '<b>Согласие.</b> Отмечая галочки на экране входа, вы даёте согласие на обработку указанных данных в указанных целях. Согласие можно отозвать, при этом аккаунт может быть закрыт. При принятии мы сохраняем дату и время, IP-адрес, сведения о браузере и версию документов, привязывая их к аккаунту.',
      '<b>Оператор данных</b> (владелец персональных записей по Цифровому кодексу КР) определяет цели и способы обработки.',
      OPERATOR + ' Контакт для запросов: ____________________ (e-mail или ссылка на поддержку).'
    ]}
  };

  /* ---------- документы ---------- */
  W.openDoc = function(id, back){
    const d = DOCS[id];
    if(!d) return;
    W.__docBackFn = back || null;
    openModal(`<div style="padding:4px 2px;">
      <div class="h2" style="margin-bottom:12px;">${d.title}</div>
      <div style="max-height:62vh;overflow-y:auto;font-size:13.5px;line-height:1.6;color:var(--text);padding-right:4px;">
        ${d.items.map(p => `<p style="margin:0 0 10px;">${p}</p>`).join('')}
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:12px;" onclick="docBackNow()">${back ? 'Назад' : 'Закрыть'}</button>
    </div>`);
  };
  W.docBackNow = function(){
    const f = W.__docBackFn; W.__docBackFn = null;
    if(typeof f === 'function') f(); else closeModal();
  };
  /* список документов: из настроек возвращаемся в настройки, иначе просто закрываем */
  W.openDocsList = function(from){
    const back = from === 'settings' ? function(){ openModal(settingsSheet()); } : null;
    const rows = [['agreement','Пользовательское соглашение'],['rules','Правила площадки'],['cookies','Политика cookie'],['privacy','Политика конфиденциальности']]
      .map(r => `<div class="row between" style="padding:13px 4px;cursor:pointer;border-bottom:1px solid var(--border-soft);" onclick="openDoc('${r[0]}', ${back ? 'docsBackSettings' : 'null'})"><span style="font-size:14px;font-weight:600;">${r[1]}</span>${icon('chev',16,'var(--text-faint)')}</div>`).join('');
    W.docsBackSettings = back;
    openModal(`<div class="h2" style="margin-bottom:10px;">Документы</div>
      <div style="margin-bottom:14px;">${rows}</div>
      <button class="btn btn-ghost btn-block" onclick="${back ? 'docsBackSettings()' : 'closeModal()'}">${back ? 'Назад' : 'Закрыть'}</button>`);
  };

  /* ---------- соглашение ---------- */
  W.markAgreed = function(){ lsSet(AGREE_KEY, AGREE_VER); };
  W.markPdConsent = function(){ lsSet('dp_pd_consent', 'v1'); };
  W.acceptAgreement = function(){ W.markAgreed(); closeModal(); };
  /* ---------- ОБЯЗАТЕЛЬНЫЙ ЭКРАН: без принятия соглашения и согласия на обработку данных в сайт не пускаем ---------- */
  W.__gateAgree = false; W.__gatePd = false;
  let gateForced = false;
  function accKeyNow(){ return (typeof state !== 'undefined' && state && state.authed && state.accKey) ? state.accKey : ''; }
  function accFlag(k){ return 'dp_consent_' + k; }
  /* отправляет запись о принятии на сервер для аккаунта; при успехе ставит отметку на устройстве */
  function sendConsent(key, onOk){
    const tok = lsGet('dp_token');
    if(!tok || !key) return;
    fetch(CONSENT_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'set', token: tok, agree_ver: AGREE_VER, pd_ver: AGREE_VER }) })
      .then(function(r){ return r.json(); })
      .then(function(d){ if(d && d.ok){ lsSet(accFlag(key), AGREE_VER); if(typeof onOk === 'function') onOk(); } })
      .catch(function(){});
  }
  function gateMainHtml(){
    const link = (id, t) => `<span style="color:var(--accent);font-weight:600;cursor:pointer;" onclick="showAgreeGate('doc','${id}')">${t}</span>`;
    return `<div class="h2" style="margin-bottom:8px;">Добро пожаловать в Dropplay</div>
      <div class="muted" style="font-size:13px;line-height:1.55;margin-bottom:18px;">Чтобы пользоваться площадкой, примите документы и дайте согласие на обработку персональных данных. Без этого вход на сайт недоступен.</div>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--text);margin:0 0 12px;cursor:pointer;">
        <input type="checkbox" ${W.__gateAgree ? 'checked' : ''} onchange="gateCheck('a', this.checked)" style="margin-top:3px;width:18px;height:18px;flex-shrink:0;">
        <span>Я принимаю ${link('agreement','пользовательское соглашение')} и ${link('rules','правила площадки')}</span></label>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--text);margin:0 0 14px;cursor:pointer;">
        <input type="checkbox" ${W.__gatePd ? 'checked' : ''} onchange="gateCheck('p', this.checked)" style="margin-top:3px;width:18px;height:18px;flex-shrink:0;">
        <span>Я даю согласие на обработку персональных данных по ${link('privacy','политике конфиденциальности')}</span></label>
      <div class="faint" style="font-size:12px;line-height:1.5;margin-bottom:16px;">Политика cookie: ${link('cookies','подробнее')}. Согласие на cookie не требуется: сайт использует только необходимое хранилище браузера.</div>
      <button id="gateGo" class="btn btn-primary btn-block" style="margin-bottom:10px;" ${(W.__gateAgree && W.__gatePd) ? '' : 'disabled'} onclick="acceptGate()">Принимаю и продолжить</button>
      ${(typeof state !== 'undefined' && state && state.authed) ? '<button class="btn btn-ghost btn-block" onclick="logoutAccount()">Выйти из аккаунта</button>' : ''}`;
  }
  function gateDocHtml(id){
    const d = DOCS[id];
    return `<div class="h2" style="margin-bottom:12px;">${d.title}</div>
      <div style="font-size:13.5px;line-height:1.6;color:var(--text);">${d.items.map(p => `<p style="margin:0 0 10px;">${p}</p>`).join('')}</div>
      <button class="btn btn-ghost btn-block" style="margin-top:12px;" onclick="showAgreeGate('main')">Назад</button>`;
  }
  W.showAgreeGate = function(view, docId, force){
    if(force) gateForced = true;
    if(!gateForced && agreed()){ const old = document.getElementById('agreeGate'); if(old) old.remove(); return; }
    let el = document.getElementById('agreeGate');
    if(!el){
      el = document.createElement('div');
      el.id = 'agreeGate';
      el.style.cssText = 'position:fixed;inset:0;z-index:200;background:var(--bg);overflow-y:auto;';
      document.body.appendChild(el);
    }
    const inner = view === 'doc' ? gateDocHtml(docId) : gateMainHtml();
    el.innerHTML = `<div style="width:100%;max-width:480px;margin:0 auto;min-height:100%;box-sizing:border-box;padding:28px 18px calc(28px + env(safe-area-inset-bottom,0px));">${inner}</div>`;
  };
  W.gateCheck = function(which, on){
    if(which === 'a') W.__gateAgree = !!on; else W.__gatePd = !!on;
    const b = document.getElementById('gateGo');
    if(b) b.disabled = !(W.__gateAgree && W.__gatePd);
  };
  W.acceptGate = function(){
    if(!(W.__gateAgree && W.__gatePd)) return;
    W.markAgreed(); W.markPdConsent();
    gateForced = false;
    const el = document.getElementById('agreeGate'); if(el) el.remove();
    const key = accKeyNow();
    if(key){ sendConsent(key); }                      /* вошли: пишем на аккаунт сразу */
    else { lsSet('dp_consent_pending', '1'); }        /* ещё не вошли: запишем на аккаунт при входе или регистрации */
  };
  /* после входа, регистрации или восстановления сессии: привязываем согласие к аккаунту */
  (function(){
    const _apply = W.applyLocalUser;
    if(typeof _apply !== 'function') return;
    W.applyLocalUser = async function(){
      const r = await _apply.apply(this, arguments);
      try{
        const key = accKeyNow();
        if(r && key){
          if(lsGet('dp_consent_pending') === '1'){
            sendConsent(key, function(){ lsSet('dp_consent_pending', ''); });
          } else if(lsGet(accFlag(key)) !== AGREE_VER && agreed()){
            /* это аккаунт, у которого на этом устройстве не записано согласие: просим принять */
            setTimeout(function(){ W.showAgreeGate('main', null, true); }, 300);
          }
        }
      }catch(e){}
      return r;
    };
  })();
  W.openAgreeGate = function(){ W.showAgreeGate('main'); };
  /* экран показываем сразу при открытии сайта, пока не приняты соглашение и согласие */
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ W.showAgreeGate('main'); });
  else W.showAgreeGate('main');

  /* ---------- cookie-баннер ---------- */
  function cookieBanner(){
    if(lsGet(COOKIE_KEY)) return;
    const el = document.createElement('div');
    el.id = 'cookieBar';
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));max-width:456px;margin:0 auto;z-index:45;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:12px 14px;box-shadow:0 14px 32px -12px rgba(20,22,28,.35);display:flex;gap:10px;align-items:center;';
    el.innerHTML = `<div style="flex:1;font-size:12.5px;line-height:1.45;color:var(--text-dim);">Сайт использует только необходимое хранилище браузера: вход в аккаунт и тему. Рекламных и аналитических cookie нет.
      <span style="color:var(--accent);font-weight:600;cursor:pointer;" onclick="openDocsList(null)">Подробнее</span></div>
      <button class="btn btn-primary btn-sm" onclick="cookieAccept()">Понятно</button>`;
    document.body.appendChild(el);
  }
  W.cookieAccept = function(){ lsSet(COOKIE_KEY, '1'); const el = document.getElementById('cookieBar'); if(el) el.remove(); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cookieBanner); else cookieBanner();

  /* ---------- обучение: правила и проверка «можно / нельзя» ---------- */
  const LEARN = [
    { t: 'Указать в описании честный ранг и количество скинов, как в игре', ok: true,  why: 'Честные характеристики — основа доверия покупателя.' },
    { t: 'Написать в названии свой Telegram, чтобы договориться напрямую', ok: false, why: 'Контакты в объявлении запрещены: общение и оплата только внутри площадки.' },
    { t: 'Передать логин и пароль через раздел «Данные аккаунта» после покупки', ok: true, why: 'Эти данные покупатель увидит только после оплаты.' },
    { t: 'Попросить оплату переводом на карту, минуя сделку', ok: false, why: 'Оплата в обход сделки не защищена, и такие сделки поддержка не разбирает.' },
    { t: 'Выставить аккаунт, который вам не принадлежит', ok: false, why: 'Продавать можно только то, что принадлежит вам.' },
    { t: 'Честно написать, что в аккаунте были баны или сменилась привязка почты', ok: true, why: 'Честное описание состояния снижает споры.' }
  ];
  W.__learnAns = {};
  W.__learnMode = 'info';
  W.__learnPendingCat = null;

  function learnPassed(){
    return LEARN.every(function(it, i){ const a = W.__learnAns[i]; return !!a && a.correct; });
  }
  function quizHtml(){
    return LEARN.map(function(it, i){
      const a = W.__learnAns[i];
      const sel = (v) => (a && a.choice === v) ? 'btn-primary' : 'btn-ghost';
      const fb = a ? `<div style="font-size:12px;line-height:1.45;margin-top:6px;color:${a.correct ? 'var(--accent-2)' : 'var(--danger)'};">${a.correct ? 'Верно. ' : 'Неверно. '}${it.why}</div>` : '';
      return `<div style="padding:11px 0;border-bottom:1px solid var(--border-soft);">
        <div style="font-size:13.5px;font-weight:600;line-height:1.4;margin-bottom:8px;">${it.t}</div>
        <div class="row gap8">
          <button class="btn btn-sm ${sel(true)}" style="flex:1;" onclick="learnAnswer(${i}, true)">Можно</button>
          <button class="btn btn-sm ${sel(false)}" style="flex:1;" onclick="learnAnswer(${i}, false)">Нельзя</button>
        </div>${fb}</div>`;
    }).join('');
  }
  function learnFooterHtml(){
    if(W.__learnMode === 'gate'){
      const ok = learnPassed();
      return `<div id="learnStatus" class="faint" style="font-size:12px;margin:12px 0 8px;">${ok ? 'Проверка пройдена.' : 'Отметьте все примеры верно, чтобы продолжить.'}</div>
        <button id="learnGo" class="btn btn-primary btn-block" ${ok ? '' : 'disabled'} onclick="learnContinue()">Продолжить к анкете</button>`;
    }
    return `<button class="btn btn-ghost btn-block" style="margin-top:12px;" onclick="learnBack()">Назад</button>`;
  }
  W.learnSheet = function(mode){
    W.__learnMode = mode;
    const rulesBox = (title, color, items) => `<div style="border:1px solid ${color};border-radius:14px;padding:12px 14px;margin-bottom:10px;">
      <div style="font-weight:800;font-size:13px;color:${color};margin-bottom:6px;">${title}</div>
      ${items.map(x => `<div style="font-size:13px;line-height:1.5;margin-bottom:4px;">${x}</div>`).join('')}</div>`;
    return `<div style="padding:4px 2px;">
      <div class="h2" style="margin-bottom:4px;">${mode === 'gate' ? 'Правила продажи' : 'Обучение и правила'}</div>
      <div class="muted" style="font-size:12.5px;line-height:1.5;margin-bottom:12px;">${mode === 'gate'
        ? 'Перед первым объявлением прочитайте правила и отметьте, что можно, а что нельзя.'
        : 'Здесь можно повторить проверку и открыть правила в любой момент.'}</div>
      ${rulesBox('Правильно', 'var(--accent-2)', [
        '• Честные характеристики: ранг, уровень, скины — как в игре.',
        '• Состояние аккаунта, включая баны и привязки.',
        '• Данные для входа — только в разделе «Данные аккаунта» (покупатель увидит их после оплаты).',
        '• Общение и подтверждение сделки внутри площадки.'])}
      ${rulesBox('Нельзя', 'var(--danger)', [
        '• Оплата или общение вне площадки, в обход сделки.',
        '• Контакты, ссылки и игровые ID в названии и описании.',
        '• Товар, которого нет, или чужой аккаунт.',
        '• Характеристики, которых на самом деле нет.'])}
      <div class="section-title" style="margin:14px 0 4px;">Проверка: что можно, а что нельзя</div>
      <div id="learnQuiz">${quizHtml()}</div>
      <div id="learnFoot">${learnFooterHtml()}</div>
    </div>`;
  };
  function learnRerender(){
    const q = document.getElementById('learnQuiz'); if(q) q.innerHTML = quizHtml();
    const f = document.getElementById('learnFoot'); if(f) f.innerHTML = learnFooterHtml();
  }
  W.learnAnswer = function(i, choice){
    W.__learnAns[i] = { choice: choice, correct: choice === LEARN[i].ok };
    learnRerender();
  };
  W.learnContinue = function(){
    if(!learnPassed()) return;
    lsSet(learnKey(), '1');
    closeModal();
    const cat = W.__learnPendingCat; W.__learnPendingCat = null;
    if(cat && typeof W.__origSellPickCat === 'function') W.__origSellPickCat(cat);
  };
  W.learnBack = function(){ openModal(settingsSheet()); };
  W.openLearnInfo = function(){
    W.__learnAns = {};
    openModal(W.learnSheet('info'));
  };

  /* перед выбором категории (шаг 3 — анкета с характеристиками) — проверка правил, если ещё не пройдена */
  (function(){
    const _orig = W.sellPickCat;
    if(typeof _orig !== 'function') return;
    W.__origSellPickCat = _orig;
    W.sellPickCat = function(c){
      if(lsGet(learnKey()) === '1') return _orig.apply(this, arguments);
      W.__learnPendingCat = c;
      W.__learnAns = {};
      openModal(W.learnSheet('gate'));
    };
  })();

  /* кнопки в настройках: обучение и документы */
  (function(){
    const _settings = W.settingsSheet;
    if(typeof _settings !== 'function') return;
    W.settingsSheet = function(){
      const html = _settings.apply(this, arguments);
      const marker = '<button class="btn btn-danger btn-block" onclick="logoutAccount()">';
      if(html.indexOf(marker) < 0) return html;
      const extra = '<div style="margin-bottom:14px;">'
        + profileRow('info', 'Обучение и правила', '', "openLearnInfo()")
        + profileRow('note', 'Документы и соглашение', '', "openDocsList('settings')")
        + '</div>';
      return html.replace(marker, extra + marker);
    };
  })();
})();
