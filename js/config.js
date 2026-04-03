// ============================================================
// NOCTYRA MUSIC — CONFIG v8 (Vercel)
// API keys TIDAK disimpan di sini.
// Set key di: Vercel Dashboard → Project → Settings → Environment Variables
// ============================================================

const CONFIG = {
  // ── API Endpoints (Vercel Serverless Functions) ──────────
  YT_API:        '/api/youtube',
  AI_API:        '/api/ai',
  YT_MAX_RESULTS: 20,

  // ── OpenRouter Model (gratis) ────────────────────────────
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
