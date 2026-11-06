/* ---------- продавцы-аккаунты: каждый аккаунт — отдельный человек ---------- */
window.__ALL_ME = window.__ALL_ME || {};
function accOfListing(l){
  try{
    const us = accUsers();
    if(l.sellerUid){ const a = us.find(x=>x.uid===l.sellerUid); if(a) return a; }
    if(l.sellerAcc){ const a = us.find(x=>x.key===l.sellerAcc); if(a) return a; }
    if(l.sellerName){ const k = String(l.sellerName).trim().toLowerCase(); const a = us.find(x=>x.key===k); if(a) return a; }
    if(l.sellerKey){ const a = us.find(x=>supportKeyByName(x.key)===l.sellerKey); if(a) return a; }
  }catch(e){}
  return null;
}
function isMineListing(l){
  if(!l || !state.authed) return false;
  if(state.myListings && state.myListings.includes(l.id)) return true;
  const myUid = supportUidMe();
  if(l.sellerUid && myUid && l.sellerUid===myUid) return true;
  if(l.sellerKey && l.sellerKey===supportKeyMe()) return true;
  if(l.sellerName && state.accKey && String(l.sellerName).trim().toLowerCase()===state.accKey) return true;
  return false;
}
/* ---------- присутствие: в сети / печатает (данные приходят с сервера) ---------- */
window.__PRES = window.__PRES || {};
function presUpdate(acc, v, upd, initial){
  const now = Date.now(), p = window.__PRES[acc], u = upd ? Date.parse(upd) : 0;
  const tn = (v && v.tn) || 0;
  const e = { v: v || {}, upd: u || 0, tn: tn, rcvTn: p ? p.rcvTn : 0 };
  if(p){ if(tn !== p.tn) e.rcvTn = now; }
  else if(!initial && tn && u && (now + (window.__presSkew||0) - u) < 4000) e.rcvTn = now;
  window.__PRES[acc] = e;
}
/* показ «онлайн» и «печатает» отключён: статус можно подделать, он вводит в заблуждение. Чтобы вернуть, поставить true */
const PRES_SHOW = false;
function presOnlineKey(key){
  if(!PRES_SHOW) return false;
  const e = window.__PRES[String(key||'').trim().toLowerCase()];
  if(!e || !e.v || e.v.off) return false;
  return (Date.now() + (window.__presSkew||0) - e.upd) < 45000;
}
function peerKeyOf(d){ return String((d && (d.peerKey || (d.counterparty && d.counterparty.name))) || '').trim().toLowerCase(); }
function peerOnline(d){ return presOnlineKey(peerKeyOf(d)); }
function peerTyping(d){
  if(!PRES_SHOW) return false;
  const e = window.__PRES[peerKeyOf(d)];
  if(!e || !e.v || e.v.off || !presOnlineKey(peerKeyOf(d))) return false;
  return e.v.ty === d.id && !!e.rcvTn && (Date.now() - e.rcvTn) < 4000;
}
function pseudoSeller(acc, name, uid){
  const key = acc ? acc.key : String(name||'').trim().toLowerCase();
  const rm = (window.__ALL_ME||{})[key] || {};
  return {
    id: (acc && acc.uid) || uid || supportKeyByName(name||'player'),
    name: (acc && (acc.nickname||acc.key)) || name || 'Игрок',
    color: rm.color || '#6C5CE7',
    rating: rm.rating || 0,
    deals: rm.deals || 0,
    reviews: Array.isArray(rm.reviews) ? rm.reviews : [],
    verified: isVerifiedRec(rm),
    avgResponseMin: rm.avgResponseMin || 10,
    status: (acc && acc.status) || rm.status || 'active',
    online: presOnlineKey(key)
  };
}
function sellerOf(l){
  if(!l) return state.me;
  try{ cleanSellers(); }catch(e){}
  const sl = state.sellers.find(s=>s.id===l.sellerId);
  if(sl) return sl;
  if(isMineListing(l)) return state.me;
  return pseudoSeller(accOfListing(l), l.sellerName, l.sellerUid);
}
function sellerIdOf(l){
  if(state.sellers.some(s=>s.id===l.sellerId)) return l.sellerId;
  if(isMineListing(l)) return 'me';
  return sellerOf(l).id;
}
function sellerById(id){
  if(id==='me') return state.me;
  const sl = state.sellers.find(s=>s.id===id);
  if(sl) return sl;
  try{ const a = accUsers().find(x=>x.uid===id || supportKeyByName(x.key)===id); if(a) return pseudoSeller(a); }catch(e){}
  const l0 = state.listings.find(l=>sellerIdOf(l)===id);
  return l0 ? sellerOf(l0) : null;
}
function sellerBadges(s){
  if(s.status==='banned') return `<span class="badge" style="background:var(--danger-soft);color:var(--danger);">${icon('close',11)} Заблокирован</span>`;
  if(s.status==='frozen') return `<span class="badge" style="background:var(--warning-soft);color:var(--warning);">${icon('lock',11)} Ограничен</span>`;
  return `${s.verified?verifiedMark(14):''}${s.online?`<span style="color:#33e39a;font-size:12px;line-height:1;" title="в сети">●</span>`:''}`;
}
function listingCardHtml(l){
  const seller = sellerOf(l);
  const isPromoted = l.promoted && l.promotedUntil > Date.now();
  const hasImg = l.images && l.images.length;
  const bg = hasImg ? `url('${l.images[0]}') center/cover` : `linear-gradient(145deg, ${l.color}, ${l.color}99)`;
  const letter = hasImg ? '' : gameIcon(GAMES.find(g=>g.id===l.gameId), 58) || '?';
  return `<div class="lcard" onclick="navigate('/item/${l.id}')">
    <div class="lcard-img" style="background:${bg};">${letter}
      ${isPromoted ? `<span class="badge badge-promo" style="position:absolute;top:8px;left:8px;">${icon('bolt',10)} ТОП</span>` : ''}
      ${l.vip ? `<span class="badge badge-vip" style="position:absolute;top:${isPromoted?'34px':'8px'};left:8px;">${icon('bolt',10)} VIP</span>` : ''}
    </div>
    <div class="lcard-price">${fmtPrice(l.price)}</div>
    <div class="lcard-title">${l.title}</div>
    <div class="lcard-meta">${starsHtml(seller.rating)}</div>
  </div>`;
}
function page404(){
  return `${topbar({title:'Страница не найдена', back:true})}
  <div class="page empty-state">
    ${icon('search',40,'var(--text-faint)')}
    <div class="h2">Ничего не найдено</div>
    <div class="muted" style="font-size:13px;">Такой страницы не существует</div>
    <a href="#/"><button class="btn btn-primary" style="margin-top:8px;">На главную</button></a>
  </div>`;
}
function pageHome(){
  const popular = state.listings.filter(l=>!l.sold && (!l.moderation || l.moderation==='approved')).sort((a,b)=>b.views-a.views).slice(0,8);
  const fresh = state.listings.filter(l=>!l.sold && (!l.moderation || l.moderation==='approved')).sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
  return `
  ${topbar({right:`<div class="icon-btn bell-btn" style="position:relative;" onclick="openNotifs()">${icon('bell',20)}${unreadNotifs()>0?`<span id="notifBadge" style="position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;border-radius:9px;background:var(--danger);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;">${Math.min(unreadNotifs(),99)}</span>`:''}</div>`})}
  <div class="page">
    <div style="margin-bottom:18px;">
      <div class="h1">Zyro</div>
      <div class="muted" style="font-size:13px;margin-top:2px;">Безопасные P2P-сделки по цифровым товарам</div>
    </div>
    <form class="search-bar" style="margin-bottom:18px;" onsubmit="event.preventDefault(); const q=document.getElementById('homeSearch').value; navigate('/catalog?q='+encodeURIComponent(q));">
      ${icon('search',18,'var(--text-faint)')}
      <input id="homeSearch" class="input" placeholder="Игра, товар или продавец...">
    </form>
    <div class="row between" style="margin-bottom:12px;">
      <div class="section-title" style="margin:0;">Категории игр</div>
      <a href="#/games" class="faint" style="font-size:12.5px;font-weight:700;">Все →</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px;">
      ${GAMES.slice(0,9).map(g=>`
        <div class="cat-tile" style="background:linear-gradient(150deg, ${g.color}22, var(--surface));height:auto;align-items:center;justify-content:flex-start;gap:9px;padding:14px 8px 12px;text-align:center;" onclick="navigate('/catalog?game=${g.id}')">
          ${gameIcon(g,52)}
          <div class="h3" style="font-size:12px;line-height:1.25;">${g.name}</div>
        </div>
      `).join('')}
    </div>
    <div class="row between" style="margin-bottom:12px;">
      <div class="section-title" style="margin:0;">Популярное сейчас</div>
    </div>
    <div class="scroll-x" style="margin-bottom:24px;">
      ${popular.map(l=>{
        const seller = sellerOf(l);
        const hasImg = l.images && l.images.length;
        return `<div style="min-width:168px;max-width:168px;" class="card" onclick="navigate('/item/${l.id}')">
          <div style="height:90px;border-radius:22px 22px 0 0;background:${hasImg ? `url('${l.images[0]}') center/cover` : `linear-gradient(150deg, ${l.color}, ${l.color}88)`};display:flex;align-items:center;justify-content:center;">
            ${hasImg ? '' : `<span style="font-family:var(--font-display);font-weight:800;color:#fff;opacity:.85;">${(GAMES.find(g=>g.id===l.gameId)||{}).name||''}</span>`}
          </div>
          <div style="padding:10px 12px 12px;">
            <div style="font-size:12.5px;font-weight:700;line-height:1.3;height:32px;overflow:hidden;">${l.title}</div>
            <div class="row between" style="margin-top:8px;">
              <span style="color:var(--accent-2);font-weight:800;font-size:13.5px;">${fmtPrice(l.price)}</span>
              ${starsHtml(seller.rating)}
            </div>
            <button class="btn btn-primary btn-sm btn-block" style="margin-top:8px;" onclick="event.stopPropagation(); openBuyPaymentModal('${l.id}');">${icon('bolt',13)} Купить</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="section-title">Свежие объявления</div>
    <div class="lgrid">
      ${fresh.map(listingCardHtml).join('')}
    </div>
  </div>`;
}
