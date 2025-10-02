const BOARD_SIZE = 10;
const FILL_PROBABILITY = 0.5;
const TARGET_NPC_COUNT = 42;
const CLUSTER_BREAK_CHANCE = 0.5;
const NPC_COLORS = ["blue", "red", "yellow", "green"]; 
const NPC_COLOR_NAMES = {
  blue: "Синяя",
  red: "Красная",
  yellow: "Жёлтая",
  green: "Зелёная",
};
const SCORE_MIN = 4;
const SCORE_MAX = 7;
const TARGET_SCORE = 1000;
const MAX_ATTEMPTS = 5;
const boardEl = document.getElementById("board");
const attemptsEl = document.getElementById("attempts-remaining");
const progressFillEl = document.getElementById("progress-fill");
const progressTextEl = document.getElementById("progress-text");
const comboPopoverEl = document.getElementById("combo-popover");
const comboPopoverTitleEl = document.getElementById("combo-popover-title");
const comboPopoverValueEl = document.getElementById("combo-popover-value");
const comboPopoverMultiplierEl = document.getElementById("combo-popover-multiplier");

const boardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
const cellElements = [];
const perimeterCells = [];
let isAnimating = false;
const mergedCells = new Set();
let totalScore = 0;
let attemptsRemaining = MAX_ATTEMPTS;
let isGameOver = false;
let activeRunState = null;
let comboFlightCleanup = null;

const playerToken = document.createElement("div");
playerToken.className = "player-token";
boardEl.appendChild(playerToken);

function init() {
  createCells();
  seedBoard();
  renderPieces();
  resetScoreState();
  refreshPerimeterAvailability(true);
  setStatus("Выберите клетку на контуре, чтобы поставить шашку.");
}

function complimentForScore(score) {
  if (score >= 90) {
    return "Legendary!";
  }
  if (score >= 60) {
    return "Amazing!";
  }
  if (score >= 35) {
    return "Great!";
  }
  if (score >= 16) {
    return "Nice Move!";
  }
  return "Well Done!";
}

function triggerProgressBarAnimation(progressBar, latestGain) {
  progressBar.classList.remove("progress-bar--shake");
  progressBar.getBoundingClientRect();
  progressBar.classList.add("progress-bar--shake");
  if (progressFillEl) {
    progressFillEl.classList.remove("progress-bar__fill--pulse");
    progressFillEl.getBoundingClientRect();
    progressFillEl.classList.add("progress-bar__fill--pulse");
  }
  if (!progressBar.querySelector(".progress-float")) {
    const float = document.createElement("div");
    float.className = "progress-float";
    progressBar.appendChild(float);
  }
  const floatEl = progressBar.querySelector(".progress-float");
  if (floatEl) {
    floatEl.textContent = `+${latestGain}`;
    floatEl.classList.remove("progress-float--active");
    floatEl.getBoundingClientRect();
    floatEl.classList.add("progress-float--active");
    setTimeout(() => {
      floatEl.classList.remove("progress-float--active");
    }, 520);
  }
}

function createCells() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("div");
      cell.classList.add("cell", (row + col) % 2 === 0 ? "light" : "dark");
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      if (isPerimeter(row, col)) {
        cell.classList.add("perimeter");
        cell.addEventListener("click", onPerimeterClick);
        perimeterCells.push(cell);
      }

      boardEl.appendChild(cell);
      rowCells.push(cell);
    }
    cellElements.push(rowCells);
  }
}

function seedBoard() {
  const interiorCells = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      boardState[row][col] = null;
      mergedCells.delete(cellKey(row, col));

      if (!isPerimeter(row, col)) {
        interiorCells.push({ r: row, c: col });
      }
    }
  }

  shuffleInPlace(interiorCells);

  for (const { r, c } of interiorCells) {
    if (countTotalNpc() >= TARGET_NPC_COUNT) {
      break;
    }

    const adjacency = countAdjacentNpc(boardState, r, c);
    const spawnChance = spawnChanceForAdjacency(adjacency);
    if (Math.random() < spawnChance) {
      boardState[r][c] = makeNpcToken(randomNpcColor());
    }
  }

  breakAdjacencies();
  ensureTargetCount(TARGET_NPC_COUNT);
  refreshPerimeterAvailability();
}

