// ── Constants ──
const ROWS = 8;
const COLS = 8;
const TOTAL = ROWS * COLS;
const NUM_JEWELS = 7;
const TARGET_SCORE = 5000;
const GAME_TIME = 300; // 5 minutes in seconds

// ── Board: flat array of 64 ints (0-6 jewel types, -1 empty) ──

class Board {
  constructor() {
    this.cells = new Array(TOTAL).fill(-1);
  }

  copy() {
    const b = new Board();
    b.cells = this.cells.slice();
    return b;
  }

  // Generate a board with no initial matches
  generate() {
    this.cells = new Array(TOTAL).fill(-1);
    for (let i = 0; i < TOTAL; i++) {
      this.cells[i] = this._randomFor(i);
    }
    // Safety: if by any chance matches exist, regenerate
    if (this.findMatches().size > 0) return this.generate();
  }

  _randomFor(index) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const valid = [];
    for (let t = 0; t < NUM_JEWELS; t++) {
      // Check horizontal 3-in-a-row
      if (col >= 2 && this.cells[index - 1] === t && this.cells[index - 2] === t) continue;
      // Check vertical 3-in-a-row
      if (row >= 2 && this.cells[index - COLS] === t && this.cells[index - COLS * 2] === t) continue;
      valid.push(t);
    }
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // Find all matched cell indices
  findMatches() {
    const matched = new Set();

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const i = r * COLS + c;
        const val = this.cells[i];
        if (val < 0) continue;
        let run = 1;
        while (c + run < COLS && this.cells[r * COLS + c + run] === val) run++;
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(i + k);
        }
      }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const i = r * COLS + c;
        const val = this.cells[i];
        if (val < 0) continue;
        let run = 1;
        while (r + run < ROWS && this.cells[(r + run) * COLS + c] === val) run++;
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(i + k * COLS);
        }
      }
    }

    return matched;
  }

  // Check if a swap between index a and b would produce a match
  wouldMatch(a, b) {
    // Must be adjacent
    const ar = Math.floor(a / COLS), ac = a % COLS;
    const br = Math.floor(b / COLS), bc = b % COLS;
    const dr = Math.abs(ar - br), dc = Math.abs(ac - bc);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      // Temporarily swap
      [this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]];
      const matches = this.findMatches().size > 0;
      [this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]];
      return matches;
    }
    return false;
  }

  // Swap two cells
  swap(a, b) {
    [this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]];
  }

  // Apply gravity: remove matched, shift down, fill new
  applyGravity(matched) {
    // Mark matched as empty
    for (const i of matched) this.cells[i] = -1;

    // Shift down per column
    for (let c = 0; c < COLS; c++) {
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const i = r * COLS + c;
        if (this.cells[i] >= 0) {
          this.cells[writeRow * COLS + c] = this.cells[i];
          if (writeRow !== r) this.cells[i] = -1;
          writeRow--;
        }
      }
      // Fill top with new jewels
      for (let r = writeRow; r >= 0; r--) {
        this.cells[r * COLS + c] = Math.floor(Math.random() * NUM_JEWELS);
      }
    }
  }

  // Check if any valid move exists
  hasValidMoves() {
    for (let i = 0; i < TOTAL; i++) {
      const r = Math.floor(i / COLS), c = i % COLS;
      const neighbors = [];
      if (r > 0) neighbors.push(i - COLS);
      if (r < ROWS - 1) neighbors.push(i + COLS);
      if (c > 0) neighbors.push(i - 1);
      if (c < COLS - 1) neighbors.push(i + 1);
      for (const j of neighbors) {
        if (this.wouldMatch(i, j)) return true;
      }
    }
    return false;
  }

  // Shuffle the board
  shuffle() {
    // Fisher-Yates shuffle of jewel types
    const types = this.cells.slice();
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    this.cells = types;
    // If no valid moves after shuffle, try again
    if (!this.hasValidMoves()) return this.shuffle();
    // If pre-existing matches, regenerate
    if (this.findMatches().size > 0) return this.generate();
  }
}

// ── Jewel Renderer ──

class JewelRenderer {
  constructor(boardEl) {
    this.board = boardEl;
    this.cells = [];
    this.jewels = [];
    this._createCells();
  }

