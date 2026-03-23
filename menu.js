/* ============================================================
   menu.js — cook.html / act.html 共用邏輯
   使用前須先定義 window.MENU_CONFIG：
   {
     dishes:         Array<{ title, img, page }>,
     backHomeTarget: string,  // 放「返回首頁」按鈕的卡片標題
   }
   ============================================================ */
(function () {
  'use strict';

  const cfg = window.MENU_CONFIG;

  /* ── 行動裝置視口高度修正 ── */
  function setVHVar() {
    const vh = window.visualViewport
      ? window.visualViewport.height * 0.01
      : window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /* ── 「返回首頁」按鈕定位 ── */
  function positionBackHome() {
    const cards = [...document.querySelectorAll('.dish-card')];
    const target = cards.find(c => {
      const span = c.querySelector('span');
      return span && span.textContent.trim() === cfg.backHomeTarget;
    });
    const btn = document.getElementById('backHome');
    if (!target || !btn) return;
    const cr  = target.getBoundingClientRect();
    const br  = btn.getBoundingClientRect();
    btn.style.left = `${Math.max(8, cr.left + (cr.width - br.width) / 2)}px`;
    btn.style.top  = `${Math.max(8, cr.top  - br.height - 8)}px`;
  }

  /* ── 渲染卡片 ── */
  function renderMenu() {
    const grid = document.getElementById('dishGrid');
    grid.innerHTML = '';
    cfg.dishes.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'dish-card';
      btn.setAttribute('type', 'button');
      btn.innerHTML = `<img src="${d.img}" alt="${d.title}"><span>${d.title}</span>`;
      btn.addEventListener('click', () => goPage(d.page));
      grid.appendChild(btn);
    });
    requestAnimationFrame(() => positionBackHome());
  }

  /* ── 淡出導頁 ── */
  function goPage(url) {
    const cont = document.getElementById('menuContainer');
    cont.classList.add('fade-out');
    setTimeout(() => { window.location.href = url; }, 500);
  }

  /* ── 背景音樂 ── */
  const bgm  = document.getElementById('bgm');
  const hint = document.getElementById('soundHint');

  async function tryAutoPlay() {
    try {
      bgm.muted = true; bgm.volume = 0.5;
      await bgm.play();
      bgm.muted = false;
    } catch {
      showSoundHint();
    }
    setTimeout(() => { if (bgm.muted) showSoundHint(); }, 800);
  }

  function showSoundHint() { hint.style.display = 'block'; }
  function hideSoundHint() { hint.style.display = 'none';  }

  function enableBgm() {
    bgm.muted = false; bgm.volume = 0.5;
    if (bgm.paused) bgm.play().catch(() => {});
    hideSoundHint();
    window.removeEventListener('pointerdown', enableBgmOnce, true);
    window.removeEventListener('touchstart',  enableBgmOnce, true);
    window.removeEventListener('keydown',     enableBgmOnce, true);
  }
  function enableBgmOnce() { enableBgm(); }

  /* ── 啟動 ── */
  window.addEventListener('resize', () => { setVHVar(); positionBackHome(); });
  window.visualViewport?.addEventListener('resize', () => { setVHVar(); positionBackHome(); });

  window.onload = () => {
    setVHVar();
    renderMenu();
    tryAutoPlay();
    window.addEventListener('pointerdown', enableBgmOnce, true);
    window.addEventListener('touchstart',  enableBgmOnce, true);
    window.addEventListener('keydown',     enableBgmOnce, true);
  };
}());