function renderPieces(spawnCells = null) {
  boardEl.querySelectorAll(".piece").forEach((node) => node.remove());

  mergedCells.forEach((key) => {
    const { r, c } = parseCellKey(key);
    if (!isNpc(boardState[r]?.[c])) {
      mergedCells.delete(key);
    }
  });

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = boardState[row][col];
      if (isNpc(value)) {
        const piece = document.createElement("div");
        const color = getNpcColor(value) || "yellow";
        piece.className = "piece npc";
        piece.classList.add(`npc--${color}`);
        if (mergedCells.has(cellKey(row, col))) {
          piece.classList.add("npc-merged");
        }
        if (spawnCells && spawnCells.has(cellKey(row, col))) {
          piece.classList.add("spawn");
        }
        cellElements[row][col].appendChild(piece);
      }
    }
  }
}

function onPerimeterClick(event) {
  if (isAnimating) {
    return;
  }
  if (isGameOver) {
    setStatus("Игра завершена. Перезапустите, чтобы сыграть ещё раз.");
    return;
  }
  if (attemptsRemaining <= 0) {
    setStatus("Попытки исчерпаны. Перегенерируйте поле или дождитесь перезапуска.");
    return;
  }

  const target = event.currentTarget;
  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);

  if (boardState[row][col] !== null) {
    return;
  }

  isAnimating = true;
  refreshPerimeterAvailability(false);
  boardState[row][col] = "player";
  playerToken.classList.add("active");
  movePlayerToken(row, col, { immediate: true }).then(() => {
    runTurn(row, col).catch((err) => {
      console.error(err);
      setStatus("Во время расчёта маршрута произошла ошибка.");
      resetPlayerToken();
      isAnimating = false;
    });
  });
}

async function runTurn(startRow, startCol) {
  setStatus("Поиск оптимального маршрута прыжков…");
  const best = computeBestJumpPath(boardState, startRow, startCol);

  if (best.captured.length === 0) {
    clearRunHud();
    setStatus("Нет доступных прыжков с этой позиции. Попробуйте другую клетку.");
    await wait(400);
    boardState[startRow][startCol] = null;
    resetPlayerToken();
    consumeAttempt();
    isAnimating = false;
    if (!isGameOver) {
      refreshPerimeterAvailability(true);
    }
    return;
  }

  startRunState();
  setStatus(`Маршрут найден. Прыжков: ${best.captured.length}.`);
  const finalPos = await animateSequence(best.path);
  boardState[finalPos.r][finalPos.c] = null;
  await wait(240);
  resetPlayerToken();

  const spawnTargets = refillTraversedCells(best.path);
  renderPieces(spawnTargets);
  await processMerges(spawnTargets);
  const gained = await finalizeRunScore();
  isAnimating = false;
  if (!isGameOver) {
    refreshPerimeterAvailability(true);
    setStatus(`Ход завершён. Получено ${gained} очков.`);
  } else {
    refreshPerimeterAvailability(false);
  }
}

function computeBestJumpPath(state, startRow, startCol) {
  const boardCopy = state.map((row) => row.slice());
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function dfs(board, row, col, path, captured) {
    let bestResult = { path, captured };

    for (const [dr, dc] of directions) {
      const midRow = row + dr;
      const midCol = col + dc;
      const destRow = row + dr * 2;
      const destCol = col + dc * 2;

      if (!inBounds(midRow, midCol) || !inBounds(destRow, destCol)) {
        continue;
      }

      if (!isNpc(board[midRow][midCol]) || board[destRow][destCol] !== null) {
        continue;
      }

      const nextBoard = board.map((r) => r.slice());
      nextBoard[row][col] = null;
      nextBoard[midRow][midCol] = null;
      nextBoard[destRow][destCol] = "player";

      const nextPath = [
        ...path,
        {
          from: { r: row, c: col },
          via: { r: midRow, c: midCol },
          to: { r: destRow, c: destCol },
        },
      ];
      const nextCaptured = [...captured, { r: midRow, c: midCol }];

      const result = dfs(nextBoard, destRow, destCol, nextPath, nextCaptured);

      if (result.captured.length > bestResult.captured.length) {
        bestResult = result;
      } else if (
        result.captured.length === bestResult.captured.length &&
        result.path.length < bestResult.path.length
      ) {
        bestResult = result;
      }
    }

    return bestResult;
  }

  return dfs(boardCopy, startRow, startCol, [], []);
}

