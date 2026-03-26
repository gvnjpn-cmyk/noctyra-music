// ============================================================
// NOCTYRA MUSIC — LYRICS MODULE
// Sources: lrclib.net → lyrics.ovh (both free, no key)
// Exposes fetchFor(song) for FullPlayer to call directly
// ============================================================

const Lyrics = (() => {
  const cache = new Map();

  function clean(str) {
    return str
      .replace(/\(official.*?\)/gi, '')
      .replace(/\[official.*?\]/gi, '')
      .replace(/\(lyric.*?\)/gi, '')
      .replace(/\[lyric.*?\]/gi, '')
      .replace(/\(audio.*?\)/gi, '')
      .replace(/\(mv.*?\)/gi, '')
      .replace(/official|lyric|audio|video|hd|4k|remaster|vevo|records/gi, '')
      .replace(/feat\..*$/gi, '')
      .replace(/ft\..*$/gi, '')
      .replace(/[-–|×].*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function fromLrclib(title, artist) {
    try {
      const params = new URLSearchParams({ track_name: title });
      if (artist) params.set('artist_name', artist);
      const res = await fetch(`https://lrclib.net/api/search?${params}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.length) return null;
      const match = data.find(d => d.plainLyrics) || data.find(d => d.syncedLyrics);
      if (!match) return null;
      if (match.plainLyrics) return match.plainLyrics.trim();
      return match.syncedLyrics
        .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
        .replace(/^\s*\n/gm, '')
        .trim();
    } catch { return null; }
  }

  async function fromLyricsOvh(title, artist) {
    try {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.lyrics?.trim() || null;
    } catch { return null; }
  }

  async function fetchFor(song) {
    const title  = clean(song.title);
    const artist = clean(song.channel || '');
    const key    = `${artist}::${title}`.toLowerCase();

    if (cache.has(key)) return cache.get(key);

    let lyrics = await fromLrclib(title, artist);
    if (!lyrics) lyrics = await fromLrclib(title, '');
    if (!lyrics && artist) lyrics = await fromLyricsOvh(title, artist);

    cache.set(key, lyrics);
    return lyrics;
  }

  function init() {
    // Old panel methods kept as no-ops for compatibility
  }

  return { init, fetchFor };
})();
