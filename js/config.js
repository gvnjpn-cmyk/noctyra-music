// ============================================================
// NOCTYRA MUSIC — CONFIG v5
// ============================================================

const CONFIG = {
  // ── YouTube Data API v3 ──────────────────────────────────
  YOUTUBE_API_KEY: 'AIzaSyB065PpjmiBiXx9XFj5o0ueMHzEwQy98_E',
  YT_SEARCH_URL:   'https://www.googleapis.com/youtube/v3/search',
  YT_MAX_RESULTS:  20,

  // ── OpenRouter API (replaces Claude direct) ─────────────
  // Get key: https://openrouter.ai → free tier available
  OPENROUTER_API_KEY: '',
  OPENROUTER_URL:     'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_MODEL:   'google/gemini-flash-1.5', // free model

  // ── Search ───────────────────────────────────────────────
  SEARCH_DEBOUNCE_MS: 500,
  CACHE_TTL_MS:       5 * 60 * 1000,

  // ── LocalStorage Keys ────────────────────────────────────
  STORAGE_PLAYLISTS: 'noctyra_playlists',
  STORAGE_HISTORY:   'noctyra_history',
  STORAGE_OFFLINE:   'noctyra_offline',
  STORAGE_LIKES:     'noctyra_likes',
};