async function animateSequence(path) {
  let currentRow = path.length ? path[0].from.r : null;
  let currentCol = path.length ? path[0].from.c : null;
  let finalRow = currentRow;
  let finalCol = currentCol;

  for (const step of path) {
    const captureCell = cellElements[step.via.r][step.via.c];
    const capturePiece = captureCell.querySelector(".piece");
    const explosionPromise = capturePiece ? playCaptureEffect(capturePiece, captureCell) : null;
    const captureKey = cellKey(step.via.r, step.via.c);
    const capturedToken = boardState[step.via.r][step.via.c];
    const capturedColor = getNpcColor(capturedToken);
    const capturedSpecial = mergedCells.has(captureKey);

    let popupInfo = null;
    if (activeRunState) {
      popupInfo = applyJumpScore({ color: capturedColor, isSpecial: capturedSpecial });
    }
    if (popupInfo) {
      spawnJumpPopup(captureCell, popupInfo.points, popupInfo.multiplier, capturedSpecial);
    }
    await wait(80);
    await movePlayerToken(step.to.r, step.to.c);

    if (explosionPromise) {
      await explosionPromise;
    }

    boardState[step.via.r][step.via.c] = null;
    mergedCells.delete(captureKey);
    boardState[step.from.r][step.from.c] = null;
    mergedCells.delete(cellKey(step.from.r, step.from.c));
    boardState[step.to.r][step.to.c] = "player";
    mergedCells.delete(cellKey(step.to.r, step.to.c));

    currentRow = step.to.r;
    currentCol = step.to.c;
  }

  if (currentRow !== null && currentCol !== null) {
    finalRow = currentRow;
    finalCol = currentCol;
  }

  return { r: finalRow, c: finalCol };
}

function movePlayerToken(row, col, { immediate = false } = {}) {
  return new Promise((resolve) => {
    const cell = cellElements[row][col];
    const boardRect = boardEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    playerToken.classList.add("active");

    const applyPosition = () => {
      const tokenRect = playerToken.getBoundingClientRect();
      const targetX = cellRect.left - boardRect.left + cellRect.width / 2 - tokenRect.width / 2;
      const targetY = cellRect.top - boardRect.top + cellRect.height / 2 - tokenRect.height / 2;
      playerToken.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    };

    if (immediate) {
      const previousTransition = playerToken.style.transition;
      playerToken.style.transition = "none";
      applyPosition();
      requestAnimationFrame(() => {
        playerToken.style.transition = previousTransition || "";
        resolve();
      });
      return;
    }

    const handleTransitionEnd = (event) => {
      if (event.target !== playerToken || event.propertyName !== "transform") {
        return;
      }
      playerToken.removeEventListener("transitionend", handleTransitionEnd);
      resolve();
    };

    playerToken.addEventListener("transitionend", handleTransitionEnd);
    requestAnimationFrame(() => {
      applyPosition();
    });
  });
}

function resetPlayerToken() {
  playerToken.classList.remove("active");
  playerToken.style.transition = "none";
  playerToken.style.transform = "translate(-9999px, -9999px)";
  requestAnimationFrame(() => {
    playerToken.style.transition = "";
  });
}

function isPerimeter(row, col) {
  return row === 0 || col === 0 || row === BOARD_SIZE - 1 || col === BOARD_SIZE - 1;
}

function cellKey(row, col) {
  return `${row},${col}`;
}

function refreshPerimeterAvailability(enabled = !isAnimating) {
  perimeterCells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const occupied = boardState[row][col] !== null;

    cell.classList.remove("available", "disabled");

    if (!enabled) {
      cell.classList.add("disabled");
      return;
    }

    if (occupied) {
      cell.classList.add("disabled");
    } else {
      cell.classList.add("available");
    }
  });
}

