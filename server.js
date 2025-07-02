const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Node 18+ includes a global fetch API. If you're on an older Node version,
// install `node-fetch` and import it here instead.

// Middleware to parse form data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Enable CORS for all routes without external dependencies
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve the home page to avoid issues if index.html is not
// automatically resolved by express.static
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Simple slugify helper to create filesystem friendly names
 * @param {string} str
 */
function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * POST /add-track
 * Accepts title and artist, fetches artwork and stores data
 */
app.post('/add-track', async (req, res) => {
  const { title, artist } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ message: 'Title and artist are required' });
  }

  try {
    // Build search URL for the artwork finder
    const term = encodeURIComponent(`${title} ${artist}`);
    const searchUrl = `https://bendodson.com/projects/itunes-artwork-finder/search/?term=${term}`;

    // Request the HTML page
    const response = await fetch(searchUrl);
    const html = await response.text();

    // Try to find the first image in the HTML
    let imageUrl = null;
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1].startsWith('http') ? imgMatch[1] : `https:${imgMatch[1]}`;
    }

    const artworkDir = path.join(__dirname, 'artwork');
    // Ensure the artwork directory exists
    if (!fs.existsSync(artworkDir)) {
      fs.mkdirSync(artworkDir, { recursive: true });
    }

    let artworkPath = null;
    if (imageUrl) {
      const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
      const fileName = `${slugify(title)}${ext}`;
      const dest = path.join(artworkDir, fileName);

      const imgResp = await fetch(imageUrl);
      if (imgResp.ok) {
        const buffer = Buffer.from(await imgResp.arrayBuffer());
        fs.writeFileSync(dest, buffer);
        artworkPath = path.join('artwork', fileName);
      }
    }

    // Read or create playlist.json
    const playlistFile = path.join(__dirname, 'playlist.json');
    let playlist = [];
    if (fs.existsSync(playlistFile)) {
      try {
        playlist = JSON.parse(fs.readFileSync(playlistFile, 'utf8'));
      } catch (_) {
        // If the file exists but can't be parsed, start fresh
        playlist = [];
      }
    }
    const track = { title, artist, artwork: artworkPath };
    playlist.push(track);
    fs.writeFileSync(playlistFile, JSON.stringify(playlist, null, 2));

    res.status(201).json({ message: 'Track added', track });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add track' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
