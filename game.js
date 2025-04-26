const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const SQUARE = 50;
const DIRECTIONS = ['UP','DOWN','LEFT','RIGHT'];

let snake = [{ x: 200, y: 150 }];
let images = [getRandomImageUrl()];
let dir = 'RIGHT';

function getRandomImageUrl() {
  // 50×50 random from Unsplash
  return `https://source.unsplash.com/random/50x50?sig=${Math.random()}`;
}

function pickNewDirection() {
  // simulate human hesitation
  if (Math.random() < 0.3) {
    dir = DIRECTIONS[Math.floor(Math.random() * 4)];
  }
}

function moveSnake() {
  let head = { ...snake[0] };
  if (dir === 'UP') head.y -= SQUARE;
  if (dir === 'DOWN') head.y += SQUARE;
  if (dir === 'LEFT') head.x -= SQUARE;
  if (dir === 'RIGHT') head.x += SQUARE;

  snake.unshift(head);
  images.unshift(getRandomImageUrl());

  // drop the tail
  snake.pop();
  images.pop();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snake.forEach((seg, i) => {
    let img = new Image();
    img.src = images[i];
    img.onload = () => ctx.drawImage(img, seg.x, seg.y, SQUARE, SQUARE);
  });
}

function loop() {
  pickNewDirection();
  moveSnake();
  draw();
}

setInterval(loop, 600);
