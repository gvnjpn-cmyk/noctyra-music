// ============================================================
// NOCTYRA MUSIC — FULLSCREEN PLAYER v2
// - Swipe kiri/kanan untuk ganti tab (Queue/Lirik/Terkait)
// - Fix seek progress bar
// - Fix play button sync
// ============================================================

const FullPlayer = (() => {
  let isOpen     = false;
  let activeTab  = 'queue';
  let isShuffle  = false;
  let isRepeat   = false;
  let isLiked    = false;
  let fpDragging = false;
  let tabIndex   = 0; // 0=queue, 1=lyrics, 2=related
  const TABS     = ['queue','lyrics','related'];

  // ── Open / Close ─────────────────────────────────────────
  function open() {
    const el = document.getElementById('fullscreen-player');
    if (!el) return;
    el.classList.add('open');
    isOpen = true;
    document.body.style.overflow = 'hidden';
    const queue = Player.getQueue();
    const idx   = Player.getIndex();
    if (idx >= 0 && queue[idx]) syncSong(queue[idx]);
    switchTab(activeTab);
  }

  function close() {
    document.getElementById('fullscreen-player')?.classList.remove('open');
    isOpen = false;
    document.body.style.overflow = '';
  }

  // ── Sync song info ────────────────────────────────────────
  function syncSong(song) {
    if (!song) return;
    document.getElementById('fp-art').src             = song.thumbnail || '';
    document.getElementById('fp-title').textContent   = song.title;
    document.getElementById('fp-artist').textContent  = song.channel || '—';
    const bg = document.getElementById('fp-bg');
    if (bg) bg.style.backgroundImage = `url(${song.thumbnail})`;
    isLiked = false;
    document.getElementById('fp-like')?.classList.remove('liked');
    document.getElementById('fp-download-btn')?.classList.remove('saved');
    if (activeTab === 'lyrics')  loadLyrics(song);
    if (activeTab === 'queue')   renderQueue();
    if (activeTab === 'related') loadRelated(song);
  }

  // ── Progress ──────────────────────────────────────────────
  function updateProgress(pct, current, duration) {
    if (fpDragging) return;
    const fill = document.getElementById('fp-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const cur = document.getElementById('fp-time-current');
    const dur = document.getElementById('fp-time-duration');
    if (cur) cur.textContent = current;
    if (dur) dur.textContent = duration;
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

  // ── Tab switching (also moves swipe container) ────────────
  function switchTab(tab) {
    activeTab = tab;
    tabIndex  = TABS.indexOf(tab);
    if (tabIndex < 0) tabIndex = 0;

    document.querySelectorAll('.fp-tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));

    // Move swipe container
    const track = document.getElementById('fp-swipe-track');
    if (track) track.style.transform = `translateX(${-tabIndex * 100}%)`;

    const queue = Player.getQueue();
    const idx   = Player.getIndex();
    const song  = queue[idx];

    if (tab === 'lyrics' && song)  loadLyrics(song);
    if (tab === 'queue')           renderQueue();
    if (tab === 'related' && song) loadRelated(song);
  }

  // ── Queue Tab ─────────────────────────────────────────────
  function renderQueue() {
    const container = document.getElementById('fp-pane-queue');
    if (!container) return;
    const queue = Player.getQueue();
    const idx   = Player.getIndex();
    if (!queue.length) {
      container.innerHTML = '<p class="fp-lyrics-empty">Antrian kosong.</p>';
      return;
    }
    const upcoming = [...queue.slice(idx), ...queue.slice(0, idx)];
    container.innerHTML = '';
    upcoming.forEach((song, i) => {
      const card = document.createElement('div');
      card.className = 'fp-queue-row' + (i === 0 ? ' active' : '');
      card.innerHTML = `
        <img src="${esc(song.thumbnail)}" loading="lazy" alt="">
        <div class="fp-queue-info">
          <p class="fp-queue-title">${esc(song.title)}</p>
          <p class="fp-queue-channel">${esc(song.channel)}</p>
        </div>
        ${i === 0 ? '<div class="fp-queue-eq"><span></span><span></span><span></span></div>' : ''}
      `;
      const originalIdx = queue.indexOf(song);
      card.addEventListener('click', () => Player.setQueue(queue, originalIdx));
      container.appendChild(card);
    });
  }

  // ── Lyrics Tab ────────────────────────────────────────────
  async function loadLyrics(song) {
    const loading = document.getElementById('fp-lyrics-loading');
    const textEl  = document.getElementById('fp-lyrics-text');
    const emptyEl = document.getElementById('fp-lyrics-empty');
    if (!textEl) return;
    textEl.textContent    = '';
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

  // ── Related Tab ───────────────────────────────────────────
  async function loadRelated(song) {
    const container = document.getElementById('fp-pane-related');
    if (!container) return;
    container.innerHTML = `<div class="fp-lyrics-loading"><div class="spinner"></div><span>Mencari lagu terkait...</span></div>`;
    try {
      const results  = await Search.fetchYoutube(`${song.channel} best songs`);
      const filtered = results.filter(s => s.videoId !== song.videoId).slice(0, 8);
      container.innerHTML = '';
      if (!filtered.length) {
        container.innerHTML = '<p class="fp-lyrics-empty">Tidak ada lagu terkait.</p>';
        return;
      }
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
          </button>
        `;
        row.addEventListener('click', e => {
          if (e.target.closest('.fp-add-btn')) return;
          const queue = Player.getQueue();
          Player.setQueue([...queue, s], queue.length);
          showToast('✓ Ditambahkan ke antrian');
        });
        row.querySelector('.fp-add-btn').addEventListener('click', e => {
          e.stopPropagation();
          Playlist.showAddToPlaylist(s);
        });
        container.appendChild(row);
      });
    } catch {
      container.innerHTML = '<p class="fp-lyrics-empty">Gagal memuat.</p>';
    }
  }

  // ── Seek Progress Bar ─────────────────────────────────────
  function initSeek() {
    const bar = document.getElementById('fp-progress-bar');
    if (!bar) return;

    function getSeekPct(e) {
      const rect = bar.getBoundingClientRect();
      const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }

    function applySeek(pct) {
      document.getElementById('fp-progress-fill').style.width = (pct * 100) + '%';
      try {
        const dur = window._ytPlayer?.getDuration?.() || 0;
        if (dur) window._ytPlayer.seekTo(pct * dur, true);
      } catch {}
    }

    bar.addEventListener('mousedown', e => {
      fpDragging = true;
      applySeek(getSeekPct(e));
    });
    bar.addEventListener('touchstart', e => {
      fpDragging = true;
      applySeek(getSeekPct(e));
    }, { passive: true });
    window.addEventListener('mousemove', e => { if (fpDragging) applySeek(getSeekPct(e)); });
    window.addEventListener('touchmove', e => { if (fpDragging) applySeek(getSeekPct(e)); }, { passive: true });
    window.addEventListener('mouseup',  () => { fpDragging = false; });
    window.addEventListener('touchend', () => { fpDragging = false; });
  }

  // ── Swipe left/right for tabs ─────────────────────────────
  function initTabSwipe() {
    const content = document.getElementById('fp-tab-content');
    if (!content) return;
    let startX = 0, startY = 0, moved = false;

    content.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      moved  = false;
    }, { passive: true });

    content.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      // Only swipe if horizontal > vertical and > 50px
      if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
        if (dx < 0 && tabIndex < TABS.length - 1) switchTab(TABS[tabIndex + 1]);
        if (dx > 0 && tabIndex > 0)               switchTab(TABS[tabIndex - 1]);
      }
    }, { passive: true });
  }

  // ── Swipe down on header to close ────────────────────────
  function initSwipeClose() {
    const el = document.getElementById('fullscreen-player');
    let startY = 0;
    el.addEventListener('touchstart', e => {
      if (e.target.closest('#fp-tab-content')) return;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', e => {
      if (e.target.closest('#fp-tab-content')) return;
      const diff = e.changedTouches[0].clientY - startY;
      if (diff > 90) close();
    }, { passive: true });
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
    });
    document.getElementById('fp-repeat')?.addEventListener('click', () => {
      isRepeat = !isRepeat;
      document.getElementById('fp-repeat').classList.toggle('active', isRepeat);
    });
    document.getElementById('fp-like')?.addEventListener('click', () => {
      isLiked = !isLiked;
      document.getElementById('fp-like').classList.toggle('liked', isLiked);
      showToast(isLiked ? '♥ Ditambahkan ke favorit' : 'Dihapus dari favorit');
    });
    document.getElementById('fp-download-btn')?.addEventListener('click', () => {
      const q = Player.getQueue(), i = Player.getIndex();
      if (i >= 0 && q[i]) {
        Offline.addSong(q[i]);
        document.getElementById('fp-download-btn').classList.add('saved');
      }
    });

    document.querySelectorAll('.fp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    initSeek();
    initTabSwipe();
    initSwipeClose();
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, open, close, syncSong, updateProgress, updatePlayState };
})();
