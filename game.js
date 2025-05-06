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
    { src: 'assets/photo1.jpg', title: 'Project A', artist: 'Artist 1', link: 'https://example.com/A' },
    { src: 'assets/photo2.jpg', title: 'Project B', artist: 'Artist 2', link: 'https://example.com/B' },
    { src: 'assets/photo3.jpg', title: 'Project C', artist: 'Artist 3', link: 'https://example.com/C' },
  ];

  const loaded = IMAGES.map(item => {
    const img = new Image();
    img.src = item.src;
    img.onerror = () => console.error('Failed to load', item.src);
    return img;
  });

  function preloadAll(images) {
    return Promise.all(
      images.map(img => new Promise(res => { img.onload = img.onerror = res; }))
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
      if (tImg) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(tImg, target.x, target.y, S, S);
        ctx.globalAlpha = 1;
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
    if (tImg) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    }
    snakePos.forEach((pos, i) => {
      const img = loaded[snakeImg[i]];
      if (img) ctx.drawImage(img, pos.x, pos.y, S, S);
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
  }

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x >= target.x && x < target.x + S && y >= target.y && y < target.y + S) {
      const embed = document.getElementById('spotify-embed');
      const container = document.getElementById('spotify-embed-container');
      embed.src = `https://open.spotify.com/embed/track/3n3Ppam7vgaVa1iaRUc9Lp?utm_source=generator&theme=0`;
      container.style.display = 'block';
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
      for (let i = 0; i < snakePos.length; i++) {
        const p = snakePos[i];
        if (x >= p.x && x < p.x + S && y >= p.y && y < p.y + S) {
          const md = IMAGES[snakeImg[i]];
          info.textContent = `${md.title} — ${md.artist}`;
          over = true;
          break;
        }
      }
      canvas.style.cursor = over ? 'default' : 'default';
    }

    if (!over) info.textContent = '';
  });

  canvas.addEventListener('touchstart', () => {
    setTimeout(() => {
      info.textContent = '';
    }, 1500);
  });

  preloadAll(loaded).then(start);
});
