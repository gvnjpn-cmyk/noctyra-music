// ============================================================
// NOCTYRA MUSIC — APP v5
// Navigation, home, greeting, offline, init
// ============================================================

const History = (() => {
  const MAX = 20;
  function load() { try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_HISTORY)) || []; } catch { return []; } }
  function add(song) {
    const h = load().filter(s => s.videoId !== song.videoId);
    h.unshift(song);
    if (h.length > MAX) h.length = MAX;
    localStorage.setItem(CONFIG.STORAGE_HISTORY, JSON.stringify(h));
    App.renderRecentlyPlayed();
  }
  function get() { return load(); }
  return { add, get };
})();

const App = (() => {
  const views = ['home','search','library','offline'];
  let currentView = 'home';

  function navigate(view) {
    if (!views.includes(view)) return;
    currentView = view;
    document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
    document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === view));
    if (view === 'library') Playlist.renderLibrary();
    if (view === 'offline') Offline.renderView();
    if (view === 'search')  setTimeout(() => document.getElementById('search-input')?.focus(), 100);
  }

  // ── Greeting (time-based, Spotify-style) ─────────────────
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 5)  return 'Masih melek nih 🌙';
    if (h < 11) return 'Selamat pagi ☀️';
    if (h < 15) return 'Selamat siang 🌤';
    if (h < 18) return 'Selamat sore 🌆';
    if (h < 21) return 'Selamat malam 🌙';
    return 'Malam ini dengerin apa? 🎵';
  }

  // ── Quick Picks (time-based playlists) ───────────────────
  function getQuickPicks() {
    const h = new Date().getHours();
    if (h < 7)  return [
      { label: 'Lagu Malam', query: 'lagu malam indo acoustic' },
      { label: 'Lofi Sleep', query: 'lofi sleep music' },
      { label: 'Chill Hits', query: 'chill indie music' },
    ];
    if (h < 12) return [
      { label: 'Pagi Semangat', query: 'lagu semangat pagi indonesia' },
      { label: 'Morning Pop', query: 'morning pop hits 2024' },
      { label: 'Acoustic Pagi', query: 'acoustic morning songs' },
    ];
    if (h < 17) return [
      { label: 'Kerja Fokus', query: 'lofi study focus music' },
      { label: 'Pop Siang', query: 'pop hits indonesia 2024' },
      { label: 'Playlist Kerja', query: 'upbeat work playlist' },
    ];
    return [
      { label: 'Santai Sore', query: 'lagu santai sore indonesia' },
      { label: 'Malam Galau', query: 'lagu galau malam indonesia' },
      { label: 'Evening Chill', query: 'evening chill playlist' },
    ];
  }

  function renderQuickPicks() {
    const container = document.getElementById('quick-picks');
    if (!container) return;
    const picks = getQuickPicks();
    container.innerHTML = picks.map(p => `
      <button class="quick-pick-btn" data-query="${p.query}">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5,3 19,12 5,21"/></svg>
        ${p.label}
      </button>
    `).join('');
    container.querySelectorAll('.quick-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate('search');
        const inp = document.getElementById('search-input');
        if (inp) { inp.value = btn.dataset.query; inp.dispatchEvent(new Event('input')); }
      });
    });
  }

  function renderRecentlyPlayed() {
    const container = document.getElementById('recently-played');
    if (!container) return;
    const history = History.get();
    if (!history.length) { container.closest('.home-section')?.style.setProperty('display','none'); return; }
    container.closest('.home-section')?.style.removeProperty('display');
    const songs = history.slice(0, 10);
    container.innerHTML = songs.map((song, i) => `
      <div class="mini-card" data-index="${i}">
        <img src="${esc(song.thumbnail)}" alt="${esc(song.title)}" loading="lazy">
        <p>${esc(song.title)}</p>
      </div>
    `).join('');
    container.querySelectorAll('.mini-card').forEach((card, i) => {
      card.addEventListener('click', () => Player.setQueue(songs, i));
    });
  }

  function renderMoodGrid() {
    const container = document.getElementById('mood-grid');
    if (!container) return;
    const moods = [
      { label:'Galau',    emoji:'😢', query:'lagu galau indonesia',        color:'#6366f1' },
      { label:'Semangat', emoji:'🔥', query:'lagu semangat motivasi',       color:'#f97316' },
      { label:'Santai',   emoji:'🌊', query:'lagu santai lofi',             color:'#0ea5e9' },
      { label:'Anime',    emoji:'⛩️', query:'anime ost opening',            color:'#ec4899' },
      { label:'K-Pop',    emoji:'💫', query:'kpop hits 2024',               color:'#a855f7' },
      { label:'Hip-Hop',  emoji:'🎤', query:'hip hop rap 2024',             color:'#eab308' },
      { label:'Study',    emoji:'📚', query:'lofi study music',             color:'#10b981' },
      { label:'Party',    emoji:'🎉', query:'party dance hits',             color:'#ef4444' },
    ];
    container.innerHTML = moods.map(m => `
      <button class="mood-card" data-query="${m.query}" style="--mood-color:${m.color}">
        <span class="mood-emoji">${m.emoji}</span>
        <span class="mood-label">${m.label}</span>
      </button>`).join('');
    container.querySelectorAll('.mood-card').forEach(card => {
      card.addEventListener('click', () => {
        navigate('search');
        const inp = document.getElementById('search-input');
        if (inp) { inp.value = card.dataset.query; inp.dispatchEvent(new Event('input')); }
      });
    });
  }

  async function fetchTrending() {
    const container = document.getElementById('trending-list');
    if (!container) return;
    try {
      const res  = await fetch(`${CONFIG.YT_API}?type=trending`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const songs = (data.items||[]).map(item => ({
        videoId:   item.id,
        title:     item.snippet.title,
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url||'',
      }));
      if (!songs.length) { container.innerHTML=''; return; }
      container.innerHTML = songs.map((s,i) => `
        <div class="mini-card" data-index="${i}">
          <img src="${esc(s.thumbnail)}" alt="${esc(s.title)}" loading="lazy">
          <p>${esc(s.title)}</p>
        </div>`).join('');
      container.querySelectorAll('.mini-card').forEach((card,i) => {
        card.addEventListener('click', () => Player.setQueue(songs, i));
      });
    } catch { container.innerHTML=''; }
  }

  function updateBodyPlayState(playing) {
    document.body.classList.toggle('is-playing', playing);
  }

  function init() {
    // Update greeting
    const greetEl = document.getElementById('home-greeting-text');
    if (greetEl) greetEl.textContent = getGreeting();

    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });

    Player.init();
    Search.init();
    Playlist.init();
    AI.init();
    Lyrics.init();
    FullPlayer.init();
    Offline.init();

    renderMoodGrid();
    renderQuickPicks();
    renderRecentlyPlayed();
    fetchTrending();
    navigate('home');

    console.log('[Noctyra Music v5] App initialized ✓');
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  return { init, navigate, renderRecentlyPlayed, updateBodyPlayState };
})();

document.addEventListener('DOMContentLoaded', App.init);
