// game.js — Snake that keeps eaten images on its tail, with Spotify integration

document.addEventListener('DOMContentLoaded', async () => {
  // —— Canvas Setup ——
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const S      = 50;                                 // grid square size
  const COLS   = Math.floor(canvas.width  / S);
  const ROWS   = Math.floor(canvas.height / S);

  // —— Spotify Config ——
  const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1EFCSLSz1lSDiP?si=dffe24344bc34c49';
  const SPOTIFY_PLAYLIST_ID  = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];
  const clientId     = 'a4ef7fce60e44760b30f3db53a0ce878';
  const clientSecret = 'aa93345266164ef9a43b5e65c10ae7e2';

  async function fetchSpotifyToken() {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await resp.json();
    return access_token;
  }

  async function fetchAllPlaylistTracks(playlistId, token) {
    let tracks = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    while (url) {
      const res  = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      const json = await res.json();
      tracks = tracks.concat(json.items);
      url    = json.next;
    }
    return tracks;
  }

  function extractArtworkUrls(tracks) {
    return tracks
      .map(item => item.track?.album?.images?.[0]?.url)
      .filter(u => !!u);
  }

  function preloadImages(urls) {
    return Promise.all(
      urls.map(url => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src     = url;
      }))
    );
  }

  async function loadTrackArtworks(playlistId) {
    const token  = await fetchSpotifyToken();
    const tracks = await fetchAllPlaylistTracks(playlistId, token);
    const urls   = extractArtworkUrls(tracks);

    // Preload first 20 for a fast start
    const initialImages = await preloadImages(urls.slice(0, 20));
    // Background load the rest
    preloadImages(urls.slice(20))
      .then(more => initialImages.push(...more))
      .catch(err => console.warn('Some images failed:', err));

    return initialImages;
  }

  // —— Load Images (Spotify with fallback) ——
  let loadedImages = [];
  try {
    loadedImages = await loadTrackArtworks(SPOTIFY_PLAYLIST_ID);
    // Show preview if needed
    const preview = document.getElementById('preview-art');
    if (preview && loadedImages.length) {
      preview.src = loadedImages[0].src;
      preview.style.display = 'block';
    }
  } catch (err) {
    console.error('Spotify load failed, falling back to static assets:', err);
    // Fallback static images
    const PHOTO_URLS = [
      '/assets/photo1.jpg',
      '/assets/photo2.jpg',
      '/assets/photo3.jpg',
    ];
    loadedImages = PHOTO_URLS.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }

  // —— Snake Game State ——
  const rnd = n => Math.floor(Math.random() * n);
  let snakePos = [];
  let snakeImg = [];
  let target   = { x: 0, y: 0, img: 0 };

  function initSnake() {
    snakePos = [{ x: rnd(COLS) * S, y: rnd(ROWS) * S }];
    snakeImg = [rnd(loadedImages.length)];
  }

  function spawnTarget() {
    let x, y;
    do {
      x = rnd(COLS) * S;
      y = rnd(ROWS) * S;
    } while (snakePos.some(p => p.x === x && p.y === y));
    target = { x, y, img: rnd(loadedImages.length) };
  }

  function moveOneStep() {
    const head = { ...snakePos[0] };
    if      (head.x < target.x) head.x += S;
    else if (head.x > target.x) head.x -= S;
    else if (head.y < target.y) head.y += S;
    else if (head.y > target.y) head.y -= S;
    return head;
  }

  function step() {
    const newHead = moveOneStep();
    const ate = (newHead.x === target.x && newHead.y === target.y);

    snakePos.unshift(newHead);
    if (!ate) snakePos.pop();
    else {
      snakeImg.push(target.img);
      spawnTarget();
    }

    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw target
    ctx.globalAlpha = 0.8;
    ctx.drawImage(loadedImages[target.img], target.x, target.y, S, S);
    ctx.globalAlpha = 1;

    // Draw snake
    snakePos.forEach((p, i) => {
      ctx.drawImage(loadedImages[snakeImg[i]], p.x, p.y, S, S);
    });
  }

  // —— Start Game ——  
  initSnake();
  spawnTarget();
  draw();
  setInterval(step, 400);
});
