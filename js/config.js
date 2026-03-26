// ============================================================
// NOCTYRA MUSIC — CONFIG
// Fill in your API keys before deploying
// ============================================================

const CONFIG = {
  // ── YouTube Data API v3 ──────────────────────────────────
  // Get key: https://console.cloud.google.com → Enable YouTube Data API v3
  YOUTUBE_API_KEY: 'AIzaSyB065PpjmiBiXx9XFj5o0ueMHzEwQy98_E',
  YT_SEARCH_URL: 'https://www.googleapis.com/youtube/v3/search',
  YT_MAX_RESULTS: 20,

  // ── Claude (Anthropic) API ───────────────────────────────
  // Get key: https://console.anthropic.com
  CLAUDE_API_KEY: 'YOUR_CLAUDE_API_KEY_HERE',
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',

  // ── Search Behavior ──────────────────────────────────────
  SEARCH_DEBOUNCE_MS: 500,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // ── LocalStorage Keys ────────────────────────────────────
  STORAGE_PLAYLISTS: 'noctyra_playlists',
  STORAGE_HISTORY: 'noctyra_history',
};
