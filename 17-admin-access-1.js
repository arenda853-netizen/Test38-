/* ================= ДОСТУП АДМИНИСТРАЦИИ ================= */
const MASTER_HASH = 'e96e2bb77fc6cad3d8b35f81653b0ad006c60e511528cc302765d12b04a689a2';
const ADMIN_ROLES = {
  owner:     {label:'Главный админ', perms:['listings','catalog','disputes','chats','players','freeze','ban','finance','logs','staff','settings','vip','hold','dev']},
  moderator: {label:'Модератор',     perms:['listings']},
  junior:    {label:'Младший админ', perms:['catalog','listings']},
  admin:     {label:'Админ',         perms:['listings','disputes','players','freeze']},
  senior:    {label:'Старший админ', perms:['finance','players','freeze','listings']},
  logger:    {label:'Логер',         perms:['logs']},
  developer: {label:'Разработчик',   perms:['dev']}
};
let ADMIN = null; // {role, staffId, key} — только в памяти вкладки и sessionStorage
const ADMIN_SESS_KEY = 'obmenka_admin_sess';
const SID = (function(){
  try{
    let x = sessionStorage.getItem('obm_sid');
    if(!x){ x = Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('obm_sid', x); }
    return x;
  }catch(e){ return Math.random().toString(36).slice(2); }
})();
function sha256(str){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const b = unescape(encodeURIComponent(str)); const bytes=[];
  for(let i=0;i<b.length;i++) bytes.push(b.charCodeAt(i));
  const l = bytes.length*8; bytes.push(0x80);
  while(bytes.length%64!==56) bytes.push(0);
  for(let i=7;i>=0;i--) bytes.push(i>=4 ? 0 : (l>>>(i*8))&255);
  let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let o=0;o<bytes.length;o+=64){
    const w=new Array(64);
    for(let i=0;i<16;i++) w[i]=(bytes[o+i*4]<<24)|(bytes[o+i*4+1]<<16)|(bytes[o+i*4+2]<<8)|bytes[o+i*4+3];
    for(let i=16;i<64;i++){
      const s0=rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3), s1=rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10);
      w[i]=(w[i-16]+s0+w[i-7]+s1)|0;
    }
    let [a,b2,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){
      const S1=rotr(e,6)^rotr(e,11)^rotr(e,25), ch=(e&f)^(~e&g), t1=(h+S1+ch+K[i]+w[i])|0;
      const S0=rotr(a,2)^rotr(a,13)^rotr(a,22), mj=(a&b2)^(a&c)^(b2&c), t2=(S0+mj)|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b2;b2=a;a=(t1+t2)|0;
    }
    H=[(H[0]+a)|0,(H[1]+b2)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0];
  }
  return H.map(x=>('00000000'+(x>>>0).toString(16)).slice(-8)).join('');
}
function hashPw(pw){ return sha256('obmenka|'+pw); }
function can(perm){ return !!(ADMIN && ADMIN_ROLES[ADMIN.role].perms.includes(perm)); }
function isOwner(){ return !!(ADMIN && ADMIN.role==='owner'); }
function ensureStaff(){ if(!state.staff) state.staff = {}; if(!Array.isArray(state.logs)) state.logs = []; }
function logOp(action, details, cat, data){
  if(!ADMIN) return;
  ensureStaff();
  const actor = ADMIN.staffId||'owner', now = Date.now();
  const last = state.logs[state.logs.length-1];
  if(last && last.actor===actor && last.action===action && (last.details||'')===(details||'') && (!cat || (cat==='views' && now-last.ts<60000)) && now-last.ts<(cat==='views'?60000:10000)) return;
  const e = {ts:now, role:ADMIN.role, actor, action, details:details||''};
  if(cat) e.cat = cat;
  if(data) e.data = data;
  state.logs.push(e);
  if(state.logs.length>3000) state.logs.splice(0, state.logs.length-3000);
  try{ actMirrorLog(e); }catch(_){}
}
function listingSnap(l){
  const sl = (state.sellers||[]).find(x=>x.id===l.sellerId);
  return {listingId:l.id, title:l.title, price:l.price, sellerId:l.sellerId, sellerName: sl?sl.name:''};
}
/* --- один сеанс на один доступ --- */
function lockKey(k){ return 'obmenka_adminlock_'+k; }
function lockRead(k){ try{ return JSON.parse(localStorage.getItem(lockKey(k))||'null'); }catch(e){ return null; } }
function lockAcquire(k){
  const l = lockRead(k), now = Date.now();
  if(l && l.sid!==SID && now-l.ts < 20000) return false;
  try{ localStorage.setItem(lockKey(k), JSON.stringify({sid:SID, ts:now})); }catch(e){ return false; }
  const c = lockRead(k); return !!(c && c.sid===SID);
}
function lockRelease(k){ const l = lockRead(k); if(l && l.sid===SID) try{ localStorage.removeItem(lockKey(k)); }catch(e){} }
/* токен админа выдаёт сервер (SQL-функция obmenka_admin_login): без него база не принимает запись в защищённые ключи */
function adminHdr(){ try{ return window.__adminTok ? { 'x-admin-token': window.__adminTok } : {}; }catch(e){ return {}; } }
async function adminTokenFetch(pw){
  window.__adminTok = '';
  try{
    const res = await fetch(SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/rpc/obmenka_admin_login', { method:'POST', headers:{ apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ p_pw: h }) });
    if(!res.ok) return;
    const j = await res.json();
    if(j && j.ok && j.token){ window.__adminTok = j.token; try{ sessionStorage.setItem('obmenka_admin_tok', j.token); }catch(e){} }
  }catch(e){}
}
function persistAdminSess(){ try{ if(ADMIN) sessionStorage.setItem(ADMIN_SESS_KEY, JSON.stringify(ADMIN)); else { sessionStorage.removeItem(ADMIN_SESS_KEY); sessionStorage.removeItem('obmenka_admin_tok'); window.__adminTok = ''; } }catch(e){} }
function adminRestore(){
  try{
    const raw = sessionStorage.getItem(ADMIN_SESS_KEY); if(!raw) return;
    const a = JSON.parse(raw); ensureStaff();
    if(!ADMIN_ROLES[a.role]) return;
    if(a.role!=='owner'){ const st = state.staff[a.staffId]; if(!st || st.role!==a.role){ persistAdminSess(); sessionStorage.removeItem(ADMIN_SESS_KEY); return; } }
    if(!lockAcquire(a.key)){ sessionStorage.removeItem(ADMIN_SESS_KEY); return; }
    ADMIN = a;
    try{ window.__adminTok = sessionStorage.getItem('obmenka_admin_tok') || ''; }catch(e){}
  }catch(e){}
}
function forceExitAdmin(msg){
  if(ADMIN) lockRelease(ADMIN.key);
  ADMIN = null; persistAdminSess();
  if(msg) toast(msg,'error');
  if(currentHash().path.startsWith('/admin') || currentHash().path.startsWith('/seller/')) navigate('/profile'); else onRoute();
}
setInterval(function(){
  if(!ADMIN) return;
  const l = lockRead(ADMIN.key);
  if(l && l.sid!==SID && Date.now()-l.ts<20000){ forceExitAdmin('Доступ занят другим сеансом'); return; }
  if(ADMIN.role!=='owner'){
    ensureStaff(); try{ const raw = {staff: state.staff}; const st = (raw.staff||{})[ADMIN.staffId];
      if(!st || st.role!==ADMIN.role){ forceExitAdmin('Ваши права отозваны'); return; } }catch(e){}
  }
  try{ localStorage.setItem(lockKey(ADMIN.key), JSON.stringify({sid:SID, ts:Date.now()})); }catch(e){}
}, 5000);
window.addEventListener('pagehide', function(){ if(ADMIN) lockRelease(ADMIN.key); });

function adminAccessSheet(){
  return `<div class="h2" style="margin-bottom:6px;">Доступ администратора</div>
  <div class="muted" style="font-size:13px;margin-bottom:12px;line-height:1.5;">Введите свой пароль доступа. Одним паролем одновременно может пользоваться только один сеанс.</div>
  <input class="input" id="adminPw" type="password" autocomplete="off" placeholder="Пароль" style="margin-bottom:14px;" onkeydown="if(event.key==='Enter')adminLogin()">
  <div class="row gap8">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" style="flex:1;" onclick="adminLogin()">Войти</button>
  </div>`;
}
async function adminLogin(){
  const el = document.getElementById('adminPw'); const pw = el ? el.value : '';
  let f = {n:0, until:0}; try{ f = JSON.parse(localStorage.getItem('obmenka_admin_fail')||'null') || f; }catch(e){}
  if(Date.now() < f.until){ toast('Слишком много попыток. Подождите '+Math.ceil((f.until-Date.now())/1000)+' с','error'); return; }
  ensureStaff();
  const h = hashPw(pw);
  let role=null, staffId=null, key=null;
  if(h===MASTER_HASH){ role='owner'; key='owner'; }
  else { for(const id in state.staff){ if(state.staff[id].hash===h){ role=state.staff[id].role; staffId=id; key='staff_'+id; break; } } }
  if(!role){
    f.n++; if(f.n>=5){ f.until = Date.now()+60000; f.n=0; }
    try{ localStorage.setItem('obmenka_admin_fail', JSON.stringify(f)); }catch(e){}
    toast('Неверный пароль','error'); return;
  }
  if(!lockAcquire(key)){ toast('Этот доступ уже занят другим сеансом','error'); return; }
  try{ localStorage.removeItem('obmenka_admin_fail'); }catch(e){}
  await adminTokenFetch(pw);
  ADMIN = {role, staffId, key}; persistAdminSess();
  try{ const info = {ts:Date.now(), device:deviceLabel(), ip:(state.me&&state.me.ip)||''}; if(role==='owner') state.ownerLast = info; else if(state.staff[staffId]) state.staff[staffId].last = info; }catch(e){}
  logOp('Вход в админ-режим'); saveState();
  closeModal(); toast('Вход выполнен: '+ADMIN_ROLES[role].label,'success'); navigate('/admin');
}
function exitAdminMode(){
  if(ADMIN){ logOp('Выход из админ-режима'); saveState(); lockRelease(ADMIN.key); }
  ADMIN = null; persistAdminSess();
  closeModal(); toast('Режим администратора выключен'); navigate('/profile');
}

/* --- выдача админки (только главный админ) --- */
let staffFormId='', staffFormPw='', staffFormRole='moderator';
function pageAdminStaff(){
  if(!can('staff')) return adminGuard('Выдача админки');
  ensureStaff();
  const ids = Object.keys(state.staff);
  return `${topbar({title:'Выдача админки', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:16px;margin-bottom:14px;">
      <div class="h3" style="font-size:13.5px;margin-bottom:10px;">Назначить роль</div>
      <input class="input" placeholder="ID игрока, например seller_3" style="margin-bottom:10px;" value="${esc(staffFormId)}" oninput="staffFormId=this.value">
      <input class="input" id="staffPw" placeholder="Пароль (от 30 символов)" style="margin-bottom:6px;" value="${esc(staffFormPw)}" oninput="staffFormPw=this.value; document.getElementById('staffPwLen').textContent=this.value.length+' / 30'">
      <div class="row between" style="margin-bottom:10px;"><span class="faint" id="staffPwLen" style="font-size:11px;">${staffFormPw.length} / 30</span>
        <span style="font-size:11.5px;color:var(--accent-2);cursor:pointer;" onclick="genStaffPw()">Сгенерировать</span></div>
      <select class="input" style="margin-bottom:12px;" onchange="staffFormRole=this.value">
        ${Object.keys(ADMIN_ROLES).filter(r=>r!=='owner').map(r=>`<option value="${r}" ${staffFormRole===r?'selected':''}>${ADMIN_ROLES[r].label}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-block" onclick="grantStaff()">${icon('check',15)} Выдать доступ</button>
    </div>
    <div class="section-title">Выданные доступы (${ids.length})</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${ids.length===0 ? `<div class="faint" style="font-size:12.5px;">Пока никому не выдано</div>` : ids.map(id=>`
        <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px;">
          <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;font-family:monospace;">${esc(id)}</div>
          <div class="faint" style="font-size:11px;">${ADMIN_ROLES[state.staff[id].role].label} · выдан ${timeAgo(state.staff[id].ts)}</div></div>
          <button class="btn btn-ghost btn-sm" onclick="copyStaffCode('${esc(id)}')">Код</button>
          <button class="btn btn-danger btn-sm" onclick="revokeStaff('${esc(id)}')">Отозвать</button>
        </div>`).join('')}
    </div>
  </div>`;
}
function genStaffPw(){
  const ch='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r='';
  const a = new Uint32Array(36); (window.crypto||{getRandomValues:x=>x.forEach((_,i)=>x[i]=Math.random()*4e9)}).getRandomValues(a);
  for(let i=0;i<36;i++) r+=ch[a[i]%ch.length];
  staffFormPw=r; onRoute();
}
function grantStaff(){
  if(!isOwner()){ toast('Выдавать админку может только главный админ','error'); return; }
  const pw = staffFormPw;
  const typed = normId(staffFormId);
  if(!typed){ toast('Введите ID игрока','error'); return; }
  if(typed==='me'){ toast('Нельзя назначить роль на собственный ID','error'); return; }
  const pl = findPlayerById(typed, true);
  if(!pl){ toast('Игрок с таким ID не найден','error'); return; }
  const id = pl.id;
  if(pw.length<30){ toast('Пароль должен быть не короче 30 символов','error'); return; }
  const h = hashPw(pw);
  if(h===MASTER_HASH){ toast('Этот пароль использовать нельзя','error'); return; }
  ensureStaff();
  for(const k in state.staff){ if(k!==id && state.staff[k].hash===h){ toast('Такой пароль уже выдан другому','error'); return; } }
  state.staff[id] = {role:staffFormRole, hash:h, ts:Date.now(), by:'owner'};
  logOp('Выдана роль', id+' → '+ADMIN_ROLES[staffFormRole].label);
  staffFormId=''; staffFormPw='';
  saveState(); toast('Доступ выдан: '+ADMIN_ROLES[staffFormRole].label,'success'); onRoute();
}
function makeStaffCode(id){
  const st = state.staff && state.staff[id]; if(!st) return '';
  const json = JSON.stringify({i:id, r:st.role, h:st.hash});
  return 'ADM-' + btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function copyStaffCode(id){
  if(!isOwner()) return;
  const code = makeStaffCode(id); if(!code) return;
  const done = ()=>toast('Код скопирован. Отправьте его сотруднику вместе с паролем','success');
  try{ navigator.clipboard.writeText(code).then(done, ()=>{ prompt('Скопируйте код:', code); }); }
  catch(e){ prompt('Скопируйте код:', code); }
}
function importStaffCode(text){
  if(!/^ADM-[A-Za-z0-9_-]+$/.test(text)) return false;
  try{
    let b = text.slice(4).replace(/-/g,'+').replace(/_/g,'/'); while(b.length%4) b+='=';
    const o = JSON.parse(decodeURIComponent(escape(atob(b))));
    if(!o || typeof o.i!=='string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(o.i) || !ADMIN_ROLES[o.r] || o.r==='owner' || !/^[0-9a-f]{64}$/.test(o.h)) return false;
    if(o.h===MASTER_HASH) return false;
    ensureStaff();
    state.staff[o.i] = {role:o.r, hash:o.h, ts:Date.now(), by:'code'};
    try{ localStorage.setItem('obmenka_admin_unlocked','1'); }catch(e){}
    saveState();
    return true;
  }catch(e){ return false; }
}
function revokeStaff(id){
  if(!isOwner()) return;
  ensureStaff(); delete state.staff[id];
  logOp('Роль отозвана', id); saveState(); toast('Доступ отозван'); onRoute();
}

/* --- настройки, финансы, логи --- */
function pageAdminSettings(){
  if(!can('settings')) return adminGuard('Настройки');
  const on = !!state.adminMode;
  return `${topbar({title:'Настройки', back:true, solid:true})}
  <div class="page">
    <div class="card" style="padding:16px;">
      <div class="row between" style="align-items:center;margin-bottom:8px;">
        <div class="h3" style="font-size:13.5px;">Админ-режим в профилях</div>
        <button class="btn btn-sm ${on?'btn-accent2':'btn-ghost'}" onclick="toggleAdminMode()">${on?'Включён':'Выключен'}</button>
      </div>
      <div class="faint" style="font-size:11.5px;line-height:1.5;">При включении в профиле любого игрока (вне админ-панели) появляется ID, IP, бан/заморозка и просмотр всех чатов его аккаунта. Доступно только главному админу — остальные роли работают исключительно в админ-панели.</div>
    </div>
    ${isOwner() ? `<div class="card" style="padding:16px;margin-top:12px;">
      <div class="row between" style="align-items:center;margin-bottom:8px;">
        <div class="h3" style="font-size:13.5px;">Режим разработчика</div>
        <button class="btn btn-sm ${state.devMode?'btn-accent2':'btn-ghost'}" onclick="toggleDevMode()">${state.devMode?'Включён':'Выключен'}</button>
      </div>
      <div class="faint" style="font-size:11.5px;line-height:1.5;">Даёт те же инструменты, что и роль «Разработчик»: менять названия, аватарки и цвета игр, добавлять новые игры. Можно держать включёнными оба режима одновременно.</div>
    </div>` : ''}
  </div>`;
}
