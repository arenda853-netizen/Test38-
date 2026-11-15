/* --- роль «Разработчик»: редактор игр --- */
function devAllowed(){ return !!(ADMIN && can('dev') && (ADMIN.role!=='owner' || state.devMode)); }
function toggleDevMode(){
  if(!isOwner()) return;
  state.devMode = !state.devMode; logOp('Режим разработчика', state.devMode?'вкл':'выкл');
  saveState(); onRoute();
}
let devDraft = null;
function pageDev(){
  if(!devAllowed()) return adminGuard('Режим разработчика');
  return `${topbar({title:'Режим разработчика', back:true, solid:true})}
  <div class="page">
    <div class="row between" style="margin-bottom:12px;">
      <div class="section-title" style="margin:0;">Игры (${GAMES.length})</div>
      <button class="btn btn-primary btn-sm" onclick="devDraft=null;navigate('/dev/new')">${icon('plus',14,'#fff')} Добавить игру</button>
    </div>
    ${GAMES.map(g=>`<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #ffffff10;cursor:pointer;" onclick="devDraft=null;navigate('/dev/game/${g.id}')">
      ${gameIcon(g,50)}
      <div style="flex:1;min-width:0;"><div class="h3" style="font-size:14.5px;">${esc(g.name)}</div><div class="faint" style="font-size:12px;margin-top:2px;">${esc(gameTags(g))||'без описания'}${g.img?' · своя аватарка':''}</div></div>
      ${icon('chev',16,'var(--text-faint)')}
    </div>`).join('')}
  </div>`;
}
function pageDevGame(kind, id){
  if(!devAllowed()) return adminGuard('Режим разработчика');
  const isNew = kind==='new';
  const key = isNew ? 'new' : id;
  const base = isNew ? {id:'', name:'', sub:'', color:'#6C5CE7', img:''} : GAMES.find(x=>x.id===id);
  if(!base) return page404();
  if(!devDraft || devDraft.key!==key) devDraft = {key, id:base.id, name:base.name, sub:base.sub||'', color:base.color||'#6C5CE7', img:base.img||'', type:gameType(base), specCat:'Аккаунты', specs:{}, reset:{}};
  const custom = !isNew && (state.customGames||[]).some(g=>g.id===id);
  const edited = !isNew && !custom && (!!(state.gameEdits && state.gameEdits[id]) || devHasSpecEdits(id));
  const preview = {id:devDraft.id, name:devDraft.name||'?', color:devDraft.color, img:devDraft.img};
  return `${topbar({title:isNew?'Новая игра':'Игра: '+esc(base.name), back:true, solid:true})}
  <div class="page">
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:18px;">
      ${gameIcon(preview,96)}
      <div class="row gap8">
        <label class="btn btn-ghost btn-sm" style="cursor:pointer;">Загрузить аватарку<input type="file" accept="image/*" style="display:none;" onchange="devUploadAvatar(event)"></label>
        ${devDraft.img ? `<button class="btn btn-ghost btn-sm" onclick="devDraft.img='';onRoute()">Убрать</button>` : ''}
      </div>
      <div class="faint" style="font-size:11px;text-align:center;">Картинка сжимается автоматически. Лучше квадратная.</div>
    </div>
    <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Название</div>
    <input class="input" maxlength="30" value="${esc(devDraft.name)}" oninput="devDraft.name=this.value" placeholder="Например, Brawl Stars" style="margin-bottom:12px;">
    <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Категории товаров (через запятую)</div>
    <input class="input" maxlength="80" value="${esc(devDraft.sub)}" oninput="devDraft.sub=this.value" placeholder="аккаунты, донат, буст" style="margin-bottom:12px;">
    <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Раздел</div>
    <select class="select" onchange="devDraft.type=this.value" style="margin-bottom:12px;">${Object.keys(GAME_TYPES).map(t=>`<option value="${t}"${devDraft.type===t?' selected':''}>${GAME_TYPES[t]}</option>`).join('')}</select>
    <div class="faint" style="font-size:11.5px;margin-bottom:4px;">Цвет иконки</div>
    <input type="color" value="${esc(devDraft.color)}" oninput="devDraft.color=this.value" style="width:100%;height:44px;border:none;border-radius:12px;background:var(--surface-2);margin-bottom:18px;">
    ${devSpecsHTML()}
    <button class="btn btn-primary btn-block" onclick="devSaveGame()">Сохранить</button>
    ${edited ? `<button class="btn btn-ghost btn-block" style="margin-top:8px;" onclick="devResetGame('${esc(id)}')">Сбросить к стандартным</button>` : ''}
    ${custom ? `<button class="btn btn-danger btn-block" style="margin-top:8px;" onclick="devDeleteGame('${esc(id)}')">Удалить игру</button>` : ''}
  </div>`;
}
function devUploadAvatar(e){
  const file = e.target.files[0]; if(!file || !devDraft) return;
  compressImage(file, 256, 0.82).then(url=>{ devDraft.img = url; onRoute(); }).catch(()=>toast('Не удалось обработать фото','error'));
}
/* каталог уходит на сервер только при активном входе админа с паролем (ADMIN_CRED);
   после перезагрузки пароль нужно ввести заново, иначе правка не попадёт на другие устройства */