function refillTraversedCells(path) {
  const spawnCells = new Set();
  if (!path.length) {
    ensureTargetCount(TARGET_NPC_COUNT, spawnCells);
    return spawnCells;
  }

  const candidateCells = new Set();
  for (const step of path) {
    candidateCells.add(cellKey(step.from.r, step.from.c));
    candidateCells.add(cellKey(step.via.r, step.via.c));
    candidateCells.add(cellKey(step.to.r, step.to.c));
  }

  candidateCells.forEach((key) => {
    const [rowStr, colStr] = key.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);

    if (Number.isNaN(row) || Number.isNaN(col)) {
      return;
    }

    if (isPerimeter(row, col)) {
      boardState[row][col] = null;
      mergedCells.delete(key);
      return;
    }

    const adjacency = countAdjacentNpc(boardState, row, col);
    const spawnChance = spawnChanceForAdjacency(adjacency);
    const colorCounts = getAdjacentColorCounts(boardState, row, col);
    let preferredColor = null;
    let preferredCount = 0;
    colorCounts.forEach((count, color) => {
      if (count > preferredCount) {
        preferredColor = color;
        preferredCount = count;
      }
    });

    const mergeBoost = preferredCount >= 2 ? 0.45 : 0;
    const finalSpawnChance = Math.min(1, spawnChance + mergeBoost);

    const shouldSpawn = countTotalNpc() < TARGET_NPC_COUNT && Math.random() < finalSpawnChance;
    if (shouldSpawn) {
      const colorBias = preferredCount >= 2 ? preferredColor : null;
      const color = colorBias && Math.random() < 0.8 ? colorBias : randomNpcColor();
      boardState[row][col] = makeNpcToken(color);
    } else {
      boardState[row][col] = null;
      mergedCells.delete(key);
    }
    if (shouldSpawn) {
      spawnCells.add(key);
      mergedCells.delete(key);
    }
  });

  ensureTargetCount(TARGET_NPC_COUNT, spawnCells);
  return spawnCells;
}

function breakAdjacencies() {
  for (let row = 1; row < BOARD_SIZE - 1; row += 1) {
    for (let col = 1; col < BOARD_SIZE - 1; col += 1) {
      if (!isNpc(boardState[row][col])) {
        continue;
      }

      if (
        col + 1 < BOARD_SIZE - 1 &&
        isNpc(boardState[row][col + 1]) &&
        Math.random() < CLUSTER_BREAK_CHANCE &&
        countTotalNpc() > TARGET_NPC_COUNT
      ) {
        if (Math.random() < 0.5) {
          boardState[row][col] = null;
          mergedCells.delete(cellKey(row, col));
          continue;
        }
        boardState[row][col + 1] = null;
        mergedCells.delete(cellKey(row, col + 1));
      }

      if (
        row + 1 < BOARD_SIZE - 1 &&
        isNpc(boardState[row + 1][col]) &&
        Math.random() < CLUSTER_BREAK_CHANCE &&
        countTotalNpc() > TARGET_NPC_COUNT
      ) {
        if (Math.random() < 0.5) {
          boardState[row][col] = null;
          mergedCells.delete(cellKey(row, col));
        } else {
          boardState[row + 1][col] = null;
          mergedCells.delete(cellKey(row + 1, col));
        }
      }
    }
  }
}

function countAdjacentNpc(board, row, col) {
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  let total = 0;
  for (const [dr, dc] of deltas) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) {
      continue;
    }
    if (isNpc(board[r][c])) {
      total += 1;
    }
  }
  return total;
}

function spawnChanceForAdjacency(adjacentCount) {
  const decay = Math.pow(0.6, adjacentCount);
  const adjusted = FILL_PROBABILITY * decay;
  return Math.min(FILL_PROBABILITY, Math.max(0.08, adjusted));
}

function playCaptureEffect(pieceNode, cellNode) {
  return new Promise((resolve) => {
    pieceNode.classList.add("exploding");
    
    const explosion = document.createElement("div");
    explosion.className = "explosion";
    
    const flash = document.createElement("div");
    flash.className = "explosion-flash";
    explosion.appendChild(flash);
    
    const core = document.createElement("div");
    core.className = "explosion-core";
    explosion.appendChild(core);
    
    const shockwave = document.createElement("div");
    shockwave.className = "explosion-shockwave";
    explosion.appendChild(shockwave);
    
    const particles = document.createElement("div");
    particles.className = "explosion-particles";
    
    const particleCount = 12;
    for (let i = 0; i < particleCount; i += 1) {
      const particle = document.createElement("div");
      particle.className = "explosion-particle";

      const angle = (i / particleCount) * Math.PI * 2;
      const distance = (35 + Math.random() * 25) * 0.2;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      particle.style.setProperty("--particle-x", `${x}px`);
      particle.style.setProperty("--particle-y", `${y}px`);
      particle.style.animationDelay = `${Math.random() * 16}ms`;

      particles.appendChild(particle);
    }

    explosion.appendChild(particles);
    cellNode.appendChild(explosion);

    const cleanup = () => {
      pieceNode.remove();
      explosion.remove();
      resolve();
    };

    setTimeout(cleanup, 120);
  });
}

