// game.js — Snake with sequential images, self-collision avoidance until trapped,
// clickable segments, snake-only flashing death and restart
// now with responsive resizing to keep images square on mobile

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const info   = document.getElementById('info-box');
  const S      = 50;
  let COLS, ROWS;

  function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    COLS = Math.floor(canvas.width / S);
    ROWS = Math.floor(canvas.height / S);
  }

  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
  });

  const IMAGES = [
    {
      src: 'assets/photo1.jpg',
      title: 'Verbathim',
      artist: 'Nemahsis',
      spotifyUrl: 'https://open.spotify.com/album/6aLc5t3mdbmonoCZMAnZ7N?si=kf-sDHxGT_qNrv2ax59iPw'
    },
    {
      src: 'assets/photo2.jpg',
      title: 'TV Show',
      artist: 'Katie Gregson-MacLeod',
      spotifyUrl: 'https://open.spotify.com/track/0hQZyBWcYejAzb9WYM96pr?si=866aa6756cb24293'
    },
    {
      src: 'assets/photo3.jpg',
      title: 'Project C',
      artist: 'Artist 3',
      spotifyUrl: 'https://open.spotify.com/track/5CtI0qwDJkDQGwXD1H1cLb'
    },
    {
      src: 'assets/photo4.jpg',
      title: 'Project D',
      artist: 'Artist 4',
      spotifyUrl: 'https://open.spotify.com/track/7GhIk7Il098yCjg4BQjzvb'
    },
    {
      src: 'assets/photo5.jpg',
      title: 'Project E',
      artist: 'Artist 5',
      spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
    },
    {
      src: 'assets/photo6.jpg',
      title: 'Project F',
      artist: 'Artist 6',
      spotifyUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    },
    {
      src: 'assets/photo7.jpg',
      title: 'Project G',
      artist: 'Artist 7',
      spotifyUrl: 'https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M'
    },
    {
      src: 'assets/photo8.jpg',
      title: 'Project H',
      artist: 'Artist 8',
      spotifyUrl: 'https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb'
    },
    {
      src: 'assets/photo9.jpg',
      title: 'Project I',
      artist: 'Artist 9',
      spotifyUrl: 'https://open.spotify.com/track/1CkvWZme3pRgbzaxZnTl5X'
    }
  ];

  const loaded = IMAGES.map(item => {
    const img = new Image();
    img.src = item.src;
    return img;
});

  function preloadAll(images) {
    return Promise.all(
      images.map(img => new Promise(res => {
        img.onload = res;
        img.onerror = () => {
          console.error('Image failed to load:', img.src);
          res();
        };
      }))
    );
  }

  let snakePos = [], snakeImg = [], target = {}, nextPhotoIndex = 0, gameInterval = null;

  function initSnake() {
    snakePos = [{
      x: Math.floor(Math.random() * COLS) * S,
      y: Math.floor(Math.random() * ROWS) * S
    }];
    snakeImg = [0];
    nextPhotoIndex = 1;
  }

  function spawnTarget() {
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS) * S;
      y = Math.floor(Math.random() * ROWS) * S;
    } while (snakePos.some(p => p.x === x && p.y === y));
    target = { x, y, img: nextPhotoIndex };
    nextPhotoIndex = (nextPhotoIndex + 1) % loaded.length;
  }

  function getCandidates(head) {
    const dirs = [
      { x:  S, y: 0 },
      { x: -S, y: 0 },
      { x: 0,  y: S },
      { x: 0,  y: -S }
    ];

    dirs.sort((a, b) => {
      const distA = Math.abs((head.x + a.x) - target.x) + Math.abs((head.y + a.y) - target.y);
      const distB = Math.abs((head.x + b.x) - target.x) + Math.abs((head.y + b.y) - target.y);
      return distA - distB;
    });

    return dirs
      .map(d => ({ x: head.x + d.x, y: head.y + d.y }))
      .filter(p =>
        p.x >= 0 && p.x < COLS * S &&
        p.y >= 0 && p.y < ROWS * S &&
        !snakePos.some(s => s.x === p.x && s.y === p.y)
      );
  }

  function moveOneStep() {
    const head = { ...snakePos[0] };
    const candidates = getCandidates(head);
    if (candidates.length === 0) {
      die();
      return head;
    }
    return candidates[0];
  }

  function die() {
    clearInterval(gameInterval);
    let flashes = 0;
    const flashTimer = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const tImg = loaded[target.img];
      if (tImg && tImg.complete && tImg.naturalWidth !== 0) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(target.x, target.y, S, S);
    }
      snakePos.forEach(pos => {
        ctx.fillStyle = (flashes % 2 === 0 ? 'white' : 'red');
        ctx.fillRect(pos.x, pos.y, S, S);
      });
      flashes++;
      if (flashes > 5) {
        clearInterval(flashTimer);
        clearInterval(gameInterval);
        start();
      }
    }, 100);
  }

  function step() {
    const newHead = moveOneStep();
    if (snakePos.some(p => p.x === newHead.x && p.y === newHead.y)) {
      return die();
    }
    const ate = newHead.x === target.x && newHead.y === target.y;
    snakePos.unshift(newHead);
    if (!ate) {
      snakePos.pop();
    } else {
      snakeImg.push(target.img);
      spawnTarget();
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tImg = loaded[target.img];
    if (tImg && tImg.complete && tImg.naturalWidth !== 0) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(target.x, target.y, S, S);
    }
    snakePos.forEach((pos, i) => {
      const img = loaded[snakeImg[i]];
      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, pos.x, pos.y, S, S);
      } else {
        ctx.fillStyle = '#ccc';
        ctx.fillRect(pos.x, pos.y, S, S);
      }
    });
  }

  function start() {
    initSnake();
    spawnTarget();
    draw();
    const maxSpeedup = 8; // cap at 8x speed (50ms interval)
    start.speedup = (start.speedup || 1) + 1;
    if (start.speedup > maxSpeedup) {
      start.speedup = 1; // reset after final death
    }
    const interval = Math.max(50, 400 / start.speedup);
    gameInterval = setInterval(step, interval);
  }
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x >= target.x && x < target.x + S && y >= target.y && y < target.y + S) {
      const md = IMAGES[target.img];
      const embed = document.getElementById('spotify-embed');
      const container = document.getElementById('spotify-embed-container');
      const match = md.spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
      if (match) {
        const trackId = match[1];
        embed.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&autoplay=1&theme=0`;
        container.style.display = 'block';
      }
    }
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    let over = false;

    if (x >= target.x && x < target.x + S && y >= target.y && y < target.y + S) {
      const md = IMAGES[target.img];
      info.textContent = `${md.title} — ${md.artist}`;
      canvas.style.cursor = 'pointer';
      over = true;
    } else {
      canvas.style.cursor = 'default';
    }

    if (!over) info.textContent = '';

    if (!over) info.textContent = '';
  });

  canvas.addEventListener('touchstart', () => {
    setTimeout(() => {
      info.textContent = '';
    }, 1500);
  });

  preloadAll(loaded).then(start);
});
