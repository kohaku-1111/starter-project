// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const ENEMY_SPEED = 2;

// Game state
let gameState = 'playing'; // 'playing', 'gameOver', 'win'
let score = 0;
let lives = 3;
let level = 1;
let keys = {};

// Player object
const player = {
    x: 50,
    y: 400,
    width: 30,
    height: 40,
    velocityX: 0,
    velocityY: 0,
    jumping: false,
    onGround: false,
    color: '#E74C3C',
    direction: 1, // 1 for right, -1 for left

    draw() {
        ctx.save();

        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Hat
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(this.x - 5, this.y, this.width + 10, 10);

        // Face
        ctx.fillStyle = '#F4D6CC';
        ctx.fillRect(this.x + 5, this.y + 12, this.width - 10, 15);

        // Eyes
        ctx.fillStyle = '#000';
        if (this.direction === 1) {
            ctx.fillRect(this.x + 12, this.y + 15, 4, 4);
            ctx.fillRect(this.x + 20, this.y + 15, 4, 4);
        } else {
            ctx.fillRect(this.x + 6, this.y + 15, 4, 4);
            ctx.fillRect(this.x + 14, this.y + 15, 4, 4);
        }

        // Mustache
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 8, this.y + 22, 14, 3);

        ctx.restore();
    },

    update() {
        if (gameState !== 'playing') return;

        // Horizontal movement
        this.velocityX = 0;
        if (keys['ArrowLeft']) {
            this.velocityX = -MOVE_SPEED;
            this.direction = -1;
        }
        if (keys['ArrowRight']) {
            this.velocityX = MOVE_SPEED;
            this.direction = 1;
        }

        // Jump
        if ((keys[' '] || keys['ArrowUp']) && this.onGround) {
            this.velocityY = JUMP_FORCE;
            this.jumping = true;
            this.onGround = false;
        }

        // Apply gravity
        this.velocityY += GRAVITY;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Canvas boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Ground collision
        if (this.y + this.height >= canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.onGround = true;
            this.jumping = false;
        }

        // Platform collision
        this.onGround = false;
        platforms.forEach(platform => {
            if (this.checkCollision(platform)) {
                // Top collision
                if (this.velocityY > 0 && this.y + this.height - this.velocityY <= platform.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    this.jumping = false;
                }
                // Bottom collision
                else if (this.velocityY < 0 && this.y - this.velocityY >= platform.y + platform.height) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
            }
        });

        // Coin collision
        coins.forEach((coin, index) => {
            if (!coin.collected && this.checkCollision(coin)) {
                coin.collected = true;
                score += 100;
                updateScore();
            }
        });

        // Goal collision
        if (this.checkCollision(goal)) {
            winGame();
        }

        // Enemy collision
        enemies.forEach(enemy => {
            if (this.checkCollision(enemy)) {
                // Jump on enemy
                if (this.velocityY > 0 && this.y + this.height - this.velocityY <= enemy.y + 10) {
                    enemy.destroyed = true;
                    this.velocityY = JUMP_FORCE / 2;
                    score += 200;
                    updateScore();
                } else {
                    // Take damage
                    loseLife();
                }
            }
        });

        // Fall off map
        if (this.y > canvas.height) {
            loseLife();
        }
    },

    checkCollision(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    },

    reset() {
        this.x = 50;
        this.y = 400;
        this.velocityX = 0;
        this.velocityY = 0;
        this.jumping = false;
        this.onGround = false;
    }
};

// Platforms
let platforms = [];

function createLevel(levelNum) {
    platforms = [];
    coins = [];
    enemies = [];

    if (levelNum === 1) {
        // Level 1 platforms
        platforms.push(
            { x: 0, y: 550, width: 200, height: 50, color: '#27AE60' },
            { x: 250, y: 500, width: 150, height: 20, color: '#8B4513' },
            { x: 450, y: 450, width: 150, height: 20, color: '#8B4513' },
            { x: 300, y: 350, width: 100, height: 20, color: '#8B4513' },
            { x: 500, y: 280, width: 120, height: 20, color: '#8B4513' },
            { x: 650, y: 350, width: 150, height: 20, color: '#8B4513' },
            { x: 700, y: 500, width: 100, height: 100, color: '#27AE60' }
        );

        // Coins
        coins.push(
            { x: 300, y: 480, width: 20, height: 20, collected: false },
            { x: 500, y: 430, width: 20, height: 20, collected: false },
            { x: 350, y: 320, width: 20, height: 20, collected: false },
            { x: 550, y: 250, width: 20, height: 20, collected: false },
            { x: 720, y: 320, width: 20, height: 20, collected: false }
        );

        // Enemies
        enemies.push(
            { x: 280, y: 460, width: 30, height: 30, direction: 1, speed: ENEMY_SPEED,
              minX: 250, maxX: 380, destroyed: false },
            { x: 480, y: 410, width: 30, height: 30, direction: 1, speed: ENEMY_SPEED,
              minX: 450, maxX: 580, destroyed: false }
        );
    }
}

