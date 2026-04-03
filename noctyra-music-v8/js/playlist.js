// ============================================================
// NOCTYRA MUSIC — PLAYLIST MODULE
// Create/delete playlists, add/remove songs, localStorage
// ============================================================

const Playlist = (() => {
  // ── Load / Save ──────────────────────────────────────────
  function load() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.STORAGE_PLAYLISTS)) || [];
    } catch { return []; }
  }

  function save(playlists) {
    localStorage.setItem(CONFIG.STORAGE_PLAYLISTS, JSON.stringify(playlists));
  }

  // ── CRUD ─────────────────────────────────────────────────
  function create(name) {
    if (!name.trim()) return null;
    const playlists = load();
    const pl = {
      id:    Date.now().toString(),
      name:  name.trim(),
      songs: [],
      createdAt: Date.now(),
    };
    playlists.push(pl);
    save(playlists);
    renderSidebar();
    return pl;
  }

  function remove(id) {
    const playlists = load().filter(p => p.id !== id);
    save(playlists);
    renderSidebar();
    renderLibrary();
  }

  function addSong(playlistId, song) {
    const playlists = load();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return false;
    if (pl.songs.some(s => s.videoId === song.videoId)) return false; // No duplicates
    pl.songs.push(song);
    save(playlists);
    return true;
  }

  function removeSong(playlistId, videoId) {
    const playlists = load();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    pl.songs = pl.songs.filter(s => s.videoId !== videoId);
    save(playlists);
  }

  function getById(id) {
    return load().find(p => p.id === id) || null;
  }

  // ── Sidebar Playlist List ────────────────────────────────
  function renderSidebar() {
    const container = document.getElementById('sidebar-playlists');
    if (!container) return;
    const playlists = load();

    if (!playlists.length) {
      container.innerHTML = `<p class="sidebar-empty">Belum ada playlist</p>`;
      return;
    }

    container.innerHTML = playlists.map(pl => `
      <button class="sidebar-playlist-item" data-id="${pl.id}">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
        </svg>
        <span>${escHtml(pl.name)}</span>
      </button>
    `).join('');

    container.querySelectorAll('.sidebar-playlist-item').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigate('library');
        openPlaylist(btn.dataset.id);
      });
    });
  }

  // ── Library View ─────────────────────────────────────────
  function renderLibrary() {
    const container = document.getElementById('library-list');
    if (!container) return;
    const playlists = load();

    if (!playlists.length) {
      container.innerHTML = `
        <div class="library-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
          </svg>
          <p>Buat playlist pertamamu</p>
          <button class="btn-primary" id="btn-create-first">Buat Playlist</button>
        </div>
      `;
      document.getElementById('btn-create-first')?.addEventListener('click', showCreateModal);
      return;
    }

    container.innerHTML = `
      <div class="playlist-grid">
        ${playlists.map(pl => `
          <div class="playlist-card" data-id="${pl.id}">
            <div class="playlist-card__cover">
              ${pl.songs[0] ? `<img src="${pl.songs[0].thumbnail}" loading="lazy" alt="">` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
                </svg>
              `}
              <div class="playlist-card__overlay">
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
            </div>
            <p class="playlist-card__name">${escHtml(pl.name)}</p>
            <p class="playlist-card__count">${pl.songs.length} lagu</p>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.playlist-card').forEach(card => {
      card.addEventListener('click', () => openPlaylist(card.dataset.id));
    });
  }

  // ── Open / View Playlist ─────────────────────────────────
  function openPlaylist(id) {
    const pl = getById(id);
    if (!pl) return;

    const detail = document.getElementById('playlist-detail');
    const list   = document.getElementById('library-list');
    if (!detail) return;

    list.style.display   = 'none';
    detail.style.display = 'block';

    detail.innerHTML = `
      <div class="playlist-detail-header">
        <button class="btn-back" id="btn-back-library">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Library
        </button>
        <div class="playlist-detail-info">
          <div class="playlist-detail-cover">
            ${pl.songs[0] ? `<img src="${pl.songs[0].thumbnail}" alt="">` : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
              </svg>
            `}
          </div>
          <div>
            <h2>${escHtml(pl.name)}</h2>
            <p class="text-muted">${pl.songs.length} lagu</p>
            <div class="playlist-actions">
              ${pl.songs.length ? `<button class="btn-primary" id="btn-play-all">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5,3 19,12 5,21"/></svg>
                Putar Semua
              </button>` : ''}
              <button class="btn-danger" id="btn-delete-playlist">Hapus Playlist</button>
            </div>
          </div>
        </div>
      </div>
      <div class="playlist-songs" id="playlist-songs">
        ${!pl.songs.length ? `<p class="empty-msg">Playlist masih kosong. Tambahkan lagu dari hasil pencarian.</p>` : ''}
      </div>
    `;

    // Render songs
    if (pl.songs.length) {
      const songsContainer = document.getElementById('playlist-songs');
      Search.renderResults(pl.songs, songsContainer);

      // Add remove button to each card
      songsContainer.querySelectorAll('.song-card').forEach((card, i) => {
        const rmBtn = document.createElement('button');
        rmBtn.className = 'song-card__remove-btn';
        rmBtn.title = 'Hapus dari playlist';
        rmBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        rmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeSong(id, pl.songs[i].videoId);
          openPlaylist(id); // Re-render
        });
        card.appendChild(rmBtn);
      });
    }

    document.getElementById('btn-back-library')?.addEventListener('click', () => {
      detail.style.display = 'none';
      list.style.display   = 'block';
    });
    document.getElementById('btn-play-all')?.addEventListener('click', () => {
      if (pl.songs.length) Player.setQueue(pl.songs, 0);
    });
    document.getElementById('btn-delete-playlist')?.addEventListener('click', () => {
      if (confirm(`Hapus playlist "${pl.name}"?`)) {
        remove(id);
        detail.style.display = 'none';
        list.style.display   = 'block';
      }
    });
  }

  // ── Modals ───────────────────────────────────────────────
  function showCreateModal() {
    const modal   = document.getElementById('modal-create-playlist');
    const overlay = document.getElementById('modal-overlay');
    const input   = document.getElementById('playlist-name-input');
    if (!modal) return;
    modal.classList.add('active');
    overlay.classList.add('active');
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }

  function hideCreateModal() {
    document.getElementById('modal-create-playlist')?.classList.remove('active');
    document.getElementById('modal-overlay')?.classList.remove('active');
  }

  // Show "add to playlist" picker for a song
  let _pendingSong = null;
  function showAddToPlaylist(song) {
    _pendingSong = song;
    const playlists = load();
    if (!playlists.length) {
      if (confirm('Belum ada playlist. Buat playlist baru?')) showCreateModal();
      return;
    }

    const modal   = document.getElementById('modal-add-song');
    const overlay = document.getElementById('modal-overlay');
    const list    = document.getElementById('add-song-list');
    if (!modal) return;

    list.innerHTML = playlists.map(pl => `
      <button class="add-song-item" data-id="${pl.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20"><rect x="3" y="3" width="18" height="18" rx="3"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
        <span>${escHtml(pl.name)}</span>
        <small>${pl.songs.length} lagu</small>
      </button>
    `).join('');

    // Use mousedown instead of click to beat overlay's click handler
    list.onmousedown = list.ontouchstart = (e) => {
      const btn = e.target.closest('.add-song-item');
      if (!btn || !_pendingSong) return;
      e.preventDefault();
      e.stopPropagation();
      const added = addSong(btn.dataset.id, _pendingSong);
      showToast(added ? '✓ Ditambahkan ke playlist' : 'Lagu sudah ada di playlist');
      _pendingSong = null;
      hideAddSongModal();
    };

    // Stop overlay click from closing before list registers
    modal.onmousedown = modal.ontouchstart = (e) => e.stopPropagation();

    modal.classList.add('active');
    overlay.classList.add('active');
  }

  function hideAddSongModal() {
    document.getElementById('modal-add-song')?.classList.remove('active');
    document.getElementById('modal-overlay')?.classList.remove('active');
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    renderSidebar();
    renderLibrary();

    // Create playlist button (sidebar)
    document.getElementById('btn-new-playlist')?.addEventListener('click', showCreateModal);

    // Modal confirm
    document.getElementById('btn-confirm-create')?.addEventListener('click', () => {
      const name = document.getElementById('playlist-name-input')?.value;
      if (create(name)) {
        hideCreateModal();
        showToast('✓ Playlist dibuat');
        renderLibrary();
      }
    });

    // Modal close
    document.getElementById('btn-cancel-create')?.addEventListener('click', hideCreateModal);
    document.getElementById('btn-close-add-song')?.addEventListener('click', hideAddSongModal);
    document.getElementById('modal-overlay')?.addEventListener('click', () => {
      hideCreateModal();
      hideAddSongModal();
      AI.hideModal();
    });

    // Enter key in playlist name input
    document.getElementById('playlist-name-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = e.target.value;
        if (create(name)) {
          hideCreateModal();
          showToast('✓ Playlist dibuat');
          renderLibrary();
        }
      }
    });
  }

  // ── Toast Notification ───────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    init,
    load,
    create,
    addSong,
    showAddToPlaylist,
    showCreateModal,
    renderSidebar,
    renderLibrary,
    openPlaylist,
    showToast,
  };
})();

// Global helper for other modules to access
function showToast(msg) { Playlist.showToast(msg); }
