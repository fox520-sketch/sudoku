const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const CELLS = 81;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROW_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ROOM_PREFIX = 'OCEAN-';
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const LEGACY_DIFFICULTY_MAP = { easy: '4', medium: '8', hard: '14', expert: '18' };

function normalizeDifficultyKey(value) {
  const raw = String(value ?? '').trim();
  if (DIFFICULTIES[raw]) return raw;
  if (LEGACY_DIFFICULTY_MAP[raw]) return LEGACY_DIFFICULTY_MAP[raw];
  const digits = raw.replace(/[^\d]/g, '');
  return DIFFICULTIES[digits] ? digits : '8';
}

function populateDifficultyOptions() {
  difficultyEl.innerHTML = '';
  Object.entries(DIFFICULTIES).forEach(([key, info]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${String(info.level).padStart(2, '0')}｜${info.name}`;
    difficultyEl.appendChild(option);
  });
}

function normalizeThemeKey(value) {
  const key = String(value || '').trim();
  return THEMES[key] ? key : 'ocean';
}

function populateThemeOptions() {
  themeEl.innerHTML = '';
  Object.entries(THEMES).forEach(([key, info]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = info.label;
    themeEl.appendChild(option);
  });
}

function getSavedTheme() {
  return normalizeThemeKey(localStorage.getItem('oceanSudokuTheme'));
}

function saveTheme(themeKey) {
  localStorage.setItem('oceanSudokuTheme', themeKey);
}

function updateThemeColor(themeKey) {
  const meta = document.querySelector('meta[name="theme-color"]');
  const color = THEMES[themeKey]?.themeColor || THEMES.ocean.themeColor;
  if (meta) meta.setAttribute('content', color);
}

function applyTheme(themeKey, options = {}) {
  const key = normalizeThemeKey(themeKey);
  state.theme = key;
  document.body.dataset.theme = key;
  if (themeEl) themeEl.value = key;
  saveTheme(key);
  updateThemeColor(key);
  if (options.updateUrl) updateThemeInBrowserUrl();
}

function getDifficultyInfo(key = difficultyEl.value) {
  return DIFFICULTIES[normalizeDifficultyKey(key)] || DIFFICULTIES['8'];
}

function normalizePlayMode(value) {
  const key = String(value || '').trim();
  return PLAY_MODES[key] ? key : 'normal';
}

function getSavedPlayMode() {
  return normalizePlayMode(localStorage.getItem('oceanSudokuPlayMode'));
}

function savePlayMode(mode) {
  localStorage.setItem('oceanSudokuPlayMode', normalizePlayMode(mode));
}

function isTeacherMode() {
  return state.playMode === 'teacher';
}

function setPlayMode(mode, options = {}) {
  const nextMode = normalizePlayMode(mode);
  const wasTeacherMode = state.playMode === 'teacher';
  state.playMode = nextMode;
  savePlayMode(nextMode);
  if (playModeEl) playModeEl.value = nextMode;
  document.body.classList.toggle('teacher-mode', nextMode === 'teacher');

  if (wasTeacherMode && nextMode !== 'teacher' && state.tutor?.active) {
    resetTeacherMode();
  }

  updateTeacherControls();
  renderTeacherStep();

  if (!options.silent) {
    setMessage(nextMode === 'teacher'
      ? '已切換到電腦教學模式，其他操作面板已隱藏。'
      : '已切換到一般遊玩模式，電腦教學面板已隱藏。');
  }
}

const DIFFICULTY_NAMES = {
  1: '最簡單',
  2: '很簡單',
  3: '簡單+',
  4: '輕鬆',
  5: '初階',
  6: '初中階',
  7: '中下',
  8: '中階',
  9: '中階+',
  10: '進階入門',
  11: '進階',
  12: '進階+',
  13: '挑戰',
  14: '困難',
  15: '困難+',
  16: '高難度',
  17: '專家',
  18: '專家+',
  19: '大師',
  20: '最難'
};

const DIFFICULTIES = (() => {
  const givensByLevel = {
    1: 50, 2: 49, 3: 47, 4: 45, 5: 43,
    6: 41, 7: 39, 8: 37, 9: 35, 10: 34,
    11: 33, 12: 32, 13: 31, 14: 30, 15: 29,
    16: 28, 17: 27, 18: 26, 19: 25, 20: 24
  };
  return Object.fromEntries(Object.entries(givensByLevel).map(([level, givens]) => {
    const key = String(level);
    const name = DIFFICULTY_NAMES[level] || '挑戰';
    return [key, {
      level: Number(level),
      givens,
      name,
      label: `${level} 級`,
      display: `${level} 級｜${name}`
    }];
  }));
})();

const THEMES = {
  ocean: { label: '海洋風', themeColor: '#0f7f9a' },
  eyeCare: { label: '護眼風', themeColor: '#778a45' },
  epaper: { label: '電子紙', themeColor: '#666666' },
  dusk: { label: '暮光風', themeColor: '#5d58ca' },
  sakura: { label: '櫻花風', themeColor: '#cf7f9e' },
  forest: { label: '森林風', themeColor: '#3f7a55' }
};

const PLAY_MODES = {
  normal: { label: '一般遊玩' },
  teacher: { label: '電腦教學' }
};

const $ = (selector) => document.querySelector(selector);
const boardEl = $('#board');
const boardPanelEl = document.querySelector('.board-panel');
const padEl = $('#numberPad');
const messageEl = $('#message');
const timerEl = $('#timer');
const mistakesEl = $('#mistakes');
const hintsEl = $('#hints');
const difficultyEl = $('#difficulty');
const themeEl = $('#theme');
const playModeEl = $('#playMode');
const loadingEl = $('#loading');
const newGameBtn = $('#newGameBtn');
const shareBtn = $('#shareBtn');
const noteBtn = $('#noteBtn');
const eraseBtn = $('#eraseBtn');
const hintBtn = $('#hintBtn');
const checkBtn = $('#checkBtn');
const winDialog = $('#winDialog');
const winText = $('#winText');
const playerNameEl = $('#playerName');
const createRoomBtn = $('#createRoomBtn');
const copyRoomLinkBtn = $('#copyRoomLinkBtn');
const roomCodeInput = $('#roomCodeInput');
const joinRoomBtn = $('#joinRoomBtn');
const leaveRoomBtn = $('#leaveRoomBtn');
const roomStatusEl = $('#roomStatus');
const playerListEl = $('#playerList');
const roomBadgeEl = $('#roomBadge');
const teacherStartBtn = $('#teacherStartBtn');
const teacherPrevBtn = $('#teacherPrevBtn');
const teacherNextBtn = $('#teacherNextBtn');
const teacherResetBtn = $('#teacherResetBtn');
const teacherStatusEl = $('#teacherStatus');
const teacherStepEl = $('#teacherStep');
const teacherBadgeEl = $('#teacherBadge');
const teacherPanelEl = document.querySelector('.teacher-panel');
const teacherDragHandleEl = $('#teacherDragHandle');

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
  locked: false,
  busy: false,
  theme: 'ocean',
  playMode: 'normal',
  tutor: {
    active: false,
    steps: [],
    stepIndex: 0,
    startedAtCurrent: [],
    panelDrag: {
      active: false,
      pointerId: null,
      offsetX: 0,
      offsetY: 0
    }
  },
  room: {
    configured: false,
    db: null,
    code: '',
    ref: null,
    playerRef: null,
    playerId: '',
    playerName: '',
    handler: null,
    heartbeatId: null,
    applyingRemote: false,
    loaded: false,
    completedShown: false,
    solvedBy: {}
  }
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


function rowLabel(row) { return ROW_LABELS[row] || String(row + 1); }
function colLabel(col) { return COL_LABELS[col] || String(col + 1); }
function cellCoordinate(index) { return `${rowLabel(rowOf(index))}${colLabel(colOf(index))}`; }

function cellLabel(index) {
  return `${cellCoordinate(index)}（第 ${rowLabel(rowOf(index))} 列、第 ${colLabel(colOf(index))} 行）`;
}

function unitName(type, unitIndex) {
  if (type === 'row') return `第 ${rowLabel(unitIndex)} 列`;
  if (type === 'col') return `第 ${colLabel(unitIndex)} 行`;
  return `第 ${unitIndex + 1} 宮（3×3 宮格）`;
}

function unitCells(type, unitIndex) {
  if (type === 'row') return DIGITS.map((_, c) => unitIndex * BOARD_SIZE + c);
  if (type === 'col') return DIGITS.map((_, r) => r * BOARD_SIZE + unitIndex);

  const startRow = Math.floor(unitIndex / BOX_SIZE) * BOX_SIZE;
  const startCol = (unitIndex % BOX_SIZE) * BOX_SIZE;
  const cells = [];
  for (let r = startRow; r < startRow + BOX_SIZE; r++) {
    for (let c = startCol; c < startCol + BOX_SIZE; c++) {
      cells.push(r * BOARD_SIZE + c);
    }
  }
  return cells;
}

function presentNumbersInUnit(board, cells) {
  return [...new Set(cells.map((index) => board[index]).filter(Boolean))].sort((a, b) => a - b);
}

function formatNumbers(numbers) {
  return numbers.length ? numbers.join('、') : '沒有已知數字';
}

function formatCandidateList(candidates) {
  return candidates.length ? candidates.join('、') : '無候選數';
}

function makeCandidateSnapshot(board) {
  return Array.from({ length: CELLS }, (_, index) => candidatesFor(board, index));
}

function getEliminationReason(board, index, candidates) {
  const rowCells = unitCells('row', rowOf(index));
  const colCells = unitCells('col', colOf(index));
  const boxCells = unitCells('box', boxOf(index));
  return `觀察 ${cellLabel(index)}：同列已有 ${formatNumbers(presentNumbersInUnit(board, rowCells))}；同行已有 ${formatNumbers(presentNumbersInUnit(board, colCells))}；同一個 3×3 宮格已有 ${formatNumbers(presentNumbersInUnit(board, boxCells))}。這裡的「宮格」就是包住這格的 3×3 小方塊。排除後，候選數只剩 ${formatCandidateList(candidates)}。`;
}

function findNakedSingleStep(board, solution, candidateSnapshot) {
  for (let index = 0; index < CELLS; index++) {
    if (board[index] !== 0) continue;
    const candidates = candidateSnapshot[index];
    if (candidates.length === 1) {
      const value = candidates[0];
      return {
        technique: '唯一候選',
        index,
        value,
        candidates,
        title: `${cellLabel(index)} 只剩一個可能數字`,
        reason: getEliminationReason(board, index, candidates),
        conclusion: `所以這格必須填 ${value}。`
      };
    }
  }
  return null;
}

function findHiddenSingleStep(board, solution, candidateSnapshot) {
  const unitTypes = ['row', 'col', 'box'];
  for (const type of unitTypes) {
    for (let unitIndex = 0; unitIndex < BOARD_SIZE; unitIndex++) {
      const cells = unitCells(type, unitIndex);
      for (const digit of DIGITS) {
        if (cells.some((index) => board[index] === digit)) continue;
        const places = cells.filter((index) => board[index] === 0 && candidateSnapshot[index].includes(digit));
        if (places.length === 1) {
          const index = places[0];
          return {
            technique: '隱性唯一',
            index,
            value: digit,
            candidates: candidateSnapshot[index],
            title: `${unitName(type, unitIndex)} 的 ${digit} 只有一個位置可放`,
            reason: `${unitName(type, unitIndex)} 還缺數字 ${digit}。檢查這個區域的空格後，只有 ${cellLabel(index)} 的候選數包含 ${digit}，其他空格都不能放 ${digit}。`,
            conclusion: `所以 ${cellLabel(index)} 要填 ${digit}。`
          };
        }
      }
    }
  }
  return null;
}

function findAdvancedStep(board, solution, candidateSnapshot) {
  let bestIndex = -1;
  let bestCandidates = null;
  for (let index = 0; index < CELLS; index++) {
    if (board[index] !== 0) continue;
    const candidates = candidateSnapshot[index];
    if (!bestCandidates || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
    }
  }

  if (bestIndex < 0) return null;
  const value = solution[bestIndex];
  return {
    technique: '進階推理示範',
    index: bestIndex,
    value,
    candidates: bestCandidates || [],
    title: `${cellLabel(bestIndex)} 需要進階判斷`,
    reason: `目前用「唯一候選」與「隱性唯一」暫時推不動。電腦改用候選數最少的格子來示範進階思路：${cellLabel(bestIndex)} 的候選數是 ${formatCandidateList(bestCandidates || [])}。`,
    conclusion: `沿著正確分支推演，這格最後可確定為 ${value}。實際練習時，可以把這一步當成較高階技巧或假設推理的示範。`
  };
}

function generateTutorialSteps(puzzle, solution) {
  const board = [...puzzle];
  const steps = [];
  const maxSteps = CELLS;

  for (let guard = 0; guard < maxSteps; guard++) {
    if (board.every((value, index) => value === solution[index])) break;

    const candidateSnapshot = makeCandidateSnapshot(board);
    let step =
      findNakedSingleStep(board, solution, candidateSnapshot) ||
      findHiddenSingleStep(board, solution, candidateSnapshot) ||
      findAdvancedStep(board, solution, candidateSnapshot);

    if (!step || !Number.isInteger(step.index)) break;

    step.number = steps.length + 1;
    step.boardBefore = boardToString(board);
    board[step.index] = step.value;
    step.boardAfter = boardToString(board);
    steps.push(step);
  }

  return steps;
}

function clearTutorState() {
  state.tutor.active = false;
  state.tutor.steps = [];
  state.tutor.stepIndex = 0;
  state.tutor.startedAtCurrent = [];
  resetTeacherPanelPosition();
  updateTeacherControls();
}

function restoreBoardFromTutorStart() {
  if (state.tutor.startedAtCurrent?.length === CELLS) {
    state.current = [...state.tutor.startedAtCurrent];
    state.locked = state.current.every((value, index) => value === state.solution[index]);
    state.notes = Array.from({ length: CELLS }, () => new Set());
    state.selected = state.current.findIndex((value, index) => !state.fixed[index] && value === 0);
    if (state.selected < 0) state.selected = 0;
    renderBoard();
  }
}

function updateTeacherControls() {
  if (!teacherStartBtn) return;

  const active = state.tutor.active;
  const total = state.tutor.steps.length;
  const stepIndex = state.tutor.stepIndex;
  const roomMode = isInRoom();
  const teacherMode = isTeacherMode();
  document.body.classList.toggle('teacher-mode', teacherMode);
  document.body.classList.toggle('tutor-active', active && teacherMode);

  teacherStartBtn.disabled = state.busy || roomMode || !teacherMode;
  teacherPrevBtn.disabled = state.busy || !active || stepIndex <= 0 || !teacherMode;
  teacherNextBtn.disabled = state.busy || !active || stepIndex >= total || !teacherMode;
  teacherResetBtn.disabled = state.busy || !active || !teacherMode;

  if (teacherBadgeEl) {
    if (roomMode) teacherBadgeEl.textContent = '單人可用';
    else if (active) teacherBadgeEl.textContent = `${stepIndex}/${total}`;
    else teacherBadgeEl.textContent = '未開始';
  }

  if (roomMode && !active && teacherStatusEl) {
    teacherStatusEl.textContent = '多人房間中暫停教學功能，請先離開房間再使用，避免覆蓋大家的同步進度。';
  }
}

function renderTeacherStep() {
  if (!teacherStepEl || !teacherStatusEl) return;
  updateTeacherControls();

  if (!isTeacherMode()) {
    teacherStatusEl.textContent = '切換到「電腦教學」模式後，才會顯示教學功能。';
    teacherStepEl.innerHTML = '<strong>電腦教學已隱藏：</strong><span>一般遊玩模式會顯示多人房間、筆記、提示與數字鍵盤。</span>';
    return;
  }

  if (!state.tutor.active) {
    teacherStatusEl.textContent = '選好題目後，按「開始教學」，電腦會從原題開始，一步一步示範如何思考。';
    teacherStepEl.innerHTML = '<strong>教學模式會說明：</strong><span>候選數、唯一候選、隱性唯一，以及必要時的進階推理示範。</span>';
    return;
  }

  const total = state.tutor.steps.length;
  const currentStepNumber = state.tutor.stepIndex;
  teacherStatusEl.textContent = currentStepNumber >= total
    ? `教學完成，共 ${total} 步。`
    : `教學進度：已完成 ${currentStepNumber} / ${total} 步。按「下一步」繼續。`;

  const step = state.tutor.steps[Math.max(0, currentStepNumber - 1)];
  if (!step) {
    teacherStepEl.innerHTML = '<strong>準備開始：</strong><span>按「下一步」，電腦會先找最容易確定的格子。</span>';
    return;
  }

  teacherStepEl.innerHTML = `
    <strong>第 ${step.number} 步｜${step.technique}</strong>
    <span>${step.title}</span>
    <span>${step.reason}</span>
    <span>${step.conclusion}</span>
  `;
}


function resetTeacherPanelPosition() {
  if (!teacherPanelEl) return;
  const drag = state.tutor.panelDrag;
  drag.active = false;
  drag.pointerId = null;
  drag.offsetX = 0;
  drag.offsetY = 0;
  teacherPanelEl.classList.remove('dragging', 'user-positioned');
  document.body.classList.remove('dragging-teacher-panel');
  teacherPanelEl.style.left = '';
  teacherPanelEl.style.top = '';
  teacherPanelEl.style.right = '';
  teacherPanelEl.style.bottom = '';
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTeacherPanelBounds() {
  const rect = teacherPanelEl.getBoundingClientRect();
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
  return { rect, margin, maxLeft, maxTop };
}

function moveTeacherPanelTo(left, top) {
  if (!teacherPanelEl) return;
  const { margin, maxLeft, maxTop } = getTeacherPanelBounds();
  const nextLeft = clampNumber(left, margin, maxLeft);
  const nextTop = clampNumber(top, margin, maxTop);

  // 拖曳後只使用 left/top 定位，避免和 CSS 原本的 right/bottom 混用造成游標偏移或面板跳走。
  teacherPanelEl.style.left = `${Math.round(nextLeft)}px`;
  teacherPanelEl.style.top = `${Math.round(nextTop)}px`;
  teacherPanelEl.style.right = 'auto';
  teacherPanelEl.style.bottom = 'auto';
  teacherPanelEl.classList.add('user-positioned');
}

function keepTeacherPanelInsideViewport() {
  if (!teacherPanelEl || !teacherPanelEl.classList.contains('user-positioned')) return;
  const rect = teacherPanelEl.getBoundingClientRect();
  moveTeacherPanelTo(rect.left, rect.top);
}

function isTeacherPanelFloating() {
  return document.body.classList.contains('tutor-active') && teacherPanelEl;
}

function setupTeacherPanelDrag() {
  if (!teacherPanelEl || !teacherDragHandleEl) return;

  teacherDragHandleEl.addEventListener('pointerdown', (event) => {
    if (!isTeacherPanelFloating()) return;
    event.preventDefault();

    const rect = teacherPanelEl.getBoundingClientRect();

    state.tutor.panelDrag = {
      active: true,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    // 先把目前 CSS 計算出來的位置固定成 left/top，滑鼠才會一直對準原本抓住的位置。
    teacherPanelEl.style.left = `${Math.round(rect.left)}px`;
    teacherPanelEl.style.top = `${Math.round(rect.top)}px`;
    teacherPanelEl.style.right = 'auto';
    teacherPanelEl.style.bottom = 'auto';
    teacherPanelEl.classList.add('dragging', 'user-positioned');
    document.body.classList.add('dragging-teacher-panel');

    try {
      teacherDragHandleEl.setPointerCapture?.(event.pointerId);
    } catch (error) {
      // 某些瀏覽器在特殊情況下可能不能 capture，忽略即可，仍可用 window pointermove。
    }
  }, { passive: false });

  window.addEventListener('pointermove', (event) => {
    const drag = state.tutor.panelDrag;
    if (!drag.active) return;
    if (drag.pointerId !== null && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
    event.preventDefault();

    moveTeacherPanelTo(
      event.clientX - drag.offsetX,
      event.clientY - drag.offsetY
    );
  }, { passive: false });

  const endDrag = (event) => {
    const drag = state.tutor.panelDrag;
    if (!drag.active) return;
    if (drag.pointerId !== null && event?.pointerId !== undefined && event.pointerId !== drag.pointerId) return;

    drag.active = false;
    document.body.classList.remove('dragging-teacher-panel');
    teacherPanelEl.classList.remove('dragging');
    keepTeacherPanelInsideViewport();

    try {
      if (event?.pointerId !== undefined) teacherDragHandleEl.releasePointerCapture?.(event.pointerId);
    } catch (error) {
      // pointer capture 可能已被瀏覽器釋放。
    }
  };

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  window.addEventListener('resize', keepTeacherPanelInsideViewport);
}

function keepBoardVisibleDuringTeaching() {
  if (!boardPanelEl) return;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const behavior = prefersReducedMotion ? 'auto' : 'smooth';
  const isNarrow = window.matchMedia?.('(max-width: 860px)')?.matches;
  const rect = boardEl.getBoundingClientRect();
  const boardMostlyVisible = rect.top >= 72 && rect.bottom <= window.innerHeight - 72;

  if (isNarrow || !boardMostlyVisible) {
    boardPanelEl.scrollIntoView({ behavior, block: 'start' });
  }
}

function startTeacherMode() {
  if (!isTeacherMode()) {
    setPlayMode('teacher', { silent: true });
  }
  if (isInRoom()) {
    setMessage('多人房間中請先離開房間，再使用電腦解題教學。');
    updateTeacherControls();
    return;
  }
  if (state.busy) return;

  const steps = generateTutorialSteps(state.puzzle, state.solution);
  if (!steps.length) {
    setMessage('這題目前沒有可教學的步驟，可能已經完成。');
    return;
  }

  state.tutor.active = true;
  state.tutor.steps = steps;
  state.tutor.stepIndex = 0;
  state.tutor.startedAtCurrent = [...state.current];

  state.current = [...state.puzzle];
  state.notes = Array.from({ length: CELLS }, () => new Set());
  state.selected = state.current.findIndex((value) => value === 0);
  state.locked = false;
  state.notesMode = false;

  renderBoard();
  renderTeacherStep();
  setMessage(`電腦教學已開始，共 ${steps.length} 步。按「下一步」開始推理。`);
  setTimeout(keepBoardVisibleDuringTeaching, 60);
}

function applyTutorialBoard(stepCount) {
  state.current = [...state.puzzle];
  for (let i = 0; i < stepCount; i++) {
    const step = state.tutor.steps[i];
    if (!step) break;
    state.current[step.index] = step.value;
  }
  const focusStep = state.tutor.steps[Math.max(0, stepCount - 1)];
  state.selected = focusStep ? focusStep.index : state.current.findIndex((value) => value === 0);
  if (state.selected < 0) state.selected = 0;
}

function nextTeacherStep() {
  if (!state.tutor.active) {
    startTeacherMode();
    return;
  }
  if (state.tutor.stepIndex >= state.tutor.steps.length) return;

  state.tutor.stepIndex += 1;
  applyTutorialBoard(state.tutor.stepIndex);
  state.notes = Array.from({ length: CELLS }, () => new Set());

  if (state.tutor.stepIndex >= state.tutor.steps.length) {
    state.locked = true;
    clearInterval(state.timerId);
    setMessage('電腦教學已完成整題解答。');
  } else {
    const step = state.tutor.steps[state.tutor.stepIndex - 1];
    setMessage(`第 ${step.number} 步：${step.technique}。`);
  }

  renderBoard();
  renderTeacherStep();
  setTimeout(keepBoardVisibleDuringTeaching, 60);
}

function previousTeacherStep() {
  if (!state.tutor.active || state.tutor.stepIndex <= 0) return;
  state.tutor.stepIndex -= 1;
  state.locked = false;
  applyTutorialBoard(state.tutor.stepIndex);
  state.notes = Array.from({ length: CELLS }, () => new Set());
  renderBoard();
  renderTeacherStep();
  setMessage(state.tutor.stepIndex === 0 ? '已回到教學起點。' : `已回到第 ${state.tutor.stepIndex} 步。`);
  setTimeout(keepBoardVisibleDuringTeaching, 60);
}

function resetTeacherMode() {
  if (!state.tutor.active) return;
  restoreBoardFromTutorStart();
  clearTutorState();
  renderTeacherStep();
  setMessage('已結束電腦教學，並回到開始教學前的盤面。');
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
    cell.dataset.coord = cellCoordinate(i);
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${cellLabel(i)}，座標 ${cellCoordinate(i)}`);
    cell.title = cellLabel(i);
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
  const tutorialFocusIndex = state.tutor.active && state.tutor.stepIndex > 0
    ? state.tutor.steps[state.tutor.stepIndex - 1]?.index
    : -1;
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
    if (index === tutorialFocusIndex) cell.classList.add('tutorial-focus');
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

function isInRoom() {
  return Boolean(state.room.code);
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
    setMessage(isInRoom() ? '已更新個人筆記。筆記不會同步到房間。' : '已更新筆記。');
    renderBoard();
    return;
  }

  const wasEmpty = state.current[index] === 0;
  const wasCorrectBefore = state.current[index] === state.solution[index];
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
  syncRoomState({ action: 'input', index, value, wasCorrectBefore });
}

function eraseSelected() {
  if (state.locked || state.selected < 0) return;
  const index = state.selected;
  if (state.fixed[index]) {
    setMessage('題目原本給的數字不能清除。');
    return;
  }
  const wasCorrectBefore = state.current[index] === state.solution[index];
  state.current[index] = 0;
  state.notes[index].clear();
  setMessage('已清除。');
  renderBoard();
  syncRoomState({ action: 'erase', index, value: 0, wasCorrectBefore });
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
  syncRoomState({ action: 'hint', index, value: state.solution[index] });
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
  syncRoomState({ action: 'check', index: -1, value: 0 });
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
  const difficulty = getDifficultyInfo(difficultyEl.value).display;
  winText.textContent = `難度：${difficulty}｜時間：${timerEl.textContent}｜錯誤：${state.mistakes}｜提示：${state.hints}`;
  setMessage(isInRoom() ? '恭喜！這個房間已經完成這題數獨。' : '恭喜完成這題數獨！');
  if (typeof winDialog.showModal === 'function') winDialog.showModal();
  syncRoomState({ action: 'finish', index: -1, value: 0 });
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
  state.tutor.active = false;
  state.tutor.steps = [];
  state.tutor.stepIndex = 0;
  state.tutor.startedAtCurrent = [];
  state.room.solvedBy = {};
  renderTeacherStep();
}

function setControlsDisabled(disabled) {
  state.busy = disabled;
  const roomMode = isInRoom();
  newGameBtn.disabled = disabled || roomMode;
  difficultyEl.disabled = disabled || roomMode;
  shareBtn.disabled = disabled;
  [noteBtn, eraseBtn, hintBtn, checkBtn, ...padEl.children]
    .filter(Boolean)
    .forEach((el) => {
      el.disabled = disabled;
    });
  updateRoomControls();
  updateTeacherControls();
}

function getDifficultyFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeDifficultyKey(params.get('difficulty'));
}

function getThemeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');
  return theme ? normalizeThemeKey(theme) : getSavedTheme();
}

function getSeedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeSeed(params.get('seed'));
}

function getRoomFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeRoomCode(params.get('room'));
}

function makeShareUrl(seed = state.seed, difficultyKey = difficultyEl.value) {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.set('seed', seed);
  url.searchParams.set('difficulty', normalizeDifficultyKey(difficultyKey));
  url.searchParams.set('theme', state.theme || normalizeThemeKey(themeEl?.value));
  url.hash = '';
  return url.toString();
}

function makeRoomUrl(code = state.room.code) {
  const url = new URL(window.location.href);
  url.searchParams.delete('seed');
  url.searchParams.delete('difficulty');
  url.searchParams.set('room', code);
  url.searchParams.set('theme', state.theme || normalizeThemeKey(themeEl?.value));
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

function updateBrowserUrlForRoom(code) {
  try {
    window.history.replaceState(null, '', makeRoomUrl(code));
  } catch (error) {
    // 不影響遊戲。
  }
}

function updateThemeInBrowserUrl() {
  if (isInRoom()) updateBrowserUrlForRoom(state.room.code);
  else updateBrowserUrl(state.seed || getSeedFromUrl() || createSeed(), difficultyEl.value);
}

function removeRoomFromBrowserUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.set('seed', state.seed);
    url.searchParams.set('difficulty', normalizeDifficultyKey(difficultyEl.value));
    url.searchParams.set('theme', state.theme || normalizeThemeKey(themeEl?.value));
    window.history.replaceState(null, '', url.toString());
  } catch (error) {
    // 不影響遊戲。
  }
}

