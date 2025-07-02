function loadSongs() {
  const songs = window.imagesData || [];
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
