/* ============================================================
   ЗАЩИТА КОНТЕНТА
   • Админ-раздел (#/admin...): скриншоты, копирование, выделение, печать и меню «сохранить» блокируются.
   • Остальной сайт (главная, каталог, чаты, профиль): скриншоты можно делать.
     Копировать можно только: ID (игрока, товара, сделки), сообщения в чате и то, что
     помечено вручную (class="copyable" или data-copy). Всё остальное выделять и копировать нельзя.
   Поля ввода (ник, пароль, чат, форма продажи) работают как обычно.
   ============================================================ */
(function(){
  'use strict';
  const ID_RE = /^(?:(?:ID|Id|id)\s*[:№#]?\s*)?(?:DP#?\d{6,}|#[A-Za-z0-9_-]{4,}|[a-z]{1,4}_[a-z0-9]{5,12})$/;
  const OK_SEL = '.bubble, .copyable, [data-copy], [data-copyok]';
  const FIELD_SEL = 'input, textarea, [contenteditable="true"]';

  const css = document.createElement('style');
  css.textContent =
    /* основной сайт: выделять можно только разрешённое */
    'body:not(.dp-admin) #app, body:not(.dp-admin) #modal-root{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}' +
    'body:not(.dp-admin) .bubble, body:not(.dp-admin) .copyable, body:not(.dp-admin) [data-copy], body:not(.dp-admin) [data-copyok],' +
    'body:not(.dp-admin) .bubble *, body:not(.dp-admin) .copyable *, body:not(.dp-admin) [data-copy] *, body:not(.dp-admin) [data-copyok] *' +
    '{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;}' +
    'input, textarea, [contenteditable="true"]{-webkit-user-select:text !important;user-select:text !important;-webkit-touch-callout:default !important;}' +
    /* админка: ничего выделять нельзя */
    'body.dp-admin #app, body.dp-admin #modal-root, body.dp-admin #app *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}' +
    'body.dp-admin img{-webkit-user-drag:none;pointer-events:auto;}' +
    '#dpShield{position:fixed;inset:0;z-index:2147483647;background:#0F1115;color:#fff;display:none;align-items:center;justify-content:center;text-align:center;padding:24px;font:600 15px/1.5 system-ui,sans-serif;}' +
    '#dpShield.on{display:flex;}' +
    '@media print{body.dp-admin *{visibility:hidden !important;}}';
  document.head.appendChild(css);

  const shield = document.createElement('div');
  shield.id = 'dpShield';
  shield.textContent = 'Скриншоты и запись экрана в админ-разделе запрещены';
  function mountShield(){ if(!shield.parentNode && document.body) document.body.appendChild(shield); }

  const isAdmin = () => /^#!?\/?admin(\/|\?|$)/.test(location.hash);
  const inField = t => !!(t && t.closest && t.closest(FIELD_SEL));
  let shieldTimer = 0;
  function flash(ms){
    if(!isAdmin()) return;
    shield.classList.add('on');
    clearTimeout(shieldTimer);
    shieldTimer = setTimeout(function(){ if(!document.hidden && document.hasFocus()) shield.classList.remove('on'); }, ms || 1800);
  }
  function applyMode(){
    mountShield();
    document.body.classList.toggle('dp-admin', isAdmin());
    if(!isAdmin()) shield.classList.remove('on');
  }

  /* ---- разметка разрешённых для копирования ID ---- */
  function tagIds(root){
    if(isAdmin() || !root || !root.querySelectorAll) return;
    const els = root.querySelectorAll('span, div, b, strong, code, small, p, a');
    for(let i = 0; i < els.length; i++){
      const el = els[i];
      if(el.hasAttribute('data-copyok') || el.children.length > 0) continue;   /* только «листья» */
      const t = (el.textContent || '').trim();
      if(t.length >= 4 && t.length <= 40 && ID_RE.test(t)) el.setAttribute('data-copyok', '1');
    }
  }
  let tagTimer = 0;
  function scheduleTag(){ clearTimeout(tagTimer); tagTimer = setTimeout(function(){ tagIds(document.getElementById('app')); tagIds(document.getElementById('modal-root')); }, 60); }

  function selectionAllowed(){
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed) return true;
    for(let i = 0; i < sel.rangeCount; i++){
      let n = sel.getRangeAt(i).commonAncestorContainer;
      if(n.nodeType === 3) n = n.parentNode;
      if(!(n && n.closest && n.closest(OK_SEL))) return false;
    }
    return true;
  }

  /* ---- события ---- */
  document.addEventListener('copy', function(e){
    if(inField(e.target) || inField(document.activeElement)) return;
    if(isAdmin() || !selectionAllowed()){ e.preventDefault(); try{ e.clipboardData && e.clipboardData.setData('text/plain', ''); }catch(x){} }
  }, true);
  document.addEventListener('cut', function(e){
    if(inField(e.target)) return;
    if(isAdmin()){ e.preventDefault(); }
  }, true);
  document.addEventListener('contextmenu', function(e){
    if(inField(e.target)) return;
    if(isAdmin() || !(e.target.closest && e.target.closest(OK_SEL))) e.preventDefault();
  }, true);
  document.addEventListener('dragstart', function(e){ if(isAdmin() || !(e.target.closest && e.target.closest(OK_SEL))) e.preventDefault(); }, true);
  document.addEventListener('selectstart', function(e){
    if(inField(e.target)) return;
    const el = e.target.nodeType === 3 ? e.target.parentNode : e.target;
    if(isAdmin() || !(el && el.closest && el.closest(OK_SEL))) e.preventDefault();
  }, true);

  /* скриншоты — только в админке (браузер не даёт запретить их полностью: это защита «по возможности») */
  document.addEventListener('keyup', function(e){
    if(!isAdmin()) return;
    if(e.key === 'PrintScreen' || e.code === 'PrintScreen'){
      flash(2500);
      try{ navigator.clipboard && navigator.clipboard.writeText(' '); }catch(x){}
    }
  }, true);
  document.addEventListener('keydown', function(e){
    if(!isAdmin()) return;
    const k = String(e.key || '').toLowerCase();
    const snip = (e.metaKey && e.shiftKey && (k === 's' || k === '3' || k === '4' || k === '5')) || (e.ctrlKey && e.shiftKey && k === 's') || k === 'printscreen';
    const prt = (e.ctrlKey || e.metaKey) && (k === 'p' || k === 's');
    if(snip){ flash(2500); }
    if(prt){ e.preventDefault(); flash(1500); }
    if((e.ctrlKey || e.metaKey) && (k === 'c' || k === 'x' || k === 'a') && !inField(e.target)){ e.preventDefault(); }
  }, true);
  /* запись экрана / системные снимки на телефоне: прячем содержимое, когда страница теряет фокус */
  document.addEventListener('visibilitychange', function(){ if(isAdmin()){ if(document.hidden) shield.classList.add('on'); else flash(400); } });
  window.addEventListener('blur', function(){ if(isAdmin()) shield.classList.add('on'); });
  window.addEventListener('focus', function(){ if(isAdmin()) flash(300); });
  window.addEventListener('pagehide', function(){ if(isAdmin()) shield.classList.add('on'); });
  window.addEventListener('hashchange', function(){ applyMode(); scheduleTag(); });

  function start(){
    applyMode();
    const app = document.getElementById('app');
    if(app) new MutationObserver(scheduleTag).observe(app, { childList:true, subtree:true });
    const mr = document.getElementById('modal-root');
    if(mr) new MutationObserver(scheduleTag).observe(mr, { childList:true, subtree:true });
    scheduleTag();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