function ensureTargetCount(target, spawnedCollection = null) {
  let current = countTotalNpc();
  if (current > target) {
    const candidates = getInteriorCells((row, col) => isNpc(boardState[row][col]));
    candidates.sort((a, b) => countAdjacentNpc(boardState, b.r, b.c) - countAdjacentNpc(boardState, a.r, a.c));
    for (const { r, c } of candidates) {
      if (current <= target) {
        break;
      }
      boardState[r][c] = null;
      mergedCells.delete(cellKey(r, c));
      current -= 1;
    }
    return;
  }

  if (current < target) {
    const empties = getInteriorCells((row, col) => boardState[row][col] === null);
    empties.sort((a, b) => countAdjacentNpc(boardState, a.r, a.c) - countAdjacentNpc(boardState, b.r, b.c));
    for (const { r, c } of empties) {
      if (current >= target) {
        break;
      }
      const token = makeNpcToken(randomNpcColor());
      mergedCells.delete(cellKey(r, c));
      boardState[r][c] = token;
      if (spawnedCollection) {
        spawnedCollection.add(cellKey(r, c));
      }
      current += 1;
    }
  }
}

function countTotalNpc() {
  let total = 0;
  for (let row = 1; row < BOARD_SIZE - 1; row += 1) {
    for (let col = 1; col < BOARD_SIZE - 1; col += 1) {
      if (isNpc(boardState[row][col])) {
        total += 1;
      }
    }
  }
  return total;
}

function getAdjacentColorCounts(board, row, col) {
  const counts = new Map();
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nc < 0 || nr >= BOARD_SIZE || nc >= BOARD_SIZE) {
      continue;
    }
    const value = board[nr]?.[nc];
    if (!isNpc(value)) {
      continue;
    }
    const color = getNpcColor(value);
    if (!color) {
      continue;
    }
    counts.set(color, (counts.get(color) || 0) + 1);
  }

  return counts;
}

function getInteriorCells(filterFn) {
  const cells = [];
  for (let row = 1; row < BOARD_SIZE - 1; row += 1) {
    for (let col = 1; col < BOARD_SIZE - 1; col += 1) {
      if (!filterFn || filterFn(row, col)) {
        cells.push({ r: row, c: col });
      }
    }
  }
  return cells;
}

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function setStatus() {}

function resetScoreState() {
  totalScore = 0;
  attemptsRemaining = MAX_ATTEMPTS;
  isGameOver = false;
  activeRunState = null;
  updateScoreHud();
  resetComboPopover();
}

function updateScoreHud(latestGain = 0) {
  if (attemptsEl) {
    attemptsEl.textContent = String(attemptsRemaining);
  }
  updateProgressHud(latestGain);
}

function updateProgressHud(latestGain = 0) {
  if (!progressFillEl) {
    return;
  }
  const clamped = Math.min(totalScore, TARGET_SCORE);
  const ratio = TARGET_SCORE > 0 ? Math.min(1, clamped / TARGET_SCORE) : 0;
  progressFillEl.style.width = `${ratio * 100}%`;
  const progressBar = progressFillEl.parentElement;
  if (progressBar) {
    progressBar.setAttribute("aria-valuenow", String(clamped));
    if (latestGain > 0) {
      triggerProgressBarAnimation(progressBar, latestGain);
    }
  }
  if (progressTextEl) {
    progressTextEl.textContent = `${clamped} / ${TARGET_SCORE}`;
  }
}

function startRunState() {
  activeRunState = {
    comboScore: 0,
    jumpCount: 0,
    fibPrev: 0,
    fibCurrent: 4,
    specialCount: 0,
    breakdown: [],
  };
  resetComboPopover();
  showComboPopover();
}

function appendRunBreakdown(text) {
  activeRunState.breakdown.push(text);
}

function applyJumpScore({ color, isSpecial }) {
  if (!activeRunState) {
    return null;
  }
  const run = activeRunState;
  run.jumpCount += 1;

  const points = run.fibCurrent;
  if (isSpecial) {
    run.specialCount += 1;
  }
  run.comboScore += points;

  updateComboPopover(run.comboScore, run.specialCount);

  const multiplierDisplay = run.specialCount > 0 ? run.specialCount + 1 : 1;
  const colorName = color ? NPC_COLOR_NAMES[color] || "Фишка" : "Фишка";
  let breakdown = `Прыжок ${run.jumpCount}: ${colorName} +${points}`;
  if (run.specialCount > 0) {
    breakdown += `, множитель ×${multiplierDisplay}`;
  }
  appendRunBreakdown(breakdown);

  const nextScore = run.fibPrev === 0 ? run.fibCurrent + run.fibCurrent : run.fibPrev + run.fibCurrent;
  run.fibPrev = run.fibCurrent;
  run.fibCurrent = nextScore;

  return { points, multiplier: multiplierDisplay };
}