  _createCells() {
    this.board.innerHTML = '';
    this.cells = [];
    this.jewels = [];
    for (let i = 0; i < TOTAL; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      this.board.appendChild(cell);
      this.cells.push(cell);
      this.jewels.push(null);
    }
  }

  render(board) {
    for (let i = 0; i < TOTAL; i++) {
      const type = board.cells[i];
      if (type < 0) {
        this._clearCell(i);
      } else if (this.jewels[i] === null) {
        this._createJewel(i, type);
      } else {
        this.jewels[i].className = `jewel jewel-${type}`;
      }
    }
  }

  _createJewel(index, type) {
    const jewel = document.createElement('div');
    jewel.className = `jewel jewel-${type}`;
    this.cells[index].appendChild(jewel);
    this.jewels[index] = jewel;
  }

  _clearCell(index) {
    if (this.jewels[index]) {
      this.cells[index].innerHTML = '';
      this.jewels[index] = null;
    }
  }

  highlightCell(index, on) {
    this.cells[index].classList.toggle('highlight', on);
  }

  selectCell(index) {
    this.clearSelection();
    this.cells[index].classList.add('selected');
  }

  clearSelection() {
    for (const cell of this.cells) cell.classList.remove('selected');
  }

  removeJewels(matched) {
    for (const i of matched) {
      if (this.jewels[i]) {
        this.jewels[i].classList.add('removing');
      }
    }
  }

  removeJewelsDOM(matched) {
    for (const i of matched) {
      if (this.jewels[i]) {
        this.jewels[i].remove();
        this.jewels[i] = null;
      }
    }
  }

  addAppearingJewels(newIndices) {
    for (const i of newIndices) {
      if (this.jewels[i] === null) {
        const type = Math.floor(Math.random() * NUM_JEWELS);
        const jewel = document.createElement('div');
        jewel.className = `jewel jewel-${type} appearing`;
        this.cells[i].appendChild(jewel);
        this.jewels[i] = jewel;
      }
    }
  }

  flashBoard() {
    this.board.classList.add('shuffling');
  }

  clearFlash() {
    this.board.classList.remove('shuffling');
  }
}

// ── Input Handler ──

class InputHandler {
  constructor(boardEl, callbacks) {
    this.board = boardEl;
    this.callbacks = callbacks;
    this.downIndex = -1;
    this.startX = 0;
    this.startY = 0;
    this.dragging = false;
    this.dragThreshold = 20;

    this.board.addEventListener('mousedown', this._onDown.bind(this));
    this.board.addEventListener('touchstart', this._onDown.bind(this), { passive: false });

    document.addEventListener('mousemove', this._onMove.bind(this));
    document.addEventListener('touchmove', this._onMove.bind(this), { passive: false });

    document.addEventListener('mouseup', this._onUp.bind(this));
    document.addEventListener('touchend', this._onUp.bind(this));
  }

  _getCellIndex(target) {
    const cell = target.closest('.cell');
    return cell ? parseInt(cell.dataset.index) : -1;
  }

  _onDown(e) {
    if (e.type === 'touchstart') e.preventDefault();
    const index = this._getCellIndex(e.target);
    if (index < 0) return;
    this.downIndex = index;
    this.startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    this.startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    this.dragging = false;
    this.callbacks.onDown(index);
  }

  _onMove(e) {
    if (this.downIndex < 0) return;
    if (e.type === 'touchmove') e.preventDefault();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const dx = clientX - this.startX;
    const dy = clientY - this.startY;

    if (!this.dragging && Math.max(Math.abs(dx), Math.abs(dy)) > this.dragThreshold) {
      this.dragging = true;
    }

    if (this.dragging) {
      const dir = this._getDirection(dx, dy);
      const target = this._getTargetCell(this.downIndex, dir);
      if (target >= 0) {
        this.callbacks.onDrag(this.downIndex, target);
      }
    }
  }

  _onUp(e) {
    if (this.downIndex < 0) return;
    if (this.dragging) {
      const touch = e.changedTouches?.[0] ?? e;
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      const dx = clientX - this.startX;
      const dy = clientY - this.startY;
      const dir = this._getDirection(dx, dy);
      const target = this._getTargetCell(this.downIndex, dir);
      if (target >= 0) {
        this.callbacks.onDragEnd(this.downIndex, target);
      }
    } else {
      // Tap: select the jewel
      this.callbacks.onTap(this.downIndex);
    }
    this.downIndex = -1;
    this.dragging = false;
  }