function newGame(options = {}) {
  if (isInRoom() && !options.ignoreRoom) {
    setMessage('多人房間中不能直接換題，請先離開房間。');
    return;
  }

  const difficultyKey = normalizeDifficultyKey(options.difficultyKey || difficultyEl.value);
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
      setMessage(`${getDifficultyInfo(difficultyKey).display} 題目已產生，${shareHint}`);
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

async function copyText(text, successMessage, fallbackMessage) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
      return true;
    }
  } catch (error) {
    // 若瀏覽器不允許 Clipboard API，改用備用複製方式。
  }

  if (fallbackCopy(text)) {
    setMessage(successMessage);
    return true;
  }

  setMessage(fallbackMessage);
  return false;
}

async function copyShareLink() {
  const link = makeShareUrl();
  const message = isInRoom()
    ? '單人同題連結已複製！朋友打開後會看到同一題，但不會加入多人房間。'
    : '分享連結已複製！朋友打開後會看到同一題，但進度各自獨立。';
  await copyText(link, message, '無法自動複製，請直接複製目前瀏覽器網址列的連結。');
}

async function copyRoomLink() {
  if (!isInRoom()) return;
  await copyText(
    makeRoomUrl(),
    '多人房間連結已複製！朋友打開後會加入同一盤並同步進度。',
    '無法自動複製，請直接複製目前瀏覽器網址列的房間連結。'
  );
}

