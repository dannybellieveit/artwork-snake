// game.js — Refactored Snake with debug logging & one-step speed bump

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
    this.imageIndices = [0];    // head always starts with image 0
  }

  move(target, manualDir) {
    const head = { ...this.positions[0] };
    if (manualDir) {
      const next = { x: head.x + manualDir.x, y: head.y + manualDir.y };
      return this._isValid(next) ? next : head;
    }

    // --- DEBUG: log AI candidates each frame ---
    const candidates = this._getCandidates(head, target);
    console.log('    [move] head @', head, '→ candidates:', candidates);
    // --------------------------------------------

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
    this.MAX_SPEEDUP = 8;      // cap at 8×

    this.nextImageIndex = 0;  // cycles across rounds
    this.speedup        = 1;  // bumps only in _die()

    this.board          = new Board('game-canvas', this.CELL);
    this.spotifyEmbed   = document.getElementById('spotify-embed');
    this.embedContainer = document.getElementById('spotify-embed-container');
    this.infoBox        = document.getElementById('info-box');

    this.imagesData = [
      { src: 'assets/photo1.jpg', title: 'Verbathim',     artist: 'Nemahsis',
        spotifyUrl: 'https://open.spotify.com/album/6aLc5t3mdbmonoCZMAnZ7N?si=kf-sDHxGT_qNrv2ax59iPw' },
      { src: 'assets/photo2.jpg', title: 'TV Show',       artist: 'Katie Gregson-MacLeod',
        spotifyUrl: 'https://open.spotify.com/track/0hQZyBWcYejAzb9WYM96pr?si=866aa6756cb24293' },
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
    this.board.onResize = () => this.draw();
    this._preload().then(() => this.start());
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
    if (this.target && pos.x === this.target.x && pos.y === this.target.y) {
      const md = this.imagesData[this.target.metaIndex];
      this.infoBox.textContent = `${md.title} — ${md.artist}`;
      this.board.canvas.style.cursor = 'pointer';
    } else {
      this.infoBox.textContent = '';
      this.board.canvas.style.cursor = 'default';
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
      this.isManual  = true;
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

    // only compute interval from current speedup (bumped in _die)
    this.interval = Math.max(this.MIN_SPEED, this.SPEED_BASE / this.speedup);

    // init snake before spawning target
    this.snake = new Snake(this.loadedImages, this.board);
    this.snake.init();
    this._spawnTarget();

    // debug log as a single object
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
    if (ate) this._spawnTarget();
    this.draw();
  }

  _die() {
    cancelAnimationFrame(this.rafId);
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

      // draw flashing snake
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
        // bump speed once
        this.speedup = (this.speedup >= this.MAX_SPEEDUP ? 1 : this.speedup + 1);
        this.start();
      }
    };

    flash();
  }

  draw() {
    // nothing until snake + target exist
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
