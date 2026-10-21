function pageSell(){
  return `
  ${topbar({title:'Новое объявление', back:true})}
  <form class="page" onsubmit="return submitSellForm(event)">
    <div class="section-title">Фото товара <span class="faint" style="font-weight:500;">(от 1 до 10 шт.)</span></div>
    <div class="row gap8" style="margin-bottom:20px;flex-wrap:wrap;" id="sellImages">
      ${sellDraft.images.map((img,i)=>`
        <div class="img-preview-wrap">
          <img class="img-preview" src="${img}">
          <div class="img-remove" onclick="removeSellImage(${i})">${icon('close',11)}</div>
        </div>`).join('')}
      ${sellDraft.images.length < 10 ? `
      <label class="upload-tile">
        ${icon('image',22)}
        <input type="file" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
      </label>` : ''}
    </div>
    <div class="section-title">Игра</div>
    <select class="select" id="sellGame" style="margin-bottom:16px;" required onchange="renderSellSpecs()">
      <option value="">Выберите игру</option>
      ${Object.keys(GAME_TYPES).map(t=>`<optgroup label="${GAME_TYPES[t]}">${GAMES.filter(g=>gameType(g)===t).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</optgroup>`).join('')}
    </select>
    <div class="section-title">Категория</div>
    <div class="scroll-x" style="margin-bottom:16px;" id="sellCatChips">
      ${CATEGORIES.filter(c=>c!=='Все').map((c,i)=>`<div class="chip ${i===0?'active':''}" data-cat="${c}" onclick="selectSellCat(this)">${c}</div>`).join('')}
    </div>
    <input type="hidden" id="sellCategory" value="${CATEGORIES[1]}">
    <div id="sellSpecs"><div class="faint" style="font-size:12px;margin-bottom:16px;padding-left:2px;">Выберите игру, и здесь появятся её характеристики: ранг, уровень, скины и другое. Все поля обязательны.</div></div>
    <div class="section-title">Название</div>
    <input class="input" id="sellTitle" placeholder="Например: Аккаунт CS2 с Prime статусом" maxlength="70" style="margin-bottom:4px;" required>
    <div class="faint" style="font-size:11px;margin-bottom:16px;padding-left:2px;">Минимум 13 символов</div>
    <div class="section-title">Описание</div>
    <textarea class="textarea" id="sellDesc" placeholder="Опишите товар: состояние, детали передачи, гарантии..." maxlength="600" style="margin-bottom:4px;" required></textarea>
    <div class="faint" style="font-size:11px;margin-bottom:16px;padding-left:2px;">Минимум 13 символов</div>
    <div class="section-title">Данные аккаунта</div>
    <textarea class="textarea" id="sellAccountData" placeholder="Логин, пароль или другие данные для передачи — либо приветственное сообщение покупателю. Покупатель увидит это только после покупки, в комментариях." maxlength="1000" style="margin-bottom:6px;min-height:90px;"></textarea>
    <div class="faint" style="font-size:11px;margin-bottom:16px;padding-left:2px;">${icon('lock',11)} Скрыто от всех — станет видно покупателю только после оплаты</div>
    <div class="row between" style="margin-bottom:6px;">
      <div class="section-title" style="margin:0;">Цена</div>
      <div class="faint" style="font-size:11px;">Комиссия площадки: ${Math.round(SELL_FEE_RATE*100)}%</div>
    </div>
    <div class="row gap8" style="align-items:stretch;margin-bottom:22px;">
      <div style="flex:1;">
        <input class="input" type="number" min="1" id="sellPrice" placeholder="0" oninput="updateSellPriceCalc()" required>
        <div class="faint" style="font-size:10.5px;margin-top:5px;padding-left:2px;">Цена для покупателя, ₽</div>
      </div>
      <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;">
        <div id="sellNetPrice" class="h2" style="font-size:15px;color:var(--accent-2);">0 ₽</div>
        <div class="faint" style="font-size:10.5px;margin-top:3px;">Вы получите</div>
      </div>
    </div>
    <div class="section-title">Способ передачи</div>
    <div class="card" style="padding:12px 14px;margin-bottom:22px;cursor:pointer;" id="sellAutoDeliveryRow" onclick="toggleSellAutoDelivery()">
      <div class="row between">
        <div class="row gap12">
          ${icon('bolt',18,'var(--accent)')}
          <div>
            <div style="font-size:13.5px;font-weight:700;">Автоматически</div>
            <div class="faint" style="font-size:11px;margin-top:2px;max-width:220px;line-height:1.4;">Данные из поля выше откроются покупателю сразу после оплаты, без вашего участия</div>
          </div>
        </div>
        <div id="sellAutoDeliveryDot" style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        </div>
      </div>
    </div>
    <input type="hidden" id="sellAutoDelivery" value="0">
    <button class="btn btn-primary btn-block" type="submit">${icon('bolt',17,'#fff')} Опубликовать объявление</button>
    <div class="faint" style="font-size:11.5px;text-align:center;margin-top:10px;">Публикуя объявление, вы соглашаетесь с правилами площадки</div>
  </form>`;
}
function toggleSellAutoDelivery(){
  const hidden = document.getElementById('sellAutoDelivery');
  const dot = document.getElementById('sellAutoDeliveryDot');
  const row = document.getElementById('sellAutoDeliveryRow');
  if(!hidden || !dot || !row) return;
  const next = hidden.value !== '1';
  hidden.value = next ? '1' : '0';
  dot.style.borderColor = next ? 'var(--accent)' : 'var(--border)';
  dot.innerHTML = next ? `<div style="width:11px;height:11px;border-radius:50%;background:var(--accent);"></div>` : '';
  row.style.borderColor = next ? 'var(--accent)' : 'var(--border-soft)';
  row.style.background = next ? 'var(--accent-soft)' : 'var(--surface)';
}
function updateSellPriceCalc(){
  const el = document.getElementById('sellPrice');
  const out = document.getElementById('sellNetPrice');
  if(!el || !out) return;
  const price = parseFloat(el.value) || 0;
  const fee = Math.round(price * SELL_FEE_RATE);
  const net = price - fee;
  out.textContent = (price>0 ? net.toLocaleString('ru-RU') : '0') + ' ₽';
}
function selectSellCat(el){
  document.querySelectorAll('#sellCatChips .chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sellCategory').value = el.dataset.cat;
  renderSellSpecs();
}
function handleImageUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  if(sellDraft.images.length>=10) return;
  if(file.size > 15*1024*1024){
    toast('Файл больше 15 МБ — выберите изображение поменьше','error');
    return;
  }
  compressImage(file, 1280, 0.78).then(url=>{
    sellDraft.images.push(url);
    onRoute();
  }).catch(()=>toast('Не удалось обработать фото','error'));
}
function compressImage(file, maxSide, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ()=>{
      const img = new Image();
      img.onerror = reject;
      img.onload = ()=>{
        const k = Math.min(1, maxSide/Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width*k)), h = Math.max(1, Math.round(img.height*k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function removeSellImage(i){
  sellDraft.images.splice(i,1);
  onRoute();
}
function submitSellForm(e){
  e.preventDefault();
  const gameId = document.getElementById('sellGame').value;
  const title = document.getElementById('sellTitle').value.trim();
  const desc = document.getElementById('sellDesc').value.trim();
  const accountData = document.getElementById('sellAccountData').value.trim();
  const autoDelivery = document.getElementById('sellAutoDelivery').value === '1';
  const price = parseInt(document.getElementById('sellPrice').value, 10);
  const category = document.getElementById('sellCategory').value;
  if(frozenGuard('публикация недоступна')) return false;
  if(!gameId || !title || !desc || !price || price<=0){
    toast('Заполните все поля корректно','error');
    return false;
  }
  if(sellDraft.images.length < 1){
    toast('Добавьте хотя бы одно фото товара','error');
    return false;
  }
  if(title.length < 13){
    toast('Название — минимум 13 символов (сейчас '+title.length+')','error');
    return false;
  }
  if(desc.length < 13){
    toast('Описание — минимум 13 символов (сейчас '+desc.length+')','error');
    return false;
  }
  const specs = collectSellSpecs(gameId, category);
  if(!specs) return false;
  const game = GAMES.find(g=>g.id===gameId);
  let myUid = '';
  let myAccKey = String((state.me && state.me.name) || '').trim().toLowerCase();
  try {
    const db = readAccDb();
    if (db[myAccKey] && db[myAccKey].uid) myUid = db[myAccKey].uid;
  } catch(e){}

  if (!myUid) { toast('Ошибка: у аккаунта нет ID. Перезайдите.', 'error'); return false; }

  const listing = {
    id: uid('lst'), gameId, category, title, specs,
    description: desc, accountData, autoDelivery, price,
    sellerId: myUid, views: 0, createdAt: Date.now(),
    color: game.color, images: sellDraft.images.slice(0, 10),
    moderation: 'pending',
    sellerUid: myUid, sellerAcc: myAccKey, 
    sellerKey: 'u_' + myAccKey, sellerName: (state.me && state.me.name) || ''
  };
  state.listings.unshift(listing);
  // Принудительно отправляем товар на сервер СРАЗУ при создании
  if (typeof window.__SYNC !== 'undefined' && window.__SYNC.flush) {
    window.__SYNC.flush().then(() => {
      console.log('Товар отправлен на сервер с UID:', myUid);
    }).catch(console.error);
  }
  state.myListings.unshift(listing.id);
  sellDraft = {images:[], autoDelivery:false, specs:{}};
  const fee = Math.round(price * SELL_FEE_RATE);
  saveState();
  toast('Отправлено на модерацию. Появится в каталоге после проверки администрацией.','success');
  navigate('/profile/listings');
  return false;
}

