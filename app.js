(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const KEY = 'tategaki-reader-v1';

  const cfg = Object.assign(
    { fs: 20, theme: 'paper', font: 'mincho', ch: 0, frac: 0 },
    safeParse(localStorage.getItem(KEY))
  );
  function safeParse(s) { try { return JSON.parse(s) || {}; } catch { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} }

  const flow = $('#flow'), pageBox = $('#page'), stage = $('#stage');
  let chapters = [];
  let W = 600, H = 600, pitch = 38;
  let pages = 1, page = 0;

  /* ---------- 小説の読み込みと章分け ---------- */
  const HEAD = /^(第[一二三四五六七八九十百]+章|最終章)[ \u3000]+(.+)$/;

  function parse(text) {
    const lines = text.replace(/\r/g, '').split('\n').map((s) => s.trimEnd()).filter((s) => s.trim() !== '');
    const title = lines.shift() || '';
    const out = [{ type: 'cover', title }];
    let cur = null;
    for (const l of lines) {
      const m = l.match(HEAD);
      if (m) { cur = { type: 'chapter', no: m[1], name: m[2], paras: [] }; out.push(cur); }
      else if (cur) cur.paras.push(l);
    }
    return out;
  }

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function build(i) {
    const c = chapters[i];
    if (c.type === 'cover') {
      // 表紙画像（タイトル入り）。読み込めない場合は文字のタイトルを表示する
      const k = c.title.indexOf('〜');
      const a = k > 0 ? c.title.slice(0, k) : c.title;
      const b = k > 0 ? c.title.slice(k) : '';
      const fallback = `<h1>${esc(a)}</h1>${b ? `<p class="sub">${esc(b)}</p>` : ''}`;
      return `<div class="cover"><img src="cover.jpg" alt="${esc(c.title)}" draggable="false" onerror="this.parentNode.innerHTML=decodeURIComponent('${encodeURIComponent(fallback)}')"></div>`;
    }
    let h = `<h2><span class="no">${esc(c.no)}</span><span class="nm">${esc(c.name)}</span></h2>`;
    for (const p of c.paras) {
      const cls = p === '完' ? 'fin' : /^[「『（(]/.test(p) ? 'nt' : '';
      h += `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`;
    }
    return h;
  }

  /* ---------- レイアウト（行数・文字数をぴったり整数に） ---------- */
  function layout() {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    const fs = cfg.fs;
    pitch = Math.round(fs * 1.9);
    const frame = 40;                       // #book の padding 分
    const margX = vw < 600 ? 8 : 60;
    const margY = vw < 600 ? 120 : 130;     // バー分の余白
    const lines = Math.max(5, Math.min(20, Math.floor((vw - frame - margX * 2) / pitch)));
    const chars = Math.max(10, Math.min(40, Math.floor((vh - frame - margY) / fs)));
    W = lines * pitch; H = chars * fs;
    const r = document.documentElement.style;
    r.setProperty('--fs', fs + 'px');
    r.setProperty('--pitch', pitch + 'px');
    r.setProperty('--W', W + 'px');
    r.setProperty('--H', H + 'px');
    $('#fs-val').textContent = fs;
  }

  function load(i) {
    cfg.ch = i;
    flow.style.transition = 'none';
    flow.style.transform = 'none';
    flow.innerHTML = build(i);
    const w = flow.getBoundingClientRect().width;
    pages = Math.max(1, Math.ceil((w - 1) / W));
    markToc();
  }

  function setPage(p, animate) {
    page = Math.max(0, Math.min(pages - 1, p));
    flow.style.transition = animate ? 'transform .22s ease' : 'none';
    flow.style.transform = `translateX(${page * W}px)`;   // 左へ進む = 内容を右へ動かす
    cfg.frac = pages > 1 ? page / pages : 0;
    updateUi();
    save();
  }

  function next() {
    if (page < pages - 1) setPage(page + 1, true);
    else if (cfg.ch < chapters.length - 1) { load(cfg.ch + 1); setPage(0, false); }
  }
  function prev() {
    if (page > 0) setPage(page - 1, true);
    else if (cfg.ch > 0) { load(cfg.ch - 1); setPage(pages - 1, false); }
  }
  function goChapter(i) { load(i); setPage(0, false); }

  function relayout() {
    const frac = pages > 1 ? page / pages : 0;
    layout();
    load(cfg.ch);
    setPage(Math.floor(frac * pages), false);
  }

  /* ---------- UI ---------- */
  function updateUi() {
    const c = chapters[cfg.ch];
    $('#chap-name').textContent = c.type === 'cover' ? '表紙' : `${c.no} ${c.name}`;
    $('#pageno').textContent = `${page + 1} / ${pages}`;
    const s = $('#slider');
    s.max = pages - 1; s.value = page; s.disabled = pages <= 1;
  }

  function buildToc() {
    const ol = $('#toc-list'); ol.innerHTML = '';
    chapters.forEach((c, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = c.type === 'cover' ? '表紙' : `<span class="no">${esc(c.no)}</span>${esc(c.name)}`;
      b.addEventListener('click', () => { goChapter(i); closePanels(); });
      li.appendChild(b); ol.appendChild(li);
    });
  }
  function markToc() {
    document.querySelectorAll('#toc-list button').forEach((b, i) => b.classList.toggle('cur', i === cfg.ch));
  }

  function closePanels() { $('#toc').hidden = true; $('#settings').hidden = true; }
  function applyLook() {
    document.body.dataset.theme = cfg.theme;
    document.body.dataset.font = cfg.font;
    document.querySelectorAll('#seg-theme button').forEach((b) => b.classList.toggle('on', b.dataset.v === cfg.theme));
    document.querySelectorAll('#seg-font button').forEach((b) => b.classList.toggle('on', b.dataset.v === cfg.font));
  }

  /* ---------- 操作 ---------- */
  // 日本語の縦書き: 画面の左側が「次」、右側が「前」
  let swiped = false;
  stage.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if (!$('#toc').hidden || !$('#settings').hidden) { closePanels(); return; }
    const x = e.clientX / stage.clientWidth;
    if (x < 0.33) next();
    else if (x > 0.67) prev();
    else document.body.classList.toggle('ui');
  });

  let t0 = null;
  stage.addEventListener('touchstart', (e) => { t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
    t0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true; setTimeout(() => { swiped = false; }, 350);
      if (dx < 0) next(); else prev();    // 左へスワイプ = 次
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case 'ArrowLeft': case 'PageDown': case ' ': e.preventDefault(); next(); break;
      case 'ArrowRight': case 'PageUp': e.preventDefault(); prev(); break;
      case 'Home': goChapter(0); break;
      case 'End': goChapter(chapters.length - 1); setPage(pages - 1, false); break;
      case 'Escape': closePanels(); break;
    }
  });

  $('#slider').addEventListener('input', (e) => setPage(parseInt(e.target.value, 10), false));
  $('#btn-toc').addEventListener('click', () => { $('#settings').hidden = true; $('#toc').hidden = false; markToc(); });
  $('#btn-set').addEventListener('click', () => { $('#toc').hidden = true; $('#settings').hidden = false; });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closePanels));
  $('#fs-down').addEventListener('click', () => { cfg.fs = Math.max(14, cfg.fs - 1); relayout(); });
  $('#fs-up').addEventListener('click', () => { cfg.fs = Math.min(32, cfg.fs + 1); relayout(); });
  $('#seg-theme').addEventListener('click', (e) => { const v = e.target.dataset.v; if (v) { cfg.theme = v; applyLook(); save(); } });
  $('#seg-font').addEventListener('click', (e) => { const v = e.target.dataset.v; if (v) { cfg.font = v; applyLook(); relayout(); } });

  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 150); });

  /* ---------- 起動 ---------- */
  fetch('novel.txt', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((text) => {
      chapters = parse(text);
      $('#book-title').textContent = chapters[0].title;
      buildToc();
      applyLook();
      layout();
      cfg.ch = Math.min(cfg.ch, chapters.length - 1);
      load(cfg.ch);
      setPage(Math.floor((cfg.frac || 0) * pages), false);
      if (cfg.ch > 0 || cfg.frac > 0) document.body.classList.remove('ui');
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    })
    .catch(() => {
      flow.innerHTML = '<p class="nt">novel.txt を読み込めませんでした。GitHub Pages か、ローカルサーバー（python -m http.server）経由で開いてください。</p>';
    });
})();
