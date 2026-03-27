// netlify/functions/youtube.js
// Proxy untuk YouTube Data API v3
// Key disimpan di Netlify Environment Variables, tidak terekspos ke client

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'YouTube API key not configured' }) };
  }

  const params = event.queryStringParameters || {};
  const type   = params.type || 'search';

  try {
    let url;

    if (type === 'trending') {
      // Videos - most popular music in Indonesia
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=ID&maxResults=15&key=${key}`;
    } else {
      // Search
      const q = params.q || '';
      const maxResults = params.maxResults || '20';
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${key}`;
    }

    const res  = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
