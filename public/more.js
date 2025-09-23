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
    link.className = 'credit-card';
    link.setAttribute('role', 'listitem');
    link.setAttribute('aria-label', `${song.title} by ${song.artist}`);

    const image = document.createElement('img');
    image.className = 'credit-art';
    image.src = song.src;
    image.alt = `${song.title} by ${song.artist}`;
    image.loading = 'lazy';

    const info = document.createElement('div');
    info.className = 'credit-info';

    const artist = document.createElement('p');
    artist.className = 'credit-artist';
    artist.textContent = song.artist;

    const title = document.createElement('h3');
    title.className = 'credit-title';
    title.textContent = song.title;

    info.appendChild(artist);
    info.appendChild(title);

    link.appendChild(image);
    link.appendChild(info);

    container.appendChild(link);
  });
}

document.addEventListener('DOMContentLoaded', loadSongs);
