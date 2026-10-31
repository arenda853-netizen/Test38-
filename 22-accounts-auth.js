
  const ACCOUNTS_API_URL = "";
  const ACCOUNTS_LOCAL_KEY = "obmenka_accounts_db";
  function toastOrAlert(msg, type){
    try{ if(typeof toast === 'function'){ toast(msg, type||'default'); return; } }catch(e){}
    alert(msg);
  }
  function readLocalAccounts(){ return readAccDb(); }
  function writeLocalAccounts(db){
  }
  const ACCOUNTS_DB = {
    async find(nickname){
      const key = (nickname || '').trim().toLowerCase();
      if(ACCOUNTS_API_URL){
        try{
          const res = await fetch(ACCOUNTS_API_URL.replace(/\/$/,'') + '/' + encodeURIComponent(key));
          if(res.status === 404) return null;
          if(res.ok) return await res.json();
        }catch(e){}
      }
      const db = readLocalAccounts();
      return db[key] || null;
    },
    async save(nickname, password){
      const key = (nickname || '').trim().toLowerCase();
      if(ACCOUNTS_API_URL){
        try{
          const res = await fetch(ACCOUNTS_API_URL, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ nickname: key, salt: (window.__pwSalt = newPwSalt()), passHash: userPwHash(password, window.__pwSalt) })
          });
          if(res.ok) return true;
        }catch(e){}
      }
      const db = readLocalAccounts();
      db[key] = { nickname: key, salt: (window.__pwSalt2 = newPwSalt()), passHash: userPwHash(password, window.__pwSalt2), uid: newAccUid(), device: deviceLabel(), ip: ((typeof state!=='undefined' && state && state.me && state.me.ip) || ''), createdAt: Date.now(), lastLogin: Date.now() };
      writeLocalAccounts(db);
      return true;
    }
  };
  function applyLocalUser(nickname){
    const key = String(nickname||'').trim().toLowerCase();
    state.me = null;
    state.deals = [];
    state.myListings = [];
    state.favorites = [];
    state.notifications = [];
    state.authed = false;
    state.accKey = null;
    let accData = null;
    try { accData = readAccDb()[key]; } catch(e){}
    if (!accData) { toast('Аккаунт не найден', 'error'); return; }
    state.me = { id: 'me', name: nickname, balance: 0, rating: 0, deals: 0, color: '#6C5CE7', ip: accData.ip || '', status: accData.status || 'active', isAdmin: false, verified: false, avgResponseMin: 8, reviews: [], transactions: [], frozenFunds: [], photo: null };
    state.authed = true;
    state.accKey = key;
    _apply(nickname);
    (async function(){
      try { await loadAccount(key); } catch(e){}
      try{
        if(state && state.me && ready){
          const rm = window.__syncRemoteMe;
          if(isObj(rm)){
            const keep = { transactions: [], isAdmin: false, ip: state.me.ip };
            if(typeof window.__syncOwnBalance === 'number') keep.balance = window.__syncOwnBalance;
            state.me = Object.assign({}, state.me, rm, keep, { name: nickname });
            base['a:'+key+':me'] = J(rm);
          }
          if(Array.isArray(window.__syncRemoteMy)){ state.myListings = window.__syncRemoteMy; base['a:'+key+':my'] = J(window.__syncRemoteMy); } else { state.myListings = []; }
          if(Array.isArray(window.__syncRemoteFav)){ state.favorites = window.__syncRemoteFav; base['a:'+key+':fav'] = J(window.__syncRemoteFav); } else { state.favorites = []; }
          _save(); schedule(100);
          if(typeof onRoute === 'function') onRoute();
        }
      }catch(e){}
    })();
  }

/* ===== НОВЫЙ ВХОД И РЕГИСТРАЦИЯ (через серверную функцию) ===== */
/* ============================================================
   ВХОД И РЕГИСТРАЦИЯ
   Аккаунты живут в Supabase (ключ acc:<ник>) и в памяти вкладки.
   Проверки ника/пароля идут по серверу, а не по пустой памяти.
   Функции синхронизации берутся из window.__SYNC (файл 23).
   ============================================================ */
function authEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
const NICK_RESERVED = ['me','guest','owner','admin','support','system','moderator','root','null','undefined'];
let __authBusy = false;

function toastOrAlert(msg, type){
  try{ if(typeof toast === 'function'){ toast(msg, type||'default'); return; } }catch(e){}
  alert(msg);
}
function authKey(n){ return String(n||'').trim().toLowerCase(); }
function authSetBusy(on){
  __authBusy = !!on;
  const b = document.getElementById('authSubmitBtn');
  if(b){ b.disabled = !!on; b.style.opacity = on ? '.6' : ''; }
}
/* возвращает текст ошибки или '' если ник годится для РЕГИСТРАЦИИ */
function authNickError(nick){
  if(!nick) return 'Введите ник.';
  if(/[А-Яа-яЁё]/.test(nick)) return 'В нике нельзя использовать русские буквы. Только английские (A–Z), цифры и _.';
  if(!/^[A-Za-z0-9_]+$/.test(nick)) return 'В нике можно только английские буквы (A–Z), цифры и знак _ (без пробелов).';
  if(nick.length < 3) return 'Ник слишком короткий: минимум 3 символа.';
  if(nick.length > 20) return 'Ник слишком длинный: максимум 20 символов.';
  if(NICK_RESERVED.indexOf(nick.toLowerCase()) >= 0 || /^dp\d{6,}$/i.test(nick)) return 'Такой ник использовать нельзя.';
  return '';
}
function authModalContent(mode, error, nick){
  mode = mode || 'login';
  const isLogin = mode === 'login';
  const onEnter = "if(event.key==='Enter'){" + (isLogin ? 'submitLocalLogin()' : 'submitLocalRegister()') + "}";
  const filter = isLogin ? '' : `oninput="this.value=this.value.replace(/[^A-Za-z0-9_]/g,'')"`;
  return `
  <div style="padding:22px;max-width:320px;">
    <div class="h2" style="margin-bottom:4px;">${isLogin ? 'Вход' : 'Регистрация'}</div>
    <div class="muted" style="font-size:13px;margin-bottom:16px;">${isLogin ? 'Введите ник и пароль, указанные при регистрации.' : 'Придумайте ник и пароль — они понадобятся для входа с любого устройства.'}</div>
    ${error ? `<div style="color:var(--danger);font-size:13px;margin-bottom:12px;line-height:1.45;">${error}</div>` : ''}
    <input id="authNickInput" class="input" placeholder="Ник" value="${authEsc(nick||'')}" maxlength="${isLogin?40:20}" style="margin-bottom:${isLogin?'10':'4'}px;width:100%;" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" ${filter} onkeydown="${onEnter}">
    ${isLogin ? '' : `<div class="faint" style="font-size:11px;margin-bottom:10px;padding-left:2px;">Только английские буквы, цифры и _ · 3–20 символов</div>`}
    <input id="authPassInput" type="password" class="input" placeholder="Пароль" style="margin-bottom:16px;width:100%;" autocomplete="${isLogin ? 'current-password' : 'new-password'}" onkeydown="${onEnter}">
    <button id="authSubmitBtn" class="btn btn-primary btn-block" style="margin-bottom:10px;" onclick="${isLogin ? 'submitLocalLogin()' : 'submitLocalRegister()'}">
      ${isLogin ? 'Войти' : 'Зарегистрироваться'}
    </button>
    <button class="btn btn-ghost btn-block" onclick="openAuthModal('${isLogin ? 'register' : 'login'}')">
      ${isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
    </button>
    ${isLogin ? `<div class="faint" style="font-size:11.5px;text-align:center;margin-top:14px;cursor:pointer;text-decoration:underline;" onclick="showForgotPasswordInfo()">Забыли пароль?</div>` : ''}
  </div>`;
}
window.showForgotPasswordInfo = function(){
  toastOrAlert('Восстановление пароля пока доступно только через администратора. Обратитесь в поддержку и укажите свой ник.', 'default');
};
window.openAuthModal = function(mode, error, nick){
  if(typeof openModal === 'function'){ openModal(authModalContent(mode, error, nick)); }
};
/* адрес серверной функции входа (файл из шага 1) */
const AUTH_URL = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/swift-worker';
/* пароль проверяет и сохраняет только сервер; браузер лишь получает ответ */
async function authCall(action, nick, pass){
  let r;
  try{
    r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action: action, nick: nick, pass: pass, device: deviceLabel() }) });
  }catch(e){ return { ok:false, error:'net', status:0 }; }
  let d = {}; try{ d = await r.json(); }catch(e){}
  if(!d || typeof d !== 'object') d = {};
  d.status = r.status;
  return d;
}
function authNetMsg(){
  const S0 = window.__SYNC;
  if(!S0) return 'Ошибка: файл 23-sync-supabase.js не загрузился. Откройте консоль браузера (F12 → Console) и пришлите первую красную строку.';
  if(!S0.fetchAccount || !S0.claimAccount) return 'Ошибка: на сайте старая версия файла 23-sync-supabase.js. Замените его новым и обновите страницу.';
  let st = ''; try{ st = window.__SYNC && window.__SYNC.status(); }catch(e){}
  if(st === 'notable') return 'В базе Supabase нет таблицы obmenka_kv. Нужно выполнить SQL из файла 23.';
  if(st === 'denied') return 'Сервер отклонил доступ (проверьте ключ Supabase и политику доступа).';
  const L = window.__SYNC_LAST; const det = L ? ' [код ' + L.status + (L.err ? ': ' + authEsc(L.err) : '') + ']' : '';
  return 'Нет связи с сервером' + det + '. Проверьте интернет и попробуйте ещё раз. Если не помогает, проект Supabase мог быть приостановлен: откройте его в панели Supabase и нажмите Restore.';
}

