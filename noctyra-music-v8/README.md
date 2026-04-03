# 🎵 Noctyra Music

Spotify-like music web app using YouTube as music source.
Dark glassmorphism theme, AI-powered playlist generation, mobile-first.

---

## ⚡ Quick Setup

### 1. Set API Keys

Edit `js/config.js`:

```js
YOUTUBE_API_KEY: 'YOUR_KEY_HERE',   // YouTube Data API v3
CLAUDE_API_KEY:  'YOUR_KEY_HERE',   // Anthropic Claude API
```

### 2. Get YouTube API Key

1. Go to https://console.cloud.google.com
2. Create project → Enable **YouTube Data API v3**
3. Create credentials → API Key
4. (Optional) Restrict key to your domain

### 3. Get Claude API Key

1. Go to https://console.anthropic.com
2. API Keys → Create Key

### 4. Deploy to Netlify

Drag-and-drop the whole folder to https://app.netlify.com/drop

Or use Netlify CLI:
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=.
```

---

## 📁 File Structure

```
noctyra-music/
├── index.html          # App shell, all views, modals
├── style.css           # Complete styles (dark glassmorphism)
└── js/
    ├── config.js       # API keys & constants  ← EDIT THIS
    ├── player.js       # YouTube IFrame API, queue, controls
    ├── search.js       # YouTube search, smart query, cache
    ├── playlist.js     # Playlist CRUD, localStorage
    ├── ai.js           # Claude AI playlist generator
    └── app.js          # Navigation, home, init
```

---

## 🔑 Features

| Feature | Description |
|---|---|
| 🎵 Player | Play/pause, next/prev, progress bar seek |
| 🔍 Search | Debounced YouTube search with smart query transform |
| 📋 Playlists | Create, add/remove songs, save to localStorage |
| 🤖 AI Playlist | Describe mood → Claude generates songs → auto-search YouTube |
| ✨ AI Recommend | Get song recommendations with one-click search |
| 📱 Mobile | Bottom nav, touch-friendly controls |

---

## 🧠 Smart Query Transform

The search automatically optimizes your query:

| Input | → YouTube Query |
|---|---|
| `lagu indo galau` | `lagu indo galau official audio` |
| `anime sad ost` | `anime sad ost official audio` |
| `kpop hits` | `kpop hits official mv` |
| `lofi study` | `lofi study music` |
| `Coldplay` | `Coldplay official audio` |

---

## ⚠️ Notes

- **API keys are exposed** in client-side JS. For production, proxy requests through a backend.
- YouTube API v3 has a **daily quota** (10,000 units/day free). Each search costs ~100 units.
- Claude API calls are billed per token.
- The YouTube IFrame player requires an internet connection to stream.