  _getDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  _getTargetCell(index, dir) {
    const r = Math.floor(index / COLS), c = index % COLS;
    switch (dir) {
      case 'up':    if (r === 0) return -1; return index - COLS;
      case 'down':  if (r === ROWS - 1) return -1; return index + COLS;
      case 'left':  if (c === 0) return -1; return index - 1;
      case 'right': if (c === COLS - 1) return -1; return index + 1;
    }
    return -1;
  }
}

// ── Game ──

class Game {
  constructor() {
    this.board = new Board();
    this.renderer = null;
    this.input = null;
    this.score = 0;
    this.combo = 0;
    this.jewelsRemoved = 0;
    this.phase = 'idle';
    this.selectedCell = -1;
    this.pendingSwap = null;
    this.invalidSwapBack = null;
    this.timeLeft = GAME_TIME;
    this.timerInterval = null;
  }

  init() {
    const boardEl = document.getElementById('board');
    this.renderer = new JewelRenderer(boardEl);
    this.input = new InputHandler(boardEl, {
      onDown: (i) => this._onDown(i),
      onDrag: (from, to) => this._onDrag(from, to),
      onDragEnd: (from, to) => this._onDragEnd(from, to),
      onTap: (i) => this._onTap(i),
    });
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.jewelsRemoved = 0;
    this.selectedCell = -1;
    this.pendingSwap = null;
    this.invalidSwapBack = null;
    this.timeLeft = GAME_TIME;
    this.phase = 'idle';
    this.board.generate();
    this.renderer.render(this.board);
    this._updateHUD();
    this._showScreen('game-screen');
    this._startTimer();
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _startTimer() {
    this._stopTimer();
    this._updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this._updateTimerDisplay();
      if (this.timeLeft <= 0) {
        this._stopTimer();
        this._endGame(false);
      }
    }, 1000);
  }

  _updateTimerDisplay() {
    const el = document.getElementById('timer');
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (this.timeLeft <= 30) {
      el.classList.add('warning');
    } else {
      el.classList.remove('warning');
    }
  }

  // ── Input callbacks ──

  _onDown(index) {
    if (this.phase !== 'idle') return;
    if (this.board.cells[index] < 0) return;
    this.selectedCell = index;
    this.renderer.selectCell(index);
  }

  _onDrag(from, to) {
    if (this.phase !== 'idle') return;
    this.renderer.highlightCell(to, true);
  }

  _onDragEnd(from, to) {
    if (this.phase !== 'idle') return;
    this.renderer.highlightCell(to, false);
    if (from < 0 || to < 0) return;
    if (!this.board.wouldMatch(from, to)) return;
    this._doSwap(from, to);
  }

  _onTap(index) {
    if (this.phase !== 'idle') return;
    if (this.board.cells[index] < 0) {
      this.selectedCell = -1;
      this.renderer.clearSelection();
      return;
    }
    if (this.selectedCell === index) {
      // Tapped same cell twice — try adjacent swaps
      this._tryAdjacentSwap(index);
    } else if (this.selectedCell >= 0) {
      // Tapped a different cell — try swap
      if (this._areAdjacent(this.selectedCell, index) && this.board.wouldMatch(this.selectedCell, index)) {
        this._doSwap(this.selectedCell, index);
      } else {
        this.selectedCell = index;
        this.renderer.selectCell(index);
      }
    } else {
      this.selectedCell = index;
      this.renderer.selectCell(index);
    }
  }

  _tryAdjacentSwap(index) {
    const r = Math.floor(index / COLS), c = index % COLS;
    const neighbors = [];
    if (r > 0) neighbors.push(index - COLS);
    if (r < ROWS - 1) neighbors.push(index + COLS);
    if (c > 0) neighbors.push(index - 1);
    if (c < COLS - 1) neighbors.push(index + 1);
    // Try each neighbor, pick the first valid swap
    for (const n of neighbors) {
      if (this.board.wouldMatch(index, n)) {
        this._doSwap(index, n);
        return;
      }
    }
    this.selectedCell = -1;
    this.renderer.clearSelection();
  }

  _areAdjacent(a, b) {
    const ar = Math.floor(a / COLS), ac = a % COLS;
    const br = Math.floor(b / COLS), bc = b % COLS;
    return (Math.abs(ar - br) + Math.abs(ac - bc)) === 1;
  }

  // ── Swap ──

  _doSwap(a, b) {
    this.phase = 'swapping';
    this.selectedCell = -1;
    this.renderer.clearSelection();
    this.pendingSwap = { a, b };
    this.board.swap(a, b);
    this.renderer.render(this.board);

    // Animate the swap using transforms
    const cellA = this.renderer.cells[a];
    const cellB = this.renderer.cells[b];
    const jewelA = this.renderer.jewels[a];
    const jewelB = this.renderer.jewels[b];

    const rectA = cellA.getBoundingClientRect();
    const rectB = cellB.getBoundingClientRect();
    const dx = rectB.left - rectA.left;
    const dy = rectB.top - rectA.top;

    if (jewelA) jewelA.style.transition = 'transform 0.2s ease-in-out';
    if (jewelB) jewelB.style.transition = 'transform 0.2s ease-in-out';
    if (jewelA) jewelA.style.transform = `translate(${dx}px, ${dy}px)`;
    if (jewelB) jewelB.style.transform = `translate(${-dx}px, ${-dy}px)`;

    setTimeout(() => {
      if (jewelA) { jewelA.style.transform = ''; jewelA.style.transition = ''; }
      if (jewelB) { jewelB.style.transform = ''; jewelB.style.transition = ''; }
      this.phase = 'checking';
      this._checkMatches();
    }, 200);
  }

  // ── Match detection & cascade ──

  _checkMatches() {
    const matches = this.board.findMatches();
    if (matches.size === 0) {
      // No matches — check for no-valid-moves or win
      if (this.checkWin()) return;
      if (!this.board.hasValidMoves()) {
        this._shuffle();
      } else {
        this.phase = 'idle';
      }
      return;
    }

    this.combo++;
    const score = this._calcScore(matches.size, this.combo);
    this.score += score;
    this.jewelsRemoved += matches.size;
    this._updateHUD();

    this.phase = 'removing';
    this.renderer.removeJewels(matches);

    // After removal animation, apply gravity
    setTimeout(() => {
      this.renderer.removeJewelsDOM(matches);
      this.board.applyGravity(matches);
      this.phase = 'falling';
      this.renderer.render(this.board);
      this._animateFall();
    }, 300);
  }

  _animateFall() {
    // Detect which cells changed (jewels fell or new ones appeared)
    const newIndices = [];
    for (let i = 0; i < TOTAL; i++) {
      if (!this.renderer.jewels[i]) {
        newIndices.push(i);
      }
    }
    this.renderer.addAppearingJewels(newIndices);

    setTimeout(() => {
      this.phase = 'cascading';
      setTimeout(() => {
        this._checkMatches();
      }, 100);
    }, 300);
  }

  _calcScore(matchSize, combo) {
    let points = matchSize * 10;
    if (matchSize > 3) points += (matchSize - 3) * 20;
    if (combo > 1) points += (combo - 1) * 15;
    return points;
  }

  // ── Shuffle ──

  _shuffle() {
    this.phase = 'shuffling';
    this.renderer.flashBoard();
    setTimeout(() => {
      this.board.shuffle();
      this.renderer.render(this.board);
      this.renderer.clearFlash();
      this.phase = 'idle';
    }, 600);
  }

  // ── HUD ──

  _updateHUD() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('target').textContent = TARGET_SCORE;
    document.getElementById('combo').textContent = this.combo > 1 ? `x${this.combo}` : '0';
  }

  // ── Screens ──

  _showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  checkWin() {
    if (this.jewelsRemoved >= TARGET_SCORE) {
      this._endGame(true);
      return true;
    }
    return false;
  }

  _endGame(won) {
    this._stopTimer();
    this.phase = won ? 'victory' : 'gameover';
    this._showScreen('end-screen');
    document.getElementById('end-title').textContent = won ? 'Victory!' : "Time's Up!";
    document.getElementById('end-message').textContent = won
      ? `You reached the target score!`
      : `You scored ${this.score} points.`;
    document.getElementById('end-score').textContent = `Score: ${this.score}`;
  }

}

// ── Init ──

const game = new Game();
game.init();

document.getElementById('play-btn').addEventListener('click', () => game.start());
document.getElementById('restart-btn').addEventListener('click', () => game.start());
