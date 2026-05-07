const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const CELLS = 81;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DIFFICULTIES = {
  easy: { label: '簡單', givens: 45 },
  medium: { label: '中等', givens: 38 },
  hard: { label: '困難', givens: 32 },
  expert: { label: '專家', givens: 28 }
};

const $ = (selector) => document.querySelector(selector);
const boardEl = $('#board');
const padEl = $('#numberPad');
const messageEl = $('#message');
const timerEl = $('#timer');
const mistakesEl = $('#mistakes');
const hintsEl = $('#hints');
const difficultyEl = $('#difficulty');
const loadingEl = $('#loading');
const newGameBtn = $('#newGameBtn');
const shareBtn = $('#shareBtn');
const noteBtn = $('#noteBtn');
const eraseBtn = $('#eraseBtn');
const hintBtn = $('#hintBtn');
const checkBtn = $('#checkBtn');
const winDialog = $('#winDialog');
const winText = $('#winText');

const state = {
  puzzle: Array(CELLS).fill(0),
  solution: Array(CELLS).fill(0),
  current: Array(CELLS).fill(0),
  fixed: Array(CELLS).fill(false),
  notes: Array.from({ length: CELLS }, () => new Set()),
  selected: -1,
  mistakes: 0,
  hints: 0,
  notesMode: false,
  seed: '',
  startedAt: Date.now(),
  elapsed: 0,
  timerId: null,
  locked: false
};