async function finalizeRunScore() {
  let finalScore = 0;
  if (activeRunState) {
    const run = activeRunState;
    activeRunState = null;
    const baseTotal = Math.max(0, run.comboScore);
    const multiplier = Math.max(1, run.specialCount + 1);

    if (baseTotal > 0) {
      const finalScoreCandidate = baseTotal * multiplier;
      const compliment = complimentForScore(finalScoreCandidate);
      await presentRunScoreFinal({ baseTotal, multiplier, finalScore: finalScoreCandidate, compliment });
      finalScore = finalScoreCandidate;
    }
  }

  totalScore += finalScore;
  updateScoreHud(finalScore);
  consumeAttempt();
  await wait(280);
  hideComboPopover();
  return finalScore;
}

function consumeAttempt() {
  if (attemptsRemaining <= 0) {
    return;
  }
  attemptsRemaining -= 1;
  updateScoreHud();
  if (totalScore >= TARGET_SCORE && !isGameOver) {
    handleVictory();
    return;
  }
  if (attemptsRemaining <= 0 && !isGameOver) {
    handleDefeat();
  }
}

function handleVictory() {
  isGameOver = true;
  refreshPerimeterAvailability(false);
  setTimeout(() => window.location.reload(), 3200);
}

function handleDefeat() {
  isGameOver = true;
  refreshPerimeterAvailability(false);
  setTimeout(() => window.location.reload(), 3200);
}

function clearRunHud() {
  if (activeRunState) {
    activeRunState.breakdown = [];
  }
}

function spawnJumpPopup(cellNode, points, multiplier, isSpecial) {
  if (!cellNode) {
    return;
  }
  const popup = document.createElement("div");
  popup.className = "jump-popup";
  popup.textContent = `+${points}`;

  if (isSpecial) {
    const multi = document.createElement("span");
    multi.className = "jump-popup__multiplier";
    multi.textContent = `×${multiplier}`;
    popup.appendChild(multi);
  }

  cellNode.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 2000);
}

function showComboPopover() {
  if (!comboPopoverEl) {
    return;
  }
  comboPopoverEl.classList.remove("combo-popover--flight", "combo-popover--celebrate");
  comboPopoverEl.setAttribute("aria-hidden", "false");
  comboPopoverEl.classList.add("combo-popover--active");
  if (comboPopoverTitleEl) {
    comboPopoverTitleEl.textContent = "";
    comboPopoverTitleEl.setAttribute("aria-hidden", "true");
    comboPopoverTitleEl.classList.remove("combo-popover__title--show");
  }
}

function updateComboPopover(score, specialCount) {
  if (!comboPopoverEl) {
    return;
  }
  if (comboPopoverValueEl) {
    comboPopoverValueEl.textContent = `+${score}`;
    comboPopoverValueEl.classList.remove("combo-popover__value--pulse");
    comboPopoverValueEl.getBoundingClientRect();
    comboPopoverValueEl.classList.add("combo-popover__value--pulse");
  }
  if (comboPopoverMultiplierEl) {
    if (specialCount > 0) {
      comboPopoverMultiplierEl.textContent = `×${specialCount + 1}`;
      comboPopoverMultiplierEl.setAttribute("aria-hidden", "false");
      comboPopoverMultiplierEl.classList.add("combo-popover__multiplier--visible");
    } else {
      comboPopoverMultiplierEl.textContent = "";
      comboPopoverMultiplierEl.setAttribute("aria-hidden", "true");
      comboPopoverMultiplierEl.classList.remove("combo-popover__multiplier--visible");
    }
  }
}

