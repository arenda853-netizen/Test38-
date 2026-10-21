function pageCatalog(params){
  catalogFilters.q = params.q || catalogFilters.q || '';
  catalogFilters.game = params.game || catalogFilters.game || '';
  if(params.game){ const _g = GAMES.find(x=>x.id===params.game); if(_g) catalogFilters.type = gameType(_g); }
  return `
  ${topbar({title:'Каталог', back:false, solid:true,
    right:`<div class="icon-btn" onclick="openModal(filterSheet())">${icon('filter',18)}</div>`})}
  <div class="page">
    <div class="search-bar" style="margin-bottom:12px;">
      ${icon('search',18,'var(--text-faint)')}
      <input class="input" id="catalogSearch" placeholder="Поиск по каталогу..." value="${catalogFilters.q}" oninput="catalogFilters.q=this.value; renderCatalogList();">
    </div>
    <div id="catalogTypeTabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">${catalogTypeTabsHTML()}</div>
    <div class="scroll-x" id="catalogGameChips" style="margin-bottom:12px;">${catalogGameChipsHTML()}</div>
    <div class="scroll-x" style="margin-bottom:14px;">
      ${CATEGORIES.map(c=>`<div class="chip ${catalogFilters.cat===c?'active':''}" onclick="setCatalogCat('${c}')">${c}</div>`).join('')}
    </div>
    <div class="row between" style="margin-bottom:10px;">
      <div id="catalogCount" class="faint" style="font-size:12px;"></div>
      <div class="row gap8">
        <label class="row gap8 muted" style="font-size:12px;">
          <input type="checkbox" ${catalogFilters.verifiedOnly?'checked':''} onchange="catalogFilters.verifiedOnly=this.checked; renderCatalogList();">
          Только проверенные
        </label>
      </div>
    </div>
    <div id="catalog-list" class="lgrid"></div>
  </div>`;
}
function catalogTypeTabsHTML(){
  const tabs = [['','Все']].concat(Object.keys(GAME_TYPES).map(t=>[t,GAME_TYPES[t]]));
  return tabs.map(t=>`<div class="chip ${catalogFilters.type===t[0]?'active':''}" onclick="setCatalogType('${t[0]}')">${t[1]}</div>`).join('');
}
function catalogGameChipsHTML(){
  const t = catalogFilters.type;
  let list = GAMES.filter(g=>!t || gameType(g)===t);
  const sel = catalogFilters.game ? GAMES.find(g=>g.id===catalogFilters.game) : null;
  list = list.slice(0,40);
  if(sel && !list.includes(sel)) list.unshift(sel);
  return `<div class="chip ${catalogFilters.game===''?'active':''}" onclick="setCatalogGame('')">Все игры</div>`
    + list.map(g=>`<div class="chip ${catalogFilters.game===g.id?'active':''}" onclick="setCatalogGame('${g.id}')" style="display:flex;align-items:center;gap:7px;padding-left:8px;">${gameIcon(g,22)}${esc(g.name)}</div>`).join('')
    + `<div class="chip" onclick="navigate('/games')">Ещё…</div>`;
}
function refreshCatalogChips(){
  const a = document.getElementById('catalogTypeTabs'), b = document.getElementById('catalogGameChips');
  if(a) a.innerHTML = catalogTypeTabsHTML();
  if(b) b.innerHTML = catalogGameChipsHTML();
}
function setCatalogType(t){
  catalogFilters.type = t;
  if(t && catalogFilters.game){ const g = GAMES.find(x=>x.id===catalogFilters.game); if(!g || gameType(g)!==t) catalogFilters.game = ''; }
  refreshCatalogChips();
  renderCatalogList();
}
function setCatalogGame(gameId){
  catalogFilters.game = gameId;
  refreshCatalogChips();
  renderCatalogList();
}
function setCatalogCat(cat){
  catalogFilters.cat = cat;
  document.querySelectorAll('.scroll-x')[1].querySelectorAll('.chip').forEach(c=>{
    c.classList.toggle('active', c.textContent.trim() === cat);
  });
  renderCatalogList();
}
function renderCatalogList(){
  const listEl = document.getElementById('catalog-list');
  if(!listEl) return;
  let items = state.listings.filter(l=>{
    if(l.sold) return false;
    if(l.moderation && l.moderation !== 'approved') return false;
    const seller = sellerOf(l);
    if(seller && seller.status === 'banned') return false;
    if(catalogFilters.game && l.gameId !== catalogFilters.game) return false;
    if(catalogFilters.type && !catalogFilters.game){ const _g = GAMES.find(x=>x.id===l.gameId); if(((_g&&_g.type)||'game') !== catalogFilters.type) return false; }
    if(catalogFilters.cat && catalogFilters.cat !== 'Все' && l.category !== catalogFilters.cat) return false;
    if(catalogFilters.verifiedOnly && !(seller && seller.verified)) return false;
    if(catalogFilters.priceMin !== '' && l.price < +catalogFilters.priceMin) return false;
    if(catalogFilters.priceMax !== '' && l.price > +catalogFilters.priceMax) return false;
    if(catalogFilters.minRating && !(seller && +seller.rating >= catalogFilters.minRating)) return false;
    if(catalogFilters.q){
      const q = catalogFilters.q.toLowerCase();
      if(!l.title.toLowerCase().includes(q) && !String(l.description||l.desc||'').toLowerCase().includes(q) && !(seller && seller.name.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  if(catalogFilters.sort==='new') items.sort((a,b)=>b.createdAt-a.createdAt);
  if(catalogFilters.sort==='price_asc') items.sort((a,b)=>a.price-b.price);
  if(catalogFilters.sort==='price_desc') items.sort((a,b)=>b.price-a.price);
  if(catalogFilters.sort==='rating'){
    items.sort((a,b)=>{
      const ra = sellerOf(a).rating;
      const rb = sellerOf(b).rating;
      return rb-ra;
    });
  }
  items.sort((a,b)=>{
    const pa = a.promoted && a.promotedUntil > Date.now() ? 1 : 0;
    const pb = b.promoted && b.promotedUntil > Date.now() ? 1 : 0;
    return pb - pa;
  });
  items.sort((a,b)=>(b.vip?1:0)-(a.vip?1:0));
  const countEl = document.getElementById('catalogCount');
  if(countEl) countEl.textContent = items.length + ' объявлени' + (items.length%10===1 && items.length%100!==11 ? 'е' : (items.length%10>=2 && items.length%10<=4 && !(items.length%100>=12&&items.length%100<=14) ? 'я' : 'й'));
  if(items.length===0){
    listEl.innerHTML = `<div class="empty-state">${icon('search',36,'var(--text-faint)')}<div class="h2">Ничего не нашлось</div><div class="muted" style="font-size:13px;">Попробуйте изменить фильтры или запрос</div></div>`;
    return;
  }
  listEl.innerHTML = items.map(listingCardHtml).join('');
}
function filterSheet(){
  return `<div class="h2" style="margin-bottom:14px;">Сортировка</div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
    ${[['new','Сначала новые'],['price_asc','Сначала дешевле'],['price_desc','Сначала дороже'],['rating','По рейтингу продавца']].map(([k,label])=>`
      <div class="row between" style="padding:12px 14px;background:var(--surface-2);border-radius:14px;cursor:pointer;" onclick="catalogFilters.sort='${k}'; renderCatalogList(); closeModal();">
        <span style="font-size:14px;font-weight:600;">${label}</span>
        ${catalogFilters.sort===k?icon('check',18,'var(--accent-2)'):''}
      </div>`).join('')}
  </div>
  <div class="h2" style="margin-bottom:10px;">Цена, ₽</div>
  <div class="row gap8" style="margin-bottom:18px;">
    <input class="input" type="number" min="0" placeholder="от" value="${catalogFilters.priceMin}" oninput="catalogFilters.priceMin=this.value;">
    <input class="input" type="number" min="0" placeholder="до" value="${catalogFilters.priceMax}" oninput="catalogFilters.priceMax=this.value;">
  </div>
  <div class="h2" style="margin-bottom:10px;">Рейтинг продавца от</div>
  <div class="row gap8" style="margin-bottom:20px;">
    ${[0,4,4.5,4.8].map(r=>`<div class="chip ${catalogFilters.minRating===r?'active':''}" onclick="catalogFilters.minRating=${r}; renderCatalogList(); closeModal(); openModal(filterSheet());">${r===0?'Любой':r+'★'}</div>`).join('')}
  </div>
  <button class="btn btn-primary btn-block" onclick="renderCatalogList(); closeModal();">Применить</button>`;
}
