const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

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
    if (!fs.existsSync(artworkDir)) {
      fs.mkdirSync(artworkDir);
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
      playlist = JSON.parse(fs.readFileSync(playlistFile));
    }
    const track = { title, artist, artwork: artworkPath };
    playlist.push(track);
    fs.writeFileSync(playlistFile, JSON.stringify(playlist, null, 2));

    res.json({ message: 'Track added', track });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add track' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
