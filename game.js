// game.js — Snake with sequential images, self-collision avoidance until trapped, flashing death and restart

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const S      = 50;
  const COLS   = Math.floor(canvas.width / S);
  const ROWS   = Math.floor(canvas.height / S);

  // Image URLs
  const PHOTO_URLS = [
    'assets/photo1.jpg', 'assets/photo2.jpg', 'assets/photo3.jpg',
    'assets/photo4.jpg', 'assets/photo5.jpg', 'assets/photo6.jpg',
    'assets/photo7.jpg', 'assets/photo8.jpg', 'assets/photo9.jpg'
  ];

  // Preload images
  const loaded = PHOTO_URLS.map(src => {
    const img = new Image(); img.src = src;
    img.onerror = () => console.error('Load failed:', src);
    return img;
  });
  function preloadAll(arr) {
    return Promise.all(arr.map(im => new Promise(res => { im.onload = im.onerror = res; })));
  }

  // Game state
  let snakePos = [], snakeImg = [], target = {}, nextPhotoIndex = 0, gameInterval;

  // Initialize snake and first photo index
  function initSnake() {
    snakePos = [{
      x: Math.floor(Math.random()*COLS)*S,
      y: Math.floor(Math.random()*ROWS)*S
    }];
    snakeImg = [0];
    nextPhotoIndex = 1;
  }

  // Spawn target with next sequential photo
  function spawnTarget() {
    let x, y;
    do {
      x = Math.floor(Math.random()*COLS)*S;
      y = Math.floor(Math.random()*ROWS)*S;
    } while (snakePos.some(p=>p.x===x&&p.y===y));
    target = { x, y, img: nextPhotoIndex };
    nextPhotoIndex = (nextPhotoIndex + 1) % loaded.length;
  }

  // Determine next head position avoiding self-collision if possible
  function moveOneStep() {
    const head = { ...snakePos[0] };
    // Primary direction towards target
    let dx = 0, dy = 0;
    if (head.x < target.x) dx = S;
    else if (head.x > target.x) dx = -S;
    if (head.y < target.y) dy = S;
    else if (head.y > target.y) dy = -S;

    // Candidate moves in priority order
    const candidates = [];
    // Primary move (horizontal or vertical)
    if (dx !== 0) candidates.push({ x: head.x+dx, y: head.y });
    if (dy !== 0) candidates.push({ x: head.x,     y: head.y+dy });
    // Opposite axis first if primary fails
    if (dy !== 0) candidates.push({ x: head.x,     y: head.y+dy });
    if (dx !== 0) candidates.push({ x: head.x+dx, y: head.y });
    // Fallback to all directions
    [{x:S,y:0},{x:-S,y:0},{x:0,y:S},{x:0,y:-S}].forEach(d=>
      candidates.push({ x: head.x+d.x, y: head.y+d.y })
    );

    // Return first that doesn't collide self
    for (const pos of candidates) {
      if (!snakePos.some(p=>p.x===pos.x&&p.y===pos.y)) {
        return pos;
      }
    }
    // If all collide, return primary to trigger death
    return candidates[0];
  }

  // Death: flash and restart
  function die() {
    clearInterval(gameInterval);
    let flashes = 0;
    const flashI = setInterval(() => {
      ctx.fillStyle = (flashes%2===0 ? 'white':'red');
      ctx.fillRect(0,0,canvas.width,canvas.height);
      if (++flashes>5) {
        clearInterval(flashI);
        startGame();
      }
    }, 100);
  }

  // Game step
  function step() {
    const newHead = moveOneStep();
    const ate = (newHead.x===target.x && newHead.y===target.y);
    // Self-collision check
    if (snakePos.some(p=>p.x===newHead.x&&p.y===newHead.y)) {
      return die();
    }

    snakePos.unshift(newHead);
    if (!ate) snakePos.pop();
    else {
      snakeImg.push(target.img);
      spawnTarget();
    }
    draw();
  }

  // Draw board
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // draw target
    const tImg = loaded[target.img];
    if (tImg) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(tImg, target.x, target.y, S, S);
      ctx.globalAlpha = 1;
    }
    // draw snake
    snakePos.forEach((p,i) => {
      const img = loaded[snakeImg[i]];
      if (img) ctx.drawImage(img, p.x, p.y, S, S);
    });
  }

  // Start/restart game
  function startGame() {
    initSnake();
    spawnTarget();
    draw();
    gameInterval = setInterval(step, 400);
  }

  // Launch
  preloadAll(loaded).then(startGame);
});
