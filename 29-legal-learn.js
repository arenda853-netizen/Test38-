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

  function lsGet(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function accKey(){ return (typeof state !== 'undefined' && state && state.accKey) || 'guest'; }
  function learnKey(){ return 'dp_learn_' + accKey(); }
  function agreed(){ return lsGet(AGREE_KEY) === AGREE_VER; }

  ICONS.info = '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>';

  /* ---------- ТЕКСТЫ ДОКУМЕНТОВ (черновик: перед запуском проверьте у юриста и впишите реквизиты) ---------- */
  const OPERATOR = 'Оператор площадки: <b>[ФИО ИП или наименование ОсОО, ИНН, адрес]</b>.';
  const LAW_PD = 'Законом Кыргызской Республики «Об информации персонального характера» (№ 58 от 14.04.2008 с изменениями) и Цифровым кодексом Кыргызской Республики';
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
      '<b>Ваши права.</b> Вы вправе получить сведения о своих данных, потребовать их уточнения или удаления и отозвать согласие. Запрос направляется в поддержку площадки.',
      '<b>Согласие.</b> Отмечая галочку при регистрации, вы даёте письменное или электронное согласие на обработку указанных данных в указанных целях. Согласие можно отозвать, при этом аккаунт может быть закрыт.',
      OPERATOR + ' Контакт для запросов: <b>[укажите e-mail или ссылку на поддержку]</b>.'
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
  /* окно без закрытия по фону: пока соглашение не принято, дальше не пустим */
  W.openAgreeGate = function(){
    if(agreed()) return;
    const root = document.getElementById('modal-root');
    if(!root) return;
    root.innerHTML = `<div class="modal-overlay">
      <div class="modal-sheet"><div class="sheet-handle"></div>
        <div style="padding:6px 2px 4px;">
          <div class="h2" style="margin-bottom:8px;">Обновление соглашения</div>
          <div class="muted" style="font-size:13px;line-height:1.55;margin-bottom:16px;">Чтобы продолжить пользоваться площадкой, примите пользовательское соглашение, правила и политику cookie.
            <span style="color:var(--accent);font-weight:600;cursor:pointer;" onclick="openDoc('agreement', openAgreeGate)">Соглашение</span>,
            <span style="color:var(--accent);font-weight:600;cursor:pointer;" onclick="openDoc('rules', openAgreeGate)">правила</span>,
            <span style="color:var(--accent);font-weight:600;cursor:pointer;" onclick="openDoc('cookies', openAgreeGate)">cookie</span>.</div>
          <button class="btn btn-primary btn-block" style="margin-bottom:10px;" onclick="acceptAgreement()">Принимаю</button>
          <button class="btn btn-ghost btn-block" onclick="logoutAccount()">Выйти из аккаунта</button>
        </div>
      </div></div>`;
  };
  /* после входа или восстановления сессии: если соглашение ещё не принято — показываем */
  (function(){
    const _apply = W.applyLocalUser;
    if(typeof _apply !== 'function') return;
    W.applyLocalUser = async function(){
      const r = await _apply.apply(this, arguments);
      if(r && !agreed()) setTimeout(function(){ W.openAgreeGate(); }, 300);
      return r;
    };
  })();

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
