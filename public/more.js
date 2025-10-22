function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadSongs() {
  const allSongs = (window.imagesData || []).slice();
  const pinned = allSongs.filter(song => song.pinned);
  const rest = shuffle(allSongs.filter(song => !song.pinned));
  const songs = [...pinned, ...rest];
  const container = document.getElementById('songs');
  songs.forEach(song => {
    const link = document.createElement('a');
    link.href = song.spotifyUrl;
    link.target = '_blank';
    link.className = 'song-item';

    const img = document.createElement('img');
    img.src = song.src;
    img.alt = `${song.title} by ${song.artist}`;

    const info = document.createElement('div');
    info.className = 'song-info';
    info.textContent = `${song.artist} - ${song.title}`;

    link.appendChild(img);
    link.appendChild(info);
    container.appendChild(link);
  });
  console.log(`Loaded ${songs.length} songs`);
}

document.addEventListener('DOMContentLoaded', loadSongs);
