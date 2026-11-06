function pageItem(id){
  const l = state.listings.find(x=>x.id===id);
  if(!l) return page404();
  const seller = sellerOf(l);
  const game = GAMES.find(g=>g.id===l.gameId) || {};
  const isFav = state.favorites.includes(id);
  return `
  ${topbar({back:true, right:`<div class="icon-btn" onclick="toggleFavorite('${id}')">${icon('star',18, isFav?'#FFB020':'currentColor')}</div>`})}
  <div class="page">
    ${(can('listings') && l.moderation==='pending') ? `<div class="card" style="padding:10px 14px;margin-bottom:12px;background:var(--warning-soft);font-size:12px;line-height:1.5;">${icon('shield',14,'var(--warning)')} Проверка заявки. Скрытые данные аккаунта администрации не показываются.</div>` : ''}
    ${l.images && l.images.length ? `
    <div style="position:relative;margin-bottom:16px;">
      <div class="scroll-x" style="scroll-snap-type:x mandatory;gap:0;border-radius:22px;overflow-x:auto;">
        ${l.images.map(img=>`<img src="${img}" style="width:100%;flex:0 0 100%;height:220px;object-fit:cover;scroll-snap-align:start;border-radius:22px;">`).join('')}
      </div>
      ${l.images.length>1 ? `<div class="badge" style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.55);color:#fff;border:none;">${icon('image',12,'#fff')} ${l.images.length}</div>` : ''}
    </div>` : `
    <div style="height:180px;border-radius:22px;background:linear-gradient(150deg, ${l.color}, ${l.color}77);display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="font-family:var(--font-display);font-weight:800;font-size:22px;color:#fff;opacity:.9;">${game.name||''}</span>
    </div>`}
    <div class="row gap8" style="margin-bottom:8px;">
      <span class="badge" style="background:var(--surface-2);color:var(--text-dim);">${l.category}</span>
      <span class="faint" style="font-size:12px;">${icon('eye',12)} ${l.views} просмотров</span>
    </div>
    <div class="h1" style="font-size:19px;line-height:1.35;margin-bottom:8px;">${l.title}</div>
    <div class="h1" style="color:var(--accent-2);font-size:24px;margin-bottom:16px;">${fmtPrice(l.price)}</div>
    <div class="card" style="padding:14px;margin-bottom:16px;cursor:pointer;" onclick="goToSeller('${seller.id}')">
      <div class="row gap12">
        <div class="avatar" style="width:46px;height:46px;background:${seller.color};font-size:16px;">${initials(seller.name)}${seller.online?'<span class="online-dot"></span>':''}</div>
        <div style="flex:1;">
          <div class="row gap8"><span class="h3">${seller.name}</span>${icon('chev',14,'var(--text-faint)')}</div>
          <div class="row gap8" style="margin-top:3px;">${sellerBadges(seller)}</div>
          <div class="faint" style="font-size:11px;margin-top:3px;">${icon('clock',11)} отвечает за ~${seller.avgResponseMin} мин</div>
        </div>
        <div style="text-align:right;">
          ${starsHtml(seller.rating)}
          <div class="faint" style="font-size:11px;margin-top:2px;">${seller.deals} сделок · ${(seller.reviews||[]).length} отзывов</div>
        </div>
      </div>
    </div>
    ${specsHTML(l)}
    <div class="section-title">Описание</div>
    <div class="muted" style="font-size:13.5px;line-height:1.6;margin-bottom:14px;">${l.description}</div>
    ${l.autoDelivery ? `
    <div class="card" style="padding:12px 14px;margin-bottom:14px;background:var(--accent-soft);border-color:#6c5ce730;">
      <div class="row gap12">
        ${icon('bolt',18,'var(--accent)')}
        <div style="font-size:12px;line-height:1.5;">Продавец включил автовыдачу: после оплаты его данные сразу появятся в «Комментариях» чата. Сделка закрывается только после подтверждения обеих сторон.</div>
      </div>
    </div>` : ''}
    <div class="row between" style="margin-bottom:10px;">
      <div class="section-title" style="margin:0;">Отзывы</div>
    </div>
    <div style="margin-bottom:20px;">
      ${(seller.reviews||[]).length===0 ? `<div class="faint" style="font-size:12.5px;">Пока нет отзывов</div>` :
        (seller.reviews||[]).slice(0,4).map((r,ri)=>`
        <div class="review-card">
          <div class="row between" style="margin-bottom:4px;">
            <span style="font-size:12.5px;font-weight:700;">${r.author}</span>
            ${starsHtml(r.rating)}
          </div>
          <div class="muted" style="font-size:12.5px;line-height:1.5;">${r.text}</div>
          <div class="row between" style="margin-top:5px;"><span class="faint" style="font-size:10.5px;">${timeAgo(r.ts)}</span><span class="faint" style="font-size:11px;cursor:pointer;" onclick="reviewReportSheet('${seller.id}',${ri})">Пожаловаться</span></div>
        </div>`).join('')}
    </div>
    <div class="card" style="padding:14px;margin-bottom:90px;background:var(--accent-2-soft);border-color:#00d4b530;">
      <div class="row gap12">
        ${icon('shield',20,'var(--accent-2)')}
        <div style="font-size:12.5px;line-height:1.5;color:#bdf3e8;">Сделка защищена гарантом платформы: деньги списываются с покупателя и замораживаются до подтверждения получения товара.</div>
      </div>
    </div>
  </div>
  ${(can('listings') && l.moderation==='pending') ? `<div class="chat-input-bar chat-input-bar-fixed" style="justify-content:space-between;">
    <button class="btn btn-ghost" style="flex:1;" onclick="openRejectSheet('${l.id}', true)">${icon('close',17)} Отказать</button>
    <button class="btn btn-accent2" style="flex:1.3;" onclick="approveListing('${l.id}'); navigate('/admin/listings')">${icon('check',17)} Одобрить</button>
  </div>` : `<div class="chat-input-bar chat-input-bar-fixed" style="justify-content:space-between;">
    <button class="btn btn-ghost" style="flex:1;" onclick="openChatWithSeller('${l.id}', true)">${icon('chat',17)} Написать</button>
    ${l.sold
      ? `<button class="btn btn-ghost" style="flex:1.3;opacity:.6;" disabled>${icon('check',17)} Продано</button>`
      : (l.moderation==='pending'
        ? `<button class="btn btn-ghost" style="flex:1.3;opacity:.6;" disabled>${icon('clock',17)} На модерации</button>`
        : (l.moderation==='rejected'
          ? `<button class="btn btn-ghost" style="flex:1.3;opacity:.6;" disabled>${icon('close',17)} Отклонено</button>`
          : `<button class="btn btn-primary" style="flex:1.3;" onclick="openBuyPaymentModal('${l.id}')">${icon('bolt',17)} Купить</button>`))}
  </div>`}`;
}
function toggleFavorite(id){
  const i = state.favorites.indexOf(id);
  if(i>=0){ state.favorites.splice(i,1); toast('Убрано из избранного'); }
  else { state.favorites.push(id); toast('Добавлено в избранное','success'); }
  saveState();
  onRoute();
}

