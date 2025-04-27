// game.js — Snake that keeps eaten images on its tail, now with Spotify API

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const S = 50;                                 // grid square size
  const COLS = Math.floor(canvas.width  / S);
  const ROWS = Math.floor(canvas.height / S);

  // Config: Spotify Playlist URL/ID
  const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1EFCSLSz1lSDiP?si=dffe24344bc34c49';
  const SPOTIFY_PLAYLIST_ID  = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];

  // Function to fetch Spotify API token
  async function fetchSpotifyToken() {
    const clientId = 'a4ef7fce60e44760b30f3db53a0ce878';
    const clientSecret = 'aa93345266164ef9a43b5e65c10ae7e2';
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

  // Function to fetch all tracks from Spotify Playlist
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

  // Extract album art URLs from tracks
  function extractArtworkUrls(tracks) {
    return tracks
      .map(item => item.track?.album?.images?.[0]?.url)
      .filter(u => !!u);
  }

  // Preload images from URLs
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

  // Loading all artwork URLs from the Spotify Playlist
  async function loadTrackArtworks(playlistId) {
    const token  = await fetchSpotifyToken();
    const tracks = await fetchAllPlaylistTracks(playlistId, token);
    const urls   = extractArtworkUrls(tracks);

    // Preload the first few images quickly
    const initialUrls   = urls.slice(0, 20);
    const initialImages = await preloadImages(initialUrls);

    // Background load the rest
    const remainingUrls = urls.slice(20);
    preloadImages(remainingUrls)
      .then(moreImages => {
        initialImages.push(...moreImages);
      })
      .catch(err => console.warn('Some images failed to load:', err));

    return initialImages;
  }

  // Preload Spotify album art and start game
  const PHOTO_URLS = await loadTrackArtworks(SPOTIFY_PLAYLIST_ID);

  // Preload images
  const loaded = PHOTO_URLS.map(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.error('Load failed:', src);
    return img;
  });
  function preloadAll(arr) {
    return Promise.all(arr.map(im => new Promise(res => im.onload = im.onerror = res)));
  }

  // Utility: random number generator for grid positions
  const rnd = n => Math.floor(Math.random() * n);

  // Snake state: parallel arrays
  let snakePos = [];    // [{x,y},…]
  let snakeImg = [];    // [imgIndex, …]

  // Target state
  let target = { x: 0, y: 0, img: 0 };

  // Initialize Snake
  function initSnake() {
    const startX = rnd(COLS) * S;
    const startY = rnd(ROWS) * S;
    snakePos = [{ x: startX, y: startY }];
    snakeImg = [ rnd(loaded.length) ];
  }

  // Spawn a new target
  function spawnTarget() {
    let x, y;
    do {
      x = rnd(COLS) * S;
      y = rnd(ROWS) * S;
    } while (snakePos.some(p => p.x === x && p.y === y));
    target = { x, y, img: rnd(loaded.length) };
  }

  // Move snake one step
  function moveOneStep() {
    const head = { ...snakePos[0] };
    if      (head.x < target.x) head.x += S;
    else if (head.x > target.x) head.x -= S;
    else if (head.y < target.y) head.y += S;
    else if (head.y > target.y) head.y -= S;
    return head;
  }

  // Update snake and target state
  function step() {
    const newHead = moveOneStep();
    const ate = (newHead.x === target.x && newHead.y === target.y);

    // Shift snake positions
    snakePos.unshift(newHead);
    if (!ate) {
      snakePos.pop(); 
    }

    // Append image on eat
    if (ate) {
      snakeImg.push(target.img);
      spawnTarget();
    }

    // Draw everything
    draw();
  }

  // Draw snake and target
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw target
    ctx.globalAlpha = 0.8;
    ctx.drawImage(loaded[target.img], target.x, target.y, S, S);
    ctx.globalAlpha = 1;

    // Draw snake
    snakePos.forEach((p, i) => {
      const img = loaded[snakeImg[i]];
      ctx.drawImage(img, p.x, p.y, S, S);
    });
  }

  // Start game after preload
  preloadAll(loaded).then(() => {
    initSnake();
    spawnTarget();
    draw();
    setInterval(step, 400);
  });
});
