const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://artists.spotify.com/songwriter/1TelBtQMaDF8z4egR19IzG';
  console.log('Scraping songs from Spotify...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const songs = await page.evaluate(() => {
    const rows = document.querySelectorAll('[data-testid="table-row"]');
    return Array.from(rows).map(row => {
      const artwork = row.querySelector('img')?.src || '';
      const title = row.querySelector('[data-testid="entity-title"]')?.textContent.trim() || '';
      const artist = row.querySelector('[data-testid="creator-identifier"]')?.textContent.trim() || '';
      const link = row.querySelector('a')?.href || '';
      return { artwork, title, artist, link };
    });
  });

  await fs.promises.mkdir('public/data', { recursive: true });
  await fs.promises.writeFile('public/data/songs.json', JSON.stringify(songs, null, 2));
  console.log(`Saved ${songs.length} songs to public/data/songs.json`);

  await browser.close();
})();