function moveSelection(deltaRow, deltaCol) {
  if (state.selected < 0) return;
  const nextRow = Math.max(0, Math.min(8, rowOf(state.selected) + deltaRow));
  const nextCol = Math.max(0, Math.min(8, colOf(state.selected) + deltaCol));
  selectCell(nextRow * BOARD_SIZE + nextCol);
}

function boardToString(board) {
  return board.map((value) => Number(value) || 0).join('');
}

function stringToBoard(value) {
  const text = String(value || '');
  if (!/^\d{81}$/.test(text)) return null;
  return [...text].map((char) => Number(char));
}

function normalizeSolvedBy(value) {
  if (!value || typeof value !== 'object') return {};
  const solvedBy = {};
  for (const [rawIndex, rawPlayerId] of Object.entries(value)) {
    const index = Number(rawIndex);
    const playerId = String(rawPlayerId || '').trim();
    if (Number.isInteger(index) && index >= 0 && index < CELLS && playerId) {
      solvedBy[index] = playerId;
    }
  }
  return solvedBy;
}

function countSolvedBy(solvedBy, playerId) {
  const id = String(playerId || '');
  if (!id) return 0;
  return Object.values(normalizeSolvedBy(solvedBy)).filter((value) => value === id).length;
}

function getServerIncrement(delta) {
  const increment = window.firebase?.database?.ServerValue?.increment;
  return typeof increment === 'function' ? increment(delta) : delta;
}

