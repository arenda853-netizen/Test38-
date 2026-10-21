
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
  function authModalContent(mode, error){
    mode = mode || 'login';
    const isLogin = mode === 'login';
    return `
    <div style="padding:22px;max-width:320px;">
      <div class="h2" style="margin-bottom:4px;">${isLogin ? 'Вход' : 'Регистрация'}</div>
      <div class="muted" style="font-size:13px;margin-bottom:16px;">${isLogin ? 'Введите ник и пароль, указанные при регистрации.' : 'Придумайте ник и пароль — они понадобятся для входа с любого устройства.'}</div>
      ${error ? `<div style="color:var(--danger);font-size:13px;margin-bottom:12px;">${error}</div>` : ''}
      <input id="authNickInput" class="input" placeholder="Ник" style="margin-bottom:10px;width:100%;" autocomplete="username">
      <input id="authPassInput" type="password" class="input" placeholder="Пароль" style="margin-bottom:16px;width:100%;" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
      <button class="btn btn-primary btn-block" style="margin-bottom:10px;" onclick="${isLogin ? 'submitLocalLogin()' : 'submitLocalRegister()'}">
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
  window.openAuthModal = function(mode, error){
    if(typeof openModal === 'function'){ openModal(authModalContent(mode, error)); }
  };
  window.submitLocalRegister = async function(){
    const nickEl = document.getElementById('authNickInput');
    const passEl = document.getElementById('authPassInput');
    const nickname = nickEl ? nickEl.value.trim() : '';
    const password = passEl ? passEl.value : '';
    if(!nickname || !password){ openAuthModal('register', 'Введите ник и пароль.'); return; }
    if(password.length < 4){ openAuthModal('register', 'Пароль должен быть не короче 4 символов.'); return; }
    const existing = await ACCOUNTS_DB.find(nickname);
    if(existing){ openAuthModal('register', 'Такой ник уже занят, придумайте другой.'); return; }
    await ACCOUNTS_DB.save(nickname, password);
    applyLocalUser(nickname);
    if(typeof closeModal === 'function') closeModal();
    toastOrAlert('Вы зарегистрированы! Привет, ' + nickname, 'success');
  };
  window.submitLocalLogin = async function(){
    const nickEl = document.getElementById('authNickInput');
    const passEl = document.getElementById('authPassInput');
    const nickname = nickEl ? nickEl.value.trim() : '';
    const password = passEl ? passEl.value : '';
    if(!nickname || !password){ openAuthModal('login', 'Введите ник и пароль.'); return; }
    const account = await ACCOUNTS_DB.find(nickname);
    if(!account || !(account.passHash ? userPwHash(password, account.salt||'') === account.passHash : account.password === password)){
      openAuthModal('register', 'Такого аккаунта нет. Придумайте ник и пароль, чтобы зарегистрироваться.');
      return;
    }
    { const _k = nickname.trim().toLowerCase(), _a = readLocalAccounts()[_k] || account; if(_a && _a.status==='banned'){ try{ localStorage.setItem('dp_site_block', JSON.stringify({nick:_k})); }catch(e){} if(typeof closeModal==='function') closeModal(); enforceAccStatus(); return; } }
    try{ const db = readLocalAccounts(), k = nickname.trim().toLowerCase(); if(db[k]){ db[k].lastLogin = Date.now(); db[k].device = deviceLabel(); db[k].ip = ((state&&state.me&&state.me.ip)||db[k].ip||''); if(!db[k].uid) db[k].uid = 'DP' + Math.floor(100000000 + Math.random() * 900000000); writeLocalAccounts(db); } }catch(e){}
    applyLocalUser(nickname);
    if(typeof closeModal === 'function') closeModal();
    toastOrAlert('Успешный вход! Привет, ' + nickname, 'success');
  };