function createSeed() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${time}-${random}`;
}

function normalizeSeed(seed) {
  return String(seed || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let seedValue = hashString(seed || 'ocean-sudoku');
  return function rng() {
    seedValue += 0x6D2B79F5;
    let t = seedValue;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function rowOf(index) { return Math.floor(index / BOARD_SIZE); }
function colOf(index) { return index % BOARD_SIZE; }
function boxOf(index) { return Math.floor(rowOf(index) / BOX_SIZE) * BOX_SIZE + Math.floor(colOf(index) / BOX_SIZE); }

function isValidPlacement(board, index, value) {
  const row = rowOf(index);
  const col = colOf(index);
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board[row * BOARD_SIZE + c] === value && c !== col) return false;
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r * BOARD_SIZE + col] === value && r !== row) return false;
  }
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      const i = r * BOARD_SIZE + c;
      if (board[i] === value && i !== index) return false;
    }
  }
  return true;
}

function candidatesFor(board, index) {
  if (board[index] !== 0) return [];
  return DIGITS.filter((value) => isValidPlacement(board, index, value));
}

function fillRandom(board, rng) {
  let bestIndex = -1;
  let bestCandidates = null;

  for (let i = 0; i < CELLS; i++) {
    if (board[i] !== 0) continue;
    const candidates = candidatesFor(board, i);
    if (candidates.length === 0) return false;
    if (!bestCandidates || candidates.length < bestCandidates.length) {
      bestIndex = i;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }

  if (bestIndex === -1) return true;

  for (const value of shuffle(bestCandidates, rng)) {
    board[bestIndex] = value;
    if (fillRandom(board, rng)) return true;
    board[bestIndex] = 0;
  }
  return false;
}

function makeSolution(rng) {
  const board = Array(CELLS).fill(0);
  fillRandom(board, rng);
  return board;
}

function countSolutions(board, limit = 2) {
  let count = 0;
  const work = [...board];

  function search() {
    if (count >= limit) return;
    let bestIndex = -1;
    let bestCandidates = null;

    for (let i = 0; i < CELLS; i++) {
      if (work[i] !== 0) continue;
      const candidates = candidatesFor(work, i);
      if (candidates.length === 0) return;
      if (!bestCandidates || candidates.length < bestCandidates.length) {
        bestIndex = i;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }

    if (bestIndex === -1) {
      count += 1;
      return;
    }

    for (const value of bestCandidates) {
      work[bestIndex] = value;
      search();
      work[bestIndex] = 0;
      if (count >= limit) return;
    }
  }

  search();
  return count;
}

function createPuzzle(difficultyKey, seed) {
  const targetGivens = DIFFICULTIES[difficultyKey].givens;
  const rng = makeRng(`${seed}|${difficultyKey}`);
  let bestPuzzle = null;
  let bestClues = CELLS;

  for (let attempt = 0; attempt < 24; attempt++) {
    const solution = makeSolution(rng);
    const puzzle = [...solution];
    const order = shuffle([...Array(CELLS).keys()], rng);
    let clues = CELLS;

    for (const index of order) {
      if (clues <= targetGivens) break;
      const mirror = CELLS - 1 - index;
      const removed = [];

      if (puzzle[index] !== 0) {
        removed.push([index, puzzle[index]]);
        puzzle[index] = 0;
        clues -= 1;
      }
      if (mirror !== index && puzzle[mirror] !== 0 && clues > targetGivens) {
        removed.push([mirror, puzzle[mirror]]);
        puzzle[mirror] = 0;
        clues -= 1;
      }

      if (removed.length === 0) continue;

      if (countSolutions(puzzle, 2) !== 1) {
        for (const [removedIndex, removedValue] of removed) puzzle[removedIndex] = removedValue;
        clues += removed.length;
      }
    }

    if (clues < bestClues) {
      bestClues = clues;
      bestPuzzle = { puzzle, solution };
    }
    if (clues <= targetGivens + 1) return { puzzle, solution };
  }

  return bestPuzzle;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function startTimer() {
  clearInterval(state.timerId);
  state.startedAt = Date.now();
  state.elapsed = 0;
  timerEl.textContent = '00:00';
  state.timerId = setInterval(() => {
    state.elapsed = Date.now() - state.startedAt;
    timerEl.textContent = formatTime(state.elapsed);
  }, 500);
}

function buildBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < CELLS; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    cell.dataset.index = String(i);
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `第 ${rowOf(i) + 1} 列，第 ${colOf(i) + 1} 行`);
    cell.addEventListener('click', () => selectCell(i));
    boardEl.appendChild(cell);
  }
}

function buildPad() {
  padEl.innerHTML = '';
  for (const value of DIGITS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(value);
    button.addEventListener('click', () => handleNumber(value));
    padEl.appendChild(button);
  }
}

function renderBoard() {
  const selectedValue = state.selected >= 0 ? state.current[state.selected] : 0;
  [...boardEl.children].forEach((cell, index) => {
    const value = state.current[index];
    const isSelected = index === state.selected;
    const isPeer = state.selected >= 0 && index !== state.selected && (
      rowOf(index) === rowOf(state.selected) ||
      colOf(index) === colOf(state.selected) ||
      boxOf(index) === boxOf(state.selected)
    );
    const isSame = selectedValue !== 0 && value === selectedValue && index !== state.selected;
    const isWrong = value !== 0 && value !== state.solution[index] && !state.fixed[index];

    cell.className = 'cell';
    if (state.fixed[index]) cell.classList.add('given');
    if (isPeer) cell.classList.add('peer');
    if (isSame) cell.classList.add('same');
    if (isSelected) cell.classList.add('selected');
    if (isWrong) cell.classList.add('error');

    cell.innerHTML = '';
    if (value !== 0) {
      cell.textContent = value;
    } else if (state.notes[index].size > 0) {
      const notes = document.createElement('div');
      notes.className = 'notes';
      for (const digit of DIGITS) {
        const span = document.createElement('span');
        span.textContent = state.notes[index].has(digit) ? digit : '';
        notes.appendChild(span);
      }
      cell.appendChild(notes);
    }
  });

  mistakesEl.textContent = String(state.mistakes);
  hintsEl.textContent = String(state.hints);
  noteBtn.classList.toggle('active', state.notesMode);
  noteBtn.setAttribute('aria-pressed', String(state.notesMode));
}

function selectCell(index) {
  if (state.locked) return;
  state.selected = index;
  renderBoard();
}

function setMessage(text) {
  messageEl.textContent = text;
}

function clearPeerNotes(index, value) {
  for (let i = 0; i < CELLS; i++) {
    if (i === index) continue;
    if (rowOf(i) === rowOf(index) || colOf(i) === colOf(index) || boxOf(i) === boxOf(index)) {
      state.notes[i].delete(value);
    }
  }
}

function handleNumber(value) {
  if (state.locked || state.selected < 0) {
    setMessage('請先選擇一個空格。');
    return;
  }
  const index = state.selected;
  if (state.fixed[index]) {
    setMessage('題目原本給的數字不能修改。');
    return;
  }

  if (state.notesMode) {
    if (state.current[index] !== 0) return;
    if (state.notes[index].has(value)) state.notes[index].delete(value);
    else state.notes[index].add(value);
    setMessage('已更新筆記。');
    renderBoard();
    return;
  }

  const wasEmpty = state.current[index] === 0;
  state.current[index] = value;
  state.notes[index].clear();
  clearPeerNotes(index, value);

  if (value !== state.solution[index]) {
    state.mistakes += 1;
    setMessage('這格好像不是這個數字，再想想看。');
  } else {
    setMessage(wasEmpty ? '填得不錯！' : '已更新數字。');
    const cell = boardEl.children[index];
    cell?.classList.add('complete-pulse');
    setTimeout(() => cell?.classList.remove('complete-pulse'), 240);
  }

  renderBoard();
  maybeFinish();
}

function eraseSelected() {
  if (state.locked || state.selected < 0) return;
  const index = state.selected;
  if (state.fixed[index]) {
    setMessage('題目原本給的數字不能清除。');
    return;
  }
  state.current[index] = 0;
  state.notes[index].clear();
  setMessage('已清除。');
  renderBoard();
}

function giveHint() {
  if (state.locked) return;
  let index = state.selected;
  if (index < 0 || state.fixed[index] || state.current[index] === state.solution[index]) {
    index = state.current.findIndex((value, i) => !state.fixed[i] && value !== state.solution[i]);
  }
  if (index < 0) {
    setMessage('目前沒有需要提示的格子。');
    return;
  }
  state.selected = index;
  state.current[index] = state.solution[index];
  state.notes[index].clear();
  state.hints += 1;
  clearPeerNotes(index, state.solution[index]);
  setMessage(`提示：這格是 ${state.solution[index]}。`);
  renderBoard();
  maybeFinish();
}

function checkBoard() {
  if (state.locked) return;
  const emptyCount = state.current.filter((value) => value === 0).length;
  const wrongCount = state.current.filter((value, index) => value !== 0 && value !== state.solution[index]).length;
  if (wrongCount === 0 && emptyCount === 0) {
    finishGame();
  } else if (wrongCount === 0) {
    setMessage(`目前都正確，還剩 ${emptyCount} 格。`);
  } else {
    setMessage(`目前有 ${wrongCount} 格需要修正。`);
  }
  renderBoard();
}

function maybeFinish() {
  if (state.current.every((value, index) => value === state.solution[index])) {
    finishGame();
  }
}

function finishGame() {
  if (state.locked) return;
  state.locked = true;
  clearInterval(state.timerId);
  const difficulty = DIFFICULTIES[difficultyEl.value].label;
  winText.textContent = `難度：${difficulty}｜時間：${timerEl.textContent}｜錯誤：${state.mistakes}｜提示：${state.hints}`;
  setMessage('恭喜完成這題數獨！');
  if (typeof winDialog.showModal === 'function') winDialog.showModal();
}

function resetState(puzzleData, seed) {
  state.puzzle = puzzleData.puzzle;
  state.solution = puzzleData.solution;
  state.current = [...puzzleData.puzzle];
  state.fixed = puzzleData.puzzle.map((value) => value !== 0);
  state.notes = Array.from({ length: CELLS }, () => new Set());
  state.selected = state.current.findIndex((value) => value === 0);
  state.mistakes = 0;
  state.hints = 0;
  state.notesMode = false;
  state.seed = seed;
  state.locked = false;
}

function setControlsDisabled(disabled) {
  [newGameBtn, shareBtn, difficultyEl, noteBtn, eraseBtn, hintBtn, checkBtn, ...padEl.children]
    .filter(Boolean)
    .forEach((el) => {
      el.disabled = disabled;
    });
}

function getDifficultyFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const difficulty = params.get('difficulty');
  return DIFFICULTIES[difficulty] ? difficulty : 'medium';
}

function getSeedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeSeed(params.get('seed'));
}

function makeShareUrl(seed = state.seed, difficultyKey = difficultyEl.value) {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', seed);
  url.searchParams.set('difficulty', difficultyKey);
  url.hash = '';
  return url.toString();
}

function updateBrowserUrl(seed, difficultyKey) {
  try {
    const url = makeShareUrl(seed, difficultyKey);
    window.history.replaceState(null, '', url);
  } catch (error) {
    // 在部分舊瀏覽器或特殊環境可能不能更新網址，不影響遊戲。
  }
}

function newGame(options = {}) {
  const difficultyKey = options.difficultyKey || difficultyEl.value;
  const seed = normalizeSeed(options.seed) || createSeed();
  const updateUrl = options.updateUrl !== false;
  difficultyEl.value = difficultyKey;

  loadingEl.hidden = false;
  setControlsDisabled(true);
  setMessage('正在產生新題目...');

  requestAnimationFrame(() => {
    setTimeout(() => {
      const puzzleData = createPuzzle(difficultyKey, seed);
      resetState(puzzleData, seed);
      startTimer();
      renderBoard();
      if (updateUrl) updateBrowserUrl(seed, difficultyKey);
      const shareHint = options.fromSharedUrl ? '你正在玩朋友分享的同一題。' : '可按「分享同一題」複製連結給朋友。';
      setMessage(`${DIFFICULTIES[difficultyKey].label}題目已產生，${shareHint}`);
      loadingEl.hidden = true;
      setControlsDisabled(false);
    }, 20);
  });
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }
  textarea.remove();
  return copied;
}

async function copyShareLink() {
  const link = makeShareUrl();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      setMessage('分享連結已複製！朋友打開後會看到同一題，但進度各自獨立。');
      return;
    }
  } catch (error) {
    // 若瀏覽器不允許 Clipboard API，改用備用複製方式。
  }

  if (fallbackCopy(link)) {
    setMessage('分享連結已複製！朋友打開後會看到同一題，但進度各自獨立。');
  } else {
    setMessage('無法自動複製，請直接複製目前瀏覽器網址列的連結。');
  }
}

function moveSelection(deltaRow, deltaCol) {
  if (state.selected < 0) return;
  const nextRow = Math.max(0, Math.min(8, rowOf(state.selected) + deltaRow));
  const nextCol = Math.max(0, Math.min(8, colOf(state.selected) + deltaCol));
  selectCell(nextRow * BOARD_SIZE + nextCol);
}

function bindEvents() {
  newGameBtn.addEventListener('click', () => newGame());
  difficultyEl.addEventListener('change', () => newGame());
  shareBtn.addEventListener('click', copyShareLink);
  noteBtn.addEventListener('click', () => {
    state.notesMode = !state.notesMode;
    setMessage(state.notesMode ? '筆記模式已開啟。' : '筆記模式已關閉。');
    renderBoard();
  });
  eraseBtn.addEventListener('click', eraseSelected);
  hintBtn.addEventListener('click', giveHint);
  checkBtn.addEventListener('click', checkBoard);

  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '9') handleNumber(Number(event.key));
    else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') eraseSelected();
    else if (event.key.toLowerCase() === 'n') noteBtn.click();
    else if (event.key.toLowerCase() === 'h') giveHint();
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1, 0); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1, 0); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(0, -1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(0, 1); }
  });
}

function init() {
  buildBoard();
  buildPad();
  bindEvents();

  const sharedSeed = getSeedFromUrl();
  if (sharedSeed) {
    const difficultyKey = getDifficultyFromUrl();
    newGame({
      seed: sharedSeed,
      difficultyKey,
      updateUrl: false,
      fromSharedUrl: true
    });
  } else {
    newGame();
  }
}

init();
