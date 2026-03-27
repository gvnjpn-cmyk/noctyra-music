// ============================================================
// NOCTYRA MUSIC — CONFIG v6
// API keys TIDAK disimpan di sini.
// Semua request lewat Netlify Functions (server-side proxy).
// Set key di: Netlify Dashboard → Site → Environment Variables
// ============================================================

const CONFIG = {
  // ── API Endpoints (proxy ke Netlify Functions) ───────────
  YT_API:        '/.netlify/functions/youtube',
  AI_API:        '/.netlify/functions/ai',
  YT_MAX_RESULTS: 20,

  // ── OpenRouter Model ─────────────────────────────────────
  // Model ini dikirim ke proxy, bukan key-nya
  OPENROUTER_MODEL: 'meta-llama/llama-3.1-8b-instruct:free',

  // ── Search ───────────────────────────────────────────────
  SEARCH_DEBOUNCE_MS: 500,
  CACHE_TTL_MS:       5 * 60 * 1000,

  // ── LocalStorage Keys ────────────────────────────────────
  STORAGE_PLAYLISTS: 'noctyra_playlists',
  STORAGE_HISTORY:   'noctyra_history',
  STORAGE_OFFLINE:   'noctyra_offline',
  STORAGE_LIKES:     'noctyra_likes',
};
