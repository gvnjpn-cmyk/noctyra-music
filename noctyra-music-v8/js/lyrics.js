// ============================================================
// NOCTYRA MUSIC — LYRICS MODULE v4
// Better cleaning + more search strategies for Indo songs
// ============================================================

const Lyrics = (() => {
  const cache = new Map();

  function clean(str) {
    return str
      .replace(/\(official.*?\)/gi,'').replace(/\[official.*?\]/gi,'')
      .replace(/\(lyric.*?\)/gi,'').replace(/\[lyric.*?\]/gi,'')
      .replace(/\(audio.*?\)/gi,'').replace(/\(mv.*?\)/gi,'')
      .replace(/\(music video.*?\)/gi,'').replace(/\(video.*?\)/gi,'')
      .replace(/official|lyric|audio|video|hd|4k|remaster|vevo|records|musik/gi,'')
      .replace(/feat\..*$/gi,'').replace(/ft\..*$/gi,'')
      .replace(/\s*[-–|×x]\s*.*$/, '')
      .replace(/\s+/g,' ').trim();
  }

  function cleanArtist(ch) {
    return ch
      .replace(/VEVO$/i,'').replace(/Official$/i,'')
      .replace(/Music$/i,'').replace(/ Records$/i,'')
      .replace(/ TV$/i,'').replace(/ Channel$/i,'')
      .replace(/\s+/g,' ').trim();
  }

  async function fromLrclib(title, artist) {
    try {
      const params = new URLSearchParams({ track_name: title });
      if (artist) params.set('artist_name', artist);
      const res = await fetch(`https://lrclib.net/api/search?${params}`,
        { signal: AbortSignal.timeout(7000) });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.length) return null;
      const match = data.find(d => d.plainLyrics) || data.find(d => d.syncedLyrics);
      if (!match) return null;
      if (match.plainLyrics) return match.plainLyrics.trim();
      return match.syncedLyrics
        .replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g,'')
        .replace(/^\s*\n/gm,'').trim();
    } catch { return null; }
  }

  async function fromLyricsOvh(title, artist) {
    try {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(7000) });
      if (!res.ok) return null;
      const d = await res.json();
      return d.lyrics?.trim() || null;
    } catch { return null; }
  }

  async function fetchFor(song) {
    const title   = clean(song.title);
    const channel = cleanArtist(song.channel || '');
    const key     = `${channel}::${title}`.toLowerCase();
    if (cache.has(key)) return cache.get(key);

    // Try multiple strategies
    let lyrics = null;

    // 1. lrclib with artist
    lyrics = await fromLrclib(title, channel);

    // 2. lrclib title only
    if (!lyrics) lyrics = await fromLrclib(title, '');

    // 3. First word of channel as artist
    if (!lyrics && channel.includes(' '))
      lyrics = await fromLrclib(title, channel.split(' ')[0]);

    // 4. lyrics.ovh
    if (!lyrics && channel) lyrics = await fromLyricsOvh(title, channel);

    // 5. lyrics.ovh swapped
    if (!lyrics) lyrics = await fromLyricsOvh(channel, title);

    cache.set(key, lyrics);
    return lyrics;
  }

  function init() {}
  return { init, fetchFor };
})();
