// game.js — Snake that keeps eaten images on its tail (static assets)

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const S    = 50;                              // grid square size
  const COLS = Math.floor(canvas.width  / S);
  const ROWS = Math.floor(canvas.height / S);

  // UPDATE THESE to point at your stored images:
  const PHOTO_URLS = [
    '/assets/photo1.jpg',
    '/assets/photo2.jpg',
    '/assets/photo3.jpg',
    // …add as many as you like
  ];

  // Preload images
  const loaded = PHOTO_URLS.map(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.error('Load failed:', src);
    return img;
  });
  function preloadAll(arr) {
    return Promise.all(arr.map(im =>
      new Promise(res => { im.onload = im.onerror = res; })
    ));
  }

  const rnd = n => Math.floor(Math.random() * n);

  let snakePos = [];   // [{x,y},…]
  let snakeImg = [];   // [index,…]
  let target   = { x:0, y:0, img:0 };

  function initSnake() {
    snakePos = [{ x: rnd(COLS)*S, y: rnd(ROWS)*S }];
    snakeImg = [ rnd(loaded.length) ];
  }

  function spawnTarget() {
    let x, y;
    do {
      x = rnd(COLS)*S;
      y = rnd(ROWS)*S;
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

    snakePos.unshift(newHead);
    if (!ate) snakePos.pop();

    if (ate) {
      snakeImg.push(target.img);
      spawnTarget();
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
      ctx.drawImage(loaded[snakeImg[i]], p.x, p.y, S, S);
    });
  }

  // start the game
  preloadAll(loaded).then(() => {
    initSnake();
    spawnTarget();
    draw();
    setInterval(step, 400);
  });
});
