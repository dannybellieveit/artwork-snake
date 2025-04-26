// game.js - Snake Image Game with Proper Growth

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const SQUARE     = 50;  
  const COLS       = Math.floor(canvas.width  / SQUARE);
  const ROWS       = Math.floor(canvas.height / SQUARE);

  // Your asset filenames here:
  const PHOTO_URLS = [
    '/assets/cheryl.jpg',
    '/assets/vape.jpg',
    '/assets/RGGaSV6.jpg',
    // …add more
  ];

  // Preload images
  const loadedImages = PHOTO_URLS.map(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.error(`Failed to load ${src}`);
    return img;
  });

  // Wait until all images have loaded (or errored)
  function loadAll(imgs) {
    return Promise.all(imgs.map(img =>
      new Promise(res => img.onload = img.onerror = res)
    ));
  }

  const rand = n => Math.floor(Math.random() * n);

  // Initialize snake with one segment at a random cell
  let snake = [{
    x: rand(COLS) * SQUARE,
    y: rand(ROWS) * SQUARE,
    img: rand(loadedImages.length)
  }];

  // Target to chase
  let target;

  function spawnTarget() {
    let x, y;
    do {
      x = rand(COLS) * SQUARE;
      y = rand(ROWS) * SQUARE;
    } while (snake.some(seg => seg.x === x && seg.y === y));
    target = {
      x, y,
      img: rand(loadedImages.length)
    };
  }

  // Compute new head coordinates
  function moveHead() {
    const head = { ...snake[0] };
    if      (head.x < target.x) head.x += SQUARE;
    else if (head.x > target.x) head.x -= SQUARE;
    else if (head.y < target.y) head.y += SQUARE;
    else if (head.y > target.y) head.y -= SQUARE;
    return head;
  }

  // Game step: move, eat, grow/pop
  function step() {
    const oldHeadImg = snake[0].img;
    const newHeadPos = moveHead();
    // Add new head, carrying over the head’s image
    snake.unshift({
      x: newHeadPos.x,
      y: newHeadPos.y,
      img: oldHeadImg
    });

    if (newHeadPos.x === target.x && newHeadPos.y === target.y) {
      // Ate target: change the new tail’s image to the eaten one
      snake[snake.length - 1].img = target.img;
      spawnTarget();
    } else {
      // Normal move: remove tail
      snake.pop();
    }

    draw();
  }

  // Draw target + snake
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw target
    ctx.globalAlpha = 0.8;
    ctx.drawImage(
      loadedImages[target.img],
      target.x, target.y, SQUARE, SQUARE
    );
    ctx.globalAlpha = 1;

    // draw snake
    snake.forEach(seg => {
      ctx.drawImage(
        loadedImages[seg.img],
        seg.x, seg.y, SQUARE, SQUARE
      );
    });
  }

  // Initialize when ready
  loadAll(loadedImages).then(() => {
    spawnTarget();
    draw();
    setInterval(step, 400);
  });
});
