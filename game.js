// game.js — Snake chases targets, grows properly, keeps eaten image

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const SQUARE = 50;
  const COLS   = Math.floor(canvas.width  / SQUARE);
  const ROWS   = Math.floor(canvas.height / SQUARE);

  // Your repo-hosted images:
  const PHOTO_URLS = [
    '/assets/1.jpg',
    '/assets/vape.jpg',
    '/assets/cheryl.jpg',
    // …etc
  ];

  // Preload
  const loadedImages = PHOTO_URLS.map(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.error(`Failed to load ${src}`);
    return img;
  });
  function loadAll(imgs) {
    return Promise.all(imgs.map(i => new Promise(r => i.onload = i.onerror = r)));
  }

  const rand = n => Math.floor(Math.random() * n);

  // Initial snake: one segment somewhere
  let snake = [{
    x: rand(COLS) * SQUARE,
    y: rand(ROWS) * SQUARE,
    img: rand(loadedImages.length)
  }];

  let target, lastEatenImg = null;

  function spawnTarget() {
    let x, y;
    do {
      x = rand(COLS) * SQUARE;
      y = rand(ROWS) * SQUARE;
    } while (snake.some(s => s.x === x && s.y === y));
    target = { x, y, img: rand(loadedImages.length) };
  }

  // Step head one tile toward target
  function moveHead() {
    const h = { ...snake[0] };
    if      (h.x < target.x) h.x += SQUARE;
    else if (h.x > target.x) h.x -= SQUARE;
    else if (h.y < target.y) h.y += SQUARE;
    else if (h.y > target.y) h.y -= SQUARE;
    return h;
  }

  function step() {
    const headImg = snake[0].img;            // carry-forward image
    const newHead = moveHead();
    const ate     = (newHead.x === target.x && newHead.y === target.y);

    // 1) add new head
    snake.unshift({ x: newHead.x, y: newHead.y, img: headImg });

    // 2) if we ate, remember this image and respawn; else normal pop
    if (ate) {
      lastEatenImg = target.img;
      spawnTarget();
    } else {
      snake.pop();
    }

    // 3) reapply the last-eaten image to the tail (so it never “falls off”)
    if (lastEatenImg !== null) {
      snake[snake.length - 1].img = lastEatenImg;
    }

    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw target
    ctx.globalAlpha = 0.8;
    ctx.drawImage(loadedImages[target.img], target.x, target.y, SQUARE, SQUARE);
    ctx.globalAlpha = 1;

    // draw snake
    snake.forEach(s => {
      ctx.drawImage(loadedImages[s.img], s.x, s.y, SQUARE, SQUARE);
    });
  }

  // kickoff
  loadAll(loadedImages).then(() => {
    spawnTarget();
    draw();
    setInterval(step, 400);
  });
});
