/**
 * Conway's Game of Life — Cosmic Void
 * shawnrider.com
 *
 * Cells render as points of light in deep space.
 */
(function () {
  'use strict';

  var CELL_SIZE = 10;
  var TICK_MS = 150;
  var DENSITY = 0.25;

  // Neon star palette
  var PALETTE = [
    [255, 216, 102],  // gold
    [255, 110, 180],  // pink
    [120, 220, 232],  // cyan
    [199, 146, 234],  // purple
    [169, 220, 118],  // green
    [240, 236, 248],  // white
    [122, 162, 247],  // blue
    [252, 152, 103],  // orange
  ];

  function GameOfLife(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = 0;
    this.rows = 0;
    this.grid = [];
    this.age = [];       // track how long each cell has been alive (for shimmer)
    this.running = true;
    this.rafId = null;
    this.lastTick = 0;
    this.tick = 0;       // global tick counter for shimmer phase

    this.resize();
    this.seed();
    this.bindEvents();
  }

  GameOfLife.prototype.resize = function () {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.cols = Math.ceil(this.canvas.width / CELL_SIZE);
    this.rows = Math.ceil(this.canvas.height / CELL_SIZE);

    var oldGrid = this.grid;
    var oldAge = this.age;
    var oldCols = oldGrid.length > 0 ? oldGrid[0].length : 0;
    var oldRows = oldGrid.length;
    this.grid = [];
    this.age = [];

    for (var r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      this.age[r] = [];
      for (var c = 0; c < this.cols; c++) {
        if (r < oldRows && c < oldCols) {
          this.grid[r][c] = oldGrid[r][c];
          this.age[r][c] = oldAge[r] ? (oldAge[r][c] || 0) : 0;
        } else {
          this.grid[r][c] = Math.random() < DENSITY ? 1 : 0;
          this.age[r][c] = 0;
        }
      }
    }
  };

  GameOfLife.prototype.seed = function () {
    this.grid = [];
    this.age = [];
    for (var r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      this.age[r] = [];
      for (var c = 0; c < this.cols; c++) {
        var alive = Math.random() < DENSITY ? 1 : 0;
        this.grid[r][c] = alive;
        this.age[r][c] = 0;
      }
    }
  };

  GameOfLife.prototype.step = function () {
    var next = [];
    var nextAge = [];
    this.tick++;
    for (var r = 0; r < this.rows; r++) {
      next[r] = [];
      nextAge[r] = [];
      for (var c = 0; c < this.cols; c++) {
        var neighbors = this.countNeighbors(r, c);
        if (this.grid[r][c]) {
          if (neighbors === 2 || neighbors === 3) {
            next[r][c] = 1;
            nextAge[r][c] = this.age[r][c] + 1;
          } else {
            next[r][c] = 0;
            nextAge[r][c] = 0;
          }
        } else {
          if (neighbors === 3) {
            next[r][c] = 1;
            nextAge[r][c] = 1; // newborn
          } else {
            next[r][c] = 0;
            nextAge[r][c] = 0;
          }
        }
      }
    }
    this.grid = next;
    this.age = nextAge;
  };

  GameOfLife.prototype.countNeighbors = function (r, c) {
    var count = 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = (r + dr + this.rows) % this.rows;
        var nc = (c + dc + this.cols) % this.cols;
        count += this.grid[nr][nc];
      }
    }
    return count;
  };

  GameOfLife.prototype.render = function () {
    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;

    // Clear to transparent so CSS gradient background shows through
    ctx.clearRect(0, 0, w, h);

    var t = this.tick;

    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) continue;

        var ci = ((r * 31 + c * 17) & 0x7fffffff) % PALETTE.length;
        var rgb = PALETTE[ci];
        var age = this.age[r][c];
        var cx = c * CELL_SIZE + CELL_SIZE * 0.5;
        var cy = r * CELL_SIZE + CELL_SIZE * 0.5;

        // Shimmer: brightness oscillates per-cell based on position + time
        var phase = (r * 7 + c * 13 + t * 0.4);
        var shimmer = 0.6 + 0.4 * Math.sin(phase);

        // Newborn cells flare bright
        var birthFlare = age < 3 ? 1.5 - (age * 0.25) : 1.0;

        var brightness = shimmer * birthFlare;
        var alpha = Math.min(brightness * 0.85, 1.0);

        // Outer glow — soft, big, dim
        var glowR = 3 + shimmer * 2;
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (alpha * 0.6) + ')');
        grad.addColorStop(0.4, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (alpha * 0.2) + ')');
        grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');

        ctx.fillStyle = grad;
        ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

        // Core — bright hot point
        var coreSize = 1.0 + shimmer * 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgb(' + Math.min(rgb[0] + 60, 255) + ',' + Math.min(rgb[1] + 60, 255) + ',' + Math.min(rgb[2] + 60, 255) + ')';
        ctx.fillRect(cx - coreSize * 0.5, cy - coreSize * 0.5, coreSize, coreSize);
        ctx.globalAlpha = 1;
      }
    }
  };

  GameOfLife.prototype.toggleCell = function (x, y) {
    var c = Math.floor(x / CELL_SIZE);
    var r = Math.floor(y / CELL_SIZE);
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.grid[r][c] = this.grid[r][c] ? 0 : 1;
      this.age[r][c] = this.grid[r][c] ? 1 : 0;
    }
  };

  GameOfLife.prototype.spawnGlider = function (x, y) {
    var c = Math.floor(x / CELL_SIZE);
    var r = Math.floor(y / CELL_SIZE);
    var pattern = [
      [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
    ];
    for (var i = 0; i < pattern.length; i++) {
      var pr = (r + pattern[i][0]) % this.rows;
      var pc = (c + pattern[i][1]) % this.cols;
      this.grid[pr][pc] = 1;
      this.age[pr][pc] = 1;
    }
  };

  GameOfLife.prototype.bindEvents = function () {
    var self = this;
    var resizeTimer;

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        self.resize();
        self.render();
      }, 200);
    });

    this.canvas.addEventListener('click', function (e) {
      self.toggleCell(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('dblclick', function (e) {
      e.preventDefault();
      self.spawnGlider(e.clientX, e.clientY);
    });
  };

  GameOfLife.prototype.start = function () {
    var self = this;

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      this.running = false;
      this.render();
      return;
    }

    motionQuery.addEventListener('change', function (e) {
      self.running = !e.matches;
      if (self.running) {
        self.lastTick = performance.now();
        self.loop(self.lastTick);
      }
    });

    this.lastTick = performance.now();
    this.loop(this.lastTick);
  };

  GameOfLife.prototype.loop = function (timestamp) {
    if (!this.running) return;

    var tick = window.golTickMs || TICK_MS;
    if (timestamp - this.lastTick >= tick) {
      this.step();
      this.render();
      this.lastTick = timestamp;
    }

    this.rafId = requestAnimationFrame(this.loop.bind(this));
  };

  GameOfLife.prototype.pause = function () {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  GameOfLife.prototype.resume = function () {
    if (!this.running) {
      this.running = true;
      this.lastTick = performance.now();
      this.loop(this.lastTick);
    }
  };

  // Initialize
  var canvas = document.getElementById('gol-canvas');
  if (canvas) {
    window.gol = new GameOfLife(canvas);
    window.gol.start();
  }
})();
