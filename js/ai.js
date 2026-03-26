// ============================================================
// NOCTYRA MUSIC — AI MODULE v2
// Uses OpenRouter API (free tier available)
// + AI Chat Sidebar
// ============================================================

const AI = (() => {
  let isLoading   = false;
  let chatHistory = []; // for sidebar chat

  // ── OpenRouter API Call ──────────────────────────────────
  async function callAI(systemPrompt, userMessage, jsonMode = false) {
    const key = CONFIG.OPENROUTER_API_KEY;
    if (!key || key === 'YOUR_OPENROUTER_API_KEY_HERE') {
      throw new Error('OpenRouter API key belum diset. Daftar gratis di openrouter.ai');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ];

    const res = await fetch(CONFIG.OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer':  location.origin,
        'X-Title':       'Noctyra Music',
      },
      body: JSON.stringify({
        model:       CONFIG.OPENROUTER_MODEL,
        max_tokens:  1200,
        messages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenRouter error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ── Chat API (multi-turn) ────────────────────────────────
  async function callChat(userMessage) {
    const key = CONFIG.OPENROUTER_API_KEY;
    if (!key || key === 'YOUR_OPENROUTER_API_KEY_HERE') {
      throw new Error('OpenRouter API key belum diset di config.js');
    }

    chatHistory.push({ role: 'user', content: userMessage });

    const systemMsg = {
      role: 'system',
      content: `Kamu adalah Noctyra AI, asisten musik yang ramah dan cerdas untuk Noctyra Music app.
Kamu bisa:
- Merekomendasikan lagu dan artis
- Menjawab pertanyaan tentang musik
- Membantu user menemukan lagu berdasarkan mood
- Memberikan info tentang genre, artis, album
Jawab dalam bahasa yang sama dengan user (Indonesia/Inggris).
Jawaban singkat dan to the point. Gunakan emoji sesekali.`
    };

    const res = await fetch(CONFIG.OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer':  location.origin,
        'X-Title':       'Noctyra Music',
      },
      body: JSON.stringify({
        model:      CONFIG.OPENROUTER_MODEL,
        max_tokens: 600,
        messages:   [systemMsg, ...chatHistory.slice(-10)],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      chatHistory.pop();
      throw new Error(err.error?.message || `Error ${res.status}`);
    }

    const data   = await res.json();
    const reply  = data.choices?.[0]?.message?.content || '...';
    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  }

  // ── AI Playlist Generator ────────────────────────────────
  const PLAYLIST_SYSTEM = `Kamu adalah kurator musik AI untuk Noctyra Music.
User mendeskripsikan mood/tema, buat playlist.
Respond HANYA dengan JSON (tanpa markdown/backtick):
{"playlistName":"Nama playlist kreatif","description":"1-2 kalimat","songs":[{"title":"Judul Lagu","artist":"Nama Artis","query":"search query YouTube"}]}
Generate 6-10 lagu. Variasikan artis.
Untuk input Indonesia/lagu Indo: sertakan lagu Indonesia yang relevan.
Untuk anime: sertakan lagu anime.
Query harus spesifik agar mudah ditemukan di YouTube.`;

  async function generatePlaylist(moodInput) {
    if (isLoading) return;
    isLoading = true;

    const statusEl = document.getElementById('ai-status');
    const container = document.getElementById('ai-results');
    const saveBtn   = document.getElementById('btn-save-ai-playlist');
    const playBtn   = document.getElementById('btn-play-ai-playlist');

    container.innerHTML = '';
    statusEl.textContent = '🤖 Generating playlist...';
    statusEl.style.display = 'block';
    saveBtn.style.display  = 'none';
    playBtn.style.display  = 'none';

    let parsed;
    try {
      const raw = await callAI(PLAYLIST_SYSTEM, moodInput, true);
      parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
    } catch (err) {
      statusEl.textContent = `⚠ ${err.message}`;
      isLoading = false; return;
    }

    const results = [];
    for (let i = 0; i < parsed.songs.length; i++) {
      const s = parsed.songs[i];
      statusEl.textContent = `🔎 Mencari lagu... (${i+1}/${parsed.songs.length})`;
      try {
        const r = await Search.fetchYoutube(s.query || `${s.title} ${s.artist}`);
        if (r.length) results.push(r[0]);
        await sleep(150);
      } catch {}
    }

    if (!results.length) {
      statusEl.textContent = '⚠ Tidak ada lagu ditemukan.';
      isLoading = false; return;
    }

    statusEl.style.display = 'none';
    container.innerHTML = `<div class="ai-playlist-header"><h3>${esc(parsed.playlistName)}</h3><p class="text-muted">${esc(parsed.description)}</p></div>`;
    const songList = document.createElement('div');
    songList.className = 'ai-song-list';
    container.appendChild(songList);
    Search.renderResults(results, songList);

    saveBtn.style.display = 'flex';
    playBtn.style.display = 'flex';
    saveBtn.dataset.name  = parsed.playlistName;
    saveBtn._songs        = results;

    saveBtn.onclick = () => {
      const pl = Playlist.create(parsed.playlistName);
      if (pl) {
        results.forEach(s => Playlist.addSong(pl.id, s));
        showToast(`✓ Playlist "${parsed.playlistName}" disimpan!`);
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Tersimpan ✓';
      }
    };
    playBtn.onclick = () => { Player.setQueue(results, 0); hideModal(); };

    isLoading = false;
  }

  // ── AI Recommendation ────────────────────────────────────
  const RECOMMEND_SYSTEM = `Kamu adalah rekomendasi musik AI untuk Noctyra Music.
Respond HANYA dengan JSON:
{"suggestions":[{"title":"Judul","artist":"Artis","why":"alasan 1 kalimat","query":"YouTube search query"}]}
5-8 lagu. Variasikan genre. Sertakan lagu Indonesia jika relevan.`;

  async function getRecommendations(input) {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById('recommend-results');
    const statusEl  = document.getElementById('recommend-status');
    container.innerHTML = '';
    statusEl.textContent = '🤖 Mencari rekomendasi...';
    statusEl.style.display = 'block';

    try {
      const raw    = await callAI(RECOMMEND_SYSTEM, input, true);
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
      statusEl.style.display = 'none';

      container.innerHTML = parsed.suggestions.map((s,i) => `
        <div class="recommend-item" data-query="${esc(s.query)}">
          <span class="recommend-num">${i+1}</span>
          <div class="recommend-info">
            <p class="recommend-title">${esc(s.title)}</p>
            <p class="recommend-artist">${esc(s.artist)}</p>
            <p class="recommend-why">${esc(s.why)}</p>
          </div>
          <button class="recommend-search-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
        </div>`).join('');

      container.querySelectorAll('.recommend-item').forEach(item => {
        item.querySelector('.recommend-search-btn').addEventListener('click', () => {
          App.navigate('search');
          const inp = document.getElementById('search-input');
          if (inp) { inp.value = item.dataset.query; inp.dispatchEvent(new Event('input')); }
          hideModal();
        });
      });
    } catch (err) {
      statusEl.textContent = `⚠ ${err.message}`;
    }
    isLoading = false;
  }

  // ── AI Chat Sidebar ──────────────────────────────────────
  function openChat() {
    document.getElementById('ai-chat-sidebar')?.classList.add('open');
    document.getElementById('ai-chat-overlay')?.classList.add('active');
    document.getElementById('chat-input')?.focus();
  }

  function closeChat() {
    document.getElementById('ai-chat-sidebar')?.classList.remove('open');
    document.getElementById('ai-chat-overlay')?.classList.remove('active');
  }

  function appendChatMsg(role, text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${role}`;

    // Convert **bold** and line breaks
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    msg.innerHTML = `<div class="chat-bubble">${formatted}</div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg   = input?.value.trim();
    if (!msg) return;

    input.value = '';
    appendChatMsg('user', msg);

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    const container = document.getElementById('chat-messages');
    container.innerHTML += `<div class="chat-msg chat-msg--ai" id="${typingId}"><div class="chat-bubble chat-typing"><span></span><span></span><span></span></div></div>`;
    container.scrollTop = container.scrollHeight;

    try {
      const reply = await callChat(msg);
      document.getElementById(typingId)?.remove();
      appendChatMsg('ai', reply);

      // If reply mentions a song/artist, offer quick search
      const searchMatch = reply.match(/[""]([^""]+)[""]|"([^"]+)"/);
      if (searchMatch) {
        const term = searchMatch[1] || searchMatch[2];
        const suggestion = document.createElement('div');
        suggestion.className = 'chat-suggestion';
        suggestion.innerHTML = `<button class="chat-suggest-btn" data-query="${esc(term)}">🔍 Cari "${esc(term)}"</button>`;
        suggestion.querySelector('button').addEventListener('click', () => {
          App.navigate('search');
          const inp = document.getElementById('search-input');
          if (inp) { inp.value = term; inp.dispatchEvent(new Event('input')); }
          closeChat();
        });
        container.appendChild(suggestion);
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      document.getElementById(typingId)?.remove();
      appendChatMsg('ai', `⚠ ${err.message}`);
    }
  }

  // ── Modal ────────────────────────────────────────────────
  function showModal(tab = 'generate') {
    document.getElementById('modal-ai')?.classList.add('active');
    document.getElementById('modal-overlay')?.classList.add('active');
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
    document.querySelectorAll('[data-open-ai]').forEach(btn => {
      btn.addEventListener('click', () => showModal(btn.dataset.openAi || 'generate'));
    });
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.getElementById('btn-generate-playlist')?.addEventListener('click', () => {
      const m = document.getElementById('mood-input')?.value.trim();
      if (m) generatePlaylist(m);
    });
    document.getElementById('mood-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const m = e.target.value.trim(); if (m) generatePlaylist(m); }
    });
    document.getElementById('btn-get-recommendations')?.addEventListener('click', () => {
      const m = document.getElementById('recommend-input')?.value.trim();
      if (m) getRecommendations(m);
    });
    document.getElementById('recommend-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const m = e.target.value.trim(); if (m) getRecommendations(m); }
    });
    document.getElementById('btn-close-ai')?.addEventListener('click', hideModal);

    // Chat sidebar
    document.querySelectorAll('[data-open-chat]').forEach(btn => {
      btn.addEventListener('click', openChat);
    });
    document.getElementById('btn-close-chat')?.addEventListener('click', closeChat);
    document.getElementById('ai-chat-overlay')?.addEventListener('click', closeChat);
    document.getElementById('btn-send-chat')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    // Welcome message
    setTimeout(() => {
      if (document.getElementById('chat-messages')?.children.length === 0) {
        appendChatMsg('ai', 'Halo! 👋 Aku Noctyra AI. Mau cari lagu apa, atau butuh rekomendasi musik?');
      }
    }, 500);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function esc(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  return { init, showModal, hideModal, generatePlaylist, getRecommendations, openChat, closeChat };
})();
