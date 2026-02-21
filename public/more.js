function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sortPinned(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.item.pinnedOrder)) ? Number(a.item.pinnedOrder) : Number.POSITIVE_INFINITY;
      const orderB = Number.isFinite(Number(b.item.pinnedOrder)) ? Number(b.item.pinnedOrder) : Number.POSITIVE_INFINITY;
      if (orderA !== orderB) return orderA - orderB;
      return a.index - b.index;
    })
    .map(entry => entry.item);
}

function loadSongs() {
  const allSongs = (window.imagesData || []).slice();
  const pinned = sortPinned(allSongs.filter(song => song.pinned));
  const rest = shuffle(allSongs.filter(song => !song.pinned));
  const songs = [...pinned, ...rest];
  const container = document.getElementById('songs');
  songs.forEach(song => {
    const link = document.createElement('a');
    link.href = song.spotifyUrl;
    link.target = '_blank';
    link.rel = 'noopener';
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
