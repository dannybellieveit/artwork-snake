async function loadSongs() {
  try {
    const res = await fetch('public/data/songs.json');
    const songs = await res.json();
    const container = document.getElementById('songs');
    songs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'song-card';

      const img = document.createElement('img');
      img.src = song.artwork;
      img.alt = song.title;

      const title = document.createElement('div');
      title.textContent = song.title;

      const artist = document.createElement('div');
      artist.textContent = song.artist;

      const link = document.createElement('a');
      link.href = song.link;
      link.target = '_blank';
      link.textContent = 'Listen';

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(artist);
      card.appendChild(link);

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load songs', err);
  }
}

document.addEventListener('DOMContentLoaded', loadSongs);
