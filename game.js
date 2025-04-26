// game.js — Snake that keeps eaten images on its tail

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const S = 50;                                 // grid square
  const COLS = Math.floor(canvas.width  / S);
  const ROWS = Math.floor(canvas.height / S);

  // Update these to match your filenames:
  const PHOTO_URLS = [
    '/assets/1.jpg',
    '/assets/cheryl.jpg',
    '/assets/vape.jpg',
    // …etc
  ];

  // Preload images
  const loaded = PHOTO_URLS.map(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.error('Load failed:', src);
    return img;
  });
  function preloadAll(arr) {
    return Promise.all(arr.map(im => new Promise(res => im.onload = im.onerror = res)));
  }

  // Utility
  const rnd = n => Math.floor(Math.random() * n);

  // Snake state: parallel arrays
  let snakePos = [];    // [{x,y},…]
  let snakeImg = [];    // [imgIndex, …]

  // Target state
  let target = { x: 0, y: 0, img: 0 };

  function initSnake() {
    const startX = rnd(COLS) * S;
    const startY = rnd(ROWS) * S;
    snakePos = [{ x: startX, y: startY }];
    snakeImg = [ rnd(loaded.length) ];
  }

  function spawnTarget() {
    let x, y;
    do {
      x = rnd(COLS) * S;
      y = rnd(ROWS) * S;
    } while (snakePos.some(p => p.x === x && p.y === y));
    target = { x, y, img: rnd(loaded.length) };
  }

  function moveOneStep() {
    const head = { ...snakePos[0] };
    if      (head.x < target.x) head.x += S;
    else if (head.x > target.x) head.x -= S;
    else if (head.y < target.y) head.y += S;
    else if (head.y > target.y) head.y -= S;
    return head;
  }

  function step() {
    const newHead = moveOneStep();
    const ate = (newHead.x === target.x && newHead.y === target.y);

    // 1) shift positions
    snakePos.unshift(newHead);
    if (!ate) {
      snakePos.pop(); 
    }

    // 2) append image on eat
    if (ate) {
      snakeImg.push(target.img);
      spawnTarget();
    }

    // 3) keep snakeImg length synced to snakePos
    if (!ate) {
      snakeImg = snakeImg; // no-op, we only grow on eat
    }

    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw target
    ctx.globalAlpha = 0.8;
    ctx.drawImage(loaded[target.img], target.x, target.y, S, S);
    ctx.globalAlpha = 1;

    // draw snake
    snakePos.forEach((p, i) => {
      const img = loaded[snakeImg[i]];
      ctx.drawImage(img, p.x, p.y, S, S);
    });
  }

  // start
  preloadAll(loaded).then(() => {
    initSnake();
    spawnTarget();
    draw();
    setInterval(step, 400);
  });
});
