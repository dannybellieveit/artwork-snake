function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadSongs() {
  const songs = shuffle((window.imagesData || []).slice());
  const container = document.getElementById('songs');

  if (!container) {
    return;
  }

  songs.forEach(song => {
    const link = document.createElement('a');
    link.href = song.spotifyUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'song-item';
    link.setAttribute('role', 'listitem');
    link.setAttribute('aria-label', `${song.title} by ${song.artist}`);

    const img = document.createElement('img');
    img.src = song.src;
    img.alt = `${song.title} by ${song.artist}`;
    img.loading = 'lazy';

    const info = document.createElement('div');
    info.className = 'song-info';
    info.textContent = `${song.artist} — ${song.title}`;

    link.appendChild(img);
    link.appendChild(info);
    container.appendChild(link);
  });

  console.log(`Loaded ${songs.length} songs`);
}

document.addEventListener('DOMContentLoaded', loadSongs);
