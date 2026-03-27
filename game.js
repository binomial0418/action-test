/* ============================================================
   game.js — 所有遊戲頁面的共用邏輯
   使用前須先定義 window.GAME_CONFIG：
   {
     recipe:    string[],        // 正確步驟順序
     imageMap:  Record<string,string>, // 步驟 → 圖檔名
     menuUrl:   string,          // 回選單的 URL（'cook.html' 或 'act.html'）
     menuLabel: string,          // 選單按鈕文字（'重選菜色' 或 '重選活動'）
   }
   ============================================================ */
(function () {
  'use strict';

  const cfg      = window.GAME_CONFIG;
  const recipe   = cfg.recipe;
  const imageMap = cfg.imageMap;

  let confettiInstance;
  let timerId = null, timerStart = 0;

  const sndError   = document.getElementById('sndError');
  const sndSuccess = document.getElementById('sndSuccess');
  const bgm        = document.getElementById('bgm');

  /* ── 音效 ── */
  function tryPlayBgm() {
    if (!bgm) return;
    bgm.volume = 0.6;
    bgm.play().catch(() => {
      const resume = () => {
        bgm.play().catch(() => {});
        document.removeEventListener('click',     resume, true);
        document.removeEventListener('touchend',  resume, true);
      };
      document.addEventListener('click',    resume, true);
      document.addEventListener('touchend', resume, true);
    });
  }

  function playSnd(el, rewind = true) {
    if (!el) return;
    try { if (rewind) el.currentTime = 0; el.play()?.catch(() => {}); } catch (e) {}
  }

  /* ── 動態產生拖放格 ── */
  function buildDropZone() {
    const zone = document.getElementById('dropZone');
    if (!zone) return;
    zone.innerHTML = '';
    const rowSize = 4;
    let idx = 1;
    while (idx <= recipe.length) {
      const row = document.createElement('div');
      row.className = 'drop-row';
      for (let c = 0; c < rowSize && idx <= recipe.length; c++, idx++) {
        const slot = document.createElement('div');
        slot.className   = 'drop-slot';
        slot.dataset.idx = idx;
        row.appendChild(slot);
      }
      zone.appendChild(row);
    }
  }

  /* ── 動態產生側欄按鈕 ── */
  function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const svgRestart = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    const svgMenu    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
    const svgHome    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>`;
    sidebar.innerHTML = `
      <button class="btn" onclick="restartTransition()">${svgRestart} 重來</button>
      <button class="btn" onclick="toMenu()">${svgMenu} ${cfg.menuLabel}</button>
      <button class="btn" onclick="toHome()">${svgHome} 回首頁</button>
    `;
  }

  /* ── 側欄位置對齊第一排格子 ── */
  function positionSidebar() {
    const cont = document.getElementById('gameContainer');
    const row  = document.querySelector('.drop-row');
    if (!cont || !row) return;
    const a = cont.getBoundingClientRect(), b = row.getBoundingClientRect();
    cont.style.setProperty('--sidebar-top', `${b.top - a.top}px`);
  }

  /* ── 煙火爆發原點 ── */
  function originAtCongrats() {
    const el = document.getElementById('congrats'), r = el.getBoundingClientRect();
    const vw = window.visualViewport?.width  ?? innerWidth;
    const vh = window.visualViewport?.height ?? innerHeight;
    return {
      x: Math.max(0.02, Math.min(0.98, (r.left + r.width  / 2) / vw)),
      y: Math.max(0.02, Math.min(0.98, (r.top  + r.height * .45) / vh)),
    };
  }

  /* ── 初始化遊戲 ── */
  function initGame() {
    buildDropZone();

    const stepList = document.getElementById('stepList');
    stepList.innerHTML = '';
    [...recipe].sort(() => Math.random() - 0.5).forEach(step => {
      const card = document.createElement('div');
      card.className  = 'step-img';
      card.dataset.step = step;
      card.onclick    = () => placeStepImage(step, card);

      const img = document.createElement('img'); img.src = imageMap[step];
      const lbl = document.createElement('div'); lbl.textContent = step;
      card.append(img, lbl);
      card.style.opacity = '0';   // 等 dealCards() 飛入
      stepList.appendChild(card);
    });

    document.querySelectorAll('.drop-slot').forEach((el, i) => {
      el.innerHTML        = '';
      el.style.background = '#fff';
      el.dataset.step     = '';
      el.dataset.filled   = '0';
      el.dataset.idx      = i + 1;
      el.classList.remove('wrong');
    });

    confettiInstance = confetti.create(
      document.getElementById('confetti-canvas'),
      { resize: true, useWorker: true }
    );
    positionSidebar();
  }

  /* ── 洗牌飛入動畫 ── */
  function dealCards() {
    const cards = [...document.querySelectorAll('.step-img')];
    const order = [...Array(cards.length).keys()].sort(() => Math.random() - 0.5);
    const anims = cards.map((card, i) => {
      // 從隨機角度（0°~360°）射入，距離 150~260px
      const angle = Math.random() * Math.PI * 2;
      const dist  = 150 + Math.random() * 110;
      const offX  = Math.cos(angle) * dist;
      const offY  = Math.sin(angle) * dist;
      // 旋轉方向與入射方向相關，讓牌像被甩出來
      const rot   = (Math.random() - 0.5) * 80;
      const rotX  = (Math.random() - 0.5) * 50;
      const rotY  = (Math.random() - 0.5) * 50;

      return card.animate(
        [
          // 出發：遠方、3D 亂轉、縮小
          { opacity: 0,
            transform: `perspective(700px) translate(${offX}px,${offY}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotate(${rot}deg) scale(0.45)` },
          // 衝過頭
          { opacity: 1,
            transform: `perspective(700px) translate(${-offX * .07}px,${-offY * .07}px) rotateX(${-rotX * .1}deg) rotateY(${-rotY * .1}deg) rotate(${-rot * .1}deg) scale(1.15)`,
            offset: 0.65 },
          // 回彈
          { opacity: 1,
            transform: `perspective(700px) translate(0.5px, -2px) rotateX(1deg) rotateY(0deg) rotate(0.3deg) scale(0.97)`,
            offset: 0.85 },
          // 落定
          { opacity: 1,
            transform: 'perspective(700px) translate(0,0) rotateX(0deg) rotateY(0deg) rotate(0deg) scale(1)' },
        ],
        { duration: 560, delay: order[i] * 90, easing: 'ease-out', fill: 'forwards' }
      );
    });
    return Promise.all(anims.map(a => a.finished));
  }

  /* ── 恭喜特效 ── */
  function showCongrats() {
    const c = document.getElementById('congrats');
    c.style.animation = 'none';
    void c.offsetWidth; // 強制重繪以重新觸發動畫
    c.style.animation = 'showCongrats 4s ease-out';

    const o = originAtCongrats();
    confettiInstance({ particleCount: 160, spread: 80, startVelocity: 45, decay: .92, scalar: 1.1, origin: { x: Math.max(0.02, o.x - .05), y: o.y } });
    confettiInstance({ particleCount: 160, spread: 80, startVelocity: 45, decay: .92, scalar: 1.1, origin: { x: Math.min(0.98, o.x + .05), y: o.y } });
  }

  /* ── 點擊步驟圖卡 ── */
  function placeStepImage(step, el) {
    if (el.dataset.placed === '1') return;

    const slots = [...document.querySelectorAll('.drop-slot')];
    const slot  = slots.find(s => !s.dataset.step);
    if (!slot) return;
    const idx = slots.indexOf(slot);

    slot.classList.remove('wrong');

    if (recipe[idx] === step) {
      // 答對：飛入動畫
      el.dataset.placed      = '1';
      el.style.pointerEvents = 'none';

      const from = el.querySelector('img').getBoundingClientRect();
      const to   = slot.getBoundingClientRect();

      // 建立飛行克隆
      const clone = document.createElement('img');
      clone.src = imageMap[step];
      Object.assign(clone.style, {
        position: 'fixed', left: from.left + 'px', top: from.top + 'px',
        width: from.width + 'px', height: from.height + 'px',
        borderRadius: '16px', objectFit: 'cover', pointerEvents: 'none',
        zIndex: '9000',
      });
      document.body.appendChild(clone);

      // 計算從卡片中心移到格子中心的位移與縮放
      const dx    = (to.left + to.width  / 2) - (from.left + from.width  / 2);
      const dy    = (to.top  + to.height / 2) - (from.top  + from.height / 2);
      const scale = to.width / from.width;

      // 同步淡出原卡片
      el.animate([{ opacity: 1 }, { opacity: 0.1 }], { duration: 360, fill: 'forwards' });

      // 拋物線飛入：中途微微上揚，再落入格子
      clone.animate(
        [
          { transform: 'translate(0,0) scale(1)', offset: 0 },
          { transform: `translate(${dx * .5}px,${dy * .5 - 24}px) scale(${(scale + 1) / 2 + .05})`, offset: .45 },
          { transform: `translate(${dx}px,${dy}px) scale(${scale})`, offset: 1 },
        ],
        { duration: 360, easing: 'ease-in', fill: 'forwards' }
      ).onfinish = () => {
        clone.remove();

        const img = document.createElement('img'); img.src = imageMap[step];
        slot.appendChild(img);
        slot.style.background = '#caffbf';
        slot.dataset.step     = step;
        slot.dataset.filled   = '1';
        el.style.opacity      = '0.1';

        // 格子彈跳落地感
        slot.animate(
          [{ transform: 'scale(1.18)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1)' }],
          { duration: 220, easing: 'ease-out' }
        );

        const done = slots.every((s, i) => s.dataset.step === recipe[i]);
        if (done) { stopTimer(); showCongrats(); }
        else      { playSnd(sndSuccess); }
      };
    } else {
      // 答錯
      slot.classList.add('wrong');
      playSnd(sndError);
      el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
         { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 300, easing: 'ease-in-out' }
      );
      setTimeout(() => {
        if (slot.dataset.step) return;
        slot.classList.remove('wrong');
        slot.innerHTML        = '';
        slot.style.background = '#fff';
        slot.dataset.step     = '';
        slot.dataset.filled   = '0';
      }, 700);
    }
  }

  /* ── 計時器 ── */
  function fmtTime(ms) {
    const m  = Math.floor(ms / 60000);
    const s  = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }
  function startTimer() {
    const t = document.getElementById('timer');
    stopTimer();
    timerStart    = performance.now();
    t.hidden      = false;
    t.textContent = '耗用時間：00:00.00';
    timerId = setInterval(() => {
      t.textContent = '耗用時間：' + fmtTime(performance.now() - timerStart);
    }, 30);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }
  function resetTimerDisplay() {
    const t = document.getElementById('timer');
    if (t) t.textContent = '耗用時間：00:00.00';
  }

  /* ── 導頁 ── */
  function restartTransition() {
    const c = document.getElementById('gameContainer');
    c.classList.add('fade-out');
    [sndError, sndSuccess].forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    stopTimer(); resetTimerDisplay();
    setTimeout(() => { initGame(); dealCards().then(() => startTimer()); c.classList.remove('fade-out'); }, 400);
  }
  function toMenu() {
    const c = document.getElementById('gameContainer');
    c.classList.add('fade-out');
    setTimeout(() => location.href = cfg.menuUrl, 400);
  }
  function toHome() {
    const c = document.getElementById('gameContainer');
    c.classList.add('fade-out');
    setTimeout(() => location.href = 'index.html', 400);
  }

  /* ── 前導畫面 ── */
  function setupIntro() {
    const title = (document.querySelector('h1')?.textContent || '').trim();
    document.getElementById('introTitle').textContent = title;

    // 依類型產生提示文字
    const isCook = cfg.menuUrl.includes('cook');
    const list = document.getElementById('introLines');
    if (isCook) {
      list.innerHTML = `<li>請排好 ${title} 製作順序，</li><li>就能完成 ${title} 啦</li><li>準備開始囉～</li>`;
    } else {
      list.innerHTML = `<li>請排好 ${title} 步驟順序，</li><li>就能完成挑戰啦！</li><li>準備開始囉～</li>`;
    }

    const intro = document.getElementById('intro');
    document.getElementById('btnStart').addEventListener('click', () => {
      intro.classList.remove('enter');
      intro.classList.add('leave');
      dealCards().then(() => startTimer());
      tryPlayBgm();
      setTimeout(() => { intro.style.display = 'none'; }, 450);
    });
  }

  /* ── 全域函式（供 HTML onclick 呼叫） ── */
  window.restartTransition = restartTransition;
  window.toMenu  = toMenu;
  window.toHome  = toHome;

  /* ── 啟動 ── */
  window.addEventListener('resize', positionSidebar);
  window.onload = () => {
    buildSidebar();
    initGame();
    tryPlayBgm();
    setupIntro();
  };
}());
