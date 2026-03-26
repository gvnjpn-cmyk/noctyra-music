// ============================================================
// NOCTYRA MUSIC — HISTORY MODULE
// Tracks recently played songs in localStorage
// ============================================================

const History = (() => {
  const MAX = 20;

  function load() {
    try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_HISTORY)) || []; }
    catch { return []; }
  }

  function add(song) {
    const history = load().filter(s => s.videoId !== song.videoId);
    history.unshift(song);
    if (history.length > MAX) history.length = MAX;
    localStorage.setItem(CONFIG.STORAGE_HISTORY, JSON.stringify(history));
    App.renderRecentlyPlayed();
  }

  function get() { return load(); }

  return { add, get };
})();


// ============================================================
// NOCTYRA MUSIC — APP MODULE
// Navigation, home section, global init
// ============================================================

const App = (() => {
  const views = ['home', 'search', 'library'];
  let currentView = 'home';

  // ── Navigation ───────────────────────────────────────────
  function navigate(view) {
    if (!views.includes(view)) return;
    currentView = view;

    // Update views
    document.querySelectorAll('.view').forEach(el => {
      el.classList.toggle('active', el.id === `view-${view}`);
    });

    // Update nav buttons (sidebar + mobile)
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === view);
    });

    // On navigate to library, re-render
    if (view === 'library') {
      Playlist.renderLibrary();
    }

    // Focus search input when navigating to search
    if (view === 'search') {
      setTimeout(() => document.getElementById('search-input')?.focus(), 100);
    }
  }

  // ── Home Screen ──────────────────────────────────────────
  function renderRecentlyPlayed() {
    const container = document.getElementById('recently-played');
    if (!container) return;
    const history = History.get();

    if (!history.length) {
      container.closest('.home-section')?.style.setProperty('display', 'none');
      return;
    }
    container.closest('.home-section')?.style.removeProperty('display');

    // Render as horizontal scroll cards
    container.innerHTML = history.slice(0, 10).map((song, i) => `
      <div class="mini-card" data-video-id="${song.videoId}" data-index="${i}">
        <img src="${song.thumbnail}" alt="${escHtml(song.title)}" loading="lazy">
        <p>${escHtml(song.title)}</p>
      </div>
    `).join('');

    const songs = history.slice(0, 10);
    container.querySelectorAll('.mini-card').forEach((card, i) => {
      card.addEventListener('click', () => Player.setQueue(songs, i));
    });
  }

  function renderMoodGrid() {
    const container = document.getElementById('mood-grid');
    if (!container) return;

    const moods = [
      { label: 'Galau',          emoji: '😢', query: 'lagu galau indonesia', color: '#6366f1' },
      { label: 'Semangat',       emoji: '🔥', query: 'lagu semangat motivasi', color: '#f97316' },
      { label: 'Santai',         emoji: '🌊', query: 'lagu santai lofi', color: '#0ea5e9' },
      { label: 'Anime',          emoji: '⛩️', query: 'anime ost opening', color: '#ec4899' },
      { label: 'K-Pop',          emoji: '💫', query: 'kpop hits 2024', color: '#a855f7' },
      { label: 'Hip-Hop',        emoji: '🎤', query: 'hip hop rap 2024', color: '#eab308' },
      { label: 'Study',          emoji: '📚', query: 'lofi study music', color: '#10b981' },
      { label: 'Party',          emoji: '🎉', query: 'party dance hits', color: '#ef4444' },
    ];

    container.innerHTML = moods.map(m => `
      <button class="mood-card" data-query="${m.query}" style="--mood-color: ${m.color}">
        <span class="mood-emoji">${m.emoji}</span>
        <span class="mood-label">${m.label}</span>
      </button>
    `).join('');

    container.querySelectorAll('.mood-card').forEach(card => {
      card.addEventListener('click', () => {
        navigate('search');
        const input = document.getElementById('search-input');
        if (input) {
          input.value = card.dataset.query;
          input.dispatchEvent(new Event('input'));
        }
      });
    });
  }

  // ── Body play state (for global animations) ──────────────
  function updateBodyPlayState(playing) {
    document.body.classList.toggle('is-playing', playing);
  }

  // ── Main Init ────────────────────────────────────────────
  function init() {
    // Nav buttons
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });

    // Init all modules
    Player.init();
    Search.init();
    Playlist.init();
    AI.init();
    Lyrics.init();
    FullPlayer.init();

    // Render home content
    renderMoodGrid();
    renderRecentlyPlayed();
    fetchTrending();

    // Navigate to home by default
    navigate('home');

    console.log('[Noctyra Music] App initialized ✓');
  }

  // ── Fetch Trending Indonesia ─────────────────────────────
  async function fetchTrending() {
    const container = document.getElementById('trending-list');
    if (!container) return;

    if (!CONFIG.YOUTUBE_API_KEY || CONFIG.YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
      container.innerHTML = `<p class="text-muted" style="font-size:13px">Set YouTube API key untuk melihat trending.</p>`;
      return;
    }

    try {
      const params = new URLSearchParams({
        part:            'snippet',
        chart:           'mostPopular',
        videoCategoryId: '10',       // Music category
        regionCode:      'ID',       // Indonesia
        maxResults:      '15',
        key:             CONFIG.YOUTUBE_API_KEY,
      });

      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const songs = (data.items || []).map(item => ({
        videoId:   item.id,
        title:     item.snippet.title,
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      }));

      if (!songs.length) { container.innerHTML = ''; return; }

      // Render as horizontal mini cards
      container.innerHTML = songs.map((song, i) => `
        <div class="mini-card" data-index="${i}" style="cursor:pointer">
          <img src="${escHtml(song.thumbnail)}" alt="${escHtml(song.title)}" loading="lazy">
          <p>${escHtml(song.title)}</p>
        </div>
      `).join('');

      container.querySelectorAll('.mini-card').forEach((card, i) => {
        card.addEventListener('click', () => Player.setQueue(songs, i));
      });

    } catch (err) {
      console.warn('[Trending] Failed:', err.message);
      container.innerHTML = '';
    }
  }

  // ── Helper ───────────────────────────────────────────────
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, navigate, renderRecentlyPlayed, updateBodyPlayState };
})();

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', App.init);