async function presentRunScoreFinal({ baseTotal, multiplier, finalScore, compliment }) {
  if (!comboPopoverEl) {
    return;
  }
  comboPopoverEl.classList.add("combo-popover--celebrate");
  if (comboPopoverTitleEl) {
    comboPopoverTitleEl.textContent = compliment;
    comboPopoverTitleEl.setAttribute("aria-hidden", "false");
    comboPopoverTitleEl.classList.add("combo-popover__title--show");
  }
  if (comboPopoverValueEl) {
    comboPopoverValueEl.textContent = `+${baseTotal}`;
    comboPopoverValueEl.classList.add("combo-popover__value--pulse");
  }
  await wait(360);
  if (multiplier > 1 && comboPopoverMultiplierEl) {
    comboPopoverMultiplierEl.textContent = `×${multiplier}`;
    comboPopoverMultiplierEl.setAttribute("aria-hidden", "false");
    comboPopoverMultiplierEl.classList.add("combo-popover__multiplier--visible");
    comboPopoverMultiplierEl.classList.add("combo-popover__multiplier--pulse");
    await wait(260);
  }
  if (comboPopoverValueEl) {
    comboPopoverValueEl.textContent = `+${finalScore}`;
    comboPopoverValueEl.classList.add("combo-popover__value--pulse");
  }
  await wait(420);
  await flyComboToProgressBar(finalScore);
}

async function flyComboToProgressBar(totalGain) {
  if (!comboPopoverEl || !progressFillEl) {
    return;
  }
  const progressBar = progressFillEl.parentElement;
  if (!progressBar) {
    return;
  }

  await wait(16);

  const comboRect = comboPopoverEl.getBoundingClientRect();
  const barRect = progressBar.getBoundingClientRect();
  const dx = barRect.left + barRect.width / 2 - (comboRect.left + comboRect.width / 2);
  const dy = barRect.top + barRect.height / 2 - (comboRect.top + comboRect.height / 2);

  comboPopoverEl.style.setProperty("--combo-flight-x", `${dx}px`);
  comboPopoverEl.style.setProperty("--combo-flight-y", `${dy}px`);
  comboPopoverEl.classList.remove("combo-popover--celebrate");
  comboPopoverEl.classList.add("combo-popover--flight");
  comboPopoverEl.classList.add("combo-popover--flying");

  if (comboFlightCleanup) {
    clearTimeout(comboFlightCleanup);
  }

  comboFlightCleanup = setTimeout(() => {
    comboPopoverEl.classList.remove("combo-popover--active", "combo-popover--flying", "combo-popover--flight");
    comboPopoverEl.setAttribute("aria-hidden", "true");
    resetComboPopover(true);
    comboFlightCleanup = null;
  }, 460);

  triggerProgressBarAnimation(progressBar, totalGain);
}

function hideComboPopover() {
  if (!comboPopoverEl) {
    return;
  }
  comboPopoverEl.classList.remove("combo-popover--active", "combo-popover--flying", "combo-popover--flight");
  comboPopoverEl.setAttribute("aria-hidden", "true");
  resetComboPopover(true);
}

function resetComboPopover(force = false) {
  if (!comboPopoverEl) {
    return;
  }
  if (comboFlightCleanup) {
    clearTimeout(comboFlightCleanup);
    comboFlightCleanup = null;
  }
  comboPopoverEl.style.removeProperty("--combo-flight-x");
  comboPopoverEl.style.removeProperty("--combo-flight-y");
  if (comboPopoverValueEl) {
    comboPopoverValueEl.textContent = "+0";
    comboPopoverValueEl.classList.remove("combo-popover__value--pulse");
  }
  if (comboPopoverTitleEl) {
    comboPopoverTitleEl.textContent = "";
    comboPopoverTitleEl.setAttribute("aria-hidden", "true");
    comboPopoverTitleEl.classList.remove("combo-popover__title--show");
  }
  if (comboPopoverMultiplierEl) {
    comboPopoverMultiplierEl.textContent = "";
    comboPopoverMultiplierEl.setAttribute("aria-hidden", "true");
    comboPopoverMultiplierEl.classList.remove("combo-popover__multiplier--visible", "combo-popover__multiplier--pulse");
  }
  if (force) {
    comboPopoverEl.classList.remove("combo-popover--active", "combo-popover--flying", "combo-popover--flight", "combo-popover--celebrate");
    comboPopoverEl.setAttribute("aria-hidden", "true");
  }
}

function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function randomNpcColor() {
  return NPC_COLORS[randomInt(0, NPC_COLORS.length - 1)];
}

function makeNpcToken(color) {
  return `npc:${color}`;
}

function isNpc(value) {
  return typeof value === "string" && value.startsWith("npc:");
}

function getNpcColor(token) {
  if (!isNpc(token)) {
    return null;
  }
  return token.split(":")[1] || null;
}