/* ---------- РЕГИСТРАЦИЯ ---------- */
function authSaveToken(tok){ try{ if(tok) localStorage.setItem('dp_token', tok); }catch(e){} }
window.submitLocalRegister = async function(){
  if(__authBusy) return;
  const nickEl = document.getElementById('authNickInput');
  const passEl = document.getElementById('authPassInput');
  const nick = nickEl ? nickEl.value.trim() : '';
  const pass = passEl ? passEl.value : '';
  const nerr = authNickError(nick);
  if(nerr){ openAuthModal('register', nerr, nick); return; }
  if(!pass){ openAuthModal('register', 'Введите пароль.', nick); return; }
  if(pass.length < 4){ openAuthModal('register', 'Пароль должен быть не короче 4 символов.', nick); return; }
  if(pass.length > 64){ openAuthModal('register', 'Пароль слишком длинный (максимум 64 символа).', nick); return; }
  authSetBusy(true);
  try{
    const d = await authCall('register', nick, pass);
    if(d.error === 'taken'){ openAuthModal('register', 'Ник «' + authEsc(nick) + '» уже занят. Придумайте другой. Если это ваш аккаунт, нажмите «Уже есть аккаунт? Войти».', nick); return; }
    if(d.error === 'bad_nick'){ openAuthModal('register', 'Ник не подходит: только английские буквы, цифры и _ (3–20 символов).', nick); return; }
    if(d.error === 'bad_pass'){ openAuthModal('register', 'Пароль не подходит (от 4 до 64 символов).', nick); return; }
    if(!d.ok){ openAuthModal('register', 'Нет связи с сервером [код ' + (d.status || '—') + ']. Проверьте интернет и попробуйте ещё раз.', nick); return; }
    authSaveToken(d.token);
    try{ if(window.__SYNC && window.__SYNC.fetchAccount) await window.__SYNC.fetchAccount(authKey(nick)); }catch(e){}
    const done = await window.applyLocalUser(nick);
    if(!done){ openAuthModal('login', 'Аккаунт создан, но войти не удалось. Попробуйте войти вручную.', nick); return; }
    if(typeof closeModal === 'function') closeModal();
    toastOrAlert('Вы зарегистрированы! Привет, ' + authEsc(nick), 'success');
  }catch(e){
    console.error(e);
    openAuthModal('register', 'Ошибка в коде: ' + authEsc((e && e.message) || e) + ' (пришлите этот текст)', nick);
  }finally{ authSetBusy(false); }
};

