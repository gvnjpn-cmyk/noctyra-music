// api/youtube.js — Vercel Serverless Function
// Proxy YouTube Data API v3
// Key disimpan di Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(500).json({ error: 'YouTube API key not configured' });

  const { type, q, maxResults = 20 } = req.query;

  try {
    let url;
    if (type === 'trending') {
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=ID&maxResults=15&key=${key}`;
    } else {
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q || '')}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${key}`;
    }

    const response = await fetch(url);
    const data     = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
