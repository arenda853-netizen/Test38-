/* ============================================================
   ОТЗЫВЫ, ЖАЛОБА ПОСЛЕ СДЕЛКИ (24 ч) И ПАУЗА ТАЙМЕРА ДЕНЕГ
   Подключается последним, после 24-content-protection.js.
   1) Отзыв сохраняется вместе с товаром и номером сделки, виден на странице продавца
      и в его профиле: счётчик отзывов, товар под каждым отзывом, список успешных сделок
      (под каждой сделкой — отзыв покупателя или «без отзыва»). Рейтинг = среднее по отзывам.
   2) Покупатель может подать жалобу в течение 24 часов после завершения сделки.
      Чат остаётся открытым, таймер замороженных денег у продавца останавливается
      до решения администрации. Через 24 часа жалобу подать нельзя.
   ============================================================ */
(function(){
  'use strict';
  const APPEAL_MS = 24 * 60 * 60 * 1000;
  const W = window;
  const isO = x => x && typeof x === 'object' && !Array.isArray(x);
  const E = s => (typeof esc === 'function') ? esc(s) : String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtLeft = ms => { const s = Math.max(0, Math.floor(ms/1000)); return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor((s%3600)/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
  const avg = rs => { const a = (rs||[]).map(r=>Number(r && r.rating)).filter(n=>n>0); return a.length ? (a.reduce((x,y)=>x+y,0)/a.length).toFixed(1) : 0; };

  /* ---------- время завершения сделки и окно жалобы ---------- */
  function completedTs(d){
    if(!d) return 0;
    if(d.completedAt) return d.completedAt;
    const ms = Array.isArray(d.messages) ? d.messages : [];
    const done = ms.filter(m=>m && m.done).reduce((a,m)=>Math.max(a, m.ts||0), 0);
    if(done) return done;
    const conf = ms.filter(m=>m && m.confirm).reduce((a,m)=>Math.max(a, m.ts||0), 0);
    return conf || d.updatedAt || 0;
  }
  function appealLeft(d){ return completedTs(d) + APPEAL_MS - Date.now(); }
  function canAppeal(d){
    return !!d && d.status === 'completed' && d.role !== 'seller' && !d.appealed && !(typeof ADMIN !== 'undefined' && ADMIN) && appealLeft(d) > 0;
  }

  const _try = W.tryCompleteDeal;
  W.tryCompleteDeal = function(id){
    const ok = _try.apply(this, arguments);
    try{
      const d = state.deals.find(x=>x.id===id);
      if(ok && d && !d.completedAt){ d.completedAt = Date.now(); saveState(); }
    }catch(e){}
    return ok;
  };

  /* ---------- жалоба покупателя после завершения ---------- */
  W.appealSheet = function(id){
    const d = state.deals.find(x=>x.id===id);
    if(!canAppeal(d)) return `<div class="h2" style="margin-bottom:6px;">Жалоба недоступна</div>
      <div class="muted" style="font-size:13px;line-height:1.5;margin-bottom:14px;">Жалобу на продавца можно подать только в течение 24 часов после завершения сделки. Это время уже прошло или жалоба уже подана.</div>
      <button class="btn btn-ghost btn-block" onclick="closeModal()">Закрыть</button>`;
    return `<div class="h2" style="margin-bottom:6px;">Жалоба на продавца</div>
    <div class="muted" style="font-size:13px;line-height:1.5;margin-bottom:10px;">Осталось на жалобу: <b>${fmtLeft(appealLeft(d))}</b>. Деньги продавца по этой сделке будут заморожены, а их таймер остановится до решения администрации. Переписка остаётся открытой.</div>
    <textarea class="textarea" id="appealText" placeholder="Что пошло не так? Опишите проблему"></textarea>
    <div class="row gap8" style="margin-top:14px;">
      <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
      <button class="btn btn-danger" style="flex:1;" onclick="appealDeal('${id}')">Подать жалобу</button>
    </div>`;
  };
  W.appealDeal = function(id){
    const d = state.deals.find(x=>x.id===id);
    if(!d) return;
    if(!canAppeal(d)){ closeModal(); toast('Время для жалобы вышло','error'); return; }
    const why = ((document.getElementById('appealText')||{}).value || '').trim();
    d.completedAt = completedTs(d);
    d.status = 'frozen'; d.appealed = true; d.appealedAt = Date.now(); d.disputeRole = 'buyer';
    d.updatedAt = Date.now();
    d.messages.push({from:'sys', text:'Покупатель подал жалобу на продавца после завершения сделки'+(why?': «'+why.slice(0,400)+'»':'')+'. Деньги продавца по сделке заморожены, таймер остановлен до решения администрации. Переписка остаётся открытой.', ts:Date.now()});
    try{ notifyDeal(d,'frozen'); }catch(e){}
    saveState();
    try{ if(W.__SYNC && W.__SYNC.flush) W.__SYNC.flush(); }catch(e){}
    try{ syncDealRows(d); }catch(e){}
    closeModal();
    toast('Жалоба подана','success');
    onRoute();
  };

  /* кнопка в меню сделки и панель в чате завершённой сделки */
  const _actions = W.dealActionsSheet;
  W.dealActionsSheet = function(id){
    let html = _actions.apply(this, arguments);
    try{
      const d = state.deals.find(x=>x.id===id);
      if(canAppeal(d)){
        const mark = `<div class="btn btn-ghost btn-block" onclick="closeModal(); navigate('/chat/support')">`;
        const btn = `<div class="btn btn-danger btn-block" onclick="closeModal(); openModal(appealSheet('${id}'))">Пожаловаться на продавца · ещё ${fmtLeft(appealLeft(d))}</div>`;
        html = html.indexOf(mark) >= 0 ? html.replace(mark, btn + mark) : html + btn;
      }
    }catch(e){}
    return html;
  };
  const _bar = W.dealActionBar;
  W.dealActionBar = function(d){
    let html = _bar.apply(this, arguments);
    try{
      if(!html && d && d.status === 'completed' && d.role !== 'seller' && !(typeof ADMIN !== 'undefined' && ADMIN)){
        const parts = [];
        if(!d.reviewed){
          parts.push((d.reviewRequested ? `<div class="faint" style="font-size:11.5px;text-align:center;margin-bottom:7px;line-height:1.4;">Ваш отзыв удалён по жалобе. Оставьте новый.</div>` : '') +
            `<button class="btn btn-primary btn-sm btn-block" onclick="openModal(reviewSheet('${d.id}'))">${d.reviewRequested ? 'Оставить отзыв заново' : 'Оставить отзыв'}</button>`);
        }
        if(canAppeal(d)){
          parts.push(`<button class="btn btn-ghost btn-sm btn-block" onclick="openModal(appealSheet('${d.id}'))">Пожаловаться на продавца (осталось <span class="appeal-left" data-end="${completedTs(d)+APPEAL_MS}">${fmtLeft(appealLeft(d))}</span>)</button>`);
        }
        if(parts.length) html = `<div style="background:var(--surface);border-top:1px solid var(--border-soft);padding:10px 14px;display:flex;flex-direction:column;gap:7px;">${parts.join('')}</div>`;
      }
    }catch(e){}
    return html;
  };

  /* решение «в пользу продавца» по жалобе после завершения: деньги уже у продавца в заморозке — второй раз не платим */
  const _finish = W.finishDispute;
  W.finishDispute = function(id){
    const d = (typeof findDealAny === 'function') ? findDealAny(id) : null;
    if(d && d.appealed && d.status === 'frozen' && typeof can === 'function' && can('disputes')){
      if(d.disputeDecision !== 'seller'){ toast('Сначала выберите решение','error'); return; }
      d.status = 'completed'; d.updatedAt = Date.now();
      d.messages.push({from:'sys', text:'Администрация отклонила жалобу. Таймер денег продавца запущен снова.', ts:Date.now(), adm:(ADMIN.staffId||'owner')});
      try{ logOp('Жалоба после сделки отклонена', id, 'disputes', {dealId:id, title:d.listingTitle, price:d.price, playerId:d.counterparty?d.counterparty.id:'', playerName:d.counterparty?d.counterparty.name:'', result:'В пользу продавца'}); }catch(e){}
      saveState(); toast('Жалоба закрыта','success');
      try{ syncDealRows(d); }catch(e){}
      onRoute();
      return;
    }
    return _finish.apply(this, arguments);
  };

  /* синхронизация сделки между сторонами: добавляем поля жалобы */
  W.syncDealRows = function(d){
    if(!d) return;
    /* копии сделок другой стороны больше не пишет браузер: статус берётся с сервера */
    return;
    const me = (state.authed && state.accKey) ? state.accKey : null;
    const all = W.__ALL_DEALS || {};
    Object.keys(all).forEach(function(acc){
      if(acc === me) return;
      if(!(all[acc]||[]).some(x=>x && x.id===d.id)) return;
      kvUpdate('a:' + acc + ':deals', function(arr){
        arr = Array.isArray(arr) ? arr : [];
        const it = arr.find(x=>x && x.id===d.id); if(!it) return undefined;
        ['status','disputeRole','disputeDecision','updatedAt','appealed','appealedAt','completedAt'].forEach(function(k){ if(d[k] !== undefined) it[k] = d[k]; });
        it.messages = it.messages || [];
        (W.__msgSrv ? [] : (d.messages||[])).forEach(function(m){
          if(m.from !== 'sys' && !m.adm) return;
          if(it.messages.some(x=>x.ts===m.ts && x.text===m.text)) return;
          it.messages.push((m.adm && m.from==='me') ? Object.assign({}, m, {from:'them'}) : m);
        });
        return arr;
      });
    });
  };

  /* ---------- замороженные деньги: привязка к сделке, пауза на время жалобы ---------- */
  function dealOfFund(f){
    const ds = state.deals || [];
    if(f.dealId){ const d = ds.find(x=>x && x.id===f.dealId); if(d) return d; }
    const d = ds.find(x=>x && x.role==='seller' && x.listingTitle===f.label && Number(x.price)===Number(f.amount) && (x.status==='completed' || x.status==='frozen'));
    if(d && !f.dealId) f.dealId = d.id;
    return d || null;
  }
  const _fin = W.finalizeListingSale;
  W.finalizeListingSale = function(listingId, price, title){
    const d = (state.deals||[]).filter(x=>x && x.listingId===listingId && x.status==='completed').sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    if(d && state.me && Array.isArray(state.me.frozenFunds) && state.me.frozenFunds.some(f=>f.dealId===d.id)){ return; }   /* деньги уже в заморозке (возобновление после жалобы) */
    const before = (state.me.frozenFunds||[]).length;
    _fin.apply(this, arguments);
    try{
      const arr = state.me.frozenFunds || [];
      if(d && arr.length > before){ arr[arr.length-1].dealId = d.id; saveState(); }
    }catch(e){}
  };

  const _card = W.frozenFundsCard;
  W.frozenFundsCard = function(me){
    let html = _card.apply(this, arguments);
    try{
      (me.frozenFunds||[]).forEach(function(f){
        if(!f.paused) return;
        const re = new RegExp('<span class="faint" style="font-size:10px;">До разморозки</span>\\s*<span class="countdown frozen-timer" data-unlock="' + f.unlockAt + '"[^>]*>[^<]*</span>');
        html = html.replace(re, '<span class="faint" style="font-size:10px;">Жалоба на сделку: таймер остановлен</span><span style="font-size:11px;color:#FFB020;font-weight:700;">⏸ на паузе</span>');
      });
    }catch(e){}
    return html;
  };

  let lastTick = Date.now();
  W.startFrozenTicker = function(){
    if(frozenTickerInterval) return;
    lastTick = Date.now();
    frozenTickerInterval = setInterval(function(){
      const now = Date.now(), dt = now - lastTick; lastTick = now;
      if(!state || !state.me || !state.me.frozenFunds || !state.me.frozenFunds.length) return;
      let unlocked = false, rerender = false, removed = false, dirty = false;
      state.me.frozenFunds = state.me.frozenFunds.filter(function(f){
        const d = dealOfFund(f);
        if(d && d.status === 'cancelled'){ removed = true; return false; }          /* возврат покупателю: деньги не зачисляются */
        if(d && d.status === 'frozen'){                                              /* жалоба: таймер стоит */
          f.unlockAt += dt; f.startedAt = (f.startedAt||now) + dt;
          if(!f.paused){ f.paused = true; rerender = true; }
          dirty = true; return true;
        }
        if(f.paused){ delete f.paused; rerender = true; dirty = true; }
        if(f.unlockAt <= now || (typeof holdOffForMe === 'function' && holdOffForMe())){
          state.me.balance += f.amount;
          state.me.transactions.unshift({type:'sale', amount:f.amount, label:'Поступление от продажи «'+f.label+'»', ts:now});
          unlocked = true; return false;
        }
        return true;
      });
      if(removed){ saveState(); try{ toast('Сделка отменена по жалобе: деньги возвращены покупателю','error'); }catch(e){} if(currentHash().path==='/profile') onRoute(); return; }
      if(unlocked){
        saveState();
        if(currentHash().path==='/profile'){ toast('Средства разморожены и зачислены на баланс','success'); onRoute(); }
        return;
      }
      if(dirty && (rerender || now % 30000 < 1000)) saveState();
      if(rerender && currentHash().path==='/profile'){ onRoute(); return; }
      document.querySelectorAll('.frozen-timer').forEach(function(el){ el.textContent = fmtLeft(parseInt(el.dataset.unlock,10) - now); });
      document.querySelectorAll('.frozen-bar-fill').forEach(function(el){
        const s = parseInt(el.dataset.start,10), u = parseInt(el.dataset.unlock,10);
        el.style.width = Math.min(100, Math.max(0, (now-s)/(u-s)*100)) + '%';
      });
      document.querySelectorAll('.appeal-left').forEach(function(el){ el.textContent = fmtLeft(parseInt(el.dataset.end,10) - now); });
    }, 1000);
  };
  if(frozenTickerInterval){ clearInterval(frozenTickerInterval); frozenTickerInterval = null; W.startFrozenTicker(); }

  /* ---------- отзывы ---------- */
  W.submitReview = function(dealId){
    const d = state.deals.find(x=>x.id===dealId);
    if(!d){ closeModal(); return; }
    if(d.reviewed){ closeModal(); toast('Отзыв по этой сделке уже оставлен'); return; }
    const text = ((document.getElementById('reviewText')||{}).value || '').trim();
    /* отзыв пишет сервер: только покупатель закрытой сделки, один раз */
    if(!d.escrowId){ closeModal(); toast('Отзыв можно оставить только по сделке с защитой','error'); return; }
    let tok = ''; try{ tok = localStorage.getItem('dp_token') || ''; }catch(e){}
    fetch(ACCOUNT_STATE_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ action:'review_add', token: tok, escrow: d.escrowId, rating: reviewStarValue, text: text }) })
      .then(function(r){ return r.json(); }).then(function(res){
        if(!res || !res.ok){
          closeModal();
          toast(res && res.error==='already' ? 'Отзыв по этой сделке уже оставлен' : (res && res.error==='not_completed' ? 'Отзыв доступен после завершения сделки' : 'Не удалось отправить отзыв'), 'error');
          return;
        }
        d.reviewed = true; reviewStarValue = 5; saveState(); closeModal(); toast('Спасибо за отзыв!','success'); onRoute();
      }).catch(function(){ closeModal(); toast('Нет связи с сервером','error'); });
  };

  /* рейтинг всегда считается по числу и оценкам отзывов */
  const _pseudo = W.pseudoSeller;
  W.pseudoSeller = function(){
    const s = _pseudo.apply(this, arguments);
    try{ if(s && Array.isArray(s.reviews) && s.reviews.length) s.rating = avg(s.reviews); }catch(e){}
    return s;
  };

  /* страницы продавца: под каждым отзывом — название товара */
  function withTitles(fn){
    return function(id){
      const real = W.sellerById;
      W.sellerById = function(x){
        const s = real.apply(this, arguments);
        if(!s || !Array.isArray(s.reviews)) return s;
        const c = Object.assign({}, s);
        c.reviews = s.reviews.map(function(r){
          if(!r || !r.title) return r;
          return Object.assign({}, r, { text: '<div style="font-size:11px;color:var(--accent-2);font-weight:700;margin-bottom:3px;">Товар: '+E(r.title)+'</div>' + (r.text||'') });
        });
        if(c.reviews.length) c.rating = avg(s.reviews) || s.rating;
        return c;
      };
      try{
        const html = fn.apply(this, arguments);
        /* пожаловаться на отзыв может только сам продавец (из своего профиля), другим кнопка не показывается */
        return String(html).replace(/<span class="faint" style="font-size:11px;cursor:pointer;" onclick="reviewReportSheet\([^)]*\)">Пожаловаться<\/span>/g, '');
      }
      finally{ W.sellerById = real; }
    };
  }
  W.pageSellerProfile = withTitles(W.pageSellerProfile);
  W.pageSellerReviews = withTitles(W.pageSellerReviews);

  /* ---------- свой профиль: отзывы и успешные сделки ---------- */
  function myReviewsHtml(){
    const me = state.me || {};
    const reviews = Array.isArray(me.reviews) ? me.reviews : [];
    const sales = (state.deals||[]).filter(d=>d && d.role==='seller' && (d.status==='completed' || (d.status==='frozen' && d.appealed)))
      .sort((a,b)=>completedTs(b)-completedTs(a));
    if(!reviews.length && !sales.length) return '';
    const stars = r => (typeof starsHtml === 'function') ? starsHtml(r) : '★'.repeat(Math.round(r));
    const ago = ts => (typeof timeAgo === 'function') ? timeAgo(ts) : '';
    const revBy = {}; reviews.forEach(function(r){ if(r && r.dealId) revBy[r.dealId] = r; });
    const card = (r, i) => `<div class="review-card" style="margin-bottom:8px;">
        <div class="row between" style="margin-bottom:4px;"><span style="font-size:12.5px;font-weight:700;">${E(r.author)}</span>${stars(r.rating)}</div>
        ${r.title ? `<div style="font-size:11px;color:var(--accent-2);font-weight:700;margin-bottom:3px;">Товар: ${E(r.title)}</div>` : ''}
        <div class="muted" style="font-size:12.5px;line-height:1.5;">${E(r.text)}</div>
        <div class="row between" style="margin-top:5px;"><span class="faint" style="font-size:10.5px;">${ago(r.ts)}</span><span class="faint" style="font-size:11px;cursor:pointer;" onclick="myReviewReport(${i})">Пожаловаться на отзыв</span></div></div>`;
    const deal = d => {
      const r = revBy[d.id];
      const who = (d.counterparty && d.counterparty.name) || d.peerKey || 'Покупатель';
      return `<div class="card" style="padding:12px 14px;margin-bottom:8px;">
        <div class="row between" style="gap:8px;"><span style="font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${E(d.listingTitle||'Товар')}</span><span style="font-size:12.5px;font-weight:700;white-space:nowrap;">${fmtPrice(d.price)}</span></div>
        <div class="faint" style="font-size:10.5px;margin:2px 0 7px;">${E(who)} · ${ago(completedTs(d))}${d.status==='frozen' ? ' · <span style="color:var(--warning);">жалоба рассматривается</span>' : ''}</div>
        ${r ? `<div style="border-top:1px solid var(--border-soft);padding-top:7px;"><div class="row between" style="margin-bottom:3px;"><span class="faint" style="font-size:11px;">Отзыв покупателя</span>${stars(r.rating)}</div><div class="muted" style="font-size:12.5px;line-height:1.45;">${E(r.text)}</div></div>`
             : `<div class="faint" style="border-top:1px solid var(--border-soft);padding-top:7px;font-size:11.5px;">Без отзыва: покупатель не оставил отзыв</div>`}
      </div>`;
    };
    return `<div class="section-title" style="margin:18px 0 8px;">Отзывы о вас · ${reviews.length}</div>
      ${reviews.length ? reviews.slice(0,20).map(function(r,i){ return card(r,i); }).join('') : `<div class="faint" style="font-size:12.5px;margin-bottom:8px;">Пока нет отзывов</div>`}
      <div class="section-title" style="margin:18px 0 8px;">Успешные сделки · ${sales.length}</div>
      ${sales.length ? sales.slice(0,30).map(deal).join('') : `<div class="faint" style="font-size:12.5px;margin-bottom:8px;">Пока нет завершённых продаж</div>`}`;
  }
  const _profile = W.pageProfile;
  W.pageProfile = function(){
    try{ if(state.me && Array.isArray(state.me.reviews) && state.me.reviews.length) state.me.rating = avg(state.me.reviews); }catch(e){}
    let html = _profile.apply(this, arguments);
    try{
      const extra = myReviewsHtml();
      if(extra){
        const i = html.lastIndexOf('<div class="faint" style="text-align:center;font-size:10.5px;margin-top:14px;">Сборка');
        html = i >= 0 ? html.slice(0,i) + extra + html.slice(i) : html + extra;
      }
    }catch(e){ console.error(e); }
    return html;
  };

  /* ---------- жалоба на отзыв: только продавец, из своего профиля ---------- */
  W.myReviewReport = function(idx){
    const r = (state.me.reviews||[])[idx];
    if(!r){ toast('Отзыв не найден','error'); return; }
    const reasons = (typeof REPORT_REASONS !== 'undefined') ? REPORT_REASONS : ['Оскорбления или мат','Спам или реклама','Фейковый или накрученный отзыв','Другое'];
    openModal(`<div class="h2" style="margin-bottom:6px;">Пожаловаться на отзыв</div>
    <div class="faint" style="font-size:12px;margin-bottom:12px;">Выберите причину, жалобу рассмотрит администрация.</div>
    <div style="display:flex;flex-direction:column;gap:8px;">${reasons.map((x,i)=>`<button class="btn btn-ghost btn-block" onclick="submitMyReviewReport(${idx},${i})">${E(x)}</button>`).join('')}</div>
    <button class="btn btn-ghost btn-block" style="margin-top:10px;" onclick="closeModal()">Отмена</button>`);
  };
  W.submitMyReviewReport = function(idx, reasonIdx){
    const r = (state.me.reviews||[])[idx];
    if(!r){ closeModal(); toast('Отзыв не найден','error'); return; }
    const reasons = (typeof REPORT_REASONS !== 'undefined') ? REPORT_REASONS : [];
    sendReviewReport(state.accKey, r, reasons[reasonIdx] || 'Другое', state.me.name);
  };
  /* ---------- доступ к жалобам на отзывы: модератор и выше ---------- */
  ['moderator','junior','admin','senior','owner'].forEach(function(r){
    try{ const p = ADMIN_ROLES[r].perms; if(p.indexOf('reviews') < 0) p.push('reviews'); }catch(e){}
  });
  const newReports = () => (state.reports||[]).filter(x=>x && x.status==='new' && x.type==='review').length;

  const _admin = W.pageAdmin;
  W.pageAdmin = function(){
    let html = _admin.apply(this, arguments);
    try{
      if(ADMIN && can('reviews') && !can('disputes') && html.indexOf("navigate('/admin/reports')") < 0){
        const row = adminMenuRow('shield','Жалобы на отзывы', newReports()+' новых. Удалить отзыв или отклонить жалобу', "navigate('/admin/reports')");
        const mk = html.indexOf("onclick=\"navigate('/admin/listings')\"");
        let at = -1;
        if(mk >= 0) at = html.lastIndexOf('<div class="card"', mk);
        if(at < 0){ const e = html.indexOf('exitAdminMode()">Выйти</button>'); if(e >= 0){ const c = html.indexOf('</div>', e); if(c >= 0) at = c + 6; } }
        if(at >= 0) html = html.slice(0, at) + row + html.slice(at);
      }
    }catch(e){ console.error(e); }
    try{
      if(isOwner() && html.indexOf("navigate('/admin/verify')") < 0){
        const pg = html.indexOf('<div class="page"');
        if(pg >= 0){ const end = html.indexOf('>', pg) + 1; html = html.slice(0,end) + adminMenuRow('shield','Верификация','Выдать или снять галочку по ID',"navigate('/admin/verify')") + html.slice(end); }
      }
    }catch(e){ console.error(e); }
    return html;
  };

  W.pageAdminReports = function(){
    if(!can('reviews')) return adminGuard('Жалобы');
    const list = (state.reports||[]).filter(x=>x && x.status==='new');
    return `${topbar({title:'Жалобы на отзывы', back:true, solid:true})}
    <div class="page">
      ${list.length===0 ? `<div class="empty-state">${icon('check',36,'var(--text-faint)')}<div class="h2">Новых жалоб нет</div></div>` :
      `<div style="display:flex;flex-direction:column;gap:10px;">${list.map(x=>`
        <div class="card" style="padding:14px;">
          <div class="row between" style="margin-bottom:6px;"><span class="h3" style="font-size:13px;">${E(x.sellerName||x.sellerId)}</span><span class="badge">${E(x.reason)}</span></div>
          <div class="review-card" style="margin-bottom:8px;"><div style="font-size:12px;font-weight:700;margin-bottom:3px;">${E(x.author||'')}</div><div class="muted" style="font-size:12.5px;line-height:1.5;">${E(x.text||'')}</div></div>
          <div class="faint" style="font-size:11px;margin-bottom:10px;">Жалоба от: ${E(x.by)} · ${timeAgo(x.ts)}</div>
          <div class="faint" style="font-size:11px;margin-bottom:8px;line-height:1.4;">Если жалоба верна и отзыв не соответствует правилам, удалите его и попросите покупателя оставить новый.</div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            <button class="btn btn-danger btn-sm btn-block" onclick="reportResolve('${x.id}',true,true)">Удалить и попросить оставить заново</button>
            <div class="row gap8">
              <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="reportResolve('${x.id}',true,false)">Только удалить</button>
              <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="reportResolve('${x.id}',false)">Отклонить</button>
            </div>
          </div>
        </div>`).join('')}</div>`}
    </div>`;
  };

  /* найти сделку покупателя, по которой оставлен отзыв */
  function buyerDealOf(x){
    const buyer = String(x.author||'').trim().toLowerCase();
    const all = W.__ALL_DEALS || {};
    let dealId = x.reviewDealId || '';
    const rows = all[buyer] || [];
    if(!dealId){
      const c = rows.filter(d=>d && d.role==='buyer' && d.status==='completed' && String(d.peerKey||'').toLowerCase()===String(x.sellerKey||'').toLowerCase())
        .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
      if(c) dealId = c.id;
    }
    return { buyer: buyer, dealId: dealId };
  }
  function askReReview(x){
    const t = buyerDealOf(x);
    if(!t.buyer || !t.dealId) return false;
    const text = 'Администрация удалила ваш отзыв по жалобе: он не соответствует правилам. Вы можете оставить новый отзыв о сделке.';
    kvUpdate('a:'+t.buyer+':deals', function(arr){
      arr = Array.isArray(arr) ? arr : [];
      const d = arr.find(y=>y && y.id===t.dealId); if(!d) return undefined;
      d.reviewed = false; d.reviewRequested = true; d.updatedAt = Date.now();
      d.messages = Array.isArray(d.messages) ? d.messages : [];
      d.messages.push({from:'sys', text:text, ts:Date.now(), adm:(ADMIN && ADMIN.staffId) || 'owner'});
      return arr;
    });
    kvUpdate('a:'+t.buyer+':notif', function(arr){
      arr = Array.isArray(arr) ? arr : [];
      arr.unshift({id:uid('ntf'), title:'Отзыв удалён по жалобе', sub:'Оставьте новый отзыв в чате сделки', link:'/chat/'+t.dealId, ts:Date.now(), read:false});
      if(arr.length > 60) arr.length = 60;
      return arr;
    });
    return true;
  }

  /* решение по жалобе: удалить отзыв у продавца, по желанию попросить покупателя написать заново */
  W.reportResolve = function(id, remove, again){
    if(!can('reviews')) return;
    const x = (state.reports||[]).find(r=>r.id===id); if(!x) return;
    if(!ADMIN_CRED){ toast('Войдите в админ-режим, чтобы решить жалобу','error'); return; }
    fetch(ADMIN_DATA_URL, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ action:'report_resolve', admin_nick: ADMIN_CRED.nick, admin_pass: ADMIN_CRED.pass, report_id: id, remove: !!remove, again: !!again }) })
      .then(function(r){ return r.json(); }).then(function(res){
        if(!res || !res.ok){
          const msg = res && res.error==='already' ? 'Жалоба уже рассмотрена' : (res && res.error==='no_report' ? 'Жалоба не найдена' : (res && res.error==='bad_admin' ? 'Неверный ник или пароль' : 'Не удалось решить жалобу'));
          toast(msg,'error'); return;
        }
        x.status = res.status; x.askedAgain = !!res.askedAgain;
        logOp(remove ? (again ? 'Отзыв удалён по жалобе, запрошен новый' : 'Отзыв удалён по жалобе') : 'Жалоба на отзыв отклонена', x.sellerId, 'reports', {sellerId:x.sellerId, reason:x.reason, by:x.by, text:String(x.text||'').slice(0,300)});
        saveState();
        toast(remove ? (x.askedAgain ? 'Отзыв удалён, покупателю предложено оставить новый' : 'Отзыв удалён') : 'Жалоба отклонена','success');
        onRoute();
      }).catch(function(){ toast('Нет связи с сервером','error'); });
  };
})();