/* ---------- ВХОД ---------- */
window.submitLocalLogin = async function(){
  if(__authBusy) return;
  const nickEl = document.getElementById('authNickInput');
  const passEl = document.getElementById('authPassInput');
  const nick = nickEl ? nickEl.value.trim() : '';
  const pass = passEl ? passEl.value : '';
  if(!nick || !pass){ openAuthModal('login', 'Введите ник и пароль.', nick); return; }
  authSetBusy(true);
  try{
    const d = await authCall('login', nick, pass);
    if(d.error === 'no_account'){ openAuthModal('login', 'Аккаунта с ником «' + authEsc(nick) + '» нет. Проверьте ник или зарегистрируйтесь.', nick); return; }
    if(d.error === 'bad_pass'){ openAuthModal('login', 'Неверный пароль.', nick); return; }
    if(d.error === 'locked'){ openAuthModal('login', 'Слишком много неверных попыток. Подождите ' + (d.minutes || 10) + ' мин.', nick); return; }
    if(!d.ok){ openAuthModal('login', 'Нет связи с сервером [код ' + (d.status || '—') + ']. Проверьте интернет и попробуйте ещё раз.', nick); return; }
    const rec = d.rec || {};
    authSaveToken(d.token);
    if(rec.status === 'banned'){
      const key = authKey(nick);
      try{ localStorage.setItem('dp_site_block', JSON.stringify({nick:key})); }catch(e){}
      if(typeof closeModal === 'function') closeModal();
      try{ enforceAccStatus(); }catch(e){}
      return;
    }
    try{ if(window.__SYNC && window.__SYNC.fetchAccount) await window.__SYNC.fetchAccount(authKey(nick)); }catch(e){}
    const done = await window.applyLocalUser(rec.display || nick);
    if(!done){ openAuthModal('login', 'Не удалось войти. Попробуйте ещё раз.', nick); return; }
    if(typeof closeModal === 'function') closeModal();
    toastOrAlert('Успешный вход! Привет, ' + authEsc(rec.display || rec.nickname || nick), 'success');
  }catch(e){
    console.error(e);
    openAuthModal('login', 'Ошибка в коде: ' + authEsc((e && e.message) || e) + ' (пришлите этот текст)', nick);
  }finally{ authSetBusy(false); }
};

/* при выходе из аккаунта пропуск удаляем из браузера */
(function(){
  const _lo = window.logoutAccount;
  if(typeof _lo === 'function'){
    window.logoutAccount = function(){ try{ localStorage.removeItem('dp_token'); }catch(e){} return _lo.apply(this, arguments); };
  }
})();

/* ---------- вход держится в браузере до выхода: после перезагрузки пароль не спрашиваем ---------- */
(function(){
  let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok) return;
  async function restoreSession(){
    try{
      const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'me', token: tok }) });
      const d = await r.json();
      if(d && d.ok && d.token) authSaveToken(d.token);   /* пропуск обновляется при каждом входе */
      if(!d || !d.ok){
        /* пропуск недействителен: только тогда стираем; при сбое связи оставляем */
        if(d && d.error === 'bad_token'){ try{ localStorage.removeItem('dp_token'); }catch(e){} }
        return;
      }
      const key = String(d.acc || '').trim().toLowerCase();
      if(!key) return;
      if(window.__SYNC && window.__SYNC.whenReady){ try{ await window.__SYNC.whenReady(10000); }catch(e){} }
      try{ if(window.__SYNC && window.__SYNC.fetchAccount) await window.__SYNC.fetchAccount(key); }catch(e){}
      await window.applyLocalUser((d.rec && d.rec.display) || key);
    }catch(e){}
  }
  window.addEventListener('DOMContentLoaded', restoreSession);
})();

/* выход или вход в другой вкладке: эта вкладка перечитывает страницу и тоже выходит */
window.addEventListener('storage', function(e){
  if(e.key === 'dp_token') location.reload();
});
