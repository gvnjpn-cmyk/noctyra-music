// ============================================================
// NOCTYRA MUSIC — PLAYER MODULE
// Handles YouTube IFrame API, queue, playback controls
// ============================================================

const Player = (() => {
  // ── Internal State ───────────────────────────────────────
  let ytPlayer = null;
  let ytReady = false;
  let progressInterval = null;
  let isDragging = false;

  // Queue state
  const queue = [];
  let queueIndex = -1;
  let isPlaying = false;

  // ── DOM References ───────────────────────────────────────
  const dom = {
    get title()    { return document.getElementById('player-title'); },
    get artist()   { return document.getElementById('player-artist'); },
    get thumb()    { return document.getElementById('player-thumb'); },
    get btnPlay()  { return document.getElementById('btn-play'); },
    get btnPrev()  { return document.getElementById('btn-prev'); },
    get btnNext()  { return document.getElementById('btn-next'); },
    // Legacy refs (kept as no-op if elements removed)
    get progress() { return document.getElementById('progress-bar'); },
    get fill()     { return document.getElementById('progress-fill'); },
    get current()  { return document.getElementById('time-current'); },
    get duration() { return document.getElementById('time-duration'); },
    get bar()      { return document.getElementById('player-bar'); },
  };

  // ── YouTube IFrame API Init ──────────────────────────────
  // Called by YouTube API script via window.onYouTubeIframeAPIReady
  function initYT() {
    ytPlayer = new YT.Player('yt-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady:       onPlayerReady,
        onStateChange: onStateChange,
        onError:       onError,
      },
    });
  }

  function onPlayerReady() {
    ytReady = true;
    window._ytPlayer = ytPlayer; // expose for FullPlayer seek
    console.log('[Player] YouTube IFrame ready');
  }

  function onStateChange(e) {
    switch (e.data) {
      case YT.PlayerState.PLAYING:
        isPlaying = true;
        updatePlayBtn(true);
        if (typeof FullPlayer !== 'undefined') FullPlayer.updatePlayState(true);
        startProgressInterval();
        App.updateBodyPlayState(true);
        break;

      case YT.PlayerState.PAUSED:
        isPlaying = false;
        updatePlayBtn(false);
        if (typeof FullPlayer !== 'undefined') FullPlayer.updatePlayState(false);
        stopProgressInterval();
        App.updateBodyPlayState(false);
        break;

      case YT.PlayerState.ENDED:
        isPlaying = false;
        stopProgressInterval();
        next();
        break;

      case YT.PlayerState.BUFFERING:
        break;
    }
  }

  function onError(e) {
    console.warn('[Player] YouTube error:', e.data);
    // On error, skip to next song
    setTimeout(() => next(), 1000);
  }

  // ── Play a Song ──────────────────────────────────────────
  function playSong(song) {
    if (!ytReady) {
      console.warn('[Player] YouTube not ready yet');
      return;
    }

    // Update mini player bar UI
    dom.bar.classList.add('active');
    dom.title.textContent  = song.title;
    dom.artist.textContent = song.channel;
    dom.thumb.src          = song.thumbnail;
    dom.thumb.alt          = song.title;

    // Sync fullscreen player
    if (typeof FullPlayer !== 'undefined') FullPlayer.syncSong(song);

    // Load and play video
    ytPlayer.loadVideoById(song.videoId);

    // Save to history
    History.add(song);

    // Highlight active song in lists
    document.querySelectorAll('.song-card').forEach(card => {
      card.classList.toggle('playing', card.dataset.videoId === song.videoId);
    });
  }

  // ── Queue Management ─────────────────────────────────────
  function setQueue(songs, startIndex = 0) {
    queue.length = 0;
    queue.push(...songs);
    queueIndex = startIndex;
    playSong(queue[queueIndex]);
  }

  function next() {
    if (queue.length === 0) return;
    queueIndex = (queueIndex + 1) % queue.length;
    playSong(queue[queueIndex]);
  }

  function prev() {
    if (queue.length === 0) return;
    // If past 3 seconds, restart current. Otherwise go back.
    if (ytPlayer && ytPlayer.getCurrentTime() > 3) {
      ytPlayer.seekTo(0);
      return;
    }
    queueIndex = (queueIndex - 1 + queue.length) % queue.length;
    playSong(queue[queueIndex]);
  }

  function togglePlay() {
    if (!ytReady || queueIndex < 0) return;
    if (isPlaying) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  }

  // ── Progress Bar ─────────────────────────────────────────
  function startProgressInterval() {
    stopProgressInterval();
    progressInterval = setInterval(updateProgress, 500);
  }

  function stopProgressInterval() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function updateProgress() {
    if (!ytPlayer || isDragging) return;
    try {
      const current  = ytPlayer.getCurrentTime() || 0;
      const duration = ytPlayer.getDuration()    || 0;
      if (duration > 0) {
        const pct = (current / duration) * 100;
        dom.fill.style.width         = pct + '%';
        dom.current.textContent      = formatTime(current);
        dom.duration.textContent     = formatTime(duration);
        dom.progress.setAttribute('aria-valuenow', Math.round(pct));
        // Sync fullscreen player
        if (typeof FullPlayer !== 'undefined') {
          FullPlayer.updateProgress(pct, formatTime(current), formatTime(duration));
        }
      }
    } catch (_) { /* YT not ready */ }
  }

  // Seek on progress bar click/drag
  function initProgressBar() {
    const bar = dom.progress;
    if (!bar) return;

    function seekTo(e) {
      const rect = bar.getBoundingClientRect();
      const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const pct  = Math.max(0, Math.min(1, x / rect.width));
      dom.fill.style.width = (pct * 100) + '%';
      if (ytPlayer && ytReady) {
        const duration = ytPlayer.getDuration() || 0;
        ytPlayer.seekTo(pct * duration, true);
      }
    }

    bar.addEventListener('mousedown',  (e) => { isDragging = true; seekTo(e); });
    bar.addEventListener('touchstart', (e) => { isDragging = true; seekTo(e); }, { passive: true });
    window.addEventListener('mousemove', (e) => { if (isDragging) seekTo(e); });
    window.addEventListener('touchmove', (e) => { if (isDragging) seekTo(e); }, { passive: true });
    window.addEventListener('mouseup',   () => { isDragging = false; });
    window.addEventListener('touchend',  () => { isDragging = false; });
  }

  // ── Helpers ──────────────────────────────────────────────
  function formatTime(secs) {
    secs = Math.floor(secs) || 0;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updatePlayBtn(playing) {
    const btn = dom.btnPlay;
    if (!btn) return;
    btn.innerHTML = playing
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    // Bind control buttons
    document.getElementById('btn-play')?.addEventListener('click', togglePlay);
    document.getElementById('btn-prev')?.addEventListener('click', prev);
    document.getElementById('btn-next')?.addEventListener('click', next);
    initProgressBar();
  }

  // ── Expose Public API ────────────────────────────────────
  return {
    init,
    initYT,
    setQueue,
    playSong,
    next,
    prev,
    togglePlay,
    getQueue:  () => [...queue],
    getIndex:  () => queueIndex,
    isPlaying: () => isPlaying,
  };
})();

// Called by YouTube IFrame API script when it's ready
window.onYouTubeIframeAPIReady = () => Player.initYT();
