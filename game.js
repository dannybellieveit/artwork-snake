// game.js — Snake that keeps eaten images on its tail, updated for user-auth flow

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM ready');

  // —— Canvas Setup ——
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const S      = 50;
  const COLS   = Math.floor(canvas.width  / S);
  const ROWS   = Math.floor(canvas.height / S);

  // —— User Token Logic ——
  function getUserToken() {
    const token = localStorage.getItem('spotify_token');
    if (!token) {
      alert('Please log in with Spotify first.');
      throw new Error('No Spotify token—please log in.');
    }
    return token;
  }

  async function fetchAllPlaylistTracks(playlistId) {
    console.log('Fetching tracks with user token…');
    const token = getUserToken();
    const resp = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=US&limit=100`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    if (!resp.ok) {
      alert(`Spotify API error: ${resp.status}`);
      throw new Error(`Spotify API ${resp.status}`);
    }
    const json = await resp.json();
    console.log(`Fetched tracks count: ${json.items.length}`);
    return json.items;
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
      urls.map(url => new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src     = url;
      }))
    ).then(imgs => imgs.filter(i => i));
  }

  async function loadTrackArtworks(playlistId) {
    const tracks = await fetchAllPlaylistTracks(playlistId);
    const urls   = extractArtworkUrls(tracks);

    // Fast start: first 20 images
    const initial = await preloadImages(urls.slice(0, 20));
    console.log('Loaded initial images:', initial.length);

    // Background load the rest
    preloadImages(urls.slice(20))
      .then(rest => console.log('Loaded remaining images:', rest.length))
      .catch(err => console.warn('Background load error:', err));

    return initial;
  }

  // —— Load Images or fallback ——
  let loadedImages;
  try {
    const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1EFCSLSz1lSDiP?si=a31a309f679845c8';
    const SPOTIFY_PLAYLIST_ID  = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];
    loadedImages = await loadTrackArtworks(SPOTIFY_PLAYLIST_ID);
    console.log('Total loadedImages:', loadedImages.length);
  } catch (e) {
    console.error('User-auth fetch failed, falling back to static assets:', e);
    const PHOTO_URLS = [
      '/assets/photo1.jpg',
      '/assets/photo2.jpg',
      '/assets/photo3.jpg'
    ];
    loadedImages = PHOTO_URLS.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
    console.log('Using static images, count=', loadedImages.length);
  }

  // —— Snake State & Logic ——
  const rnd = n => Math.floor(Math.random() * n);
  let snakePos = [], snakeImg = [], target = {};

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
    const h = { ...snakePos[0] };
    if      (h.x < target.x) h.x += S;
    else if (h.x > target.x) h.x -= S;
    else if (h.y < target.y) h.y += S;
    else if (h.y > target.y) h.y -= S;
    return h;
  }

  function step() {
    const head = moveOneStep();
    const ate  = head.x === target.x && head.y === target.y;

    snakePos.unshift(head);
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
    const tImg = loadedImages[target.img];
    if (tImg) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    }

    // Draw snake
    snakePos.forEach((p, i) => {
      const sImg = loadedImages[snakeImg[i]];
      if (sImg) ctx.drawImage(sImg, p.x, p.y, S, S);
    });
  }

  // Start the game
  initSnake();
  spawnTarget();
  draw();
  setInterval(step, 400);
});
