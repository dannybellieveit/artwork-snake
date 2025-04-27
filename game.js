// snake.js

// 1) CONFIG
const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1EFCSLSz1lSDiP?si=dffe24344bc34c49';
const SPOTIFY_PLAYLIST_ID  = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];

// 2) SPOTIFY AUTH
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

// 3) GET TRACKS + ARTWORK
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

// 4) LOAD TRACK ARTWORKS
async function loadTrackArtworks(playlistId) {
  const token  = await fetchSpotifyToken();
  const tracks = await fetchAllPlaylistTracks(playlistId, token);
  const urls   = extractArtworkUrls(tracks);
  const images = await preloadImages(urls);
  return images;
}

// 5) SNAKE GAME CLASS
class SnakeGame {
  constructor(canvas, foodSprites) {
    this.ctx         = canvas.getContext('2d');
    this.foodSprites = foodSprites;
    // your init...
  }
  setFoodSprites(sprites) {
    this.foodSprites = sprites;
  }
  // rest of your game...
}

// 6) PAGE LOAD
document.addEventListener('DOMContentLoaded', async () => {
  const playlistId = SPOTIFY_PLAYLIST_ID;
  try {
    const artImages = await loadTrackArtworks(playlistId);

    // (Optional) preview first image
    document.getElementById('preview-art').src = artImages[0].src;
    document.getElementById('preview-art').style.display = 'block';

    const canvas = document.getElementById('gameCanvas');
    const game   = new SnakeGame(canvas, artImages);
    game.start();
  } catch (err) {
    console.error('Error loading Spotify art:', err);
  }
});