function getContributionUpdates(move = {}) {
  if (!isInRoom() || !Number.isInteger(move.index) || move.index < 0 || move.index >= CELLS) return {};
  if (state.fixed[move.index]) return {};

  const updates = {};
  const indexKey = String(move.index);
  const existingSolver = state.room.solvedBy?.[indexKey] || state.room.solvedBy?.[move.index] || '';
  const isCorrectNow = state.current[move.index] === state.solution[move.index];
  const shouldCountAsSolved = move.action === 'input' && isCorrectNow;

  if (shouldCountAsSolved && !existingSolver) {
    updates[`solvedBy/${indexKey}`] = state.room.playerId;
    updates[`players/${state.room.playerId}/solvedCount`] = getServerIncrement(1);
  } else if (!isCorrectNow && existingSolver) {
    updates[`solvedBy/${indexKey}`] = null;
    updates[`players/${existingSolver}/solvedCount`] = getServerIncrement(-1);
  } else if (move.action === 'erase' && existingSolver && move.wasCorrectBefore) {
    updates[`solvedBy/${indexKey}`] = null;
    updates[`players/${existingSolver}/solvedCount`] = getServerIncrement(-1);
  }

  return updates;
}

function createRoomCode() {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  return `${ROOM_PREFIX}${suffix}`;
}

