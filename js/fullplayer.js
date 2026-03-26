// ============================================================
// NOCTYRA MUSIC — FULLSCREEN PLAYER
// Spotify-like slide-up player with Art, Controls, Tabs
// ============================================================

const FullPlayer = (() => {
  let isOpen = false;
  let activeTab = 'queue';
  let isShuffle = false;
  let isRepeat  = false;
  let isLiked   = false;
  let fpIsDragging = false;

  // ── Open / Close ─────────────────────────────────────────
  function open() {
    const el = document.getElementById('fullscreen-player');
    if (!el) return;
    el.classList.add('open');
    isOpen = true;
    document.body.style.overflow = 'hidden';

    // Sync state from current song
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

  // ── Sync song info to fullscreen UI ──────────────────────
  function syncSong(song) {
    if (!song) return;

    document.getElementById('fp-art').src    = song.thumbnail || '';
    document.getElementById('fp-title').textContent  = song.title;
    document.getElementById('fp-artist').textContent = song.channel || '—';

    // Dynamic blurred background
    const bg = document.getElementById('fp-bg');
    if (bg) bg.style.backgroundImage = `url(${song.thumbnail})`;

    // Reset like state
    isLiked = false;
    document.getElementById('fp-like')?.classList.remove('liked');

    // If lyrics tab active, reload
    if (activeTab === 'lyrics') loadLyrics(song);

    // If queue tab active, reload
    if (activeTab === 'queue') renderQueue();

    // If related tab active, reload
    if (activeTab === 'related') loadRelated(song);
  }

  // ── Progress ─────────────────────────────────────────────
  function updateProgress(pct, current, duration) {
    // Full screen progress
    document.getElementById('fp-progress-fill').style.width = pct + '%';
    document.getElementById('fp-time-current').textContent  = current;
    document.getElementById('fp-time-duration').textContent = duration;

    // Mini bar progress line
    document.getElementById('mini-progress-fill').style.width = pct + '%';
  }

  // ── Play button state ─────────────────────────────────────
  function updatePlayState(playing) {
    const fpBtn = document.getElementById('fp-play');
    const miniBtn = document.getElementById('btn-play');
    const icon = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><polygon points="5,3 19,12 5,21"/></svg>`;
    const miniIcon = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    if (fpBtn)   fpBtn.innerHTML   = icon;
    if (miniBtn) miniBtn.innerHTML = miniIcon;
  }

  // ── Tabs ─────────────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;

    document.querySelectorAll('.fp-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.fp-pane').forEach(p => p.classList.toggle('active', p.id === `fp-pane-${tab}`));

    const queue = Player.getQueue();
    const idx   = Player.getIndex();
    const song  = queue[idx];

    if (tab === 'lyrics' && song) loadLyrics(song);
    if (tab === 'queue')          renderQueue();
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

    // Show upcoming songs (current + next ones)
    const upcoming = [...queue.slice(idx), ...queue.slice(0, idx)];

    container.innerHTML = '';
    upcoming.forEach((song, i) => {
      const card = document.createElement('div');
      card.className = 'song-card' + (i === 0 ? ' playing' : '');
      card.dataset.videoId = song.videoId;
      card.innerHTML = `
        <div class="song-card__thumb">
          <img src="${esc(song.thumbnail)}" loading="lazy" alt="">
          <div class="song-card__play-overlay">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <div class="song-card__info">
          <p class="song-card__title">${esc(song.title)}</p>
          <p class="song-card__channel">${esc(song.channel)}</p>
        </div>
      `;
      const originalIdx = queue.indexOf(song);
      card.addEventListener('click', () => Player.setQueue(queue, originalIdx));
      container.appendChild(card);
    });
  }

  // ── Lyrics Tab ────────────────────────────────────────────
  async function loadLyrics(song) {
    const pane    = document.getElementById('fp-pane-lyrics');
    const loading = document.getElementById('fp-lyrics-loading');
    const textEl  = document.getElementById('fp-lyrics-text');
    const emptyEl = document.getElementById('fp-lyrics-empty');
    if (!pane) return;

    textEl.textContent = '';
    emptyEl.style.display  = 'none';
    loading.style.display  = 'flex';

    const lyrics = await Lyrics.fetchFor(song);
    loading.style.display  = 'none';

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
      // Search for related songs based on current song's channel/artist
      const cleanTitle  = song.title.replace(/\(.*?\)/g, '').replace(/official|audio|lyric/gi, '').trim();
      const query       = `${song.channel} lagu terbaik`;
      const results     = await Search.fetchYoutube(query);
      const filtered    = results.filter(s => s.videoId !== song.videoId).slice(0, 8);

      container.innerHTML = '';
      if (!filtered.length) {
        container.innerHTML = '<p class="fp-lyrics-empty">Tidak ada lagu terkait.</p>';
        return;
      }

      filtered.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.dataset.videoId = s.videoId;
        card.innerHTML = `
          <div class="song-card__thumb">
            <img src="${esc(s.thumbnail)}" loading="lazy" alt="">
            <div class="song-card__play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>
          <div class="song-card__info">
            <p class="song-card__title">${esc(s.title)}</p>
            <p class="song-card__channel">${esc(s.channel)}</p>
          </div>
          <button class="song-card__add-btn" title="Tambah ke playlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('.song-card__add-btn')) return;
          const queue = Player.getQueue();
          Player.setQueue([...queue, s], queue.length);
        });
        card.querySelector('.song-card__add-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          Playlist.showAddToPlaylist(s);
        });
        container.appendChild(card);
      });
    } catch {
      container.innerHTML = '<p class="fp-lyrics-empty">Gagal memuat lagu terkait.</p>';
    }
  }

  // ── Seek on fullscreen progress bar ──────────────────────
  function initSeek() {
    const bar = document.getElementById('fp-progress-bar');
    if (!bar) return;

    function seekTo(e) {
      const rect = bar.getBoundingClientRect();
      const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const pct  = Math.max(0, Math.min(1, x / rect.width));
      document.getElementById('fp-progress-fill').style.width = (pct * 100) + '%';
      try {
        const duration = window._ytPlayer?.getDuration?.() || 0;
        if (duration) window._ytPlayer.seekTo(pct * duration, true);
      } catch {}
    }

    bar.addEventListener('mousedown',  e => { fpIsDragging = true; seekTo(e); });
    bar.addEventListener('touchstart', e => { fpIsDragging = true; seekTo(e); }, { passive: true });
    window.addEventListener('mousemove', e => { if (fpIsDragging) seekTo(e); });
    window.addEventListener('touchmove', e => { if (fpIsDragging) seekTo(e); }, { passive: true });
    window.addEventListener('mouseup',   () => { fpIsDragging = false; });
    window.addEventListener('touchend',  () => { fpIsDragging = false; });
  }

  // ── Swipe down to close ───────────────────────────────────
  function initSwipe() {
    const el = document.getElementById('fullscreen-player');
    let startY = 0, startTime = 0;

    el.addEventListener('touchstart', e => {
      // Only initiate swipe from header/art area
      if (e.target.closest('.fp-tab-content')) return;
      startY    = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });

    el.addEventListener('touchend', e => {
      if (e.target.closest('.fp-tab-content')) return;
      const diff  = e.changedTouches[0].clientY - startY;
      const speed = diff / (Date.now() - startTime);
      if (diff > 100 || speed > 0.5) close();
    }, { passive: true });
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    // Open fullscreen when tapping mini player tap area
    document.getElementById('mini-player-tap')?.addEventListener('click', open);

    // Close button
    document.getElementById('fp-close')?.addEventListener('click', close);

    // Controls mirror main Player
    document.getElementById('fp-play')?.addEventListener('click', Player.togglePlay);
    document.getElementById('fp-prev')?.addEventListener('click', Player.prev);
    document.getElementById('fp-next')?.addEventListener('click', Player.next);

    // Shuffle
    document.getElementById('fp-shuffle')?.addEventListener('click', () => {
      isShuffle = !isShuffle;
      document.getElementById('fp-shuffle').classList.toggle('active', isShuffle);
    });

    // Repeat
    document.getElementById('fp-repeat')?.addEventListener('click', () => {
      isRepeat = !isRepeat;
      document.getElementById('fp-repeat').classList.toggle('active', isRepeat);
    });

    // Like
    document.getElementById('fp-like')?.addEventListener('click', () => {
      isLiked = !isLiked;
      document.getElementById('fp-like').classList.toggle('liked', isLiked);
      showToast(isLiked ? '♥ Ditambahkan ke favorit' : 'Dihapus dari favorit');
    });

    // Tabs
    document.querySelectorAll('.fp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Seek & swipe
    initSeek();
    initSwipe();
  }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, open, close, syncSong, updateProgress, updatePlayState };
})();
