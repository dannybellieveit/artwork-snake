const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Size of each snake segment (square)
const SQUARE = 50;
// Possible movement directions\ nconst DIRECTIONS = ['UP','DOWN','LEFT','RIGHT'];

// List of your own images placed in assets/ folder
const PHOTO_URLS = [
  "/assets/photo1.jpg",
  "/assets/photo2.jpg",
  "/assets/photo3.jpg",
  // Add more paths as needed
];

// Initialize snake with one segment at center\ nlet snake = [{ x: canvas.width/2 - SQUARE/2, y: canvas.height/2 - SQUARE/2 }];
// Initialize image list with a random image for the first segment
let images = [getRandomImageUrl()];

// Current movement direction
let dir = 'RIGHT';

// Return a random image URL from your assets
function getRandomImageUrl() {
  const i = Math.floor(Math.random() * PHOTO_URLS.length);
  return PHOTO_URLS[i];
}

// Occasionally pick a new random direction to simulate human play
function pickNewDirection() {
  if (Math.random() < 0.3) {
    dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
  }
}

// Move the snake by adding a new head and popping the tail
function moveSnake() {
  const head = { ...snake[0] };
  switch (dir) {
    case 'UP': head.y -= SQUARE; break;
    case 'DOWN': head.y += SQUARE; break;
    case 'LEFT': head.x -= SQUARE; break;
    case 'RIGHT': head.x += SQUARE; break;
  }

  // Add new head segment
  snake.unshift(head);
  images.unshift(getRandomImageUrl());

  // Remove last segment to keep length constant
  snake.pop();
  images.pop();
}

// Draw the entire snake by loading and drawing each image segment
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snake.forEach((seg, i) => {
    const img = new Image();
    img.src = images[i];
    img.onload = () => {
      ctx.drawImage(img, seg.x, seg.y, SQUARE, SQUARE);
    };
  });
}

// Main game loop: pick direction, move, then draw
function loop() {
  pickNewDirection();
  moveSnake();
  draw();
}

// Run the loop every 600ms
setInterval(loop, 600);
