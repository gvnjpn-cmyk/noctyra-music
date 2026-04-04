// ============================================================
// NOCTYRA MUSIC — FULLSCREEN PLAYER v3
// 3 horizontal pages: [Player] [Lyrics] [Queue]
// Swipe kiri/kanan untuk berpindah halaman
// ============================================================

const FullPlayer = (() => {
  let isOpen     = false;
  let pageIndex  = 0;        // 0=player, 1=lyrics, 2=queue
  let isShuffle  = false;
  let isRepeat   = false;
  let isLiked    = false;
  let fpDragging = false;
  let activeQTab = 'queue';  // sub-tab in page 2

  // ── Open / Close ─────────────────────────────────────────
  function open() {
    const el = document.getElementById('fullscreen-player');
    if (!el) return;
    el.classList.add('open');
    isOpen = true;
    document.body.style.overflow = 'hidden';
    const queue = Player.getQueue(), idx = Player.getIndex();
    if (idx >= 0 && queue[idx]) syncSong(queue[idx]);
    goToPage(pageIndex, false);
  }

  function close() {
    document.getElementById('fullscreen-player')?.classList.remove('open');
    isOpen = false;
    document.body.style.overflow = '';
  }

  // ── Page navigation ───────────────────────────────────────
  function goToPage(idx, animate = true) {
    pageIndex = Math.max(0, Math.min(2, idx));
    const track = document.getElementById('fp-pages-track');
    if (track) {
      if (!animate) track.style.transition = 'none';
      track.style.transform = `translateX(${-pageIndex * 100}%)`;
      if (!animate) requestAnimationFrame(() => track.style.transition = '');
    }
    // Update dots
    document.querySelectorAll('.fp-dot').forEach((d, i) =>
      d.classList.toggle('active', i === pageIndex));

    // Load content for page
    const queue = Player.getQueue(), idx2 = Player.getIndex();
    const song  = queue[idx2];
    if (pageIndex === 1 && song) loadLyrics(song);
    if (pageIndex === 2) { renderQueue(); if (song) loadRelated(song); }
  }

  // ── Sync song data ────────────────────────────────────────
  function syncSong(song) {
    if (!song) return;
    // Player page
    document.getElementById('fp-art').src            = song.thumbnail || '';
    document.getElementById('fp-title').textContent  = song.title;
    document.getElementById('fp-artist').textContent = song.channel || '—';
    // Lyrics page header
    document.getElementById('fp-lyrics-art').src          = song.thumbnail || '';
    document.getElementById('fp-lyrics-title').textContent  = song.title;
    document.getElementById('fp-lyrics-artist').textContent = song.channel || '—';
    // Background
    const bg = document.getElementById('fp-bg');
    if (bg) bg.style.backgroundImage = `url(${song.thumbnail})`;
    // Reset buttons
    isLiked = false;
    document.getElementById('fp-like')?.classList.remove('liked');
    document.getElementById('fp-download-btn')?.classList.remove('saved');
    // Reload current page content
    if (pageIndex === 1) loadLyrics(song);
    if (pageIndex === 2) { renderQueue(); loadRelated(song); }
    if (pageIndex === 0) renderQueuePreview();
  }

  // ── Progress ──────────────────────────────────────────────
  function updateProgress(pct, current, duration) {
    if (fpDragging) return;
    document.getElementById('fp-progress-fill').style.width = pct + '%';
    document.getElementById('fp-time-current').textContent  = current;
    document.getElementById('fp-time-duration').textContent = duration;
    document.getElementById('mini-progress-fill').style.width = pct + '%';
  }

  function updatePlayState(playing) {
    const icon = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><polygon points="5,3 19,12 5,21"/></svg>`;
    const miniIcon = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    const fpBtn   = document.getElementById('fp-play');
    const miniBtn = document.getElementById('btn-play');
    if (fpBtn)   fpBtn.innerHTML   = icon;
    if (miniBtn) miniBtn.innerHTML = miniIcon;
  }

  // ── Queue preview (bottom of player page) ────────────────
  function renderQueuePreview() {
    const container = document.getElementById('fp-pane-queue');
    if (!container) return;
    const queue = Player.getQueue(), idx = Player.getIndex();
    if (!queue.length) { container.innerHTML = '<p class="fp-lyrics-empty">Antrian kosong</p>'; return; }
    const upcoming = [...queue.slice(idx + 1), ...queue.slice(0, idx)].slice(0, 5);
    container.innerHTML = '';
    upcoming.forEach((song, i) => {
      const row = makeQueueRow(song, queue.indexOf(song), false);
      container.appendChild(row);
    });
  }

  // ── Full Queue (page 2) ───────────────────────────────────
  function renderQueue() {
    const container = document.getElementById('fp-qpane-queue');
    if (!container) return;
    const queue = Player.getQueue(), idx = Player.getIndex();
    if (!queue.length) { container.innerHTML = '<p class="fp-lyrics-empty">Antrian kosong</p>'; return; }
    const upcoming = [...queue.slice(idx), ...queue.slice(0, idx)];
    container.innerHTML = '';
    upcoming.forEach((song, i) => {
      const row = makeQueueRow(song, queue.indexOf(song), i === 0);
      container.appendChild(row);
    });
  }

  function makeQueueRow(song, originalIdx, isActive) {
    const queue = Player.getQueue();
    const row = document.createElement('div');
    row.className = 'fp-queue-row' + (isActive ? ' active' : '');
    row.innerHTML = `
      <img src="${esc(song.thumbnail)}" loading="lazy" alt="">
      <div class="fp-queue-info">
        <p class="fp-queue-title${isActive ? ' playing' : ''}">${esc(song.title)}</p>
        <p class="fp-queue-channel">${esc(song.channel)}</p>
      </div>
      ${isActive ? '<div class="fp-queue-eq"><span></span><span></span><span></span></div>' : ''}
    `;
    row.addEventListener('click', () => Player.setQueue(queue, originalIdx));
    return row;
  }

  // ── Lyrics (page 1) ───────────────────────────────────────
  async function loadLyrics(song) {
    const loading = document.getElementById('fp-lyrics-loading');
    const textEl  = document.getElementById('fp-lyrics-text');
    const emptyEl = document.getElementById('fp-lyrics-empty');
    if (!textEl) return;
    if (textEl.dataset.songId === song.videoId && textEl.textContent) return; // already loaded
    textEl.textContent    = '';
    textEl.dataset.songId = song.videoId;
    emptyEl.style.display = 'none';
    loading.style.display = 'flex';
    const lyrics = await Lyrics.fetchFor(song);
    loading.style.display = 'none';
    if (lyrics) {
      textEl.textContent = lyrics;
    } else {
      emptyEl.style.display = 'block';
    }
  }

  // ── Related (page 2) ─────────────────────────────────────
  async function loadRelated(song) {
    const container = document.getElementById('fp-qpane-related');
    if (!container || container.dataset.songId === song.videoId) return;
    container.dataset.songId = song.videoId;
    container.innerHTML = `<div class="fp-lyrics-loading"><div class="spinner"></div><span>Mencari...</span></div>`;
    try {
      const results  = await Search.fetchYoutube(`${song.channel} best songs`);
      const filtered = results.filter(s => s.videoId !== song.videoId).slice(0, 10);
      container.innerHTML = '';
      filtered.forEach(s => {
        const row = document.createElement('div');
        row.className = 'fp-queue-row';
        row.innerHTML = `
          <img src="${esc(s.thumbnail)}" loading="lazy" alt="">
          <div class="fp-queue-info">
            <p class="fp-queue-title">${esc(s.title)}</p>
            <p class="fp-queue-channel">${esc(s.channel)}</p>
          </div>
          <button class="fp-add-btn" title="Tambah ke playlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>`;
        row.addEventListener('click', e => {
          if (e.target.closest('.fp-add-btn')) return;
          const q = Player.getQueue();
          Player.setQueue([...q, s], q.length);
          showToast('✓ Ditambahkan ke antrian');
        });
        row.querySelector('.fp-add-btn').addEventListener('click', e => {
          e.stopPropagation();
          Playlist.showAddToPlaylist(s);
        });
        container.appendChild(row);
      });
    } catch { container.innerHTML = '<p class="fp-lyrics-empty">Gagal memuat.</p>'; }
  }

  // ── Seek progress bar ─────────────────────────────────────
  function initSeek() {
    const bar = document.getElementById('fp-progress-bar');
    if (!bar) return;
    function getSeekPct(e) {
      const rect = bar.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }
    function applySeek(pct) {
      document.getElementById('fp-progress-fill').style.width = (pct * 100) + '%';
      try { const d = window._ytPlayer?.getDuration?.() || 0; if (d) window._ytPlayer.seekTo(pct * d, true); } catch {}
    }
    bar.addEventListener('mousedown',  e => { fpDragging = true; applySeek(getSeekPct(e)); });
    bar.addEventListener('touchstart', e => { fpDragging = true; applySeek(getSeekPct(e)); }, { passive: true });
    window.addEventListener('mousemove', e => { if (fpDragging) applySeek(getSeekPct(e)); });
    window.addEventListener('touchmove', e => { if (fpDragging) applySeek(getSeekPct(e)); }, { passive: true });
    window.addEventListener('mouseup',   () => { fpDragging = false; });
    window.addEventListener('touchend',  () => { fpDragging = false; });
  }

  // ── Swipe between pages ───────────────────────────────────
  function initPageSwipe() {
    const fp = document.getElementById('fullscreen-player');
    let startX = 0, startY = 0, startPage = 0;

    fp.addEventListener('touchstart', e => {
      // Don't hijack scroll inside lyrics/queue body
      if (e.target.closest('.fp-lyrics-body, .fp-queue-body, .fp-tab-content')) return;
      startX    = e.touches[0].clientX;
      startY    = e.touches[0].clientY;
      startPage = pageIndex;
    }, { passive: true });

    fp.addEventListener('touchend', e => {
      if (e.target.closest('.fp-lyrics-body, .fp-queue-body, .fp-tab-content')) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (Math.abs(dx) > 55 && Math.abs(dx) > dy) {
        if (dx < 0) goToPage(pageIndex + 1);
        else         goToPage(pageIndex - 1);
      }
    }, { passive: true });

    // Swipe down on player page header to close
    fp.addEventListener('touchstart', e => {
      if (pageIndex !== 0) return;
      if (e.target.closest('.fp-tab-content')) return;
      startY = e.touches[0].clientY;
    }, { passive: true });
    fp.addEventListener('touchend', e => {
      if (pageIndex !== 0) return;
      if (e.target.closest('.fp-tab-content')) return;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 90) close();
    }, { passive: true });
  }

  // ── Sub-tabs inside queue page ────────────────────────────
  function initQueueTabs() {
    document.querySelectorAll('.fp-qtab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeQTab = btn.dataset.qtab;
        document.querySelectorAll('.fp-qtab').forEach(b => b.classList.toggle('active', b.dataset.qtab === activeQTab));
        document.querySelectorAll('.fp-qpane').forEach(p => p.classList.toggle('active', p.id === `fp-qpane-${activeQTab}`));
      });
    });
    // Tab dots nav
    document.querySelectorAll('.fp-dot').forEach(dot => {
      dot.addEventListener('click', () => goToPage(+dot.dataset.page));
    });
  }

  // ── Player page sub-tabs (queue preview / related) ────────
  function initPlayerTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.fp-pane').forEach(p => {
          p.classList.toggle('active', p.id === `fp-pane-${tab}`);
          p.style.display = p.id === `fp-pane-${tab}` ? 'block' : 'none';
        });
        const track = document.getElementById('fp-swipe-track');
        if (track) track.style.transform = tab === 'related' ? 'translateX(-100%)' : 'translateX(0)';
        const q = Player.getQueue(), i = Player.getIndex(), s = q[i];
        if (tab === 'related' && s) loadRelated(s);
        if (tab === 'queue') renderQueuePreview();
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    document.getElementById('mini-player-tap')?.addEventListener('click', open);
    document.getElementById('fp-close')?.addEventListener('click', close);
    document.getElementById('fp-play')?.addEventListener('click', Player.togglePlay);
    document.getElementById('fp-prev')?.addEventListener('click', Player.prev);
    document.getElementById('fp-next')?.addEventListener('click', Player.next);

    document.getElementById('fp-shuffle')?.addEventListener('click', () => {
      isShuffle = !isShuffle;
      document.getElementById('fp-shuffle').classList.toggle('active', isShuffle);
      showToast(isShuffle ? '🔀 Shuffle aktif' : 'Shuffle mati');
    });
    document.getElementById('fp-repeat')?.addEventListener('click', () => {
      isRepeat = !isRepeat;
      document.getElementById('fp-repeat').classList.toggle('active', isRepeat);
      showToast(isRepeat ? '🔁 Repeat aktif' : 'Repeat mati');
    });
    document.getElementById('fp-like')?.addEventListener('click', () => {
      isLiked = !isLiked;
      const btn = document.getElementById('fp-like');
      btn.classList.toggle('liked', isLiked);
      btn.querySelector('svg').style.fill = isLiked ? 'var(--accent)' : 'none';
      showToast(isLiked ? '♥ Ditambahkan ke favorit' : 'Dihapus dari favorit');
    });
    document.getElementById('fp-download-btn')?.addEventListener('click', () => {
      const q = Player.getQueue(), i = Player.getIndex();
      if (i >= 0 && q[i]) { Offline.addSong(q[i]); document.getElementById('fp-download-btn').classList.add('saved'); }
    });
    document.getElementById('fp-add-playlist-btn')?.addEventListener('click', () => {
      const q = Player.getQueue(), i = Player.getIndex();
      if (i >= 0 && q[i]) Playlist.showAddToPlaylist(q[i]);
    });

    initSeek();
    initPageSwipe();
    initQueueTabs();
    initPlayerTabs();

    // Set initial tab pane visibility
    document.querySelectorAll('.fp-pane').forEach((p, i) => {
      p.style.display = i === 0 ? 'block' : 'none';
    });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, open, close, goToPage, syncSong, updateProgress, updatePlayState };
})();
    const track = document.getElementById('fp-pages-track');
    if (track) {
      if (!animate) track.style.transition = 'none';
      track.style.transform = `translateX(${-pageIndex * 100}%)`;
      if (!animate) requestAnimationFrame(() => track.style.transition = '');
    }
    // Update dots
    document.querySelectorAll('.fp-dot').forEach((d, i) =>
      d.classList.toggle('active', i === pageIndex));

    // Load content for page
    const queue = Player.getQueue(), idx2 = Player.getIndex();
    const song  = queue[idx2];
    if (pageIndex === 1 && song) loadLyrics(song);
    if (pageIndex === 2) { renderQueue(); if (song) loadRelated(song); }
  }

  // ── Sync song data ────────────────────────────────────────
  function syncSong(song) {
    if (!song) return;
    // Player page
    document.getElementById('fp-art').src            = song.thumbnail || '';
    document.getElementById('fp-title').textContent  = song.title;
    document.getElementById('fp-artist').textContent = song.channel || '—';
    // Lyrics page header
    document.getElementById('fp-lyrics-art').src          = song.thumbnail || '';
    document.getElementById('fp-lyrics-title').textContent  = song.title;
    document.getElementById('fp-lyrics-artist').textContent = song.channel || '—';
    // Background
    const bg = document.getElementById('fp-bg');
    if (bg) bg.style.backgroundImage = `url(${song.thumbnail})`;
    // Reset buttons
    isLiked = false;
    document.getElementById('fp-like')?.classList.remove('liked');
    document.getElementById('fp-download-btn')?.classList.remove('saved');
    // Reload current page content
    if (pageIndex === 1) loadLyrics(song);
    if (pageIndex === 2) { renderQueue(); loadRelated(song); }
    if (pageIndex === 0) renderQueuePreview();
  }

  // ── Progress ──────────────────────────────────────────────
  function updateProgress(pct, current, duration) {
    if (fpDragging) return;
    document.getElementById('fp-progress-fill').style.width = pct + '%';
    document.getElementById('fp-time-current').textContent  = current;
    document.getElementById('fp-time-duration').textContent = duration;
    document.getElementById('mini-progress-fill').style.width = pct + '%';
  }

  function updatePlayState(playing) {
    const icon = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><polygon points="5,3 19,12 5,21"/></svg>`;
    const miniIcon = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    const fpBtn   = document.getElementById('fp-play');
    const miniBtn = document.getElementById('btn-play');
    if (fpBtn)   fpBtn.innerHTML   = icon;
    if (miniBtn) miniBtn.innerHTML = miniIcon;
  }

  // ── Queue preview (bottom of player page) ────────────────
  function renderQueuePreview() {
    const container = document.getElementById('fp-pane-queue');
    if (!container) return;
    const queue = Player.getQueue(), idx = Player.getIndex();
    if (!queue.length) { container.innerHTML = '<p class="fp-lyrics-empty">Antrian kosong</p>'; return; }
    const upcoming = [...queue.slice(idx + 1), ...queue.slice(0, idx)].slice(0, 5);
    container.innerHTML = '';
    upcoming.forEach((song, i) => {
      const row = makeQueueRow(song, queue.indexOf(song), false);
      container.appendChild(row);
    });
  }

  // ── Full Queue (page 2) ───────────────────────────────────
  function renderQueue() {
    const container = document.getElementById('fp-qpane-queue');
    if (!container) return;
    const queue = Player.getQueue(), idx = Player.getIndex();
    if (!queue.length) { container.innerHTML = '<p class="fp-lyrics-empty">Antrian kosong</p>'; return; }
    const upcoming = [...queue.slice(idx), ...queue.slice(0, idx)];
    container.innerHTML = '';
    upcoming.forEach((song, i) => {
      const row = makeQueueRow(song, queue.indexOf(song), i === 0);
      container.appendChild(row);
    });
  }

  function makeQueueRow(song, originalIdx, isActive) {
    const queue = Player.getQueue();
    const row = document.createElement('div');
    row.className = 'fp-queue-row' + (isActive ? ' active' : '');
    row.innerHTML = `
      <img src="${esc(song.thumbnail)}" loading="lazy" alt="">
      <div class="fp-queue-info">
        <p class="fp-queue-title${isActive ? ' playing' : ''}">${esc(song.title)}</p>
        <p class="fp-queue-channel">${esc(song.channel)}</p>
      </div>
      ${isActive ? '<div class="fp-queue-eq"><span></span><span></span><span></span></div>' : ''}
    `;
    row.addEventListener('click', () => Player.setQueue(queue, originalIdx));
    return row;
  }

  // ── Lyrics (page 1) ───────────────────────────────────────
  async function loadLyrics(song) {
    const loading = document.getElementById('fp-lyrics-loading');
    const textEl  = document.getElementById('fp-lyrics-text');
    const emptyEl = document.getElementById('fp-lyrics-empty');
    if (!textEl) return;
    if (textEl.dataset.songId === song.videoId && textEl.textContent) return; // already loaded
    textEl.textContent    = '';
    textEl.dataset.songId = song.videoId;
    emptyEl.style.display = 'none';
    loading.style.display = 'flex';
    const lyrics = await Lyrics.fetchFor(song);
    loading.style.display = 'none';
    if (lyrics) {
      textEl.textContent = lyrics;
    } else {
      emptyEl.style.display = 'block';
    }
  }

  // ── Related (page 2) ─────────────────────────────────────
  async function loadRelated(song) {
    const container = document.getElementById('fp-qpane-related');
    if (!container || container.dataset.songId === song.videoId) return;
    container.dataset.songId = song.videoId;
    container.innerHTML = `<div class="fp-lyrics-loading"><div class="spinner"></div><span>Mencari...</span></div>`;
    try {
      const results  = await Search.fetchYoutube(`${song.channel} best songs`);
      const filtered = results.filter(s => s.videoId !== song.videoId).slice(0, 10);
      container.innerHTML = '';
      filtered.forEach(s => {
        const row = document.createElement('div');
        row.className = 'fp-queue-row';
        row.innerHTML = `
          <img src="${esc(s.thumbnail)}" loading="lazy" alt="">
          <div class="fp-queue-info">
            <p class="fp-queue-title">${esc(s.title)}</p>
            <p class="fp-queue-channel">${esc(s.channel)}</p>
          </div>
          <button class="fp-add-btn" title="Tambah ke playlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>`;
        row.addEventListener('click', e => {
          if (e.target.closest('.fp-add-btn')) return;
          const q = Player.getQueue();
          Player.setQueue([...q, s], q.length);
          showToast('✓ Ditambahkan ke antrian');
        });
        row.querySelector('.fp-add-btn').addEventListener('click', e => {
          e.stopPropagation();
          Playlist.showAddToPlaylist(s);
        });
        container.appendChild(row);
      });
    } catch { container.innerHTML = '<p class="fp-lyrics-empty">Gagal memuat.</p>'; }
  }

  // ── Seek progress bar ─────────────────────────────────────
  function initSeek() {
    const bar = document.getElementById('fp-progress-bar');
    if (!bar) return;
    function getSeekPct(e) {
      const rect = bar.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }
    function applySeek(pct) {
      document.getElementById('fp-progress-fill').style.width = (pct * 100) + '%';
      try { const d = window._ytPlayer?.getDuration?.() || 0; if (d) window._ytPlayer.seekTo(pct * d, true); } catch {}
    }
    bar.addEventListener('mousedown',  e => { fpDragging = true; applySeek(getSeekPct(e)); });
    bar.addEventListener('touchstart', e => { fpDragging = true; applySeek(getSeekPct(e)); }, { passive: true });
    window.addEventListener('mousemove', e => { if (fpDragging) applySeek(getSeekPct(e)); });
    window.addEventListener('touchmove', e => { if (fpDragging) applySeek(getSeekPct(e)); }, { passive: true });
    window.addEventListener('mouseup',   () => { fpDragging = false; });
    window.addEventListener('touchend',  () => { fpDragging = false; });
  }

  // ── Swipe between pages ───────────────────────────────────
  function initPageSwipe() {
    const fp = document.getElementById('fullscreen-player');
    let startX = 0, startY = 0, startPage = 0;

    fp.addEventListener('touchstart', e => {
      // Don't hijack scroll inside lyrics/queue body
      if (e.target.closest('.fp-lyrics-body, .fp-queue-body, .fp-tab-content')) return;
      startX    = e.touches[0].clientX;
      startY    = e.touches[0].clientY;
      startPage = pageIndex;
    }, { passive: true });

    fp.addEventListener('touchend', e => {
      if (e.target.closest('.fp-lyrics-body, .fp-queue-body, .fp-tab-content')) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (Math.abs(dx) > 55 && Math.abs(dx) > dy) {
        if (dx < 0) goToPage(pageIndex + 1);
        else         goToPage(pageIndex - 1);
      }
    }, { passive: true });

    // Swipe down on player page header to close
    fp.addEventListener('touchstart', e => {
      if (pageIndex !== 0) return;
      if (e.target.closest('.fp-tab-content')) return;
      startY = e.touches[0].clientY;
    }, { passive: true });
    fp.addEventListener('touchend', e => {
      if (pageIndex !== 0) return;
      if (e.target.closest('.fp-tab-content')) return;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 90) close();
    }, { passive: true });
  }

  // ── Sub-tabs inside queue page ────────────────────────────
  function initQueueTabs() {
    document.querySelectorAll('.fp-qtab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeQTab = btn.dataset.qtab;
        document.querySelectorAll('.fp-qtab').forEach(b => b.classList.toggle('active', b.dataset.qtab === activeQTab));
        document.querySelectorAll('.fp-qpane').forEach(p => p.classList.toggle('active', p.id === `fp-qpane-${activeQTab}`));
      });
    });
    // Tab dots nav
    document.querySelectorAll('.fp-dot').forEach(dot => {
      dot.addEventListener('click', () => goToPage(+dot.dataset.page));
    });
  }

  // ── Player page sub-tabs (queue preview / related) ────────
  function initPlayerTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.fp-pane').forEach(p => {
          p.classList.toggle('active', p.id === `fp-pane-${tab}`);
          p.style.display = p.id === `fp-pane-${tab}` ? 'block' : 'none';
        });
        const track = document.getElementById('fp-swipe-track');
        if (track) track.style.transform = tab === 'related' ? 'translateX(-100%)' : 'translateX(0)';
        const q = Player.getQueue(), i = Player.getIndex(), s = q[i];
        if (tab === 'related' && s) loadRelated(s);
        if (tab === 'queue') renderQueuePreview();
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    document.getElementById('mini-player-tap')?.addEventListener('click', open);
    document.getElementById('fp-close')?.addEventListener('click', close);
    document.getElementById('fp-play')?.addEventListener('click', Player.togglePlay);
    document.getElementById('fp-prev')?.addEventListener('click', Player.prev);
    document.getElementById('fp-next')?.addEventListener('click', Player.next);

    document.getElementById('fp-shuffle')?.addEventListener('click', () => {
      isShuffle = !isShuffle;
      document.getElementById('fp-shuffle').classList.toggle('active', isShuffle);
      showToast(isShuffle ? '🔀 Shuffle aktif' : 'Shuffle mati');
    });
    document.getElementById('fp-repeat')?.addEventListener('click', () => {
      isRepeat = !isRepeat;
      document.getElementById('fp-repeat').classList.toggle('active', isRepeat);
      showToast(isRepeat ? '🔁 Repeat aktif' : 'Repeat mati');
    });
    document.getElementById('fp-like')?.addEventListener('click', () => {
      isLiked = !isLiked;
      const btn = document.getElementById('fp-like');
      btn.classList.toggle('liked', isLiked);
      btn.querySelector('svg').style.fill = isLiked ? 'var(--accent)' : 'none';
      showToast(isLiked ? '♥ Ditambahkan ke favorit' : 'Dihapus dari favorit');
    });
    document.getElementById('fp-download-btn')?.addEventListener('click', () => {
      const q = Player.getQueue(), i = Player.getIndex();
      if (i >= 0 && q[i]) { Offline.addSong(q[i]); document.getElementById('fp-download-btn').classList.add('saved'); }
    });
    document.getElementById('fp-add-playlist-btn')?.addEventListener('click', () => {
      const q = Player.getQueue(), i = Player.getIndex();
      if (i >= 0 && q[i]) Playlist.showAddToPlaylist(q[i]);
    });

    initSeek();
    initPageSwipe();
    initQueueTabs();
    initPlayerTabs();

    // Set initial tab pane visibility
    document.querySelectorAll('.fp-pane').forEach((p, i) => {
      p.style.display = i === 0 ? 'block' : 'none';
    });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, open, close, goToPage, syncSong, updateProgress, updatePlayState };
})();
