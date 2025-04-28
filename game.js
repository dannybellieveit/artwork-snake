// game.js — Snake with sequential images, self-collision avoidance until trapped,
// clickable segments, hover info, snake-only flashing death and restart
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
    draw(); // redraw after resizing
  });

  // Image metadata
  const IMAGES = [
    { src: 'assets/photo1.jpg', title: 'Project A', artist: 'Artist 1', link: 'https://example.com/A' },
    { src: 'assets/photo2.jpg', title: 'Project B', artist: 'Artist 2', link: 'https://example.com/B' },
    { src: 'assets/photo3.jpg', title: 'Project C', artist: 'Artist 3', link: 'https://example.com/C' },
    // …add more entries here
  ];

  // Preload images
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

  // Game state
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
    const candidates = [];
    const dx = target.x - head.x, dy = target.y - head.y;
    if (dx > 0) candidates.push({ x: head.x + S, y: head.y });
    if (dx < 0) candidates.push({ x: head.x - S, y: head.y });
    if (dy > 0) candidates.push({ x: head.x,     y: head.y + S });
    if (dy < 0) candidates.push({ x: head.x,     y: head.y - S });
    // Fallback directions
    [{ x: S, y: 0 }, { x: -S, y: 0 }, { x: 0, y: S }, { x: 0, y: -S }]
      .forEach(d => candidates.push({ x: head.x + d.x, y: head.y + d.y }));
    return candidates;
  }

  function moveOneStep() {
    const head = { ...snakePos[0] };
    const candidates = getCandidates(head);
    for (const pos of candidates) {
      if (!snakePos.some(p => p.x === pos.x && p.y === pos.y)) {
        return pos;
      }
    }
    // If all collide, return first to trigger death
    return candidates[0];
  }

  function die() {
    clearInterval(gameInterval);
    let flashes = 0;
    const flashTimer = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw target normally
      const tImg = loaded[target.img];
      if (tImg) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(tImg, target.x, target.y, S, S);
        ctx.globalAlpha = 1;
      }

      // Draw snake flashing
      snakePos.forEach((pos, i) => {
        ctx.fillStyle = (flashes % 2 === 0 ? 'white' : 'red');
        ctx.fillRect(pos.x, pos.y, S, S);
      });

      flashes++;
      if (flashes > 5) {
        clearInterval(flashTimer);
        start();
      }
    }, 100);
  }

  function step() {
    const newHead = moveOneStep();
    // Self-collision
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
    // Draw target
    const tImg = loaded[target.img];
    if (tImg) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    }
    // Draw snake
    snakePos.forEach((pos, i) => {
      const img = loaded[snakeImg[i]];
      if (img) ctx.drawImage(img, pos.x, pos.y, S, S);
    });
  }

  function start() {
    initSnake();
    spawnTarget();
    draw();
    gameInterval = setInterval(step, 400);
  }

  // Click → open link
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top)  * scaleY);
    const cells = [
      ...snakePos.map((p,i) => ({ p, i })),
      { p: target, i: target.img }
    ];
    cells.some(o => {
      if (x >= o.p.x && x < o.p.x + S && y >= o.p.y && y < o.p.y + S) {
        window.open(IMAGES[o.i].link, '_blank');
        return true;
      }
    });
  });

  // Hover → show info
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top)  * scaleY);
    const cells = [
      ...snakePos.map((p,i) => ({ p, i })),
      { p: target, i: target.img }
    ];
    let found = false;
    cells.forEach(o => {
      if (x >= o.p.x && x < o.p.x + S && y >= o.p.y && y < o.p.y + S) {
        const md = IMAGES[o.i];
        info.textContent = `${md.title} — ${md.artist}`;
        found = true;
      }
    });
    if (!found) info.textContent = '';
  });

  // Launch
  preloadAll(loaded).then(start);
});
