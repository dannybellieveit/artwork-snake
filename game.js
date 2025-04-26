// Game Constants
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const SQUARE_SIZE = 50; // Size of each image square
const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT']; // Possible snake movement directions

let snake = [{ x: 200, y: 150 }]; // Initial snake at starting position
let currentDirection = 'RIGHT';
let imageURLs = []; // Array to store fetched image URLs
let gameInterval;

// Randomly select a direction for a random effect (human-like play)
function getRandomDirection() {
    return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

// Fetch a random image URL
function getRandomImageUrl() {
    return `https://source.unsplash.com/50x50/?nature,${Math.random()}`;
}

// Move the snake by adding an image and changing the direction
function moveSnake() {
    let head = { ...snake[0] };

    // Update head position based on direction
    if (currentDirection === 'UP') head.y -= SQUARE_SIZE;
    if (currentDirection === 'DOWN') head.y += SQUARE_SIZE;
    if (currentDirection === 'LEFT') head.x -= SQUARE_SIZE;
    if (currentDirection === 'RIGHT') head.x += SQUARE_SIZE;

    // Add new image URL as part of the snake's body
    snake.unshift(head);
    
    // Fetch and add a new image URL
    imageURLs.unshift(getRandomImageUrl());

    // Remove the last segment of the snake (like the game logic for Snake)
    snake.pop();
    imageURLs.pop();

    // Render the snake
    drawSnake();
}

// Draw the snake on the canvas
function drawSnake() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    
    for (let i = 0; i < snake.length; i++) {
        let segment = snake[i];
        let img = new Image();
        img.src = imageURLs[i];
        img.onload = () => {
            ctx.drawImage(img, segment.x, segment.y, SQUARE_SIZE, SQUARE_SIZE);
        };
    }
}

// Update game state and simulate random human-like behavior
function gameLoop() {
    currentDirection = getRandomDirection(); // Update the direction randomly
    moveSnake(); // Move the snake
}

// Start the game loop
function startGame() {
    gameInterval = setInterval(gameLoop, 500); // Run the game loop every 500ms
}

// Initialize game
startGame();
