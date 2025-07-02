async function loadSongs() {
  try {
    const res = await fetch('public/data/songs.json');
    const songs = await res.json();
    const container = document.getElementById('songs');
    songs.forEach(song => {
      const link = document.createElement('a');
      link.href = song.link;
      link.target = '_blank';
      link.className = 'song-item';

      const img = document.createElement('img');
      img.src = song.artwork;
      img.alt = '';

      link.appendChild(img);
      container.appendChild(link);
    });
    console.log(`Loaded ${songs.length} songs`);
  } catch (err) {
    console.error('Failed to load songs', err);
  }
}

document.addEventListener('DOMContentLoaded', loadSongs);
