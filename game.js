// snake.js

// —————————————————————————————————
// 1) CONFIG: drop your playlist URL/ID here
// —————————————————————————————————
const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1EFCSLSz1lSDiP?si=dffe24344bc34c49';
const SPOTIFY_PLAYLIST_ID  = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];

// —————————————————————————————————
// 2) SPOTIFY AUTH (client-credentials)
// —————————————————————————————————
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

// —————————————————————————————————
// 3) GET ALL TRACKS + EXTRACT ARTWORK
// —————————————————————————————————
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

// —————————————————————————————————
// 4) WRAP IT UP: loadTrackArtworks()
// —————————————————————————————————
async function loadTrackArtworks(playlistId) {
  const token  = await fetchSpotifyToken();
  const tracks = await fetchAllPlaylistTracks(playlistId, token);
  const urls   = extractArtworkUrls(tracks);

  // STEP 1 — Preload the first few images quickly
  const initialUrls   = urls.slice(0, 20);
  const initialImages = await preloadImages(initialUrls);

  // STEP 2 — Background load the rest
  const remainingUrls = urls.slice(20);
  preloadImages(remainingUrls)
    .then(moreImages => {
      initialImages.push(...moreImages);
    })
    .catch(err => console.warn('Some images failed to load:', err));

  return initialImages;
}

// —————————————————————————————————
// 5) SNAKE GAME LOGIC
// —————————————————————————————————
class SnakeGame {
  constructor(canvas, foodSprites) {
    this.ctx         = canvas.getContext('2d');
    this.foodSprites = foodSprites;
    this.snake       = []; // your snake parts
    this.food        = {}; // your food object
    this.running     = false;
  }

  start() {
    this.running = true;
    this.reset();
    this.loop();
  }

  reset() {
    // Reset snake, food, etc
    this.snake = [{ x: 10, y: 10 }];
    this.spawnFood();
  }

  loop() {
    if (!this.running) return;
    // Update game, draw snake, draw food, etc
    requestAnimationFrame(() => this.loop());
  }

  spawnFood() {
    this.food = {
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 20),
      sprite: this.getRandomFoodSprite()
    };
  }

  getRandomFoodSprite() {
    return this.foodSprites[Math.floor(Math.random() * this.foodSprites.length)];
  }

  setFoodSprites(newSprites) {
    this.foodSprites = this.foodSprites.concat(newSprites);
  }

  // Other snake methods like move(), draw(), eat(), etc.
}

// —————————————————————————————————
// 6) BOOTSTRAP ON PAGE LOAD
// —————————————————————————————————
document.addEventListener('DOMContentLoaded', async () => {
  const playlistId = SPOTIFY_PLAYLIST_ID;
  try {
    const artImages = await loadTrackArtworks(playlistId);

    // (Optional) preview first image for sanity:
    const preview = document.getElementById('preview-art');
    if (preview) {
      preview.src = artImages[0].src;
      preview.style.display = 'block';
    }

    const canvas = document.getElementById('gameCanvas');
    const game   = new SnakeGame(canvas, artImages);
    game.start();
  } catch (err) {
    console.error('Error loading Spotify art:', err);
  }
});
