// game.js — Refactored Snake with resize‐clamp to avoid phantom self-traps

class Board {
  constructor(canvasId, cellSize) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.cellSize = cellSize;
    this.cols = 0;
    this.rows = 0;
    this._resizeScheduled = false;
    this._bindResize();
    this.resize();
  }

  _bindResize() {
    window.addEventListener('resize', () => this._scheduleResize());
  }

  _scheduleResize() {
    if (!this._resizeScheduled) {
      this._resizeScheduled = true;
      requestAnimationFrame(() => {
        this.resize();
        this._resizeScheduled = false;
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;

    this.canvas.width  = rect.width  * dpr;
    this.canvas.height = rect.height * dpr;

    // reset any old transform so it doesn't stack
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.cols = Math.floor(rect.width  / this.cellSize);
    this.rows = Math.floor(rect.height / this.cellSize);

    if (this.onResize) this.onResize();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawCell(x, y, drawFn) {
    this.ctx.save();
    drawFn(this.ctx, x, y, this.cellSize);
    this.ctx.restore();
  }
}

class Snake {
  constructor(images, board) {
    this.images = images;
    this.board  = board;
    this.positions    = [];
    this.imageIndices = [];
  }

  init() {
    const { cols, rows, cellSize } = this.board;
    const x = Math.floor(Math.random() * cols) * cellSize;
    const y = Math.floor(Math.random() * rows) * cellSize;
    this.positions    = [{ x, y }];
    this.imageIndices = [Math.floor(Math.random() * this.images.length)];
  }

  move(target, manualDir) {
    const head = { ...this.positions[0] };
    if (manualDir) {
      const next = { x: head.x + manualDir.x, y: head.y + manualDir.y };
      return this._isValid(next) ? next : head;
    }

    const candidates = this._getCandidates(head, target);
    console.log('    [move] head @', head, '→ candidates:', candidates);
    return candidates.length ? candidates[0] : null;
  }

  _getCandidates(head, target) {
    const d = this.board.cellSize;
    const dirs = [
      { x: d,  y: 0 },
      { x: -d, y: 0 },
      { x: 0,  y: d },
      { x: 0,  y: -d }
    ];
    dirs.sort((a, b) => {
      const da = Math.abs(head.x + a.x - target.x) + Math.abs(head.y + a.y - target.y);
      const db = Math.abs(head.x + b.x - target.x) + Math.abs(head.y + b.y - target.y);
      return da - db;
    });
    return dirs
      .map(d => ({ x: head.x + d.x, y: head.y + d.y }))
      .filter(p => this._isValid(p));
  }

  _isValid(pos) {
    const { cols, rows, cellSize } = this.board;
    const inBounds = pos.x >= 0 && pos.x < cols * cellSize &&
                     pos.y >= 0 && pos.y < rows * cellSize;
    const notSelf  = !this.positions.some(p => p.x === pos.x && p.y === pos.y);
    return inBounds && notSelf;
  }

  growOrMove(nextPos, ateIndex) {
    if (nextPos === null) return false;  // trapped → death
    this.positions.unshift(nextPos);
    if (ateIndex != null) {
      this.imageIndices.push(ateIndex);
      return true;
    }
    this.positions.pop();
    return false;
  }
}

class GameController {
  constructor() {
    this.CELL        = 50;
    this.SPEED_BASE  = 400;
    this.MIN_SPEED   = 50;
    this.FLASH_COUNT = 6;
    this.MAX_SPEEDUP = 5;      // cap at 8×

    this.nextImageIndex = 0;  // cycles across rounds
    this.speedup        = 1;  // bumped only in _die()

    this.board          = new Board('game-canvas', this.CELL);
    this.spotifyEmbed   = document.getElementById('spotify-embed');
    this.embedContainer = document.getElementById('spotify-embed-container');
    this.infobox        = document.getElementById('info-box');

    this.scoreElem     = document.getElementById('score');
    this.highScoreElem = document.getElementById('high-score');

    this.scoreElem.style.display = 'none';
    this.highScoreElem.style.display = 'none';

    this.score          = 0;
    this.highScore      = parseInt(localStorage.getItem('highScore')) || 0;
    this.highScoreDate  = localStorage.getItem('highScoreDate') || '';
    this._updateScores();

    this.imagesData = [
      { src: 'assets/photo1.jpg', title: 'Verbathim (Album)', artist: 'Nemahsis',
        spotifyUrl: 'https://open.spotify.com/track/2lmT9NiqohWoRf9yAxt4Ru?si=7291e441baaa452a' },
      { src: 'assets/photo2.jpg', title: 'TV Show', artist: 'Katie Gregson-MacLeod',
        spotifyUrl: 'https://open.spotify.com/track/0hQZyBWcYejAzb9WYM96pr?si=866aa6756cb24293' },
       { src: 'assets/photo3.jpg', title: 'We Need To Talk', artist: 'Matt Maltese',
        spotifyUrl: 'https://open.spotify.com/track/1gqMcDslzFtgOsAZDY58JX?si=f1e735a57f8e4076' },
      { src: 'assets/photo4.jpg', title: 'Alone At The Party', artist: 'Sam Tompkins',
        spotifyUrl: 'https://open.spotify.com/track/0YO7moiEboCUBDFf0hefSk?si=6abe803a16734b2e' },
       { src: 'assets/photo5.jpg', title: 'Dollar Signs', artist: 'Nemahsis',
        spotifyUrl: 'https://open.spotify.com/track/6YyEuMnthCvLOZCGEbksAF?si=ea15d86f0f7d416d' },
      { src: 'assets/photo6.jpg', title: 'Coming Closer', artist: 'Duckwrth',
        spotifyUrl: 'https://open.spotify.com/track/238p3EKRYESqsZdgE5DCDR?si=7f4332128f954948' },
       { src: 'assets/photo7.jpg', title: 'This Is The Place', artist: 'Tom Grennan',
        spotifyUrl: 'https://open.spotify.com/track/0UtoTf0kuz8x6Zfy59r8hp?si=9f2dc0ed23c54266' },
      { src: 'assets/photo8.jpg', title: 'Skin', artist: 'Joy Crookes',
        spotifyUrl: 'https://open.spotify.com/track/7k8b5u5fisGTDNahrJK6dw?si=2a87e548bd1c45ef' },
       { src: 'assets/photo9.jpg', title: 'Paradise', artist: 'Griff',
        spotifyUrl: 'https://open.spotify.com/track/7nfaD0trhQiStQ8DOQRC0h?si=9e7715a383e14fca' },
          { src: 'assets/photo10.jpg', title: 'LMLY', artist: 'Jackson Wang',
        spotifyUrl: 'https://open.spotify.com/track/3kPoV6L9vXpbxoM4Ux0KnX?si=6891a359c7fb4f50' },
      { src: 'assets/photo11.jpg', title: '54321', artist: 'April',
        spotifyUrl: 'https://open.spotify.com/track/6Vn5hk8NQIkzGsdkx5nF4q?si=42dbda986fb842fe' },
       { src: 'assets/photo12.jpg', title: 'Boy Clothes', artist: 'Nxdia',
        spotifyUrl: 'https://open.spotify.com/track/7nuCxvFvVT5YEAjSDd6Glr?si=a241207fac3348d8' },
      { src: 'assets/photo13.jpg', title: 'Options (feat. Lil Baby)', artist: 'Jordan Adetunji',
        spotifyUrl: 'https://open.spotify.com/track/0aQD4RI0U4pHWzNzQWTq9r?si=e5080b16576548f3' },
       { src: 'assets/photo14.jpg', title: '305 (feat. Bryson Tiller)', artist: 'Jordan Adetunji',
        spotifyUrl: 'https://open.spotify.com/track/494f07w2ArJNlkwnWWZViK?si=a3ff4f4b26ce4a53' },
       { src: 'assets/photo15.jpg', title: 'Stick Of Gum', artist: 'Nemahsis',
        spotifyUrl: 'https://open.spotify.com/track/7DvOMvKBZESff6Etf0v9MY?si=c31005880f374552' },
         { src: 'assets/photo16.jpg', title: 'congrats! u did it!', artist: 'flowerovlove',
        spotifyUrl: 'https://open.spotify.com/track/5bp8CvtJ8pbh2OK2HSfTwE?si=6895384a7d2343b5' },
       { src: 'assets/photo17.jpg', title: 'Appetite', artist: 'Arthur Hill',
        spotifyUrl: 'https://open.spotify.com/track/0q5zMDVszIVZb7kPi2XiOj?si=34033487b3344e8a' },
       { src: 'assets/photo18.jpg', title: 'Body On Me', artist: 'Nxdia',
        spotifyUrl: 'https://open.spotify.com/track/6MglZeuPDQwHzZTxrRZfCW?si=11e2487a15304c89' },
      /* …etc… */
    ];
    this.loadedImages = [];

    this.snake     = null;
    this.target    = null;
    this.manualDir = null;
    this.isManual  = false;
    this.rafId     = null;
    this.lastTime  = 0;

    this._bindEvents();

    // clamp snake on resize, then redraw
    this.board.onResize = () => {
      if (this.snake) {
        const maxX = (this.board.cols - 1) * this.CELL;
        const maxY = (this.board.rows - 1) * this.CELL;
        this.snake.positions = this.snake.positions.map(({ x, y }) => ({
          x: Math.min(x, maxX),
          y: Math.min(y, maxY)
        }));
      }
      this.draw();
    };

    this._preload().then(() => this.start());
  }

  _updateScores() {
    if (this.scoreElem)
      this.scoreElem.textContent = `Score: ${this.score}`;
    if (this.highScoreElem) {
      const when = this.highScoreDate ? ` (${this.highScoreDate})` : '';
      this.highScoreElem.textContent = `High Score: ${this.highScore}${when}`;
    }
  }

  _preload() {
    this.loadedImages = this.imagesData.map(d => {
      const img = new Image();
      img.src = d.src;
      return img;
    });
    return Promise.all(
      this.loadedImages.map(img => new Promise(res => {
        img.onload  = res;
        img.onerror = () => { console.error('Failed to load', img.src); res(); };
      }))
    );
  }

  _bindEvents() {
    const c = this.board.canvas;
    c.addEventListener('click',     e => this._handleClick(e));
    c.addEventListener('mousemove', e => this._handleMouseMove(e));
    window.addEventListener('keydown', e => this._handleKey(e));

    const bindBtn = (selector, key) => {
      const btn = document.querySelector(selector);
      if (!btn) return;
      ['touchstart', 'mousedown'].forEach(evt => {
        btn.addEventListener(evt, ev => {
          ev.preventDefault();
          this._handleKey({ key });
        });
      });
    };
    bindBtn('.btn-up', 'ArrowUp');
    bindBtn('.btn-down', 'ArrowDown');
    bindBtn('.btn-left', 'ArrowLeft');
    bindBtn('.btn-right', 'ArrowRight');

    // basic swipe detection on the canvas
    let startX, startY;
    c.addEventListener('touchstart', e => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: false });
    c.addEventListener('touchend', e => {
      if (startX == null || startY == null) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) > 30) {
        if (absX > absY) {
          this._handleKey({ key: dx > 0 ? 'ArrowRight' : 'ArrowLeft' });
        } else {
          this._handleKey({ key: dy > 0 ? 'ArrowDown' : 'ArrowUp' });
        }
      }
      startX = startY = null;
    });
  }

  _handleClick(e) {
    const pos = this._getEventPos(e);
    if (this.target && pos.x === this.target.x && pos.y === this.target.y) {
      const id = this.imagesData[this.target.metaIndex]
                     .spotifyUrl.match(/track\/(\w+)/)[1];
      this.spotifyEmbed.src = `https://open.spotify.com/embed/track/${id}`
                            + `?utm_source=generator&autoplay=1`;
      this.embedContainer.style.display = 'block';
    }
  }

_handleMouseMove(e) {
    const pos = this._getEventPos(e);
    const { cellSize } = this.board;

    // Check if the mouse is within the target's bounding box
    const isOverTarget =
        this.target &&
        pos.x >= this.target.x &&
        pos.x < this.target.x + cellSize &&
        pos.y >= this.target.y &&
        pos.y < this.target.y + cellSize;

    if (isOverTarget) {
        const md = this.imagesData[this.target.metaIndex];
        /*this.infoBox.textContent = `${md.title} — ${md.artist}`;*/
        this.board.canvas.style.cursor = 'pointer'; // Show pointer cursor
        console.log('Cursor set to pointer over target'); // Debugging log
    } else {
        /*this.infoBox.textContent = '';*/
        this.board.canvas.style.cursor = 'default'; // Reset to default cursor
        console.log('Cursor reset to default'); // Debugging log
    }
}

  _handleKey(e) {
    const d = this.CELL;
    const map = {
      ArrowUp:    { x:  0, y: -d },
      ArrowDown:  { x:  0, y:  d },
      ArrowLeft:  { x: -d, y:  0 },
      ArrowRight: { x:  d, y:  0 }
    };
    if (map[e.key]) {
      if (!this.isManual) {
        this.isManual = true;
        this.score = 0;
        this.scoreElem.style.display = 'block';
        this.highScoreElem.style.display = 'block';
        this._updateScores();
      }
      this.manualDir = map[e.key];
    }
  }

  _getEventPos(e) {
    const rect = this.board.canvas.getBoundingClientRect();
    const xCSS = e.clientX - rect.left;
    const yCSS = e.clientY - rect.top;
    const col  = Math.floor(xCSS / this.CELL);
    const row  = Math.floor(yCSS / this.CELL);
    return { x: col * this.CELL, y: row * this.CELL };
  }

  _spawnTarget() {
    const { cols, rows, cellSize } = this.board;
    let x, y;
    do {
      x = Math.floor(Math.random() * cols) * cellSize;
      y = Math.floor(Math.random() * rows) * cellSize;
    } while (this.snake.positions.some(p => p.x === x && p.y === y));

    this.target = { x, y, metaIndex: this.nextImageIndex };
    this.nextImageIndex = (this.nextImageIndex + 1) % this.loadedImages.length;
  }

  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.score = 0;
    this.scoreElem.style.display = 'none';
    this.highScoreElem.style.display = 'none';
    this._updateScores();

    // compute interval from current speedup (bumped only in _die)
    this.interval = Math.max(this.MIN_SPEED, this.SPEED_BASE / this.speedup);

    // init snake then spawn target
    this.snake = new Snake(this.loadedImages, this.board);
    this.snake.init();
    this._spawnTarget();

    console.log('🏁 New round', {
      head:    this.snake.positions[0],
      target:  this.target,
      speedup: this.speedup
    });

    this.lastTime = performance.now();
    this.isManual = false;
    this.rafId    = requestAnimationFrame(ts => this._loop(ts));
  }

  _loop(timestamp) {
    const delta = timestamp - this.lastTime;
    if (delta >= this.interval) {
      this.lastTime = timestamp;
      this._step();
    }
    this.rafId = requestAnimationFrame(ts => this._loop(ts));
  }

  _step() {
    const nextPos = this.snake.move(
      this.target,
      this.isManual ? this.manualDir : null
    );
    if (
      nextPos === null ||
      this.snake.positions.some(p => p.x === nextPos.x && p.y === nextPos.y)
    ) {
      return this._die();
    }

    const ate = nextPos.x === this.target.x && nextPos.y === this.target.y;
    this.snake.growOrMove(nextPos, ate ? this.target.metaIndex : null);
    if (ate) {
      this.speedup += 0.1; // Increment speedup factor
      this.interval = Math.max(this.MIN_SPEED, this.SPEED_BASE / this.speedup);
      if (this.isManual) {
        this.score++;
        if (this.score > this.highScore) {
          this.highScore     = this.score;
          this.highScoreDate = new Date().toLocaleDateString();
          localStorage.setItem('highScore', this.highScore);
          localStorage.setItem('highScoreDate', this.highScoreDate);
        }
      }
      this._spawnTarget();
      if (this.isManual) this._updateScores();
    }
    this.draw();
  }

  _die() {
    cancelAnimationFrame(this.rafId);
    if (this.isManual && this.score > this.highScore) {
      this.highScore     = this.score;
      this.highScoreDate = new Date().toLocaleDateString();
      localStorage.setItem('highScore', this.highScore);
      localStorage.setItem('highScoreDate', this.highScoreDate);
    }
    if (this.isManual) this._updateScores();
    let flashes = 0;

    const flash = () => {
      this.board.clear();

      // draw target
      this.board.drawCell(this.target.x, this.target.y, (ctx, x, y, s) => {
        ctx.globalAlpha = 0.8;
        const img = this.loadedImages[this.target.metaIndex];
        if (img.naturalWidth) ctx.drawImage(img, x, y, s, s);
        else ctx.fillRect(x, y, s, s);
        ctx.globalAlpha = 1;
      });

      // flashing snake
      this.snake.positions.forEach(pos => {
        this.board.drawCell(pos.x, pos.y, (ctx, x, y, s) => {
          ctx.fillStyle = flashes % 2 ? 'red' : 'white';
          ctx.fillRect(x, y, s, s);
        });
      });

      flashes++;
      if (flashes < this.FLASH_COUNT) {
        setTimeout(flash, 100);
      } else {
        this.speedup = 1;
        this.start();
      }
    };

    flash();
  }

  draw() {
    if (!this.snake || !this.target) return;
    this.board.clear();

    // draw target
    this.board.drawCell(this.target.x, this.target.y, (ctx, x, y, s) => {
      ctx.globalAlpha = 0.8;
      const img = this.loadedImages[this.target.metaIndex];
      if (img.naturalWidth) ctx.drawImage(img, x, y, s, s);
      else ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 1;
    });

    // draw snake
    this.snake.positions.forEach((pos, i) => {
      this.board.drawCell(pos.x, pos.y, (ctx, x, y, s) => {
        const idx = this.snake.imageIndices[i];
        const img = this.loadedImages[idx];
        if (img && img.naturalWidth) ctx.drawImage(img, x, y, s, s);
        else ctx.fillRect(x, y, s, s);
      });
    });
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => new GameController());

// ===== Add this to the end of game.js =====

document.addEventListener('DOMContentLoaded', () => {
  // Grab the footer link, the hidden iframe and its container
  const launchLink = document.getElementById('spotify-launch');
  const embed      = document.getElementById('spotify-embed');
  const container  = document.getElementById('spotify-embed-container');
  const playLink   = document.getElementById('play-link');
  const controls   = document.querySelector('.touch-controls');

  if (launchLink) {
    launchLink.addEventListener('click', function(e) {
      e.preventDefault();  // Stop the normal link navigation

      // 1) Read the playlist URL from the link
      const playlistUrl = this.href;

      // 2) Convert to the embed form:
      //    https://open.spotify.com/playlist/... → https://open.spotify.com/embed/playlist/...
      const embedUrl = playlistUrl.replace(
        'open.spotify.com/',
        'open.spotify.com/embed/'
      );

      // 3) Load it into the iframe
      embed.src = embedUrl;

      // 4) Reveal the iframe container
      container.style.display = 'block';
    });
  }

  if (playLink && controls) {
    playLink.addEventListener('click', e => {
      e.preventDefault();
      controls.classList.toggle('active');
    });
  }
});
