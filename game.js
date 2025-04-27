// game.js — Snake that keeps eaten images on its tail, with Spotify integration via Worker

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM ready');

  // —— Canvas Setup ——
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const S      = 50;
  const COLS   = Math.floor(canvas.width  / S);
  const ROWS   = Math.floor(canvas.height / S);

  // —— Worker Config ——
  const WORKER_BASE         = 'https://proud-cherry-9c55.6wbqhmqd8b.workers.dev';
  const SPOTIFY_PLAYLIST_ID = '37i9dQZF1EFCSLSz1lSDiP';

  // Fetch token from Worker
  async function fetchSpotifyToken() {
    console.log('Fetching token via Worker…');
    const resp = await fetch(`${WORKER_BASE}/spotify-token`, { method: 'GET' });
    const json = await resp.json();
    console.log('Got token:', json.access_token ? '✅' : '❌', json.error ? json.error : '');
    return json.access_token;
  }

  // Fetch tracks from Worker
  async function fetchAllPlaylistTracks(playlistId) {
    console.log('Fetching tracks via Worker…');
    const resp = await fetch(`${WORKER_BASE}/spotify-tracks?id=${playlistId}`, { method: 'GET' });
    const json = await resp.json();
    if (json.error) {
      console.error('Worker error:', json.error);
      return [];
    }
    console.log(`Fetched tracks count:`, json.items?.length);
    return json.items || [];
  }

  // Extract URLs
  function extractArtworkUrls(tracks) {
    const urls = tracks
      .map(item => item.track?.album?.images?.[0]?.url)
      .filter(u => !!u);
    console.log(`Extracted ${urls.length} artwork URLs`);
    return urls;
  }

  // Preload images
  function preloadImages(urls) {
    console.log('Preloading images:', urls.length);
    return Promise.all(
      urls.map(url => new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src     = url;
      }))
    ).then(imgs => imgs.filter(i => i));
  }

  // Load Spotify art (initial + background)
  async function loadTrackArtworks(playlistId) {
    const tracks = await fetchAllPlaylistTracks(playlistId);
    const urls   = extractArtworkUrls(tracks);

    // Fast start: first 20
    const initial = await preloadImages(urls.slice(0, 20));
    console.log('Loaded initial images:', initial.length);

    // Background load rest
    preloadImages(urls.slice(20))
      .then(rest => console.log('Loaded remaining images:', rest.length))
      .catch(err => console.warn('Background load error:', err));

    return initial;
  }

  // —— Load or fallback ——
  let loadedImages;
  try {
    loadedImages = await loadTrackArtworks(SPOTIFY_PLAYLIST_ID);
    console.log('Total loadedImages:', loadedImages.length);
  } catch (e) {
    console.error('Worker fetch failed, falling back to static assets:', e);
    const PHOTO_URLS = ['/assets/photo1.jpg','/assets/photo2.jpg','/assets/photo3.jpg'];
    loadedImages = PHOTO_URLS.map(src => { const img = new Image(); img.src = src; return img; });
    console.log('Using static images, count=', loadedImages.length);
  }

  // —— Snake State & Logic ——
  const rnd = n => Math.floor(Math.random() * n);
  let snakePos = [], snakeImg = [], target = {};

  function initSnake() {
    snakePos = [{ x: rnd(COLS)*S, y: rnd(ROWS)*S }];
    snakeImg = [rnd(loadedImages.length)];
  }

  function spawnTarget() {
    let x, y;
    do {
      x = rnd(COLS)*S; 
      y = rnd(ROWS)*S;
    } while (snakePos.some(p => p.x===x && p.y===y));
    target = { x, y, img: rnd(loadedImages.length) };
  }

  function moveOneStep() {
    const h = { ...snakePos[0] };
    if      (h.x < target.x) h.x += S;
    else if (h.x > target.x) h.x -= S;
    else if (h.y < target.y) h.y += S;
    else if (h.y > target.y) h.y -= S;
    return h;
  }

  function step() {
    const head = moveOneStep();
    const ate  = head.x===target.x && head.y===target.y;

    snakePos.unshift(head);
    if (!ate) snakePos.pop();
    else {
      snakeImg.push(target.img);
      spawnTarget();
    }

    draw();
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Draw target if loaded
    const tImg = loadedImages[target.img];
    if (tImg) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    }

    // Draw snake
    snakePos.forEach((p,i) => {
      const sImg = loadedImages[snakeImg[i]];
      if (sImg) {
        ctx.drawImage(sImg, p.x, p.y, S, S);
      }
    });
  }

  // Start
  initSnake();
  spawnTarget();
  draw();
  setInterval(step, 400);
});
