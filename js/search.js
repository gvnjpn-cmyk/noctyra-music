// ============================================================
// NOCTYRA MUSIC — SEARCH MODULE
// YouTube Data API v3, smart query transform, debounce, cache
// ============================================================

const Search = (() => {
  // ── Cache ────────────────────────────────────────────────
  const cache = new Map(); // key: query string → { results, timestamp }

  function getCached(query) {
    const entry = cache.get(query);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL_MS) {
      cache.delete(query);
      return null;
    }
    return entry.results;
  }

  function setCache(query, results) {
    cache.set(query, { results, timestamp: Date.now() });
    // Keep cache size manageable
    if (cache.size > 50) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }

  // ── Smart Query Transformer ──────────────────────────────
  // Detects language/genre context and optimizes search query
  function smartTransform(raw) {
    const q = raw.toLowerCase().trim();

    // Indonesian music patterns
    if (/lagu indo|indo pop|pop indo|galau|baper|nasyid|dangdut|melayu|indonesia|jawa|sunda|minang|koplo/.test(q)) {
      return `${raw} official audio`;
    }

    // Anime / Japanese music
    if (/anime|vocaloid|touhou|j-pop|jpop|opening|ending|ost|miku|utaite|nijisanji|hololive/.test(q)) {
      return `${raw} official audio`;
    }

    // K-pop
    if (/kpop|k-pop|bts|blackpink|twice|aespa|newjeans|ive |stayc|itzy|nct|seventeen|exo/.test(q)) {
      return `${raw} official mv`;
    }

    // Lofi / study / chill
    if (/lofi|lo-fi|chill|study music|relax|sleep music|focus/.test(q)) {
      return `${raw} music`;
    }

    // Hip-hop / rap
    if (/rap|hip hop|hiphop|freestyle|cypher|drill/.test(q)) {
      return `${raw} official audio`;
    }

    // Electronic / EDM
    if (/edm|electronic|house|techno|trance|dubstep|dnb|drum and bass/.test(q)) {
      return `${raw} official audio`;
    }

    // Default: append "official audio" for cleaner results
    return `${raw} official audio`;
  }

  // ── YouTube API Call ─────────────────────────────────────
  async function fetchYoutube(rawQuery) {
    const query = smartTransform(rawQuery);
    console.log(`[Search] Query: "${rawQuery}" → "${query}"`);

    // Check cache
    const cached = getCached(query);
    if (cached) {
      console.log('[Search] Cache hit');
      return cached;
    }

    if (!CONFIG.YOUTUBE_API_KEY || CONFIG.YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
      throw new Error('YouTube API key not configured. Set CONFIG.YOUTUBE_API_KEY in js/config.js');
    }

    const params = new URLSearchParams({
      part:       'snippet',
      q:          query,
      type:       'video',
      videoCategoryId: '10', // Music category
      maxResults:  CONFIG.YT_MAX_RESULTS,
      key:         CONFIG.YOUTUBE_API_KEY,
    });

    const res = await fetch(`${CONFIG.YT_SEARCH_URL}?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `YouTube API error ${res.status}`);
    }

    const data = await res.json();
    const results = (data.items || []).map(item => ({
      videoId:   item.id.videoId,
      title:     item.snippet.title,
      channel:   item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    }));

    setCache(query, results);
    return results;
  }

  // ── Debounce ─────────────────────────────────────────────
  let debounceTimer = null;
  function debounce(fn, ms) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, ms);
  }

  // ── Render Results ───────────────────────────────────────
  function renderResults(songs, container, contextLabel = '') {
    container.innerHTML = '';
    if (!songs.length) {
      container.innerHTML = `<p class="empty-msg">Tidak ada hasil ditemukan.</p>`;
      return;
    }

    songs.forEach((song, i) => {
      const card = document.createElement('div');
      card.className  = 'song-card';
      card.dataset.videoId = song.videoId;
      card.innerHTML  = `
        <div class="song-card__thumb">
          <img src="${song.thumbnail}" alt="${escHtml(song.title)}" loading="lazy">
          <div class="song-card__play-overlay">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <div class="song-card__info">
          <p class="song-card__title">${escHtml(song.title)}</p>
          <p class="song-card__channel">${escHtml(song.channel)}</p>
        </div>
        <button class="song-card__add-btn" title="Tambah ke playlist" aria-label="Tambah ke playlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      `;

      // Click card → play with full list as queue
      card.addEventListener('click', (e) => {
        if (e.target.closest('.song-card__add-btn')) return;
        Player.setQueue(songs, i);
      });

      // Add to playlist button
      card.querySelector('.song-card__add-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        Playlist.showAddToPlaylist(song);
      });

      // Download / save offline button
      const dlBtn = document.createElement('button');
      dlBtn.className = 'song-card__dl-btn' + (Offline.hasSong(song.videoId) ? ' saved' : '');
      dlBtn.title = 'Simpan offline';
      dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Offline.addSong(song);
        dlBtn.classList.add('saved');
      });
      card.appendChild(dlBtn);

      container.appendChild(card);
    });
  }

  // ── Init Search UI ───────────────────────────────────────
  function init() {
    const input    = document.getElementById('search-input');
    const results  = document.getElementById('search-results');
    const spinner  = document.getElementById('search-spinner');
    const emptyMsg = document.getElementById('search-empty');

    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = '';
        emptyMsg.style.display = 'none';
        return;
      }
      debounce(async () => {
        spinner.style.display = 'flex';
        results.innerHTML     = '';
        emptyMsg.style.display = 'none';
        try {
          const songs = await fetchYoutube(q);
          renderResults(songs, results);
          if (!songs.length) emptyMsg.style.display = 'block';
        } catch (err) {
          results.innerHTML = `<p class="error-msg">⚠ ${escHtml(err.message)}</p>`;
        } finally {
          spinner.style.display = 'none';
        }
      }, CONFIG.SEARCH_DEBOUNCE_MS);
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, fetchYoutube, renderResults };
})();