// Coins
let coins = [];

function drawCoin(coin) {
    if (coin.collected) return;

    ctx.save();
    ctx.fillStyle = '#F39C12';
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Enemies
let enemies = [];

function updateEnemy(enemy) {
    if (enemy.destroyed) return;

    enemy.x += enemy.speed * enemy.direction;

    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.direction *= -1;
    }
}

function drawEnemy(enemy) {
    if (enemy.destroyed) return;

    ctx.save();
    // Body
    ctx.fillStyle = '#8B008B';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.fillRect(enemy.x + 5, enemy.y + 8, 8, 8);
    ctx.fillRect(enemy.x + enemy.width - 13, enemy.y + 8, 8, 8);

    // Pupils
    ctx.fillStyle = '#000';
    ctx.fillRect(enemy.x + 8, enemy.y + 11, 4, 4);
    ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 11, 4, 4);

    // Teeth
    ctx.fillStyle = '#FFF';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(enemy.x + 5 + i * 8, enemy.y + enemy.height - 5, 5, 5);
    }

    ctx.restore();
}

// Goal
const goal = {
    x: 750,
    y: 430,
    width: 40,
    height: 70
};

function drawGoal() {
    ctx.save();
    // Flag pole
    ctx.fillStyle = '#000';
    ctx.fillRect(goal.x + 15, goal.y, 5, goal.height);

    // Flag
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(goal.x + 20, goal.y);
    ctx.lineTo(goal.x + 40, goal.y + 10);
    ctx.lineTo(goal.x + 20, goal.y + 20);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Drawing functions
function drawPlatform(platform) {
    ctx.fillStyle = platform.color;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    // Add texture
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < platform.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(platform.x + i, platform.y);
        ctx.lineTo(platform.x + i, platform.y + platform.height);
        ctx.stroke();
    }
}

function drawBackground() {
    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    drawCloud(100, 80, 60);
    drawCloud(300, 120, 50);
    drawCloud(500, 60, 70);
    drawCloud(650, 100, 55);
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Game loop
function gameLoop() {
    // Clear canvas
    drawBackground();

    // Update and draw game objects
    if (gameState === 'playing') {
        player.update();

        enemies.forEach(enemy => {
            updateEnemy(enemy);
        });
    }

    // Draw everything
    platforms.forEach(platform => drawPlatform(platform));
    coins.forEach(coin => drawCoin(coin));
    enemies.forEach(enemy => drawEnemy(enemy));
    drawGoal();
    player.draw();

    requestAnimationFrame(gameLoop);
}

// Input handling
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === 'r' || e.key === 'R') {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// UI updates
function updateScore() {
    document.getElementById('score').textContent = score;
}

function updateLives() {
    document.getElementById('lives').textContent = lives;
}

function updateLevel() {
    document.getElementById('level').textContent = level;
}

function updateGameState(message, className) {
    const gameStateDiv = document.getElementById('gameState');
    gameStateDiv.textContent = message;
    gameStateDiv.className = 'game-state ' + className;
}

// Game state functions
function loseLife() {
    if (gameState !== 'playing') return;

    lives--;
    updateLives();

    if (lives <= 0) {
        gameOver();
    } else {
        player.reset();
    }
}

function gameOver() {
    gameState = 'gameOver';
    updateGameState('ゲームオーバー！ R キーでリスタート', 'lose');
}

function winGame() {
    gameState = 'win';
    score += 1000;
    updateScore();
    updateGameState('ステージクリア！ R キーで次のレベル', 'win');
}

function restartGame() {
    gameState = 'playing';
    score = 0;
    lives = 3;
    level = 1;

    updateScore();
    updateLives();
    updateLevel();
    updateGameState('', '');

    player.reset();
    createLevel(level);
}

// Initialize game
function init() {
    createLevel(level);
    updateScore();
    updateLives();
    updateLevel();
    gameLoop();
}

// Start the game
init();