function normalizeRoomCode(value) {
  let code = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!code) return '';
  if (!code.startsWith(ROOM_PREFIX) && /^[A-Z0-9]{4,6}$/.test(code)) code = `${ROOM_PREFIX}${code}`;
  return code.slice(0, 16);
}

function getFirebaseServerTimestamp() {
  return window.firebase?.database?.ServerValue?.TIMESTAMP || Date.now();
}

function getFirebaseConfig() {
  return window.OCEAN_SUDOKU_FIREBASE_CONFIG || null;
}

function hasUsableFirebaseConfig(config) {
  return Boolean(
    config &&
    config.apiKey &&
    config.databaseURL &&
    !String(config.apiKey).includes('PASTE_') &&
    !String(config.databaseURL).includes('PASTE_')
  );
}

function setupFirebase() {
  const config = getFirebaseConfig();

  if (!hasUsableFirebaseConfig(config)) {
    state.room.configured = false;
    state.room.db = null;
    setRoomStatus('尚未設定 Firebase。請先編輯 firebase-config.js，設定後即可使用多人房間。');
    updateRoomControls();
    return false;
  }

  if (!window.firebase?.initializeApp || !window.firebase?.database) {
    state.room.configured = false;
    state.room.db = null;
    setRoomStatus('Firebase SDK 尚未載入完成，請確認網路連線後重新整理。');
    updateRoomControls();
    return false;
  }

  try {
    if (!window.firebase.apps.length) window.firebase.initializeApp(config);
    state.room.db = window.firebase.database();
    state.room.configured = true;
    setRoomStatus('單人模式。建立房間後即可多人同步同一盤。');
    updateRoomControls();
    return true;
  } catch (error) {
    console.error(error);
    state.room.configured = false;
    state.room.db = null;
    setRoomStatus('Firebase 初始化失敗，請檢查 firebase-config.js 與 Realtime Database 設定。');
    updateRoomControls();
    return false;
  }
}

function setRoomStatus(text) {
  roomStatusEl.textContent = text;
}

function getOrCreatePlayerId() {
  const key = 'oceanSudokuPlayerId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function normalizePlayerName(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 18);
  if (clean) return clean;
  const id = state.room.playerId || getOrCreatePlayerId();
  return `海友${id.slice(-4).toUpperCase()}`;
}

function setupPlayerName() {
  state.room.playerId = getOrCreatePlayerId();
  const savedName = localStorage.getItem('oceanSudokuPlayerName') || '';
  playerNameEl.value = savedName || normalizePlayerName('');
  state.room.playerName = normalizePlayerName(playerNameEl.value);
}

function savePlayerName() {
  const name = normalizePlayerName(playerNameEl.value);
  playerNameEl.value = name;
  state.room.playerName = name;
  localStorage.setItem('oceanSudokuPlayerName', name);
  if (state.room.playerRef) {
    state.room.playerRef.update({
      name,
      lastSeen: getFirebaseServerTimestamp()
    }).catch((error) => {
      console.warn('更新玩家名稱失敗', error);
    });
  }
  renderPlayers();
}

function updateRoomControls() {
  const configured = state.room.configured;
  const roomMode = isInRoom();
  const busy = state.busy;

  createRoomBtn.disabled = busy || !configured || roomMode;
  joinRoomBtn.disabled = busy || !configured || roomMode;
  roomCodeInput.disabled = busy || !configured || roomMode;
  copyRoomLinkBtn.disabled = busy || !roomMode;
  leaveRoomBtn.disabled = busy || !roomMode;
  playerNameEl.disabled = busy;

  if (roomMode) {
    roomBadgeEl.textContent = state.room.code;
    roomBadgeEl.classList.add('online');
  } else {
    roomBadgeEl.textContent = configured ? '單人' : '未設定';
    roomBadgeEl.classList.toggle('online', configured);
  }
  updateTeacherControls();
}

