// ============================================================
// NOCTYRA MUSIC — AI MODULE
// Claude API integration for playlist generation + recommendations
// ============================================================

const AI = (() => {
  let isLoading = false;

  // ── Claude API Call ──────────────────────────────────────
  async function callClaude(systemPrompt, userMessage) {
    if (!CONFIG.CLAUDE_API_KEY || CONFIG.CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
      throw new Error('Claude API key belum diset. Isi CONFIG.CLAUDE_API_KEY di js/config.js');
    }

    const res = await fetch(CONFIG.CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.CLAUDE_MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API error ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // ── AI Playlist Generator ────────────────────────────────
  // User describes mood/theme → Claude generates song list → search YouTube

  const PLAYLIST_SYSTEM = `You are a music curator AI for Noctyra Music app.
When the user describes a mood or theme, generate a playlist.
Respond ONLY in JSON format (no markdown, no backticks):
{
  "playlistName": "Creative playlist name",
  "description": "Short description 1-2 sentences",
  "songs": [
    { "title": "Song Title", "artist": "Artist Name", "query": "Search query for YouTube" },
    ...
  ]
}
Generate 6-10 songs. Vary the artists. 
If the input is in Indonesian or mentions Indonesian context, include relevant Indonesian songs.
If the input mentions anime, include anime songs.
Queries should be specific enough to find the right song on YouTube.`;

  async function generatePlaylist(moodInput) {
    if (isLoading) return;
    isLoading = true;

    const container  = document.getElementById('ai-results');
    const statusEl   = document.getElementById('ai-status');
    const saveBtn    = document.getElementById('btn-save-ai-playlist');
    if (!container) return;

    container.innerHTML = '';
    statusEl.textContent = '🤖 Generating playlist...';
    statusEl.style.display = 'block';
    saveBtn.style.display = 'none';

    let parsed;
    try {
      const raw = await callClaude(PLAYLIST_SYSTEM, moodInput);
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (err) {
      statusEl.textContent = `⚠ ${err.message}`;
      isLoading = false;
      return;
    }

    statusEl.textContent = `🔎 Mencari lagu di YouTube... (0/${parsed.songs.length})`;

    // Search each song on YouTube
    const results = [];
    for (let i = 0; i < parsed.songs.length; i++) {
      const s = parsed.songs[i];
      try {
        statusEl.textContent = `🔎 Mencari lagu di YouTube... (${i + 1}/${parsed.songs.length})`;
        const ytResults = await Search.fetchYoutube(s.query || `${s.title} ${s.artist}`);
        if (ytResults.length) results.push(ytResults[0]);
        // Small delay to avoid rate limiting
        await sleep(200);
      } catch (_) { /* Skip failed searches */ }
    }

    if (!results.length) {
      statusEl.textContent = '⚠ Tidak ada lagu yang ditemukan.';
      isLoading = false;
      return;
    }

    // Show results
    statusEl.style.display = 'none';
    container.innerHTML = `
      <div class="ai-playlist-header">
        <h3>${escHtml(parsed.playlistName)}</h3>
        <p class="text-muted">${escHtml(parsed.description)}</p>
      </div>
    `;

    const songList = document.createElement('div');
    songList.className = 'ai-song-list';
    container.appendChild(songList);
    Search.renderResults(results, songList);

    // Save + Play buttons
    saveBtn.style.display = 'flex';
    saveBtn.dataset.name  = parsed.playlistName;
    saveBtn._songs        = results;

    saveBtn.onclick = () => {
      const pl = Playlist.create(parsed.playlistName);
      if (pl) {
        results.forEach(s => Playlist.addSong(pl.id, s));
        showToast(`✓ Playlist "${parsed.playlistName}" disimpan!`);
        saveBtn.disabled = true;
        saveBtn.textContent = 'Tersimpan ✓';
      }
    };

    // Play all button
    document.getElementById('btn-play-ai-playlist').style.display = 'flex';
    document.getElementById('btn-play-ai-playlist').onclick = () => {
      Player.setQueue(results, 0);
      hideModal();
    };

    isLoading = false;
  }

  // ── AI Music Recommendation ──────────────────────────────
  const RECOMMEND_SYSTEM = `You are a music recommendation AI for Noctyra Music.
When the user describes what they want (mood, genre, activity, language), 
suggest 5-8 songs. Respond ONLY in JSON (no markdown):
{
  "suggestions": [
    { "title": "Song Title", "artist": "Artist Name", "why": "1 sentence reason", "query": "YouTube search query" }
  ]
}
Be concise. Include Indonesian songs if relevant. Vary the genres.`;

  async function getRecommendations(input) {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById('recommend-results');
    const statusEl  = document.getElementById('recommend-status');
    if (!container) return;

    container.innerHTML = '';
    statusEl.textContent = '🤖 Mencari rekomendasi...';
    statusEl.style.display = 'block';

    try {
      const raw    = await callClaude(RECOMMEND_SYSTEM, input);
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

      statusEl.style.display = 'none';
      container.innerHTML = parsed.suggestions.map((s, i) => `
        <div class="recommend-item" data-query="${escHtml(s.query)}">
          <span class="recommend-num">${i + 1}</span>
          <div class="recommend-info">
            <p class="recommend-title">${escHtml(s.title)}</p>
            <p class="recommend-artist">${escHtml(s.artist)}</p>
            <p class="recommend-why">${escHtml(s.why)}</p>
          </div>
          <button class="recommend-search-btn" title="Cari & putar">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
        </div>
      `).join('');

      // Click search button → navigate to search with query pre-filled
      container.querySelectorAll('.recommend-item').forEach(item => {
        item.querySelector('.recommend-search-btn').addEventListener('click', () => {
          const q = item.dataset.query;
          App.navigate('search');
          const input = document.getElementById('search-input');
          if (input) {
            input.value = q;
            input.dispatchEvent(new Event('input'));
          }
          hideModal();
        });
      });

    } catch (err) {
      statusEl.textContent = `⚠ ${err.message}`;
    }

    isLoading = false;
  }

  // ── Modal ────────────────────────────────────────────────
  function showModal(tab = 'generate') {
    const modal   = document.getElementById('modal-ai');
    const overlay = document.getElementById('modal-overlay');
    if (!modal) return;
    modal.classList.add('active');
    overlay.classList.add('active');
    switchTab(tab);
  }

  function hideModal() {
    document.getElementById('modal-ai')?.classList.remove('active');
    document.getElementById('modal-overlay')?.classList.remove('active');
  }

  function switchTab(tab) {
    document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.ai-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    // Open AI modal buttons
    document.querySelectorAll('[data-open-ai]').forEach(btn => {
      btn.addEventListener('click', () => showModal(btn.dataset.openAi || 'generate'));
    });

    // Tab switching
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Generate playlist submit
    document.getElementById('btn-generate-playlist')?.addEventListener('click', () => {
      const mood = document.getElementById('mood-input')?.value.trim();
      if (mood) generatePlaylist(mood);
    });
    document.getElementById('mood-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const mood = e.target.value.trim();
        if (mood) generatePlaylist(mood);
      }
    });

    // Recommend submit
    document.getElementById('btn-get-recommendations')?.addEventListener('click', () => {
      const input = document.getElementById('recommend-input')?.value.trim();
      if (input) getRecommendations(input);
    });
    document.getElementById('recommend-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = e.target.value.trim();
        if (input) getRecommendations(input);
      }
    });

    // Close button
    document.getElementById('btn-close-ai')?.addEventListener('click', hideModal);
  }

  // ── Helpers ──────────────────────────────────────────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, showModal, hideModal, generatePlaylist, getRecommendations };
})();
