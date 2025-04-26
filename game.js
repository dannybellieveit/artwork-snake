// game.js - Snake Image Game with Preloaded Assets

// Get canvas and context
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Segment size and movement directions
const SQUARE = 50;
const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

// List of your own images in assets/ folder (root-relative)
const PHOTO_URLS = [
  '/assets/photo1.jpg',
  '/assets/photo2.jpg',
  '/assets/photo3.jpg',
  // Add more as needed
];

// Preload images into array of Image objects
const loadedImages = PHOTO_URLS.map(url => {
  const img = new Image();
  img.src = url;
  img.onerror = () => console.error(`Failed to load image: ${url}`);
  return img;
});

// Utility: get random index for images
function getRandomIndex() {
  return Math.floor(Math.random() * loadedImages.length);
}

// Initialize snake as array of { x, y, imgIndex }
let snake = [{
  x: canvas.width / 2 - SQUARE / 2,
  y: canvas.height / 2 - SQUARE / 2,
  imgIndex: getRandomIndex()
}];

// Current movement direction
let dir = 'RIGHT';

// Occasionally pick a new random direction to simulate human play
function pickNewDirection() {
  if (Math.random() < 0.3) {
    dir = DIRECTIONS[getRandomIndex() % DIRECTIONS.length];
  }
}

// Move the snake: compute new head, add to front, remove tail
function moveSnake() {
  const head = { ...snake[0] };

  switch (dir) {
    case 'UP': head.y -= SQUARE; break;
    case 'DOWN': head.y += SQUARE; break;
    case 'LEFT': head.x -= SQUARE; break;
    case 'RIGHT': head.x += SQUARE; break;
  }

  // Add new head with random image index
  snake.unshift({ x: head.x, y: head.y, imgIndex: getRandomIndex() });
  // Remove last segment to keep length constant
  snake.pop();
}

// Draw the snake: clear canvas and draw each preloaded image
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snake.forEach(seg => {
    const img = loadedImages[seg.imgIndex];
    if (img.complete) {
      ctx.drawImage(img, seg.x, seg.y, SQUARE, SQUARE);
    } else {
      // If not yet loaded, draw placeholder
      ctx.fillStyle = '#555';
      ctx.fillRect(seg.x, seg.y, SQUARE, SQUARE);
    }
  });
}

// Main loop: pick direction, move, draw
function loop() {
  pickNewDirection();
  moveSnake();
  draw();
}

// Start the loop after images have started loading
setTimeout(() => setInterval(loop, 600), 100);