function renderPlayers(players = null, solvedBy = state.room.solvedBy) {
  if (!players) {
    playerListEl.innerHTML = '';
    return;
  }

  const solvedMap = normalizeSolvedBy(solvedBy);
  const entries = Object.entries(players)
    .map(([id, player]) => {
      const fallbackCount = countSolvedBy(solvedMap, id);
      const savedCount = Number(player?.solvedCount);
      return {
        id,
        name: player?.name || '海友',
        solvedCount: Number.isFinite(savedCount) ? Math.max(0, savedCount) : fallbackCount,
        online: player?.online !== false
      };
    })
    .sort((a, b) => Number(b.online) - Number(a.online) || b.solvedCount - a.solvedCount || a.name.localeCompare(b.name, 'zh-Hant'));

  playerListEl.innerHTML = '';
  for (const player of entries) {
    const chip = document.createElement('span');
    chip.className = 'player-chip';
    if (player.id === state.room.playerId) chip.classList.add('me');
    if (!player.online) chip.classList.add('offline');
    const selfLabel = player.id === state.room.playerId ? '（你）' : '';
    const offlineLabel = player.online ? '' : '（離線）';
    const label = `${player.name}${selfLabel}${offlineLabel}`;
    chip.textContent = `${label}｜${player.solvedCount} 格`;
    playerListEl.appendChild(chip);
  }
}

function roomPayloadFromCurrentGame() {
  return {
    seed: state.seed,
    difficulty: normalizeDifficultyKey(difficultyEl.value),
    puzzle: boardToString(state.puzzle),
    solution: boardToString(state.solution),
    current: boardToString(state.current),
    mistakes: state.mistakes,
    hints: state.hints,
    locked: false,
    solvedBy: {},
    createdAt: getFirebaseServerTimestamp(),
    updatedAt: getFirebaseServerTimestamp(),
    lastMove: {
      action: 'create',
      playerId: state.room.playerId,
      playerName: normalizePlayerName(playerNameEl.value),
      index: -1,
      value: 0,
      at: getFirebaseServerTimestamp()
    }
  };
}

async function createRoom() {
  if (!setupFirebase()) return;
  if (isInRoom()) return;
  if (state.busy) {
    setMessage('題目產生中，請稍後再建立房間。');
    return;
  }

  savePlayerName();
  let code = createRoomCode();
  let roomRef = state.room.db.ref(`rooms/${code}`);

  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) break;
    code = createRoomCode();
    roomRef = state.room.db.ref(`rooms/${code}`);
  }

  try {
    await roomRef.set(roomPayloadFromCurrentGame());
    await enterRoom(code, { created: true });
    setMessage(`已建立房間 ${code}，複製房間連結給朋友即可同步遊玩。`);
  } catch (error) {
    console.error(error);
    setMessage('建立房間失敗，請檢查 Firebase Realtime Database 規則。');
  }
}

async function joinRoomFromInput() {
  const code = normalizeRoomCode(roomCodeInput.value);
  if (!code) {
    setMessage('請先輸入房間代碼。');
    return;
  }
  await enterRoom(code);
}

function applyRoomSnapshot(data, initial = false) {
  const puzzle = stringToBoard(data?.puzzle);
  const solution = stringToBoard(data?.solution);
  const current = stringToBoard(data?.current || data?.puzzle);
  if (!puzzle || !solution || !current) {
    setMessage('房間資料不完整，無法載入這一盤。');
    return false;
  }

  state.seed = normalizeSeed(data.seed) || state.seed;
  difficultyEl.value = normalizeDifficultyKey(data.difficulty);
  state.puzzle = puzzle;
  state.solution = solution;
  state.current = current;
  state.fixed = puzzle.map((value) => value !== 0);
  state.mistakes = Number(data.mistakes || 0);
  state.hints = Number(data.hints || 0);
  state.locked = data.locked === true || state.current.every((value, index) => value === state.solution[index]);
  state.room.solvedBy = normalizeSolvedBy(data.solvedBy);
  clearTutorState();

  if (initial) {
    state.notes = Array.from({ length: CELLS }, () => new Set());
    state.selected = state.current.findIndex((value, i) => !state.fixed[i] && value === 0);
    if (state.selected < 0) state.selected = 0;
    state.notesMode = false;
    startTimer();
  }

  if (state.locked) {
    clearInterval(state.timerId);
    if (!state.room.completedShown) {
      state.room.completedShown = true;
      setMessage('這個多人房間已經完成這題數獨！');
    }
  } else if (initial) {
    setMessage(`已加入房間 ${state.room.code}，正在同步同一盤。`);
  }

  renderBoard();
  return true;
}

async function enterRoom(rawCode, options = {}) {
  if (!setupFirebase()) return;
  const code = normalizeRoomCode(rawCode);
  if (!code) {
    setMessage('房間代碼格式不正確。');
    return;
  }

  const roomRef = state.room.db.ref(`rooms/${code}`);
  let roomData = null;

  try {
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) {
      setMessage(`找不到房間 ${code}，請確認房間代碼是否正確。`);
      return;
    }
    roomData = snapshot.val() || {};
  } catch (error) {
    console.error(error);
    setMessage('讀取房間失敗，請確認 Firebase Realtime Database 是否已啟用。');
    return;
  }

  await leaveRoom({ quiet: true, keepUrl: true });

  savePlayerName();
  state.room.code = code;
  state.room.ref = roomRef;
  state.room.loaded = false;
  state.room.completedShown = false;
  state.room.playerRef = roomRef.child(`players/${state.room.playerId}`);

  try {
    await state.room.playerRef.set({
      name: state.room.playerName,
      solvedCount: countSolvedBy(roomData?.solvedBy, state.room.playerId),
      online: true,
      joinedAt: getFirebaseServerTimestamp(),
      lastSeen: getFirebaseServerTimestamp()
    });
    state.room.playerRef.onDisconnect().update({
      online: false,
      lastSeen: getFirebaseServerTimestamp()
    });
    state.room.heartbeatId = setInterval(() => {
      if (state.room.playerRef) {
        state.room.playerRef.update({ lastSeen: getFirebaseServerTimestamp() }).catch(() => {});
      }
    }, 15000);
  } catch (error) {
    console.error(error);
    setMessage('加入房間失敗，請檢查 Firebase 寫入規則。');
    await leaveRoom({ quiet: true, keepUrl: true });
    return;
  }

  state.room.handler = (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      leaveRoom({ quiet: true });
      setMessage('房間已不存在，已回到單人模式。');
      return;
    }

    state.room.applyingRemote = true;
    const initial = !state.room.loaded;
    if (applyRoomSnapshot(data, initial)) {
      state.room.loaded = true;
      renderPlayers(data.players || {}, data.solvedBy || {});
      setRoomStatus(`房間 ${state.room.code}｜多人同步中｜每位海友分開統計正確填入格數。`);
    }
    state.room.applyingRemote = false;
    updateRoomControls();
  };

  roomRef.on('value', state.room.handler);
  roomCodeInput.value = code;
  updateBrowserUrlForRoom(code);
  updateRoomControls();

  if (options.created) setRoomStatus(`房間 ${code}｜把房間連結傳給朋友。`);
}

