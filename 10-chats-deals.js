function statusMeta(status){
  return {
    active:{label:'Переписка', color:'var(--accent-2)'},
    paid:{label:'Оплачено', color:'var(--warning)'},
    frozen:{label:'Заморожена', color:'var(--danger)'},
    completed:{label:'Завершена', color:'var(--text-dim)'},
    cancelled:{label:'Отменена', color:'var(--text-dim)'}
  }[status];
}
let chatFilter = 'all';
function setChatFilter(f){ chatFilter = f; onRoute(); }
function pageChats(){
  const groups = {all:()=>true, active:d=>d.status==='active'||d.status==='paid', done:d=>d.status==='completed'||d.status==='cancelled', disputes:d=>d.status==='frozen'};
  const deals = [...state.deals].filter(groups[chatFilter]||groups.all).sort((a,b)=>b.updatedAt-a.updatedAt);
  const chips = [['all','Все'],['active','Активные'],['done','Завершённые'],['disputes','Споры']];
  return `
  ${topbar({title:'Сделки и чаты', solid:true})}
  <div class="page">
    ${supportChatRowHtml()}
    <div class="scroll-x" style="display:flex;gap:8px;margin:4px 0 12px;">${chips.map(c=>`<span onclick="setChatFilter('${c[0]}')" style="flex-shrink:0;padding:7px 13px;border-radius:18px;font-size:12.5px;font-weight:700;cursor:pointer;background:${chatFilter===c[0]?'var(--accent)':'var(--surface-2)'};color:${chatFilter===c[0]?'#fff':'var(--text-dim)'};">${c[1]}</span>`).join('')}</div>
    ${deals.length===0 ? `
      <div class="empty-state">${icon('chat',36,'var(--text-faint)')}<div class="h2">${chatFilter==='all'?'Пока нет чатов':'Здесь пусто'}</div><div class="muted" style="font-size:13px;">${chatFilter==='all'?'Напишите продавцу, чтобы начать сделку':'В этой категории пока нет чатов'}</div></div>
    ` : `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${deals.map(d=>{
        const last = d.messages[d.messages.length-1];
        const meta = statusMeta(d.status);
        return `<div class="listing" onclick="navigate('/chat/${d.id}')">
          <div onclick="goToSeller('${d.counterparty.id}', event)" style="cursor:pointer;">
            <div class="avatar" style="width:52px;height:52px;background:${d.counterparty.color};font-size:17px;">${initials(d.counterparty.name)}${peerOnline(d)?'<span class="online-dot"></span>':''}</div>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="row between">
              <span class="h3" style="font-size:14px;cursor:pointer;" onclick="goToSeller('${d.counterparty.id}', event)">${d.counterparty.name}</span>
              <span class="faint" style="font-size:11px;">${timeAgo(d.updatedAt)}</span>
            </div>
            <div class="faint" style="font-size:12px;margin:2px 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.listingTitle}</div>
            <div class="row between">
              <span class="muted" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;">${last ? (last.from==='me'?'Вы: ':'') + last.text : ''}</span>
              <span class="badge" style="background:${meta.color}22;color:${meta.color};">${meta.label}</span>
            </div>
          </div>
          ${d.unread>0?`<div style="width:9px;height:9px;border-radius:50%;background:var(--danger);align-self:flex-start;margin-top:6px;"></div>`:''}
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function pageChat(id){
  const d = findDealAny(id);
  if(!d) return page404();
  d.unread = 0;
  const banners = {
    active:`<div class="deal-banner b-active">
      ${icon('chat',18,'var(--accent-2)')}
      <div style="flex:1;"><div style="font-size:12.5px;font-weight:700;color:#7fe9d4;">Переписка без сделки</div><div class="faint" style="font-size:11.5px;">Купить товар можно только кнопкой «Купить» в объявлении</div></div>
    </div>`,
    paid:`<div class="deal-banner b-paid">
      ${icon('check',18,'var(--warning)')}
      <div style="flex:1;"><div style="font-size:12.5px;font-weight:700;color:#ffcf7a;">Товар оплачен</div><div class="faint" style="font-size:11.5px;">Дождитесь передачи товара. Обе стороны должны подтвердить сделку.</div></div>
    </div>`,
    frozen:`<div class="deal-banner b-frozen">
      ${icon('lock',18,'var(--danger)')}
      <div style="flex:1;">
        <div style="font-size:12.5px;font-weight:700;color:#ff8fa1;">${(function(){
          if(!d.disputeRole) return 'Сделка заморожена администрацией';
          const iAmSeller = isSellerOf(d);
          const iOpened = (d.disputeRole==='seller') === iAmSeller;
          if(iOpened) return 'Вы открыли спор';
          return d.disputeRole==='seller' ? 'Продавец открыл спор' : 'Покупатель открыл спор';
        })()}</div>
        <div class="faint" style="font-size:11.5px;">Деньги заморожены до решения администрации. Переписка открыта — пишите сюда всё, что может пригодиться как доказательство. Отменить спор может только администрация.</div>
      </div>
    </div>`,
    completed:`<div class="deal-banner b-completed">
      ${icon('check',18,'var(--accent-2)')}
      <div style="flex:1;"><div style="font-size:12.5px;font-weight:700;">✅ Сделка совершена</div><div class="faint" style="font-size:11.5px;">Обе стороны подтвердили. Деньги перейдут продавцу по окончании таймера</div></div>
    </div>`,
    cancelled:`<div class="deal-banner b-cancelled">
      ${icon('close',18,'var(--text-dim)')}
      <div style="flex:1;"><div style="font-size:12.5px;font-weight:700;">Сделка отменена</div><div class="faint" style="font-size:11.5px;">Средства возвращены покупателю</div></div>
    </div>`
  };
  const isFrozen = d.status === 'frozen';
  const isClosed = d.status === 'completed' || d.status === 'cancelled';
  const inputDisabled = isClosed; // спор не блокирует переписку — нужна для доказательств
  const isSeller = isSellerOf(d);
  // Каждая сторона видит ТОЛЬКО свою кнопку подтверждения
  const roleButton = isSeller
    ? `<button class="btn btn-ghost btn-sm" style="flex:1;" onclick="sellerConfirmTransfer('${d.id}')" ${d.sellerConfirmed?'disabled':''}>
         ${icon('check',13)} ${d.sellerConfirmed ? 'Передача подтверждена' : 'Я передал товар'}
       </button>`
    : `<button class="btn btn-accent2 btn-sm" style="flex:1;" onclick="buyerConfirmReceipt('${d.id}')" ${d.buyerConfirmed?'disabled':''}>
         ${icon('check',13)} ${d.buyerConfirmed ? 'Получение подтверждено' : 'Я получил товар'}
       </button>`;
  const paidControls = ''; // кнопки «Я передал / Я получил» и «Открыть спор» перенесены в верхнее меню чата
  return `
  <div class="chat-page" style="padding-bottom:calc(${d.status==='frozen'?(can('disputes')?150:104):68}px + env(safe-area-inset-bottom,0px));">
    ${topbar({back:true,
      title: `<span onclick="goToSeller('${d.counterparty.id}')" style="cursor:pointer;">${d.counterparty.name}</span>`,
      subtitle: peerTyping(d) ? 'печатает…' : (peerOnline(d) ? 'в сети' : 'не в сети'),
      right:`<div class="row gap8">
        <div class="icon-btn" onclick="openModal(commentsSheet('${d.id}'))" title="Комментарии">${icon('note',17)}</div>
        <div class="icon-btn" onclick="openModal(dealActionsSheet('${d.id}'))">${icon('filter',17)}</div>
      </div>`
    })}
    ${banners[d.status]}
    ${dealTimerBanner(d)}
    <div class="card" style="margin:10px 16px 0;padding:10px 12px;">
      <div class="row between">
        <div style="font-size:12.5px;font-weight:700;max-width:70%;">${d.listingTitle}</div>
        <div style="font-weight:800;color:var(--accent-2);">${fmtPrice(d.price)}</div>
      </div>
      ${paidControls}
    </div>
    <div id="msgScroll" class="chat-msgs">
      ${(function(){
        const _iSel = isSellerOf(d);
        const _meRole = _iSel ? 'Продавец' : 'Покупатель', _otherRole = _iSel ? 'Покупатель' : 'Продавец';
        let _myId = ''; try{ _myId = actUidByKey(actKey()); }catch(e){}
        return d.messages.map(m=>{
          if(m.from==='sys'){
            const isAdm = !!m.adm || /^Администрация/.test(m.text||'');
            if(isAdm) return `<div class="msg-row sys" style="flex-direction:column;align-items:center;"><div style="margin-bottom:3px;">${whoAdminHTML(m.adm||'', !m.adm)}</div><div class="bubble" style="color:#ff6b6b;font-weight:600;">${m.text}</div></div>`;
            return `<div class="msg-row sys"><div class="bubble${m.confirm?' confirm':''}">${m.text}</div></div>`;
          }
          const out = m.from==='me', bub = `<div class="bubble">${esc(m.text)}</div>`;
          if(m.adm) return msgWithTag(whoAdminHTML(m.adm), bub, out);
          if(out) return msgWithTag(whoRoleHTML(_meRole, _myId), bub, true);
          return msgWithTag(whoRoleHTML(_otherRole, d.counterparty ? d.counterparty.id : ''), bub, false);
        }).join('');
      })()}
      ${peerTyping(d) ? `<div class="msg-row in"><div class="bubble typing-b">печатает<span class="tdots"><i>.</i><i>.</i><i>.</i></span></div></div>` : ''}
    </div>
  </div>
  <div class="chat-bottom-stack">
    ${dealActionBar(d)}
    <div class="chat-input-bar">
      ${inputDisabled ? `
        <div class="row gap8" style="flex:1;background:var(--surface-2);border-radius:14px;padding:11px 14px;color:var(--text-faint);font-size:13px;">
          ${icon('lock',15)} Сделка закрыта, чат недоступен
        </div>
      ` : `
        <input class="input" id="chatInputField" placeholder="Сообщение..." style="flex:1;" value="${esc(window.__chatInputValue||'').replace(/"/g,'&quot;')}">
        <div class="icon-btn accent" onclick="sendMessage('${d.id}')">${icon('send',17,'#fff')}</div>
      `}
    </div>
  </div>`;
}
function dealActionBar(d){
  if(d.status==='frozen'){
    if(can('disputes')){
      const decided = d.disputeDecision === 'seller';
      return `<div style="background:var(--surface);border-top:1px solid var(--border-soft);padding:10px 12px;display:flex;flex-direction:column;gap:7px;">
        <div class="faint" style="font-size:10.5px;text-align:center;">Решение по спору — только для администрации</div>
        <div class="row gap8">
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="cancelDeal('${d.id}')">${icon('back',13)} Возврат</button>
          <button class="btn ${decided?'btn-accent2':'btn-ghost'} btn-sm" style="flex:1;" onclick="decideDisputeForSeller('${d.id}')">${icon('check',13)} В пользу продавца</button>
        </div>
        ${decided
          ? `<button class="btn btn-primary btn-sm btn-block" onclick="finishDispute('${d.id}')">${icon('shield',13)} Завершить спор</button>`
          : `<button class="btn btn-ghost btn-sm btn-block" style="opacity:.5;" disabled>${icon('shield',13)} Завершить спор — сначала выберите решение</button>`}
      </div>`;
    }
    return `<div style="background:var(--surface);border-top:1px solid var(--border-soft);padding:10px 14px;">
      <div class="faint" style="font-size:11.5px;text-align:center;">Спор рассматривает администрация. Отменить его самостоятельно нельзя — дождитесь решения.</div>
    </div>`;
  }
  return '';
}
/* админ (в том числе главный) не подтверждает сделку за игроков: подтверждать могут только сами стороны, спор решается кнопками спора */
function adminBlockedConfirm(){
  if(!ADMIN) return false;
  toast('Админ не может подтверждать сделку за пользователей. Если сделка спорная, используйте решение по спору.','error');
  return true;
}
function dealConfirmSheet(id){
  const d = state.deals.find(x=>x.id===id);
  if(!d) return '';
  if(ADMIN) return `<div class="h2" style="margin-bottom:6px;">Недоступно для админа</div>
  <div class="muted" style="font-size:13px;margin-bottom:16px;line-height:1.5;">Подтверждать передачу и получение товара могут только сами игроки. Админ решает только спорные сделки.</div>
  <button class="btn btn-ghost btn-block" onclick="closeModal()">Закрыть</button>`;
  const isSeller = isSellerOf(d);
  const title = isSeller ? 'Вы точно передали товар?' : 'Вы точно получили товар?';
  const text = isSeller
    ? 'Подтверждайте только если покупатель действительно получил товар. Отменить подтверждение нельзя.'
    : 'Подтверждайте только если вы проверили товар и всё в порядке. Когда подтвердят обе стороны, деньги уйдут продавцу, и вернуть их будет нельзя.';
  const fn = isSeller ? 'sellerConfirmTransfer' : 'buyerConfirmReceipt';
  return `<div class="h2" style="margin-bottom:6px;">${title}</div>
  <div class="muted" style="font-size:13px;margin-bottom:16px;line-height:1.5;">${text}</div>
  <div class="row gap8">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn btn-accent2" style="flex:1;" onclick="closeModal(); ${fn}('${d.id}')">Да, подтверждаю</button>
  </div>`;
}
function dealActionsSheet(id){
  const d = state.deals.find(x=>x.id===id);
  return `<div class="h2" style="margin-bottom:14px;">Сделка</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div class="row gap12" style="padding:10px 4px;">
        ${icon('shield',18,'var(--accent-2)')}
        <div style="font-size:13px;">Все расчёты проходят через гарант платформы. Не переводите деньги напрямую.</div>
      </div>
      ${d.status==='paid' && ADMIN ? `<div class="faint" style="font-size:12px;line-height:1.5;padding:10px 12px;background:var(--surface-2);border-radius:12px;">Подтверждать сделку за игроков админ не может. Доступно только при споре, когда сделка заморожена.</div>` : ''}
      ${d.status==='paid' && !ADMIN ? (function(){
        const isSeller = isSellerOf(d);
        const done = isSeller ? d.sellerConfirmed : d.buyerConfirmed;
        const label = done ? (isSeller?'Передача подтверждена':'Получение подтверждено') : (isSeller?'Я передал товар':'Я получил товар');
        return `<div class="btn ${done?'btn-ghost':'btn-accent2'} btn-block" ${done?'style="opacity:.6;pointer-events:none;"':''} onclick="closeModal(); openModal(dealConfirmSheet('${d.id}'))">${icon('check',15)} ${label}</div>`;
      })() : ''}
      ${(d.status==='paid' || inDisputeWindow(d)) && !ADMIN ? `<div class="btn btn-danger btn-block" onclick="closeModal(); openModal(disputeSheet('${d.id}'))">${icon('lock',15)} Открыть спор</div>` : ''}
      <div class="btn btn-ghost btn-block" onclick="closeModal(); navigate('/chat/support')">${icon('support',15)} Написать в поддержку</div>
    </div>`;
}
function commentsSheet(id){
  const d = state.deals.find(x=>x.id===id);
  if(!d) return '';
  const l = state.listings.find(x=>x.id===d.listingId);
  const isSeller = isSellerOf(d);
  const purchased = d.status==='paid' || d.status==='frozen' || d.status==='completed';
  if(!purchased){
    return `<div class="h2" style="margin-bottom:6px;">Комментарии</div>
    <div class="muted" style="font-size:13px;line-height:1.5;">Здесь появятся данные аккаунта или приветствие продавца — сразу после того, как сделка будет оформлена и оплачена.</div>`;
  }
  if(isSeller){
    const val = (d.commentsText !== undefined ? d.commentsText : (l ? l.accountData : '')) || '';
    return `<div class="h2" style="margin-bottom:4px;">Комментарии для покупателя</div>
    <div class="faint" style="font-size:12px;margin-bottom:12px;line-height:1.4;">Напишите здесь данные аккаунта или приветствие — покупатель увидит это, открыв «Комментарии» в чате.</div>
    <textarea class="textarea" id="commentsTextarea" placeholder="Например: логин и пароль от аккаунта, либо приветственное сообщение...">${val}</textarea>
    <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="saveDealComment('${id}')">${icon('send',15,'#fff')} Отправить покупателю</button>
    ${l && l.autoDelivery ? `<div class="faint" style="font-size:11px;margin-top:10px;text-align:center;">У этого товара включена автовыдача: данные из вашего объявления показываются покупателю в комментариях сразу после оплаты. Сделка сама не закрывается.</div>` : ''}`;
  }
  if(d.commentsRevealed && d.commentsText){
    return `<div class="h2" style="margin-bottom:4px;">Комментарии продавца</div>
    <div class="faint" style="font-size:11.5px;margin-bottom:10px;">${l && l.autoDelivery ? 'Данные оставил продавец (автовыдача включена продавцом)' : 'Отправлено продавцом'}</div>
    <div class="card" style="padding:12px 14px;white-space:pre-wrap;font-size:13.5px;line-height:1.55;">${d.commentsText}</div>
    <div class="faint" style="font-size:11px;margin-top:12px;line-height:1.4;">Проверьте данные и подтвердите получение в чате. Если что-то не так — откройте спор.</div>`;
  }
  return `<div class="h2" style="margin-bottom:6px;">Комментарии</div>
  <div class="muted" style="font-size:13px;line-height:1.5;">Продавец пока не оставил данные аккаунта. Дождитесь сообщения от продавца, затем подтвердите получение в чате.</div>`;
}
function saveDealComment(id){
  const d = state.deals.find(x=>x.id===id);
  const el = document.getElementById('commentsTextarea');
  if(!d || !el) return;
  if(d.status==='frozen' || d.status==='completed' || d.status==='cancelled'){
    toast('Сделка закрыта, комментарии недоступны','error');
    return;
  }
  const text = el.value.trim();
  d.commentsText = text;
  d.commentsRevealed = !!text;
  d.updatedAt = Date.now();
  if(text){
    d.messages.push({from:'sys', text:'Продавец добавил данные в комментарии (кнопка вверху чата).', ts:Date.now()});
  }
  saveState();
  closeModal();
  toast(text ? 'Отправлено покупателю' : 'Комментарий очищен', 'success');
  onRoute();
}
function disputeSheet(id){
  return `<div class="h2" style="margin-bottom:6px;">Вы точно хотите открыть спор?</div>
  <div class="muted" style="font-size:13px;margin-bottom:16px;line-height:1.5;">
    Деньги по сделке будут заморожены до решения администрации. Переписка останется открытой — пишите туда всё, что может понадобиться как доказательство. Отменить спор сможет только администрация.
  </div>
  <div class="row gap8">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Отмена</button>
    <button class="btn btn-danger" style="flex:1;" onclick="freezeDeal('${id}')">Да, открыть спор</button>
  </div>`;
}
function requireAuth(msg){
  if(state && state.authed) return true;
  toast(msg || 'Чтобы купить, войдите или зарегистрируйтесь','error');
  if(typeof openAuthModal === 'function') openAuthModal('login');
  return false;
}
function createDealFromChat(id){
  // Оформление сделки из чата отключено: покупка возможна только через кнопку «Купить» с оплатой.
  toast('Покупка доступна только через кнопку «Купить»','error');
  return;
  if(!requireAuth()) return;
  const d = state.deals.find(x=>x.id===id);
  if(!d || d.status !== 'active') return;
  d.status = 'paid'; notifyDeal(d,'paid');
  d.updatedAt = Date.now();
  d.sellerConfirmed = false;
  d.buyerConfirmed = false;
  const l = state.listings.find(x=>x.id===d.listingId);
  const hasAutoData = l && l.autoDelivery && l.accountData;
  if(hasAutoData){
    d.commentsText = l.accountData;
    d.commentsRevealed = true;
  }
  d.messages.push({from:'sys', text:'Сделка оформлена. Обе стороны должны подтвердить: продавец — передачу, покупатель — получение.', ts:Date.now()});
  if(hasAutoData) d.messages.push({from:'sys', text:'Продавец оставил данные в «Комментариях» (кнопка вверху чата). Проверьте их и подтвердите получение.', ts:Date.now()});
  saveState();
  toast('Сделка оформлена','success');
  onRoute();
}
function isSellerOf(d){
  if(!d) return false;
  const l = state.listings.find(x=>x.id===d.listingId);
  if(!l) return false;
  let myUid = '';
  try { 
    const db = readAccDb(); 
    const myKey = String((state.me && state.me.name)||'').toLowerCase(); 
    if(db[myKey] && db[myKey].uid) myUid = db[myKey].uid; 
  } catch(e){}
  if (!myUid) return false;
  if (l.sellerUid && myUid === l.sellerUid) return true;
  if (l.sellerId && myUid === l.sellerId) return true;
  return false;
}
function markSellerConfirmed(d){
  d.sellerConfirmed = true;
  d.updatedAt = Date.now();
  d.messages.push({from:'sys', text:'Продавец подтвердил передачу товара', ts:Date.now(), confirm:true});
}
function markBuyerConfirmed(d){
  d.buyerConfirmed = true;
  d.updatedAt = Date.now();
  d.messages.push({from:'sys', text:'Покупатель подтвердил получение товара', ts:Date.now(), confirm:true});
}
function inDisputeWindow(d){
  if(!d) return false;
  if(d.escrowId){
    const left = serverLeft(d.escrowId);
    if(left !== null) return d.status==='completed' && left > 0;
  }
  return !!(d.status==='completed' && d.completedAt && Date.now() < d.completedAt + 48*3600*1000);
}
function sellerConfirmTransfer(id){
  if(adminBlockedConfirm()) return;
  const d = state.deals.find(x=>x.id===id);
  if(!d || d.status!=='paid' || d.sellerConfirmed) return;
  if(!isSellerOf(d)) return; // кнопка только у продавца
  markSellerConfirmed(d);
  saveState();
  serverDealConfirm(d);
  toast('Передача подтверждена','success');
  if(!tryCompleteDeal(id)) onRoute();
}
function buyerConfirmReceipt(id){
  if(adminBlockedConfirm()) return;
  const d = state.deals.find(x=>x.id===id);
  if(!d || d.status!=='paid' || d.buyerConfirmed) return;
  if(isSellerOf(d)) return; // кнопка только у покупателя
  markBuyerConfirmed(d);
  saveState();
  serverDealConfirm(d);
  toast('Получение подтверждено','success');
  if(!tryCompleteDeal(id)) onRoute();
}
function tryCompleteDeal(id){
  const d = state.deals.find(x=>x.id===id);
  if(!d) return false;
  if(d.status !== 'paid') return false;
  if(!d.sellerConfirmed || !d.buyerConfirmed) return false;
  
  d.status = 'completed';
  d.completedAt = Date.now();
  notifyDeal(d,'completed');
  d.updatedAt = Date.now();
  const doneTs = ((d.messages||[]).filter(m=>m.confirm).reduce((a,m)=>Math.max(a,m.ts||0),0) || Date.now()) + 1;
  
  const l = state.listings.find(x=>x.id===d.listingId);
  const isMyOwnListing = (l && l.sellerKey === supportKeyMe()) || state.myListings.includes(d.listingId);

  if(isMyOwnListing){
    if(typeof finalizeListingSale === 'function') finalizeListingSale(d.listingId, d.price, d.listingTitle);
    d.messages.push({from:'sys', text:'✅ Сделка совершена. Обе стороны подтвердили сделку. Объявление отмечено проданным. Средства будут переведены продавцу через 48 часов, если спор не откроют.', ts:doneTs, local:true, done:true});
    toast('Сделка завершена. Средства будут переведены продавцу через 48 часов','success');
  } else {
    d.messages.push({from:'sys', text:'✅ Сделка совершена. Обе стороны подтвердили сделку. Средства будут переведены продавцу через 48 часов, если спор не откроют.', ts:doneTs, local:true, done:true});
    toast('Сделка завершена','success');
  }
  
  saveState();
  
  if(currentHash().path === '/chat/'+id){
    onRoute();
    if(!d.reviewed && !isMyOwnListing) setTimeout(()=>openModal(reviewSheet(id)), 400);
  }
  return true;
}
function reviewSheet(dealId){
  return `<div class="h2" style="margin-bottom:4px;">Оцените продавца</div>
  <div class="faint" style="font-size:12px;margin-bottom:14px;">Отзыв увидят другие покупатели на странице продавца</div>
  <div class="row gap8" id="reviewStars" style="margin-bottom:14px;justify-content:center;">
    ${[1,2,3,4,5].map(n=>`<span onclick="setReviewStar(${n})" data-star="${n}" style="cursor:pointer;">${icon('star',26, n<=reviewStarValue ? '#FFB020' : 'var(--border)')}</span>`).join('')}
  </div>
  <textarea class="textarea" id="reviewText" placeholder="Как прошла сделка?"></textarea>
  <div class="row gap8" style="margin-top:14px;">
    <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Позже</button>
    <button class="btn btn-primary" style="flex:1.4;" onclick="submitReview('${dealId}')">Отправить отзыв</button>
  </div>`;
}
let reviewStarValue = 5;
function setReviewStar(n){
  reviewStarValue = n;
  document.querySelectorAll('#reviewStars span').forEach(s=>{
    const filled = +s.dataset.star <= n;
    s.innerHTML = icon('star',26, filled ? '#FFB020' : 'var(--border)');
  });
}
function submitReview(dealId){
  const d = state.deals.find(x=>x.id===dealId);
  if(!d) return;
  const text = (document.getElementById('reviewText')||{}).value?.trim() || '';
  const seller = state.sellers.find(s=>s.id===d.counterparty.id);
  if(seller){
    seller.reviews = seller.reviews || [];
    seller.reviews.unshift({author: state.me.name, rating: reviewStarValue, text: text || 'Сделка прошла успешно.', ts: Date.now()});
    const ratings = seller.reviews.map(r=>r.rating);
    seller.rating = (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1);
  } else {
    try{
      const cid = d.counterparty && d.counterparty.id;
      const acc = accUsers().find(a=>a.uid===cid || supportKeyByName(a.key)===cid);
      if(acc){
        const rv = {author: state.me.name, rating: reviewStarValue, text: text || 'Сделка прошла успешно.', ts: Date.now()};
        kvUpdate('a:'+acc.key+':me', function(cur){
          if(!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
          cur.reviews = Array.isArray(cur.reviews) ? cur.reviews : [];
          cur.reviews.unshift(rv);
          const rs = cur.reviews.map(r=>r.rating);
          cur.rating = (rs.reduce((x,y)=>x+y,0)/rs.length).toFixed(1);
          return cur;
        });
      }
    }catch(e){}
  }
  d.reviewed = true;
  reviewStarValue = 5;
  saveState();
  closeModal();
  toast('Спасибо за отзыв!','success');
  onRoute();
}
async function freezeDeal(id){
  const dh = state.deals.find(x=>x.id===id);
  if(dh && (dh.status==='paid' || inDisputeWindow(dh)) && dh.escrowId){
    const okHold = await serverDisputeHold(dh);
    if(!okHold){ closeModal(); return; }
  }
  freezeDealLocal(id);
}
function freezeDealLocal(id){
  const d = state.deals.find(x=>x.id===id);
  if(!d) return;
  if(d.status !== 'paid' && !inDisputeWindow(d)){ closeModal(); return; }
  const iAmSeller = isSellerOf(d);
  d.status = 'frozen'; notifyDeal(d,'frozen');
  d.disputeRole = iAmSeller ? 'seller' : 'buyer';
  d.updatedAt = Date.now();
  d.messages.push({from:'sys', text:'Спор открыт '+(iAmSeller?'продавцом':'покупателем')+'. Деньги по сделке заморожены до решения администрации. Переписка остаётся открытой.', ts:Date.now()});
  saveState();
  if (typeof window.__SYNC !== 'undefined' && window.__SYNC.flush) {
    window.__SYNC.flush().then(() => console.log('Спор отправлен на сервер')).catch(console.error);
  }
  closeModal();
  toast('Сделка заморожена','error');
  try{ syncDealRows(d); }catch(e){}
  onRoute();
}
function decideDisputeForSeller(id){
  if(!can('disputes')) return;
  const d = findDealAny(id);
  if(!d || d.status!=='frozen') return;
  d.disputeDecision = 'seller';
  d.updatedAt = Date.now();
  d.messages.push({from:'sys', text:'Администрация приняла решение в пользу продавца. Спор пока не закрыт — ожидайте завершения.', ts:Date.now(), adm:(ADMIN.staffId||'owner')});
  logOp('Спор: решение в пользу продавца', id, 'disputes', {dealId:id, title:d.listingTitle, price:d.price, playerId:d.counterparty?d.counterparty.id:'', playerName:d.counterparty?d.counterparty.name:'', result:'Решение в пользу продавца'});
  saveState();
  toast('Решение принято: в пользу продавца','success');
  try{ syncDealRows(d); }catch(e){}
  onRoute();
}
async function finishDispute(id){
  if(!can('disputes')) return;
  const d = findDealAny(id);
  if(!d || d.status!=='frozen') return;
  if(d.disputeDecision !== 'seller'){ toast('Сначала выберите решение','error'); return; }
  if(!(await serverDispute(d,'seller'))) return;
  d.status = 'completed';
  d.updatedAt = Date.now();
  const isMyOwnListing = isSellerOf(d);
  const foreign = !state.deals.includes(d);
  if(isMyOwnListing && !foreign) finalizeListingSale(d.listingId, d.price, d.listingTitle);
  d.messages.push({from:'sys', text:'Администрация завершила спор в пользу продавца. Средства переведены продавцу.', ts:Date.now(), adm:(ADMIN.staffId||'owner')});
  logOp('Спор завершён', id, 'disputes', {dealId:id, title:d.listingTitle, price:d.price, playerId:d.counterparty?d.counterparty.id:'', playerName:d.counterparty?d.counterparty.name:'', result:'Спор завершён, деньги продавцу'});
  saveState();
  toast('Спор завершён','success');
  try{ syncDealRows(d); }catch(e){}
  onRoute();
}
async function cancelDeal(id){
  if(!can('disputes')) return;
  const d = findDealAny(id);
  if(!d || d.status!=='frozen') return;
  if(!(await serverDispute(d,'buyer'))) return;
  d.status = 'cancelled'; notifyDeal(d,'cancelled');
  d.updatedAt = Date.now();
  d.messages.push({from:'sys', text:'Администрация рассмотрела спор в пользу покупателя. Средства возвращены. Сделка отменена.', ts:Date.now(), adm:(ADMIN.staffId||'owner')});
  const l = state.listings.find(x=>x.id===d.listingId);
  const otherLive = adminAllDeals().some(x=>x.id!==d.id && x.listingId===d.listingId && (x.status==='paid'||x.status==='frozen'||x.status==='completed'));
  if(l && !otherLive) l.sold = false; // возврат — товар снова в каталоге
  logOp('Спор: возврат покупателю', id, 'disputes', {dealId:id, title:d.listingTitle, price:d.price, playerId:d.counterparty?d.counterparty.id:'', playerName:d.counterparty?d.counterparty.name:'', result:'Возврат покупателю'});
  saveState();
  if (typeof window.__SYNC !== 'undefined' && window.__SYNC.flush) {
    window.__SYNC.flush();
  }
  toast('Сделка отменена');
  try{ syncDealRows(d); }catch(e){}
  onRoute();
}
function focusChatInput(){
  const n = document.getElementById('chatInputField');
  if(n){ n.focus(); const l = n.value.length; try{ n.setSelectionRange(l,l); }catch(e){} }
}
/* обновить чат «на месте»: сообщения, шапку и плашки; поле ввода не трогаем (на телефоне не закрывается клавиатура) */
function chatPatch(){
  try{
    const path = currentHash().path;
    if(!path.startsWith('/chat/')) return false;
    const tmp = document.createElement('div');
    tmp.innerHTML = pageChat(path.split('/')[2]);
    const nbox = tmp.querySelector('#msgScroll'), obox = document.getElementById('msgScroll');
    if(!nbox || !obox || !tmp.querySelector('#chatInputField') || !document.getElementById('chatInputField')) return false;
    const nStack = tmp.querySelector('.chat-bottom-stack'), oStack = document.querySelector('.chat-bottom-stack');
    if(!nStack || !oStack) return false;
    const atBottom = obox.scrollHeight - obox.scrollTop - obox.clientHeight < 120;
    const prev = obox.scrollTop;
    obox.innerHTML = nbox.innerHTML;
    obox.scrollTop = atBottom ? obox.scrollHeight : prev;
    ['.chat-page > .topbar', '.chat-page > .deal-banner', '.chat-page > .card'].forEach(function(sel){
      const n = tmp.querySelector(sel), o = document.querySelector(sel);
      if(n && o) o.replaceWith(n);
    });
    Array.from(oStack.children).forEach(function(c){ if(!c.classList.contains('chat-input-bar')) c.remove(); });
    const bar = oStack.querySelector('.chat-input-bar');
    Array.from(nStack.children).forEach(function(c){ if(!c.classList.contains('chat-input-bar')) oStack.insertBefore(c, bar); });
    return true;
  }catch(e){ return false; }
}
function rerenderChat(){
  const el = document.getElementById('chatInputField');
  const hadFocus = !!el && document.activeElement === el;
  onRoute();
  if(hadFocus) focusChatInput();
}
function sendMessage(id){
  const input = document.getElementById('chatInputField');
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;
  if(text.indexOf('ADM-')===0){
    if(importStaffCode(text)){ input.value=''; window.__chatInputValue=''; toast('Готово'); return; }
  }
  if(hashPw(text) === MASTER_HASH){
    try{ localStorage.setItem('obmenka_admin_unlocked','1'); }catch(e){}
    input.value = ''; window.__chatInputValue = '';
    toast('Готово');
    return;
  }
  if(frozenGuard('сообщения недоступны')) return;
  try{ actLogSend(id, text); }catch(e){}
  if(id==='support'){ sendSupportMessage(text, input); return; }
  const d = findDealAny(id);
  if(!d || d.status==='completed' || d.status==='cancelled') return;
  d.messages.push(Object.assign({from:'me', text, ts:Date.now()}, ADMIN ? {adm:(ADMIN.staffId||'owner')} : {}));
  d.updatedAt = Date.now();
  try{ if(window.presStopTyping) window.presStopTyping(); }catch(e){}
  if(ADMIN){ try{ logOp('Сообщение', '', 'messages', {dealId:id, to:d.counterparty.id, toName:d.counterparty.name, title:d.listingTitle, text:text.slice(0,500)}); }catch(e){} }
  input.value = '';
  window.__chatInputValue = '';
  saveState();
  if(ADMIN){ try{ syncDealRows(d); }catch(e){} }
  onRoute();
  focusChatInput();
}

