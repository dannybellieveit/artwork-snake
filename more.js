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
  songs.forEach(song => {
    const link = document.createElement('a');
    link.href = song.spotifyUrl;
    link.target = '_blank';
    link.className = 'song-item';

    const img = document.createElement('img');
    img.src = song.src;
    img.alt = '';

    link.appendChild(img);
    container.appendChild(link);
  });
  console.log(`Loaded ${songs.length} songs`);
}

document.addEventListener('DOMContentLoaded', loadSongs);
