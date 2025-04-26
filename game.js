// game.js

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const SQUARE     = 50;
  const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  // Leading slash makes these root-relative
  const PHOTO_URLS = [
    '/assets/RGGaSV6.jpg',
    '/assets/cheryl.jpg',
    '/assets/vape.jpg',
    // add more as needed
  ];

  // Preload all images
  const loadedImages = PHOTO_URLS.map(url => {
    const img = new Image();
    img.src = url;
    img.onerror = () => console.error(`Failed to load image: ${url}`);
    return img;
  });

  function loadAllImages(imgArray) {
    return Promise.all(imgArray.map(img =>
      new Promise(resolve => {
        img.onload  = () => resolve();
        img.onerror = () => resolve();
      })
    ));
  }

  const randomIndex = () => Math.floor(Math.random() * loadedImages.length);

  // Start with one segment in the center
  let snake = [{
    x: canvas.width  / 2 - SQUARE / 2,
    y: canvas.height / 2 - SQUARE / 2,
    imgIndex: randomIndex()
  }];

  let dir = 'RIGHT';

  function pickNewDirection() {
    if (Math.random() < 0.3) {
      dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    }
  }

  function moveSnake() {
    const head = { ...snake[0] };
    switch (dir) {
      case 'UP':    head.y -= SQUARE; break;
      case 'DOWN':  head.y += SQUARE; break;
      case 'LEFT':  head.x -= SQUARE; break;
      case 'RIGHT': head.x += SQUARE; break;
    }
    snake.unshift({ x: head.x, y: head.y, imgIndex: randomIndex() });
    snake.pop();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    snake.forEach(seg => {
      const img = loadedImages[seg.imgIndex];
      ctx.drawImage(img, seg.x, seg.y, SQUARE, SQUARE);
    });
  }

  // **Define loop** before using it
  function loop() {
    pickNewDirection();
    moveSnake();
    draw();
  }

  // Wait for images, then start
  loadAllImages(loadedImages).then(() => {
    loop();                   // initial draw
    setInterval(loop, 600);   // then continuous updates
  });
});