function devNeedSecret(){
  openModal(`<div class="h2" style="margin-bottom:6px;">Подтвердите пароль админа</div>
  <div class="muted" style="font-size:13px;margin-bottom:12px;line-height:1.5;">Без пароля изменение игры сохранится только на этом устройстве и не будет видно другим.</div>
  <input class="input" id="devSecNick" placeholder="Ник админа" autocomplete="username" style="margin-bottom:8px;">
  <input class="input" id="devSecPw" type="password" placeholder="Пароль" autocomplete="current-password" style="margin-bottom:12px;">
  <div class="row gap8"><button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
  <button class="btn btn-accent2" style="flex:1;" onclick="devCheckSecret()">Подтвердить</button></div>`);
}
async function devCheckSecret(){
  const nick = (document.getElementById('devSecNick')||{}).value || '';
  const pw = (document.getElementById('devSecPw')||{}).value || '';
  const n = nick.trim().toLowerCase();
  if(!n || !pw){ toast('Введите ник и пароль','error'); return; }
  let res = null;
  try{
    const r = await fetch(SUPPORT_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'admin_check', admin_nick: n, admin_pass: pw }) });
    res = await r.json();
  }catch(e){ toast('Нет связи с сервером','error'); return; }
  if(!res || !res.ok){ toast('Неверный ник или пароль','error'); return; }
  ADMIN_CRED = { nick: n, pass: pw };
  closeModal();
  devSaveGame();
}
function devSaveGame(){
  if(!devAllowed() || !devDraft) return;
  if(typeof ADMIN_CRED === 'undefined' || !ADMIN_CRED){ devNeedSecret(); return; }
  const name = devDraft.name.trim();
  if(name.length<2){ toast('Название — минимум 2 символа','error'); return; }
  if(!/^#[0-9a-fA-F]{6}$/.test(devDraft.color)){ toast('Выберите цвет','error'); return; }
  const sp = devSpecsPrepare();
  if(sp.err){ toast(sp.err,'error'); devRe(); return; }
  const rec = {name, sub:devDraft.sub.trim(), color:devDraft.color, img:devDraft.img||'', type:devDraft.type||'game'};
  let gid = devDraft.id;
  if(devDraft.key==='new'){
    gid = 'g_'+Math.random().toString(36).slice(2,8);
    if(!state.customGames) state.customGames = [];
    state.customGames.push(Object.assign({id:gid}, rec));
    logOp('Добавлена игра', name, 'dev');
  } else {
    if(!state.gameEdits) state.gameEdits = {};
    state.gameEdits[devDraft.id] = rec;
    logOp('Изменена игра', name, 'dev');
  }
  devSpecsCommit(gid, sp.out);
  applyGameEdits(); saveState(); devDraft = null;
  toast('Сохранено','success'); navigate('/dev');
}
function devResetGame(id){
  if(!devAllowed()) return;
  if(state.gameEdits) delete state.gameEdits[id];
  devClearSpecEdits(id);
  logOp('Сброшена игра', id, 'dev');
  applyGameEdits(); saveState(); devDraft = null; toast('Сброшено к стандартным'); navigate('/dev');
}
function devDeleteGame(id){
  if(!devAllowed()) return;
  if(state.listings.some(l=>l.gameId===id)){ toast('Нельзя удалить: у игры есть объявления','error'); return; }
  state.customGames = (state.customGames||[]).filter(g=>g.id!==id);
  if(state.gameEdits) delete state.gameEdits[id];
  devClearSpecEdits(id);
  logOp('Удалена игра', id, 'dev');
  applyGameEdits(); saveState(); devDraft = null; toast('Игра удалена'); navigate('/dev');
}
/* --- характеристики товара: редактор в режиме разработчика --- */
const SPEC_CATS = ['Аккаунты','Предметы','Валюта','Услуги','Ключи'];
const SPEC_TYPES = {sel:'Список', num:'Число', txt:'Текст'};
const SPEC_PRESETS = [
  {label:'Ранг', t:'sel', o:['Без ранга','Bronze','Silver','Gold','Platinum','Diamond']},
  {label:'Уровень', t:'num'},
  {label:'Часов в игре', t:'num'},
  {label:'Регион', t:'sel', o:['EU','NA','Asia','Другой']},
  {label:'Скины', t:'txt', ph:'Названия или «Нет»'}
];
function escA(x){ return esc(x).replace(/"/g,'&quot;'); }
function devRe(){ const y = window.scrollY; onRoute(); window.scrollTo(0,y); }
function devHasSpecEdits(id){ const ed = state.specEdits; return !!ed && Object.keys(ed).some(k=>k.indexOf(id+'|')===0); }
function devClearSpecEdits(id){ const ed = state.specEdits; if(!ed) return; Object.keys(ed).forEach(k=>{ if(k.indexOf(id+'|')===0) delete ed[k]; }); }
function devSpecView(){
  const c = devDraft.specCat;
  if(devDraft.specs[c]) return devDraft.specs[c];
  if(devDraft.key==='new') return specBuiltin('__new', c);
  if(devDraft.reset[c]) return specBuiltin(devDraft.id, c);
  return specFields(devDraft.id, c);
}
function devSpecEdit(){
  const c = devDraft.specCat;
  if(!devDraft.specs[c]){ devDraft.specs[c] = JSON.parse(JSON.stringify(devSpecView())); delete devDraft.reset[c]; }
  return devDraft.specs[c];
}
function devSpecCat(c){ devDraft.specCat = c; devRe(); }
function devSpecSet(i, prop, val){
  const f = devSpecEdit()[i]; if(!f) return;
  if(prop==='o') f.o = String(val).split(',').map(x=>x.trim()).filter(Boolean);
  else f[prop] = val;
}
function devSpecType(i, t){
  const f = devSpecEdit()[i]; if(!f) return;
  f.t = t;
  if(t==='sel' && !(f.o && f.o.length)) f.o = ['Вариант 1','Вариант 2'];
  devRe();
}
function devSpecMove(i, d){ const a = devSpecEdit(), j = i+d; if(j<0 || j>=a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; devRe(); }
function devSpecDel(i){ devSpecEdit().splice(i,1); devRe(); }
function devSpecAdd(p){
  const a = devSpecEdit();
  const f = p ? JSON.parse(JSON.stringify(p)) : {label:'', t:'txt', ph:''};
  f.k = 'c_'+Math.random().toString(36).slice(2,7);
  a.push(f); devRe();
}
function devSpecAddPreset(i){ devSpecAdd(SPEC_PRESETS[i]); }
function devSpecReset(){ const c = devDraft.specCat; delete devDraft.specs[c]; devDraft.reset[c] = true; devRe(); }
function devSpecsHTML(){
  const c = devDraft.specCat, list = devSpecView();
  const hasOv = !!devDraft.specs[c] || (devDraft.key!=='new' && !devDraft.reset[c] && !!(state.specEdits && Array.isArray(state.specEdits[devDraft.id+'|'+c])));
  return `<div class="section-title" style="margin-top:6px;">Характеристики товара <span class="faint" style="font-weight:500;">(продавец обязан заполнить все)</span></div>
  <div class="faint" style="font-size:11.5px;margin-bottom:8px;line-height:1.45;">Ранг, уровень и другое для этой игры. Для каждой категории товара список свой. Изменения применяются после «Сохранить».</div>
  <div class="scroll-x" style="margin-bottom:12px;">${SPEC_CATS.map(x=>`<div class="chip ${c===x?'active':''}" onclick="devSpecCat('${x}')">${x}</div>`).join('')}</div>
  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px;">
    ${list.length ? list.map((f,i)=>`<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px;">
      <input class="input" maxlength="40" value="${escA(f.label)}" placeholder="Название, например: Ранг" oninput="devSpecSet(${i},'label',this.value)">
      <div class="row gap8" style="align-items:center;">
        <select class="select" style="flex:1;" onchange="devSpecType(${i},this.value)">${Object.keys(SPEC_TYPES).map(t=>`<option value="${t}"${f.t===t?' selected':''}>${SPEC_TYPES[t]}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" ${i===0?'disabled style="opacity:.35;"':''} onclick="devSpecMove(${i},-1)">↑</button>
        <button class="btn btn-ghost btn-sm" ${i===list.length-1?'disabled style="opacity:.35;"':''} onclick="devSpecMove(${i},1)">↓</button>
        <button class="btn btn-ghost btn-sm" onclick="devSpecDel(${i})">${icon('trash',15,'var(--danger)')}</button>
      </div>
      ${f.t==='sel' ? `<div><div class="faint" style="font-size:11px;margin-bottom:4px;">Варианты через запятую</div><input class="input" value="${escA((f.o||[]).join(', '))}" placeholder="Bronze, Silver, Gold" oninput="devSpecSet(${i},'o',this.value)"></div>` : ''}
      ${f.t==='txt' ? `<div><div class="faint" style="font-size:11px;margin-bottom:4px;">Подсказка в поле (необязательно)</div><input class="input" maxlength="60" value="${escA(f.ph||'')}" placeholder="Например: Названия или «Нет»" oninput="devSpecSet(${i},'ph',this.value)"></div>` : ''}
    </div>`).join('') : `<div class="faint" style="font-size:12px;padding:6px 2px;">Характеристик нет — продавцу ничего заполнять не нужно.</div>`}
  </div>
  <div class="faint" style="font-size:11px;margin-bottom:6px;">Быстро добавить:</div>
  <div class="scroll-x" style="margin-bottom:10px;">${SPEC_PRESETS.map((p,i)=>`<div class="chip" onclick="devSpecAddPreset(${i})">+ ${p.label}</div>`).join('')}</div>
  <button class="btn btn-ghost btn-block" style="margin-bottom:8px;" onclick="devSpecAdd()">${icon('plus',14)} Добавить характеристику</button>
  ${hasOv ? `<button class="btn btn-ghost btn-block" style="margin-bottom:8px;" onclick="devSpecReset()">Сбросить характеристики «${c}» к стандартным</button>` : ''}
  <div style="height:10px;"></div>`;
}
/* проверка и подготовка списков перед сохранением */
function devSpecsPrepare(){
  const out = {};
  for(const c of Object.keys(devDraft.specs)){
    const list = devDraft.specs[c]; if(!Array.isArray(list)) continue;
    const seen = {}, clean = [];
    for(const f of list){
      const label = String(f.label||'').trim();
      const fail = m=>{ devDraft.specCat = c; return {err: m+' ('+c+')'}; };
      if(label.length<2) return fail('Укажите название характеристики');
      if(seen[label.toLowerCase()]) return fail('Название повторяется: '+label);
      seen[label.toLowerCase()] = 1;
      const r = {k: f.k || ('c_'+Math.random().toString(36).slice(2,7)), label, t: SPEC_TYPES[f.t] ? f.t : 'txt'};
      if(r.t==='sel'){
        r.o = Array.from(new Set((f.o||[]).map(x=>String(x).trim()).filter(Boolean)));
        if(r.o.length<2) return fail('В списке «'+label+'» нужно минимум 2 варианта');
      }
      if(r.t==='txt' && f.ph) r.ph = String(f.ph).trim().slice(0,60);
      clean.push(r);
    }
    out[c] = clean;
  }
  return {out};
}
function devSpecsCommit(gid, out){
  if(!state.specEdits) state.specEdits = {};
  Object.keys(out).forEach(c=>{ state.specEdits[gid+'|'+c] = out[c]; });
  if(devDraft && devDraft.reset) Object.keys(devDraft.reset).forEach(c=>{ delete state.specEdits[gid+'|'+c]; });
  logOp('Изменены характеристики', gid, 'dev');
}
