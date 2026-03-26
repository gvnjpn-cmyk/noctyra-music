// ============================================================
// NOCTYRA MUSIC — LYRICS MODULE v3
// Sources: lrclib.net → lyrics.ovh → genius scrape fallback
// ============================================================

const Lyrics = (() => {
  const cache = new Map();

  function clean(str) {
    return str
      .replace(/\(official.*?\)/gi,'').replace(/\[official.*?\]/gi,'')
      .replace(/\(lyric.*?\)/gi,'').replace(/\[lyric.*?\]/gi,'')
      .replace(/\(audio.*?\)/gi,'').replace(/\(mv.*?\)/gi,'')
      .replace(/\(music video.*?\)/gi,'')
      .replace(/official|lyric|audio|video|hd|4k|remaster|vevo|records/gi,'')
      .replace(/feat\..*$/gi,'').replace(/ft\..*$/gi,'')
      .replace(/[-–|×x].*$/, '')
      .replace(/\s+/g,' ').trim();
  }

  // Strip Roman numerals, episode numbers, etc from channel names
  function cleanArtist(channel) {
    return channel
      .replace(/VEVO$/i,'').replace(/Official$/i,'')
      .replace(/Music$/i,'').replace(/Records$/i,'')
      .replace(/Channel$/i,'').replace(/TV$/i,'')
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

    // Strategy 1: lrclib with artist
    let lyrics = await fromLrclib(title, channel);

    // Strategy 2: lrclib title only (flexible for Indo songs)
    if (!lyrics) lyrics = await fromLrclib(title, '');

    // Strategy 3: Try first word of channel as artist
    if (!lyrics && channel.includes(' ')) {
      const shortArtist = channel.split(' ')[0];
      lyrics = await fromLrclib(title, shortArtist);
    }

    // Strategy 4: lyrics.ovh fallback
    if (!lyrics && channel) lyrics = await fromLyricsOvh(title, channel);

    cache.set(key, lyrics);
    return lyrics;
  }

  function init() {}

  return { init, fetchFor };
})();