async function leaveRoom(options = {}) {
  const hadRoom = isInRoom();

  if (state.room.ref && state.room.handler) {
    state.room.ref.off('value', state.room.handler);
  }
  if (state.room.heartbeatId) clearInterval(state.room.heartbeatId);

  if (state.room.playerRef) {
    try {
      await state.room.playerRef.update({
        online: false,
        lastSeen: getFirebaseServerTimestamp()
      });
    } catch (error) {
      // 離開房間的清除失敗不影響本機遊戲。
    }
  }

  state.room.code = '';
  state.room.ref = null;
  state.room.playerRef = null;
  state.room.handler = null;
  state.room.heartbeatId = null;
  state.room.applyingRemote = false;
  state.room.loaded = false;
  state.room.completedShown = false;
  state.room.solvedBy = {};
  renderPlayers();
  updateRoomControls();

  if (hadRoom && !options.keepUrl) removeRoomFromBrowserUrl();
  if (hadRoom && !options.quiet) setMessage('已離開多人房間，現在回到單人模式。');
  if (!isInRoom() && state.room.configured) setRoomStatus('單人模式。建立房間後即可多人同步同一盤。');
}

function syncRoomState(move = {}) {
  if (!isInRoom() || state.room.applyingRemote || !state.room.ref) return;

  const updates = {
    current: boardToString(state.current),
    mistakes: state.mistakes,
    hints: state.hints,
    locked: state.locked,
    updatedAt: getFirebaseServerTimestamp(),
    lastMove: {
      action: move.action || 'update',
      playerId: state.room.playerId,
      playerName: state.room.playerName,
      index: Number.isInteger(move.index) ? move.index : -1,
      value: Number.isInteger(move.value) ? move.value : 0,
      at: getFirebaseServerTimestamp()
    },
    ...getContributionUpdates(move)
  };

  state.room.ref.update(updates).catch((error) => {
    console.error(error);
    setMessage('同步房間失敗，請檢查網路或 Firebase 規則。');
  });
}

function bindEvents() {
  newGameBtn.addEventListener('click', () => newGame());
  difficultyEl.addEventListener('change', () => newGame());
  themeEl.addEventListener('change', () => {
    applyTheme(themeEl.value, { updateUrl: true });
    setMessage(`已切換為 ${THEMES[state.theme].label}。`);
  });
  playModeEl?.addEventListener('change', () => setPlayMode(playModeEl.value));
  shareBtn.addEventListener('click', copyShareLink);
  createRoomBtn.addEventListener('click', createRoom);
  copyRoomLinkBtn.addEventListener('click', copyRoomLink);
  joinRoomBtn.addEventListener('click', joinRoomFromInput);
  leaveRoomBtn.addEventListener('click', () => leaveRoom());
  roomCodeInput.addEventListener('input', () => {
    const code = normalizeRoomCode(roomCodeInput.value);
    roomCodeInput.value = code;
  });
  roomCodeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') joinRoomFromInput();
  });
  playerNameEl.addEventListener('change', savePlayerName);
  playerNameEl.addEventListener('blur', savePlayerName);

  noteBtn.addEventListener('click', () => {
    state.notesMode = !state.notesMode;
    setMessage(state.notesMode ? '筆記模式已開啟。' : '筆記模式已關閉。');
    renderBoard();
  });
  eraseBtn.addEventListener('click', eraseSelected);
  hintBtn.addEventListener('click', giveHint);
  checkBtn.addEventListener('click', checkBoard);
  teacherStartBtn?.addEventListener('click', startTeacherMode);
  teacherPrevBtn?.addEventListener('click', previousTeacherStep);
  teacherNextBtn?.addEventListener('click', nextTeacherStep);
  teacherResetBtn?.addEventListener('click', resetTeacherMode);

  document.addEventListener('keydown', (event) => {
    const activeTag = document.activeElement?.tagName?.toLowerCase();
    if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') return;

    if (event.key >= '1' && event.key <= '9') handleNumber(Number(event.key));
    else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') eraseSelected();
    else if (event.key.toLowerCase() === 'n') noteBtn.click();
    else if (event.key.toLowerCase() === 'h') giveHint();
    else if (event.key.toLowerCase() === 't') {
      if (!isTeacherMode()) setPlayMode('teacher');
      else startTeacherMode();
    }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1, 0); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1, 0); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(0, -1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(0, 1); }
  });

  window.addEventListener('beforeunload', () => {
    if (state.room.playerRef) {
      state.room.playerRef.update({
        online: false,
        lastSeen: getFirebaseServerTimestamp()
      });
    }
  });
}

function init() {
  populateDifficultyOptions();
  populateThemeOptions();
  applyTheme(getThemeFromUrl());
  setPlayMode(getSavedPlayMode(), { silent: true });
  difficultyEl.value = getDifficultyFromUrl();
  buildBoard();
  buildPad();
  setupTeacherPanelDrag();
  setupPlayerName();
  bindEvents();
  setupFirebase();
  renderTeacherStep();

  const roomCode = getRoomFromUrl();
  const sharedSeed = getSeedFromUrl();

  if (roomCode && state.room.configured) {
    setPlayMode('normal', { silent: true });
    newGame({ updateUrl: false });
    enterRoom(roomCode);
  } else if (sharedSeed) {
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

  if (roomCode && !state.room.configured) {
    setMessage('這是多人房間連結，但 Firebase 尚未設定，所以目前只能以單人模式開啟。');
  }
}

init();
