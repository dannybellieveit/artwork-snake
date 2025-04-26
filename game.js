// game.js - Snake Image Game with Target-Eating Growth

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const SQUARE     = 50;                      // grid cell size
  const COLS       = Math.floor(canvas.width  / SQUARE);
  const ROWS       = Math.floor(canvas.height / SQUARE);
  const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  // Paths to your repo-hosted images in assets/
  const PHOTO_URLS = [
    '/assets/vape.jpg',
    '/assets/cheryl.jpg',
    '/assets/RGGaSV6.jpg',
    // …add more filenames here
  ];

  // Preload images
  const loadedImages = PHOTO_URLS.map(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.error(`Failed to load ${src}`);
    return img;
  });

  // Wait until all images have loaded (or errored) before starting
  const loadAll = imgs =>
    Promise.all(imgs.map(img =>
      new Promise(resolve => {
        img.onload = img.onerror = () => resolve();
      })
    ));

  const rand = n => Math.floor(Math.random() * n);

  // Snake: array of segments { x, y, img }
  let snake = [{
    x: rand(COLS) * SQUARE,
    y: rand(ROWS) * SQUARE,
    img: rand(loadedImages.length)
  }];

  // Current target the snake will chase
  let target;

  function spawnTarget() {
    let x, y;
    do {
      x = rand(COLS) * SQUARE;
      y = rand(ROWS) * SQUARE;
    } while (snake.some(seg => seg.x === x && seg.y === y));
    target = { x, y, img: rand(loadedImages.length) };
  }

  function pickNewDirection() {
    // Not used here since movement is direct chase
  }

  // Move the head one grid step toward the target
  function moveHead() {
    const head = { ...snake[0] };
    if      (head.x < target.x) head.x += SQUARE;
    else if (head.x > target.x) head.x -= SQUARE;
    else if (head.y < target.y) head.y += SQUARE;
    else if (head.y > target.y) head.y -= SQUARE;
    return head;
  }

  function step() {
    const newHead = moveHead();
    snake.unshift(newHead);
    if (newHead.x === target.x && newHead.y === target.y) {
      // Ate it! Grow and respawn target
      spawnTarget();
    } else {
      // Normal move: remove tail
      snake.pop();
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw target with a border
    ctx.globalAlpha = 0.8;
    ctx.drawImage(loadedImages[target.img], target.x, target.y, SQUARE, SQUARE);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'white';
    ctx.strokeRect(target.x, target.y, SQUARE, SQUARE);

    // Draw snake segments
    snake.forEach(seg => {
      ctx.drawImage(loadedImages[seg.img], seg.x, seg.y, SQUARE, SQUARE);
    });
  }

  // Main loop initializer
  loadAll(loadedImages).then(() => {
    spawnTarget();
    draw();
    setInterval(step, 400); // Adjust speed if desired
  });
});
