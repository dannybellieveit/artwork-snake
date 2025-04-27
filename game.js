// game.js — Snake that keeps eaten images on its tail, with Spotify integration and debug logs

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM ready');

  // —— Canvas Setup ——
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const S      = 50;
  const COLS   = Math.floor(canvas.width  / S);
  const ROWS   = Math.floor(canvas.height / S);

  // —— Spotify Config ——
  const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1EFCSLSz1lSDiP?si=dffe24344bc34c49';
  const SPOTIFY_PLAYLIST_ID  = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];
  const clientId     = 'a4ef7fce60e44760b30f3db53a0ce878';
  const clientSecret = 'aa93345266164ef9a43b5e65c10ae7e2';

  async function fetchSpotifyToken() {
    console.log('Fetching Spotify token…');
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await resp.json();
    console.log('Got token:', access_token ? '✅' : '❌');
    return access_token;
  }

  async function fetchAllPlaylistTracks(playlistId, token) {
    console.log('Fetching playlist tracks…');
    let tracks = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    while (url) {
      const res  = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      const json = await res.json();
      tracks = tracks.concat(json.items);
      url    = json.next;
    }
    console.log(`Fetched ${tracks.length} tracks`);
    return tracks;
  }

  function extractArtworkUrls(tracks) {
    const urls = tracks
      .map(item => item.track?.album?.images?.[0]?.url)
      .filter(u => !!u);
    console.log(`Extracted ${urls.length} artwork URLs`);
    return urls;
  }

  function preloadImages(urls) {
    console.log('Preloading images:', urls.length);
    return Promise.all(
      urls.map(url => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => {
          console.warn('Failed to load image:', url);
          resolve(null);
        };
        img.src     = url;
      }))
    ).then(images => images.filter(img => img));
  }

  async function loadTrackArtworks(playlistId) {
    const token  = await fetchSpotifyToken();
    const tracks = await fetchAllPlaylistTracks(playlistId, token);
    const urls   = extractArtworkUrls(tracks);

    // Preload first 20 for fast start
    const initialUrls   = urls.slice(0, 20);
    console.log('Preloading first batch…');
    const initialImages = await preloadImages(initialUrls);
    console.log(`Loaded initial images: ${initialImages.length}`);

    // Background load the rest
    const remainingUrls = urls.slice(20);
    preloadImages(remainingUrls)
      .then(more => console.log(`Loaded remaining images: ${more.length}`))
      .catch(err => console.warn('Some images failed:', err));

    return initialImages;
  }

  // —— Load Images (Spotify with fallback) ——
  let loadedImages = [];
  try {
    loadedImages = await loadTrackArtworks(SPOTIFY_PLAYLIST_ID);
    console.log('Total loadedImages:', loadedImages.length);
    const preview = document.getElementById('preview-art');
    if (preview && loadedImages.length) {
      preview.src = loadedImages[0].src;
      preview.style.display = 'block';
    }
  } catch (err) {
    console.error('Spotify load failed, falling back to static assets:', err);
    const PHOTO_URLS = ['/assets/photo1.jpg','/assets/photo2.jpg','/assets/photo3.jpg'];
    loadedImages = PHOTO_URLS.map(src => { const img = new Image(); img.src = src; return img; });
    console.log('Using static images, count=', loadedImages.length);
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

    ctx.globalAlpha = 0.8;
    ctx.drawImage(loadedImages[target.img], target.x, target.y, S, S);
    ctx.globalAlpha = 1;

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