function openChatWithSeller(listingId, justChat){
  const l = state.listings.find(x=>x.id===listingId);
  const seller = sellerOf(l);
  let deal = state.deals.find(d=>d.listingId===l.id && d.counterparty.id===seller.id && d.status==='active');
  if(!deal){
    deal = {
      id: uid('deal'),
      listingId: l.id,
      listingTitle: l.title,
      price: l.price,
      counterparty: seller,
      status: 'active',
      unread:0,
      updatedAt: Date.now(),
      sellerConfirmed: false,
      buyerConfirmed: false,
      reviewed:false,
      peerKey: (function(){ try{ return sellerAccKey(l); }catch(e){ return ''; } })(),
      role: 'buyer',
      commentsText: '',
      commentsRevealed: false,
      messages: [
        {from:'sys', text:'Начните диалог с продавцом. Средства будут заморожены гарантом только после оформления сделки.', ts: Date.now()}
      ]
    };
    state.deals.unshift(deal);
    saveState();
  }
  navigate('/chat/'+deal.id);
}
const PAYMENT_METHODS = {
  card:     { label:'Банковская карта', hint:'Visa / Mastercard / МИР — через платёжный шлюз' },
  crypto:   { label:'Криптовалюта',      hint:'USDT / BTC / ETH — оплата на адрес кошелька' },
  internal: { label:'Внутренний счёт',   hint:'Списание с баланса вашего аккаунта на сайте' }
};
let pendingBuyListingId = null;
let selectedPayMethod = 'card';
function openBuyPaymentModal(listingId){
  if(!requireAuth()) return;
  if(frozenGuard('покупки недоступны')) return;
  const l = state.listings.find(x=>x.id===listingId);
  if(!l) return;
  if(l.sold){ toast('Товар уже продан','error'); return; }
  { const _s = sellerOf(l); if(_s && (_s.status==='banned'||_s.status==='frozen')){ toast('Продавец ограничен, покупка недоступна','error'); return; } }
  if(l.moderation && l.moderation !== 'approved'){ toast('Товар ещё не прошёл модерацию','error'); return; }
  pendingBuyListingId = listingId;
  selectedPayMethod = 'card';
  openModal(buyPaymentSheet(l));
}
function buyPaymentSheet(l, error){
  return `<div>
    <div class="h2" style="margin-bottom:2px;">Оплата заказа</div>
    <div class="faint" style="font-size:11.5px;margin-bottom:14px;">«${l.title}»</div>
    <div class="row between card" style="padding:12px 14px;margin-bottom:16px;background:var(--surface-2);border-color:var(--border-soft);">
      <span class="muted" style="font-size:13px;">К оплате</span>
      <span class="h2" style="font-size:17px;color:var(--accent-2);">${fmtPrice(l.price)}</span>
    </div>
    ${error ? `<div style="color:var(--danger);font-size:12.5px;margin-bottom:12px;">${error}</div>` : ''}
    <div class="muted" style="font-size:12px;font-weight:700;margin-bottom:8px;">Способ оплаты</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
      ${payMethodOptionHtml('card', l)}
      ${payMethodOptionHtml('crypto', l)}
      ${payMethodOptionHtml('internal', l)}
    </div>
    <div class="row gap12" style="align-items:flex-start;background:var(--accent-2-soft);border:1px solid #00d4b530;border-radius:14px;padding:10px 12px;margin-bottom:16px;">
      ${icon('shield',16,'var(--accent-2)')}
      <div style="font-size:11.5px;line-height:1.5;color:#bdf3e8;">Средства замораживаются гарантом платформы до подтверждения получения товара покупателем.</div>
    </div>
    <button class="btn btn-primary btn-block" onclick="confirmBuyPayment()">${icon('bolt',16)} Оплатить ${fmtPrice(l.price)}</button>
  </div>`;
}
function payMethodOptionHtml(method, l){
  const info = PAYMENT_METHODS[method];
  const active = selectedPayMethod === method;
  let note = '';
  if(method === 'internal'){
    note = (state.me.balance < l.price)
      ? `<span style="color:var(--danger);font-size:11px;font-weight:700;">Недостаточно средств</span>`
      : `<span class="faint" style="font-size:11px;">Баланс: ${fmtBal(state.me.balance)}</span>`;
  } else {
    note = `<span class="faint" style="font-size:11px;">Внешняя оплата</span>`;
  }
  return `<div class="card" style="padding:12px 14px;border-color:${active?'var(--accent)':'var(--border-soft)'};background:${active?'var(--accent-soft)':'var(--surface)'};cursor:pointer;" onclick="selectPayMethod('${method}')">
    <div class="row between">
      <div class="row gap8">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${active?'var(--accent)':'var(--border)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${active ? `<div style="width:9px;height:9px;border-radius:50%;background:var(--accent);"></div>` : ''}
        </div>
        <div style="font-size:13.5px;font-weight:700;">${info.label}</div>
      </div>
      ${note}
    </div>
    <div class="faint" style="font-size:11px;margin-top:4px;margin-left:26px;">${info.hint}</div>
  </div>`;
}
function selectPayMethod(method){
  selectedPayMethod = method;
  const l = state.listings.find(x=>x.id===pendingBuyListingId);
  if(l) openModal(buyPaymentSheet(l));
}
function confirmBuyPayment(){
  if(!requireAuth()) return;
  const l = state.listings.find(x=>x.id===pendingBuyListingId);
  if(!l){ closeModal(); return; }
  if(selectedPayMethod === 'internal' && state.me.balance < l.price){
    openModal(buyPaymentSheet(l, 'Недостаточно средств на внутреннем счёте. Выберите другой способ оплаты или пополните баланс.'));
    return;
  }
  const method = selectedPayMethod;
  closeModal();
  createPaidDeal(l.id, method);
}
async function serverBuy(l){
  let tok = '';
  try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
  if(!tok){ toast('Войдите в аккаунт заново','error'); return false; }
  const ref = (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g,'') : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  try{
    const r = await fetch(AUTH_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action:'buy', token: tok, listing: l.id, ref: ref }) });
    let d = {}; try{ d = await r.json(); }catch(e){}
    if(d.ok){ if(typeof d.balance === 'number') state.me.balance = d.balance; return ref; }
    const map = { sold:'Товар уже продан', insufficient:'Недостаточно средств', frozen:'Аккаунт заморожен до проверки администрацией',
      own_listing:'Нельзя купить свой товар', no_listing:'Товар не найден', duplicate:'Операция уже выполнена', no_wallet:'Зайдите в игру, чтобы открыть кошелёк' };
    toast(map[d.error] || ('Не удалось купить' + (d.error ? ': ' + d.error : '')), 'error');
    return false;
  }catch(e){ toast('Нет связи с сервером','error'); return false; }
}
async function createPaidDeal(listingId, payMethod){
  if(!requireAuth()) return;
  if(frozenGuard('покупки недоступны')) return;
  const l = state.listings.find(x=>x.id===listingId);
  let escrowRef = null;
  if(l && payMethod === 'internal'){ const okBuy = await serverBuy(l); if(!okBuy) return; escrowRef = okBuy; }
  const sellerId = sellerIdOf(l);
  const seller = allUsers().find(s=>s.id===l.sellerUid || s.id===l.sellerId) || { id: l.sellerUid, name: l.sellerName, color:'#6C5CE7' };
  if(l.sold){ toast('Товар уже продан','error'); return; }
  { const _s = sellerOf(l); if(_s && (_s.status==='banned'||_s.status==='frozen')){ toast('Продавец ограничен, покупка недоступна','error'); return; } }
  let deal = null;
  if(!deal){
    const methodLabel = (PAYMENT_METHODS[payMethod]||{}).label || 'выбранный способ';
    const hasAutoData = !!(l.autoDelivery && l.hasSecret);
    deal = {
      id: uid('deal'),
      escrowId: escrowRef,
      listingId: l.id,
      listingTitle: l.title,
      price: l.price,
      counterparty: seller,
      status: 'paid',
      payMethod: payMethod,
      unread:0,
      updatedAt: Date.now(),
      sellerConfirmed: false,
      buyerConfirmed: false,
      reviewed:false,
      peerKey: (l.sellerAcc || (function(){ try{ const a = accUsers().find(u=>u.uid===l.sellerUid); return a ? a.key : ''; }catch(e){ return ''; } })()),
      role: 'buyer',
      commentsText: '',
      commentsRevealed: !!hasAutoData,
      messages: [
        {from:'sys', text:'Оплата '+fmtPrice(l.price)+' ('+methodLabel+') прошла успешно. Дождитесь подтверждения передачи товара продавцом. После этого проверьте товар и нажмите «Я получил товар».', ts: Date.now()}
      ]
    };
    if(hasAutoData) deal.messages.push({from:'sys', text:'Продавец оставил данные в «Комментариях» (кнопка вверху чата). Проверьте их и подтвердите получение.', ts:Date.now()});
    l.sold = true;
    state.deals.unshift(deal);
    if(hasAutoData && escrowRef && typeof window.revealDealData === 'function') window.revealDealData(deal);
    if(payMethod === 'internal'){
      /* списание и запись в историю делает сервер (serverBuy выше) */
    } else {
      state.me.transactions.unshift({type:'purchase_ext', amount:0, label:'Оплата «'+l.title+'» ('+methodLabel+')', ts:Date.now()});
    }
    saveState();
  }
  try {
    if (!deal.peerKey && l.sellerKey) deal.peerKey = String(l.sellerKey).replace(/^u_/, '');
    console.log('=== ОТПРАВКА СДЕЛКИ ===');
    console.log('sellerUid товара:', l.sellerUid);
    console.log('sellerAcc товара:', l.sellerAcc);
    console.log('Ключ продавца (peerKey):', deal.peerKey);
    console.log('Мой ключ (state.accKey):', state.accKey);
    peerSyncDeals();
  } catch(e) { console.error(e); }
  navigate('/chat/'+deal.id);
}
function goToSeller(sellerId, event){
  if(event){ event.stopPropagation(); }
  if(!sellerId) return;
  if(sellerId === 'me'){ navigate('/profile'); return; }
  navigate('/seller/'+sellerId);
}

