function rnd(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function uid(prefix){ return prefix+'_'+Math.random().toString(36).slice(2,9); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function colorFromString(str){
  let h=0; for(let i=0;i<str.length;i++){ h = str.charCodeAt(i) + ((h<<5)-h); }
  const palette = ['#6C5CE7','#00B39A','#FF6B81','#3D8BFD','#E0A840','#8E5CFF','#22C1A0','#EF6C6C'];
  return palette[Math.abs(h) % palette.length];
}
function fmtPrice(n){ return (n||0).toLocaleString('ru-RU') + ' ₽'; }
function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return 'только что';
  if(s<3600) return Math.floor(s/60)+' мин назад';
  if(s<86400) return Math.floor(s/3600)+' ч назад';
  return Math.floor(s/86400)+' дн назад';
}
const SELL_FEE_RATE = 0.10;
const TOPUP_FEE_RATE = 0.05;
const PROMO_PRICE = 149;
const PROMO_DAYS = 7;
const REFERRAL_RATE = 0.05;
const FREEZE_MS = 48*60*60*1000;
function seedState(){
  return { 
    sellers: [], 
    listings: [], 
    deals: [], 
    me: null, 
    myListings: [], 
    favorites: [], 
    statsHistory: [0,0,0,0,0,0,0], 
    authed: false 
  };
}
function toast(msg, type){
  type = type || 'default';
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const ic = type==='success' ? icon('check',16,'#00D4B5') : type==='error' ? icon('close',16,'#FF5470') : icon('bolt',16,'#9BA1AF');
  el.innerHTML = ic + '<span>'+msg+'</span>';
  root.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .25s'; el.style.opacity='0'; setTimeout(()=>el.remove(),250); }, 2400);
}
function closeModal(){ document.getElementById('modal-root').innerHTML=''; }
function openModal(html){
  document.getElementById('modal-root').innerHTML =
    `<div class="modal-overlay" onclick="if(event.target===this) closeModal()">
       <div class="modal-sheet"><div class="sheet-handle"></div>${html}</div>
     </div>`;
}
const NAV_TABS = [
  {path:'/', label:'Главная', icon:'home'},
  {path:'/catalog', label:'Каталог', icon:'grid'},
  {path:'/sell', label:'Продать', icon:'plus', isFab:true},
  {path:'/chats', label:'Чаты', icon:'chat'},
  {path:'/profile', label:'Профиль', icon:'user'}
];
function currentHash(){
  const h = location.hash.replace(/^#/,'') || '/';
  const [path, query] = h.split('?');
  const params = {};
  if(query) query.split('&').forEach(p=>{ const [k,v]=p.split('='); if(k) params[k]=decodeURIComponent(v||''); });
  return {path: path || '/', params};
}
function navigate(hash){ location.hash = hash; }
function goBack(){ history.back(); }
let catalogFilters = { q:'', game:'', type:'', cat:'Все', sort:'new', verifiedOnly:false, priceMin:'', priceMax:'', minRating:0 };
let sellDraft = { images:[], autoDelivery:false, specs:{} };
let txHistoryOpen = false;
function toggleTxHistory(){ txHistoryOpen = !txHistoryOpen; onRoute(); }
function renderNav(){
  const {path} = currentHash();
  const hideNav = /^\/(chat|item|seller)\//.test(path);
  document.getElementById('bottomNav').style.display = hideNav ? 'none' : 'flex';
  document.getElementById('shell').classList.toggle('chat-mode', path.startsWith('/chat/'));
  const topPath = '/' + (path.split('/')[1]||'');
  const unread = state.deals.reduce((a,d)=>a+(d.unread||0),0) + supportUnreadMe();
  document.getElementById('bottomNav').innerHTML = NAV_TABS.map(t=>{
    const active = topPath === t.path || (t.path==='/' && topPath==='/');
    if(t.isFab){
      return `<a class="nav-item" href="#${t.path}"><div class="nav-sell">${icon('plus',24,'#fff')}</div></a>`;
    }
    return `<a class="nav-item ${active?'active':''}" href="#${t.path}">
        ${icon(t.icon,21)}
        <span>${t.label}</span>
        ${t.path==='/chats' && unread>0 ? `<div class="dot"></div>` : ''}
      </a>`;
  }).join('');
}
function onRoute(){
  try{ accUsers(); }catch(e){}
  try{ cleanSellers(); fixDealCounterparties(); }catch(e){}
  const {path, params} = currentHash();
  const app = document.getElementById('app');
  let html = '';
  if(!state.me && !state.authed && path.indexOf('/profile')===0){
    app.innerHTML = `<div class="fade-in">${pageAuthGate('/profile')}</div>`;
    window.scrollTo(0,0);
    renderNav();
    afterRender(path, params);
    return;
  }
  const AUTH_REQUIRED_PATHS = ['/sell','/profile','/profile/listings','/profile/edit','/admin','/admin/disputes','/admin/chats','/admin/listings','/admin/catalog','/admin/players','/admin/ban'];
  const needsAuth = AUTH_REQUIRED_PATHS.includes(path) || path.startsWith('/admin/');
  if(needsAuth && !state.authed){
    html = pageAuthGate(path);
  }
  else if(path === '/' ) html = pageHome();
  else if(path === '/catalog') html = pageCatalog(params);
  else if(path === '/games') html = pageGames();
  else if(path === '/dev') html = pageDev();
  else if(path.startsWith('/dev/')) html = pageDevGame(path.split('/')[2], path.split('/')[3]);
  else if(path.startsWith('/item/')) html = pageItem(path.split('/')[2]);
  else if(path.startsWith('/seller/') && path.endsWith('/listings')) html = pageSellerListings(path.split('/')[2]);
  else if(path.startsWith('/seller/') && path.endsWith('/reviews')) html = pageSellerReviews(path.split('/')[2]);
  else if(path.startsWith('/seller/')) html = pageSellerProfile(path.split('/')[2]);
  else if(path === '/sell') html = pageSell();
  else if(path === '/chats') html = pageChats();
  else if(path === '/chat/support') html = pageSupportChat();
  else if(path.startsWith('/chat/')) html = pageChat(path.split('/')[2]);
  else if(path === '/profile') html = pageProfile();
  else if(path === '/profile/listings') html = pageMyListings();
  else if(path === '/profile/edit') html = pageEditProfile();
  else if(path === '/admin') html = pageAdmin();
  else if(path === '/admin/disputes') html = pageAdminDisputes();
  else if(path === '/admin/chats') html = pageAdminChats();
  else if(path === '/admin/listings') html = pageAdminListings();
  else if(path === '/admin/catalog') html = pageAdminCatalog();
  else if(path.startsWith('/admin/catalog/')) html = pageAdminCatalogItem(decodeURIComponent(path.slice('/admin/catalog/'.length)));
  else if(path === '/admin/players') html = pageAdminPlayers();
  else if(path === '/admin/ban') html = pageAdminBan();
  else if(path === '/admin/activity' || path.startsWith('/admin/activity/')) html = pageAdminActivity(path.split('/').slice(3).map(decodeURIComponent));
  else if(path === '/admin/vip' || path.startsWith('/admin/vip/')) html = pageAdminVip(path.split('/').slice(3).map(decodeURIComponent));
  else if(path === '/admin/reports') html = pageAdminReports();
  else if(path === '/admin/hold') html = pageAdminHold();
  else if(path === '/admin/restricted') html = pageAdminRestricted();
  else if(path === '/admin/support' || path.startsWith('/admin/support/')) html = pageAdminSupport(path.split('/').slice(3).map(decodeURIComponent));
  else if(path === '/admin/accounts' || path.startsWith('/admin/accounts/')) html = pageAdminAccounts(path.split('/').slice(3));
  else if(path === '/admin/staff') html = pageAdminStaff();
  else if(path === '/admin/finance') html = pageAdminFinance();
  else if(path === '/admin/logs') html = pageAdminLogs();
  else if(path.startsWith('/admin/logs/')) html = pageAdminLogsActor(path.split('/').slice(3).map(decodeURIComponent));
  else if(path === '/admin/settings') html = pageAdminSettings();
  else if(path.startsWith('/admin/user-chats/')) html = pageAdminUserChats(path.split('/')[3]);
  else html = page404();
  app.innerHTML = `<div class="fade-in">${html}</div>`;
  window.scrollTo(0,0);
  renderNav();
  afterRender(path, params);
}
function afterRender(path, params){
  if(path === '/admin/players'){ renderAdminList(); }
  if(path === '/admin/restricted'){ renderRestrictedList(); }
  if(path === '/admin/vip'){ renderVipPlayers(); }
  if(path.startsWith('/admin/accounts/')){ renderAccList(); }
  if(path === '/sell'){ updateSellPriceCalc(); }
  if(path.startsWith('/admin/support/')){ const b = document.getElementById('supportThreadEnd'); if(b) b.scrollIntoView({block:'end'}); }
  if(path.startsWith('/chat/')){
    const box = document.getElementById('msgScroll');
    if(box) box.scrollTop = box.scrollHeight;
    const input = document.getElementById('chatInputField');
    if(input){
      input.addEventListener('keydown', e=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(path.split('/')[2]); }
      });
      if(window.__chatInputValue){
        input.value = window.__chatInputValue;
      }
      input.addEventListener('input', ()=>{ window.__chatInputValue = input.value; try{ if(window.presTyping) window.presTyping(path.split('/')[2]); }catch(e){} });
    }
  } else {
    window.__chatInputValue = '';
  }
  if(path === '/catalog'){ renderCatalogList(); }
  if(path === '/games'){ renderGamesList(); }
  if(path === '/admin/activity' || path === '/admin/logs'){ if(document.getElementById('act-players')) renderActPlayers(); }
}
window.addEventListener('hashchange', onRoute);
window.addEventListener('DOMContentLoaded', ()=>{ loadState(); adminRestore(); onRoute(); startFrozenTicker(); });
function topbar(opts){
  opts = opts || {};
  return `<div class="topbar ${opts.solid?'solid':''}">
    ${opts.back ? `<div class="icon-btn" onclick="goBack()">${icon('back',19)}</div>` : ''}
    ${opts.closeTo ? `<div class="icon-btn" onclick="goBack()">${icon('close',19)}</div>` : ''}
    <div style="flex:1;min-width:0;">
      ${opts.title ? `<div class="h2" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${opts.title}</div>` : ''}
      ${opts.subtitle ? `<div class="faint" style="font-size:12px;">${opts.subtitle}</div>` : ''}
    </div>
    ${opts.right || ''}
  </div>`;
}
function starsHtml(rating){
  return `<span class="row gap8" style="font-size:12.5px;">${icon('star',13,'#FFB020')}<b>${rating}</b></span>`;
}