async function processMerges(spawnCells) {
  if (!spawnCells || spawnCells.size === 0) {
    return;
  }

  // Allow layout to settle before measuring positions for animations.
  await wait(16);

  const clusters = findMergeClusters(spawnCells);
  if (clusters.length > 0) {
    await wait(432);
  }
  for (const cluster of clusters) {
    await animateMergeCluster(cluster);
  }
}

function findMergeClusters(spawnCells) {
  const clusters = [];
  const visited = new Set();
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const startKey of spawnCells) {
    if (visited.has(startKey)) {
      continue;
    }

    const start = parseCellKey(startKey);
    if (Number.isNaN(start.r) || Number.isNaN(start.c)) {
      continue;
    }

    const startToken = boardState[start.r]?.[start.c];
    if (!isNpc(startToken)) {
      continue;
    }

    const color = getNpcColor(startToken);
    if (!color) {
      continue;
    }

    const group = [];
    const queue = [startKey];
    const localVisited = new Set();
    let containsSpawn = false;

    while (queue.length) {
      const current = queue.shift();
      if (localVisited.has(current)) {
        continue;
      }
      localVisited.add(current);

      const { r: cr, c: cc } = parseCellKey(current);
      if (cr < 0 || cc < 0 || cr >= BOARD_SIZE || cc >= BOARD_SIZE) {
        continue;
      }

      const value = boardState[cr]?.[cc];
      if (!isNpc(value) || getNpcColor(value) !== color) {
        continue;
      }

      group.push({ r: cr, c: cc, token: value });
      if (spawnCells.has(current)) {
        containsSpawn = true;
      }
      visited.add(current);

      for (const [dr, dc] of directions) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nc < 0 || nr >= BOARD_SIZE || nc >= BOARD_SIZE) {
          continue;
        }
        const neighborKey = cellKey(nr, nc);
        if (localVisited.has(neighborKey)) {
          continue;
        }
        queue.push(neighborKey);
      }
    }

    if (containsSpawn && group.length >= 3) {
      clusters.push({ color, cells: group });
    }
  }

  return clusters;
}

async function animateMergeCluster(cluster) {
  const { color, cells } = cluster;
  if (!cells || cells.length < 3) {
    return;
  }

  // Choose the primary cell (first in cluster order).
  const target = cells[0];
  const targetCell = cellElements[target.r]?.[target.c];
  if (!targetCell) {
    return;
  }

  const targetPiece = targetCell.querySelector(".piece");
  if (!targetPiece) {
    return;
  }

  const targetRect = targetPiece.getBoundingClientRect();
  const animations = [];

  for (let i = 1; i < cells.length; i += 1) {
    const cell = cells[i];
    boardState[cell.r][cell.c] = null;
    const pieceNode = cellElements[cell.r]?.[cell.c]?.querySelector(".piece");
    if (!pieceNode) {
      continue;
    }

    const pieceRect = pieceNode.getBoundingClientRect();
    const dx = targetRect.left - pieceRect.left;
    const dy = targetRect.top - pieceRect.top;
    pieceNode.style.setProperty("--merge-dx", `${dx}px`);
    pieceNode.style.setProperty("--merge-dy", `${dy}px`);
    pieceNode.classList.add("merge-to-target");
    animations.push(
      waitForAnimation(pieceNode).finally(() => {
        pieceNode.remove();
      })
    );
  }

  await Promise.all(animations);

  // Ensure the target keeps the merged color token.
  boardState[target.r][target.c] = makeNpcToken(color);
  const targetKey = cellKey(target.r, target.c);
  mergedCells.add(targetKey);
  targetPiece.classList.add("merge-highlight");
  targetPiece.classList.add("npc-merged");
  await wait(600);
  targetPiece.classList.remove("merge-highlight");
}

function waitForAnimation(element) {
  return new Promise((resolve) => {
    const handle = () => {
      element.removeEventListener("animationend", handle);
      resolve();
    };
    element.addEventListener("animationend", handle, { once: true });
  });
}

function parseCellKey(key) {
  const [rowStr, colStr] = key.split(",");
  return { r: Number(rowStr), c: Number(colStr) };
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    boardEl.getBoundingClientRect();
  }
});

window.addEventListener("resize", () => {
  if (!playerToken.classList.contains("active")) {
    return;
  }

  const activeStep = findPlayerPosition();
  if (!activeStep) {
    return;
  }

  movePlayerToken(activeStep.r, activeStep.c, { immediate: true });
});

function findPlayerPosition() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (boardState[row][col] === "player") {
        return { r: row, c: col };
      }
    }
  }
  return null;
}

init();
