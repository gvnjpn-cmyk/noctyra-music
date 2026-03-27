// ============================================================
// NOCTYRA MUSIC — OFFLINE MODE
// Saves song metadata to localStorage
// Note: actual audio can't be saved (YouTube restriction),
// but we save song info + thumbnail for offline browsing
// ============================================================

const Offline = (() => {
  const STORAGE_KEY = CONFIG.STORAGE_OFFLINE;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function save(songs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); }
    catch (e) { showToast('⚠ Penyimpanan penuh'); }
  }

  function addSong(song) {
    const songs = load();
    if (songs.some(s => s.videoId === song.videoId)) {
      showToast('Lagu sudah ada di offline');
      return false;
    }
    songs.push({ ...song, savedAt: Date.now() });
    save(songs);
    showToast('✓ Disimpan untuk offline');
    return true;
  }

  function removeSong(videoId) {
    save(load().filter(s => s.videoId !== videoId));
    showToast('Dihapus dari offline');
  }

  function getSongs() { return load(); }

  function hasSong(videoId) { return load().some(s => s.videoId === videoId); }

  // Render offline library
  function renderView() {
    const container = document.getElementById('offline-list');
    if (!container) return;
    const songs = load();

    if (!songs.length) {
      container.innerHTML = `
        <div class="library-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
          <p>Belum ada lagu offline</p>
          <p class="text-muted" style="font-size:13px">Klik ikon unduh pada lagu untuk menyimpan</p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.className = 'offline-row';
      row.innerHTML = `
        <img src="${esc(song.thumbnail)}" alt="" loading="lazy">
        <div class="offline-row__info">
          <p class="offline-row__title">${esc(song.title)}</p>
          <p class="offline-row__channel">${esc(song.channel)}</p>
        </div>
        <button class="offline-row__del" data-id="${esc(song.videoId)}" title="Hapus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>`;
      row.addEventListener('click', e => {
        if (e.target.closest('.offline-row__del')) return;
        Player.setQueue(songs, i);
      });
      row.querySelector('.offline-row__del').addEventListener('click', () => {
        removeSong(song.videoId);
        renderView();
      });
      grid.appendChild(row);
    });
    container.appendChild(grid);
  }

  function init() {
    // Offline nav button
    document.querySelectorAll('[data-nav="offline"]').forEach(btn => {
      btn.addEventListener('click', () => { App.navigate('offline'); renderView(); });
    });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, addSong, removeSong, getSongs, hasSong, renderView };
})();
