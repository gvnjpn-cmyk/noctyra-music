// netlify/functions/ai.js
// Proxy untuk OpenRouter API
// Key disimpan di Netlify Environment Variables

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'OpenRouter API key not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer':  process.env.URL || 'https://noctyra-music.netlify.app',
        'X-Title':       'Noctyra Music',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