function pageSellerProfile(id){
  const seller = sellerById(id);
  if(!seller) return page404();
  const listings = state.listings.filter(l=>sellerIdOf(l)===id && !l.sold && (!l.moderation || l.moderation==='approved'));
  const reviews = seller.reviews || [];
  const pct = Math.round((parseFloat(seller.rating)||0) / 5 * 100);
  return `
  ${topbar({back:true, title:seller.name})}
  <div class="page">
    <div class="card" style="position:relative;padding:18px;margin-bottom:16px;background:linear-gradient(150deg, var(--accent-soft), var(--surface));">
      ${adminDots(seller.id)}
      <div class="row gap12">
        <div class="avatar" style="width:58px;height:58px;background:${seller.color};font-size:19px;">${initials(seller.name)}${seller.online?'<span class="online-dot"></span>':''}</div>
        <div style="flex:1;min-width:0;">
          <div class="row gap8"><span class="h2" style="font-size:16px;">${seller.name}</span></div>
          <div class="faint" style="font-size:10.5px;margin-top:2px;letter-spacing:.2px;">${reviews.length.toLocaleString('ru-RU')} отзывов</div>
          <div class="row gap8" style="margin-top:5px;">${sellerBadges(seller)}</div>
          <div class="faint" style="font-size:11px;margin-top:3px;">${icon('clock',11)} отвечает за ~${seller.avgResponseMin||10} мин</div>
        </div>
      </div>
    </div>
    <div class="row gap12" style="margin-bottom:20px;">
      <div class="card" style="flex:1;padding:14px;text-align:center;">
        ${starsHtml(seller.rating)}
        <div class="h2" style="font-size:15px;color:var(--accent-2);margin-top:5px;">${pct}%</div>
        <div class="faint" style="font-size:10px;margin-top:1px;">Рейтинг</div>
      </div>
      <div class="card" style="flex:1;padding:14px;text-align:center;">
        <div class="h1" style="font-size:19px;">${seller.deals||0}</div>
        <div class="faint" style="font-size:11px;margin-top:2px;">Сделок</div>
      </div>
      <div class="card" style="flex:1;padding:14px;text-align:center;">
        <div class="h1" style="font-size:19px;">${reviews.length}</div>
        <div class="faint" style="font-size:11px;margin-top:2px;">Отзывов</div>
      </div>
    </div>
    <div class="row between" style="margin-bottom:10px;align-items:center;">
      <div class="section-title" style="margin:0;">Товары (${listings.length})</div>
      <div class="icon-btn" style="width:30px;height:30px;" onclick="navigate('/seller/${id}/listings')">${icon('chev',15)}</div>
    </div>
    <div class="lgrid" style="margin-bottom:22px;">
      ${listings.length===0 ? `<div class="faint" style="font-size:12.5px;">Пока нет активных объявлений</div>` :
        listings.slice(0,6).map(listingCardHtml).join('')}
    </div>
    <div class="section-title">Отзывы</div>
    <div style="margin-bottom:14px;">
      ${reviews.length===0 ? `<div class="faint" style="font-size:12.5px;">Пока нет отзывов</div>` :
        reviews.slice(0,5).map((r,ri)=>`
        <div class="review-card">
          <div class="row between" style="margin-bottom:4px;">
            <span style="font-size:12.5px;font-weight:700;">${r.author}</span>
            ${starsHtml(r.rating)}
          </div>
          <div class="muted" style="font-size:12.5px;line-height:1.5;">${r.text}</div>
          <div class="row between" style="margin-top:5px;"><span class="faint" style="font-size:10.5px;">${timeAgo(r.ts)}</span><span class="faint" style="font-size:11px;cursor:pointer;" onclick="reviewReportSheet('${seller.id}',${ri})">Пожаловаться</span></div>
        </div>`).join('')}
    </div>
    ${reviews.length>0 ? `
    <div class="row gap8" style="justify-content:center;align-items:center;margin-bottom:90px;cursor:pointer;" onclick="navigate('/seller/${id}/reviews')">
      <span class="faint" style="font-size:12.5px;">Подробнее</span>
      ${icon('chev',13,'var(--text-faint)')}
    </div>` : `<div style="margin-bottom:90px;"></div>`}
  </div>
  <div class="chat-input-bar chat-input-bar-fixed" style="justify-content:center;">
    <button class="btn btn-primary btn-block" onclick="startChatWithSellerId('${seller.id}')">${icon('chat',17)} Написать продавцу</button>
  </div>`;
}
function pageSellerListings(id){
  const seller = sellerById(id);
  if(!seller) return page404();
  const listings = state.listings.filter(l=>sellerIdOf(l)===id && !l.sold && (!l.moderation || l.moderation==='approved'));
  return `${topbar({closeTo:'/seller/'+id, title:'Товары · '+seller.name, solid:true})}
  <div class="page">
    <div class="lgrid" style="margin-bottom:20px;">
      ${listings.length===0 ? `<div class="faint" style="font-size:12.5px;">Пока нет активных объявлений</div>` :
        listings.map(listingCardHtml).join('')}
    </div>
  </div>`;
}
function pageSellerReviews(id){
  const seller = sellerById(id);
  if(!seller) return page404();
  const reviews = seller.reviews || [];
  return `${topbar({closeTo:'/seller/'+id, title:'Отзывы · '+seller.name, solid:true})}
  <div class="page">
    <div style="margin-bottom:20px;">
      ${reviews.length===0 ? `<div class="faint" style="font-size:12.5px;">Пока нет отзывов</div>` :
        reviews.map((r,ri)=>`
        <div class="review-card">
          <div class="row between" style="margin-bottom:4px;">
            <span style="font-size:12.5px;font-weight:700;">${r.author}</span>
            ${starsHtml(r.rating)}
          </div>
          <div class="muted" style="font-size:12.5px;line-height:1.5;">${r.text}</div>
          <div class="row between" style="margin-top:5px;"><span class="faint" style="font-size:10.5px;">${timeAgo(r.ts)}</span><span class="faint" style="font-size:11px;cursor:pointer;" onclick="reviewReportSheet('${seller.id}',${ri})">Пожаловаться</span></div>
        </div>`).join('')}
    </div>
  </div>`;
}
function startChatWithSellerId(sellerId){
  const open = state.deals.find(d=>d.counterparty && d.counterparty.id===sellerId && d.status==='active');
  if(open){ navigate('/chat/'+open.id); return; }
  const l = state.listings.find(x=>x.sellerId===sellerId && !x.sold && (!x.moderation || x.moderation==='approved'));
  if(l){ openChatWithSeller(l.id, true); return; }
  toast('У продавца пока нет активных объявлений для чата');
}
