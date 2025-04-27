// game.js — Snake with sequential images, self-collision avoidance until trapped, flashing death and restart

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const S      = 50;
  const COLS   = Math.floor(canvas.width / S);
  const ROWS   = Math.floor(canvas.height / S);

  // Image metadata
  const IMAGES = [
    { src: 'assets/photo1.jpg', title: 'Project A', artist: 'Artist 1', link: 'https://example.com/A' },
    { src: 'assets/photo2.jpg', title: 'Project B', artist: 'Artist 2', link: 'https://example.com/B' },
    { src: 'assets/photo3.jpg', title: 'Project C', artist: 'Artist 3', link: 'https://example.com/C' },
    // …add more as needed
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
  let snakePos = [];
  let snakeImg = [];
  let target   = {};
  let nextPhotoIndex = 0;
  let gameInterval = null;

  // Initialize snake
  function initSnake() {
    snakePos = [{
      x: Math.floor(Math.random() * COLS) * S,
      y: Math.floor(Math.random() * ROWS) * S
    }];
    snakeImg = [0];
    nextPhotoIndex = 1;
  }

  // Spawn target sequentially
  function spawnTarget() {
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS) * S;
      y = Math.floor(Math.random() * ROWS) * S;
    } while (snakePos.some(p => p.x === x && p.y === y));
    target = { x, y, img: nextPhotoIndex };
    nextPhotoIndex = (nextPhotoIndex + 1) % loaded.length;
  }

  // Generate candidate moves toward target, then fallback moves
  function getCandidates(head) {
    const candidates = [];
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    if (dx > 0) candidates.push({ x: head.x + S, y: head.y });
    if (dx < 0) candidates.push({ x: head.x - S, y: head.y });
    if (dy > 0) candidates.push({ x: head.x, y: head.y + S });
    if (dy < 0) candidates.push({ x: head.x, y: head.y - S });
    // Fallback: all directions
    [{ x: S, y: 0 }, { x: -S, y: 0 }, { x: 0, y: S }, { x: 0, y: -S }]
      .forEach(d => candidates.push({ x: head.x + d.x, y: head.y + d.y }));
    return candidates;
  }

  // Move head, avoiding self if possible
  function moveOneStep() {
    const head = { ...snakePos[0] };
    const candidates = getCandidates(head);
    for (const pos of candidates) {
      if (!snakePos.some(p => p.x === pos.x && p.y === pos.y)) {
        return pos;
      }
    }
    // If all moves collide, return first to trigger death
    return candidates[0];
  }

  // Handle death: flash then restart
  function die() {
    clearInterval(gameInterval);
    let flashes = 0;
    const flashTimer = setInterval(() => {
      ctx.fillStyle = flashes % 2 === 0 ? 'white' : 'red';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (++flashes > 5) {
        clearInterval(flashTimer);
        start();
      }
    }, 100);
  }

  // Game step
  function step() {
    const newHead = moveOneStep();
    // Self-collision check
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

  // Draw everything
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw target
    const tImg = loaded[target.img];
    if (tImg) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    }
    // Draw snake segments
    snakePos.forEach((pos, i) => {
      const img = loaded[snakeImg[i]];
      if (img) ctx.drawImage(img, pos.x, pos.y, S, S);
    });
  }

  // Start or restart the game
  function start() {
    initSnake();
    spawnTarget();
    draw();
    gameInterval = setInterval(step, 400);
  }

  // Launch after images preload
  preloadAll(loaded).then(start);
});
