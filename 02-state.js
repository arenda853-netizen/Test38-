function icon(name, size, color){
  size = size || 20; color = color || 'currentColor';
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:middle;">'+(ICONS[name]||'')+'</svg>';
}
const STORAGE_KEY = 'obmenka_state_v4';
const BUILD_ID = '2026-09-29-d';
let state = null;
function loadState(){
  // Загружаем пустой каркас. Реальные данные придут из Supabase через pull().
  state = seedState();
  applyGameEdits();
}
function migrateState(){
  if(state.authed === undefined) state.authed = false;
  if(!Array.isArray(state.deals)) state.deals = [];
  if(!Array.isArray(state.notifications)) state.notifications = [];
  if(!Array.isArray(state.reports)) state.reports = [];
  state.deals = state.deals.filter(d=>!/^deal_.*_demo$/.test(d.id||''));
  if(!state.dealsByAcc) state.dealsByAcc = {};
  if(state.authed){
    if(!state.accKey && state.me && state.me.name) state.accKey = String(state.me.name).trim().toLowerCase();
  } else {
    if(state.accKey) dealsStash();
    state.accKey = null;
    state.deals = [];
    if(state.me) state.me.transactions = [];
    state.notifications = [];
  }
  if(!state.me) return;
  const me = state.me;
  if(me.verified === undefined) me.verified = false;
  if(me.avgResponseMin === undefined) me.avgResponseMin = 8;
  if(!Array.isArray(me.reviews)) me.reviews = [];
  delete me.referralCode; delete me.referralInvited; delete me.referralEarnings;
  if(!Array.isArray(me.transactions)) me.transactions = [];
  if(!Array.isArray(me.frozenFunds)) me.frozenFunds = [];
  if(!me.photo) me.photo = null;
  if(me.isAdmin === undefined) me.isAdmin = false;
  (state.sellers||[]).forEach(s=>{
    if(s.avgResponseMin === undefined) s.avgResponseMin = rnd(1,45);
    if(!Array.isArray(s.reviews)) s.reviews = genReviews();
  });
  (state.listings||[]).forEach(l=>{
    if(l.promoted === undefined) l.promoted = false;
    if(l.promotedUntil === undefined) l.promotedUntil = 0;
    if(l.autoDelivery === undefined) l.autoDelivery = (l.category==='Ключи'||l.category==='Валюта');
    if(l.accountData === undefined) l.accountData = '';
  });
  (state.deals||[]).forEach(d=>{
    delete d.autoConfirmAt;
    if(d.sellerConfirmed === undefined) d.sellerConfirmed = (d.status==='completed');
    if(d.buyerConfirmed === undefined) d.buyerConfirmed = (d.status==='completed');
    if(d.reviewed === undefined) d.reviewed = false;
    if(d.commentsText === undefined) d.commentsText = '';
    if(d.commentsRevealed === undefined) d.commentsRevealed = false;
    if(!d.listingId){
      const match = (state.listings||[]).find(l=>l.title===d.listingTitle);
      d.listingId = match ? match.id : null;
    }
  });
  if(!Array.isArray(state.statsHistory) || state.statsHistory.length===0){
    state.statsHistory = Array.from({length:7}, ()=>rnd(200,3200));
  }
  saveState();
}
function saveState(){
  // Локально НИЧЕГО не сохраняем. Всё уходит только в Supabase.
  if (typeof schedule === 'function') schedule();
}
/* чаты (сделки) привязаны к аккаунту: у каждого ника свои, при выходе не видны */
function dealsStash(){
  if(!state) return;
  if(!state.dealsByAcc) state.dealsByAcc = {};
  if(state.accKey && Array.isArray(state.deals) && state.deals.length) state.dealsByAcc[state.accKey] = state.deals;
  else if(state.accKey) delete state.dealsByAcc[state.accKey];
  /* история транзакций тоже хранится отдельно для каждого аккаунта */
  if(!state.txByAcc) state.txByAcc = {};
  const tx = state.me && state.me.transactions;
  if(state.accKey && Array.isArray(tx) && tx.length) state.txByAcc[state.accKey] = tx;
  else if(state.accKey) delete state.txByAcc[state.accKey];
  if(!state.notifByAcc) state.notifByAcc = {};
  if(state.accKey && Array.isArray(state.notifications) && state.notifications.length) state.notifByAcc[state.accKey] = state.notifications;
  else if(state.accKey) delete state.notifByAcc[state.accKey];
}
function dealsSwitchTo(nickname){
  const key = String(nickname||'').trim().toLowerCase();
  if(state.accKey === key && state.authed) return;
  dealsStash();
  state.accKey = key;
  state.deals = (state.dealsByAcc && state.dealsByAcc[key]) || [];
  if(state.dealsByAcc) delete state.dealsByAcc[key];
  if(state.me){ state.me.transactions = (state.txByAcc && state.txByAcc[key]) || []; if(state.txByAcc) delete state.txByAcc[key]; }
  state.notifications = (state.notifByAcc && state.notifByAcc[key]) || [];
  if(state.notifByAcc) delete state.notifByAcc[key];
}
function dealsClear(){
  dealsStash();
  state.accKey = null;
  state.deals = [];
  if(state.me) state.me.transactions = [];
  state.notifications = [];
}
const GAMES = [
  {id:'cs2', name:'CS2', color:'#e0a840', sub:'аккаунты, скины'},
  {id:'dota2', name:'Dota 2', color:'#b23a48', sub:'аккаунты, предметы'},
  {id:'valorant', name:'Valorant', color:'#ff4d5e', sub:'аккаунты'},
  {id:'genshin', name:'Genshin Impact', color:'#5b8def', sub:'аккаунты, донат'},
  {id:'fortnite', name:'Fortnite', color:'#8e5cff', sub:'скины, аккаунты'},
  {id:'steam', name:'Steam', color:'#4b6a8f', sub:'пополнение, ключи'},
  {id:'telegram', name:'Telegram', color:'#29a9ea', sub:'премиум, звёзды'},
  {id:'roblox', name:'Roblox', color:'#00a2ff', sub:'robux, аккаунты'},
  {id:'minecraft', name:'Minecraft', color:'#5b8731', sub:'аккаунты, донат'},
  {id:'wow', name:'World of Warcraft', color:'#c9a53b', sub:'золото, буст'},
  {id:'pubg', name:'PUBG Mobile', color:'#d68a2a', sub:'UC, аккаунты'},
  {id:'discord', name:'Discord', color:'#7289da', sub:'nitro, серверы'}
];
const CORE_GAMES_N = GAMES.length;
const GAME_TYPES = {game:'Игры', mobile:'Мобильные игры', app:'Приложения'};
