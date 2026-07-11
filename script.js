const gameCards = document.querySelectorAll('.game-card');
const gameHeader = document.getElementById('gameHeader');
const gameControls = document.getElementById('gameControls');
const gameBoard = document.getElementById('gameBoard');
const gameStatus = document.getElementById('gameStatus');
const authButton = document.getElementById('authButton');
const profilePill = document.getElementById('profilePill');
const authModal = document.getElementById('authModal');
const authSubmit = document.getElementById('authSubmit');
const authCancel = document.getElementById('authCancel');
const profileNameInput = document.getElementById('profileNameInput');
const appLoader = document.getElementById('appLoader');

const state = {
  activeGame: 'tictactoe',
  mode: 'personal',
  difficulty: 'easy',
  tictactoe: { board: Array(9).fill(''), turn: 'X', winner: '', over: false },
  chess: { board: [], selected: null, turn: 'white', winner: '', over: false },
  matching: { cards: [], flipped: [], matched: [], lock: false, level: 'Easy', levelIndex: 1, completed: false, maxLevels: 25 },
  puzzle: { board: [], solving: false, size: 3, level: 'Easy', levelIndex: 1, completed: false, maxLevels: 25 },
  auth: { profileName: '', profileEmail: '' }
};

const gameMeta = {
  tictactoe: { title: 'Tic Tac Toe', desc: 'Classic turn-based strategy with AI support.' },
  chess: { title: 'Chess', desc: 'Move your pieces and challenge the AI.' },
  matching: { title: 'Image Matching', desc: 'Find the hidden pairs before time runs out.' },
  puzzle: { title: 'Numbers Puzzle', desc: 'Slide the tiles into the right order.' }
};

function getStoredProfile() {
  try {
    const saved = localStorage.getItem('game-space-profile');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
}

function saveProfile(profile) {
  localStorage.setItem('game-space-profile', JSON.stringify(profile));
}

function renderAuth() {
  const profile = getStoredProfile();
  if (profile && profile.name) {
    state.auth.profileName = profile.name;
    state.auth.profileEmail = profile.email || '';
    authButton.hidden = true;
    profilePill.hidden = false;
    profilePill.innerHTML = `<span class="avatar">${profile.name.charAt(0).toUpperCase()}</span><span>Hi, ${profile.name}</span><button class="text-btn" id="signOutBtn">Sign out</button>`;
    document.getElementById('signOutBtn')?.addEventListener('click', () => {
      localStorage.removeItem('game-space-profile');
      state.auth.profileName = '';
      state.auth.profileEmail = '';
      renderAuth();
    });
  } else {
    state.auth.profileName = '';
    state.auth.profileEmail = '';
    authButton.hidden = false;
    profilePill.hidden = true;
  }
}

function openAuthModal() {
  authModal.hidden = false;
  profileNameInput.focus();
}

function closeAuthModal() {
  authModal.hidden = true;
}

function handleAuthSubmit() {
  const name = profileNameInput.value.trim();
  if (!name) {
    profileNameInput.focus();
    return;
  }
  const profile = { name, email: `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com` };
  saveProfile(profile);
  renderAuth();
  closeAuthModal();
}

function initAuth() {
  authButton.addEventListener('click', openAuthModal);
  authSubmit.addEventListener('click', handleAuthSubmit);
  authCancel.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (event) => {
    if (event.target === authModal) closeAuthModal();
  });
  profileNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleAuthSubmit();
  });
  renderAuth();
}

function setActiveGame(game) {
  state.activeGame = game;
  gameCards.forEach((card) => card.classList.toggle('active', card.dataset.game === game));
  renderGame();
}

gameCards.forEach((card) => card.addEventListener('click', () => setActiveGame(card.dataset.game)));

function initApp() {
  initAuth();
  renderGame();
  window.setTimeout(() => {
    appLoader?.classList.add('hidden');
  }, 1200);
}

function renderGame(options = {}) {
  if (state.activeGame !== 'tictactoe') state.mode = 'personal';
  const meta = gameMeta[state.activeGame];
  gameHeader.innerHTML = `<h2>${meta.title}</h2><p>${meta.desc}</p>`;
  gameControls.innerHTML = buildControls();
  gameBoard.innerHTML = '';
  gameStatus.textContent = '';
  resetGameState(options);
  drawActiveGame();
}

function buildControls() {
  const isTicTacToe = state.activeGame === 'tictactoe';
  const modeButtons = isTicTacToe
    ? ['personal', 'ai'].map((mode) => `<button class="mode-btn ${state.mode === mode ? 'active' : ''}" data-action="mode" data-value="${mode}">${mode === 'personal' ? 'Personal Mode' : 'AI Mode'}</button>`).join('')
    : '<button class="mode-btn active" data-action="mode" data-value="personal">Personal Mode</button>';
  const difficultyButtons = ['easy', 'medium', 'hard'].map((level) => `<button class="difficulty-btn ${state.difficulty === level ? 'active' : ''}" data-action="difficulty" data-value="${level}">${level[0].toUpperCase() + level.slice(1)}</button>`).join('');
  const nextLevelButton = (state.activeGame === 'matching' && state.matching.completed) || (state.activeGame === 'puzzle' && state.puzzle.completed)
    ? `<button class="action-btn" data-action="next-level">${getCurrentLevelProgression().hasMore ? 'Next Level' : 'Restart Levels'}</button>`
    : '';
  return `
    <div>${modeButtons}</div>
    <div>${difficultyButtons}</div>
    <button class="action-btn" data-action="reset">Reset</button>
    ${nextLevelButton}
  `;
}

function getCurrentLevelProgression() {
  const currentState = state.activeGame === 'matching' ? state.matching : state.activeGame === 'puzzle' ? state.puzzle : null;
  if (!currentState) return { levelIndex: 1, hasMore: false, maxLevels: 25 };
  return { levelIndex: currentState.levelIndex || 1, hasMore: (currentState.levelIndex || 1) < currentState.maxLevels, maxLevels: currentState.maxLevels };
}

function resetGameState(options = {}) {
  const { preserveLevel = false, nextLevel = false } = options;
  if (state.activeGame === 'tictactoe') {
    state.tictactoe = { board: Array(9).fill(''), turn: 'X', winner: '', over: false };
  } else if (state.activeGame === 'chess') {
    state.chess = { board: createInitialChessBoard(), selected: null, turn: 'white', winner: '', over: false };
  } else if (state.activeGame === 'matching') {
    const currentLevel = preserveLevel ? (state.matching.levelIndex || 1) : 1;
    const levelIndex = nextLevel ? Math.min(currentLevel + 1, 25) : currentLevel;
    const level = generateMatchingLevel(state.difficulty, levelIndex);
    state.matching = { cards: level.cards, flipped: [], matched: [], lock: false, level: level.label, levelIndex, completed: false, maxLevels: 25 };
  } else if (state.activeGame === 'puzzle') {
    const currentLevel = preserveLevel ? (state.puzzle.levelIndex || 1) : 1;
    const levelIndex = nextLevel ? Math.min(currentLevel + 1, 25) : currentLevel;
    const level = generatePuzzleLevel(state.difficulty, levelIndex);
    state.puzzle = { board: level.board, solving: false, size: level.size, level: level.label, levelIndex, completed: false, maxLevels: 25 };
  }
}

function drawActiveGame() {
  if (state.activeGame === 'tictactoe') renderTicTacToe();
  else if (state.activeGame === 'chess') renderChess();
  else if (state.activeGame === 'matching') renderMatching();
  else if (state.activeGame === 'puzzle') renderPuzzle();
}

function attachControlHandlers() {
  document.querySelectorAll('[data-action="mode"]').forEach((btn) => btn.addEventListener('click', () => {
    state.mode = btn.dataset.value;
    renderGame();
  }));
  document.querySelectorAll('[data-action="difficulty"]').forEach((btn) => btn.addEventListener('click', () => {
    state.difficulty = btn.dataset.value;
    renderGame();
  }));
  document.querySelectorAll('[data-action="reset"]').forEach((btn) => btn.addEventListener('click', () => renderGame({ preserveLevel: true })));
  document.querySelectorAll('[data-action="next-level"]').forEach((btn) => btn.addEventListener('click', () => renderGame({ preserveLevel: true, nextLevel: true })));
}

function renderTicTacToe() {
  const { board, winner, over } = state.tictactoe;
  const grid = document.createElement('div');
  grid.className = 'grid-3';
  board.forEach((cell, index) => {
    const button = document.createElement('button');
    button.className = 'tile';
    button.textContent = cell;
    button.disabled = !!cell || over;
    button.addEventListener('click', () => handleTicTacToeMove(index));
    grid.appendChild(button);
  });
  gameBoard.innerHTML = '';
  gameBoard.appendChild(grid);
  if (winner) gameStatus.textContent = `Winner: ${winner}`;
  else if (over) gameStatus.textContent = 'It is a draw.';
  else if (state.mode === 'ai' && state.tictactoe.turn === 'O') gameStatus.textContent = 'AI is thinking…';
  else gameStatus.textContent = `Next turn: ${state.tictactoe.turn}`;
  if (state.mode === 'ai' && state.tictactoe.turn === 'O' && !over) {
    setTimeout(runTicTacToeAi, 450);
  }
  attachControlHandlers();
}

function handleTicTacToeMove(index) {
  if (state.tictactoe.board[index] || state.tictactoe.over || (state.mode === 'ai' && state.tictactoe.turn === 'O')) return;
  state.tictactoe.board[index] = state.tictactoe.turn;
  advanceTicTacToeState();
  renderTicTacToe();
}

function runTicTacToeAi() {
  if (state.activeGame !== 'tictactoe' || state.mode !== 'ai' || state.tictactoe.over || state.tictactoe.turn !== 'O') return;
  const move = getTicTacToeMove(state.tictactoe.board, state.difficulty);
  if (move === null) return;
  state.tictactoe.board[move] = 'O';
  advanceTicTacToeState();
  renderTicTacToe();
}

function advanceTicTacToeState() {
  const winner = getTicTacToeWinner(state.tictactoe.board);
  if (winner) {
    state.tictactoe.winner = winner;
    state.tictactoe.over = true;
  } else if (state.tictactoe.board.every(Boolean)) {
    state.tictactoe.over = true;
  } else {
    state.tictactoe.turn = state.tictactoe.turn === 'X' ? 'O' : 'X';
  }
}

function getTicTacToeWinner(board) {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function getTicTacToeMove(board, difficulty) {
  const empty = board.map((cell, index) => (cell === '' ? index : null)).filter((entry) => entry !== null);
  if (!empty.length) return null;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];

  const winningMove = empty.find((index) => {
    const copy = [...board];
    copy[index] = 'O';
    return getTicTacToeWinner(copy) === 'O';
  });
  if (winningMove !== undefined) return winningMove;

  const blockingMove = empty.find((index) => {
    const copy = [...board];
    copy[index] = 'X';
    return getTicTacToeWinner(copy) === 'X';
  });
  if (blockingMove !== undefined) return blockingMove;

  if (difficulty === 'medium') {
    const forks = [0, 2, 6, 8];
    const forkMove = forks.find((index) => board[index] === '');
    if (forkMove !== undefined) return forkMove;
    const center = 4;
    if (board[center] === '') return center;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  return minimaxTicTacToe(board, 'O').index;
}

function minimaxTicTacToe(board, player) {
  const winner = getTicTacToeWinner(board);
  if (winner === 'O') return { score: 10, index: -1 };
  if (winner === 'X') return { score: -10, index: -1 };
  if (board.every(Boolean)) return { score: 0, index: -1 };

  const empty = board.map((cell, index) => (cell === '' ? index : null)).filter((entry) => entry !== null);
  const moves = [];
  for (const index of empty) {
    const copy = [...board];
    copy[index] = player;
    const result = minimaxTicTacToe(copy, player === 'O' ? 'X' : 'O');
    moves.push({ index, score: player === 'O' ? result.score : -result.score });
  }

  return moves.reduce((best, move) => (move.score > best.score ? move : best), moves[0]);
}

function createInitialChessBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRankBlack = ['black-rook', 'black-knight', 'black-bishop', 'black-queen', 'black-king', 'black-bishop', 'black-knight', 'black-rook'];
  const backRankWhite = ['white-rook', 'white-knight', 'white-bishop', 'white-queen', 'white-king', 'white-bishop', 'white-knight', 'white-rook'];
  board[0] = [...backRankBlack];
  board[1] = Array(8).fill('black-pawn');
  board[6] = Array(8).fill('white-pawn');
  board[7] = [...backRankWhite];
  return board;
}

function getChessKingPosition(board, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col] === `${color}-king`) return { row, col };
    }
  }
  return null;
}

function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (piece && piece.startsWith(byColor) && isLegalChessMove(board, { row: r, col: c }, { row, col })) {
        return true;
      }
    }
  }
  return false;
}

function isChessMoveSafe(board, from, to, color) {
  const nextBoard = board.map((row) => [...row]);
  nextBoard[to.row][to.col] = nextBoard[from.row][from.col];
  nextBoard[from.row][from.col] = null;
  const king = getChessKingPosition(nextBoard, color);
  return !king || !isSquareAttacked(nextBoard, king.row, king.col, color === 'white' ? 'black' : 'white');
}

function getChessCheckStatus(board, color) {
  const king = getChessKingPosition(board, color);
  if (!king) return { inCheck: false, checkmate: false };
  const inCheck = isSquareAttacked(board, king.row, king.col, color === 'white' ? 'black' : 'white');
  if (!inCheck) return { inCheck: false, checkmate: false };
  const legalMoves = getAllLegalChessMoves(board, color);
  return { inCheck: true, checkmate: legalMoves.length === 0 };
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function renderChess() {
  const boardEl = document.createElement('div');
  boardEl.className = 'chess-board';
  const currentStatus = getChessCheckStatus(state.chess.board, state.chess.turn);
  state.chess.board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      const button = document.createElement('button');
      const isSelected = state.chess.selected && state.chess.selected.row === rowIndex && state.chess.selected.col === colIndex;
      const kingSquare = getChessKingPosition(state.chess.board, state.chess.turn);
      const isKingSquare = kingSquare && kingSquare.row === rowIndex && kingSquare.col === colIndex;
      const squareClasses = [
        'chess-square',
        ((rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'),
        isSelected ? 'selected' : '',
        isKingSquare && currentStatus.inCheck ? 'check' : '',
        isKingSquare && currentStatus.checkmate ? 'checkmate' : ''
      ].filter(Boolean);
      button.className = squareClasses.join(' ');
      if (piece) {
        button.textContent = pieceSymbol(piece);
        button.style.color = piece.startsWith('white') ? '#fffef7' : '#1f2937';
      }
      button.addEventListener('click', () => handleChessClick(rowIndex, colIndex));
      boardEl.appendChild(button);
    });
  });
  gameBoard.innerHTML = '';
  gameBoard.appendChild(boardEl);
  if (state.chess.winner) gameStatus.textContent = `Winner: ${state.chess.winner}`;
  else if (state.chess.over) gameStatus.textContent = 'The match ended.';
  else if (currentStatus.checkmate) gameStatus.textContent = `${capitalize(state.chess.turn)} is in checkmate.`;
  else if (currentStatus.inCheck) gameStatus.textContent = `${capitalize(state.chess.turn)} is in check.`;
  else if (state.chess.selected) gameStatus.textContent = 'Select a destination square for the chosen piece.';
  else gameStatus.textContent = state.chess.turn === 'white' ? 'White to move' : 'Black to move';
  attachControlHandlers();
}

function handleChessClick(row, col) {
  const piece = state.chess.board[row][col];
  const myPiece = piece && piece.startsWith(state.chess.turn);
  if (!state.chess.selected && myPiece) {
    state.chess.selected = { row, col };
    renderChess();
    return;
  }
  if (state.chess.selected) {
    const from = state.chess.selected;
    if (isLegalChessMove(state.chess.board, from, { row, col }) && isChessMoveSafe(state.chess.board, from, { row, col }, state.chess.turn)) {
      state.chess.board[row][col] = state.chess.board[from.row][from.col];
      state.chess.board[from.row][from.col] = null;
      const nextTurn = state.chess.turn === 'white' ? 'black' : 'white';
      const nextStatus = getChessCheckStatus(state.chess.board, nextTurn);
      state.chess.turn = nextTurn;
      state.chess.selected = null;
      if (nextStatus.checkmate) {
        state.chess.over = true;
        state.chess.winner = nextTurn === 'white' ? 'black' : 'white';
      }
      renderChess();
    } else if (myPiece) {
      state.chess.selected = { row, col };
      renderChess();
    }
  }
}

function getAllLegalChessMoves(board, player) {
  const moves = [];
  board.forEach((row, r) => row.forEach((piece, c) => {
    if (piece && piece.startsWith(player)) {
      for (let rr = 0; rr < 8; rr += 1) {
        for (let cc = 0; cc < 8; cc += 1) {
          if (isLegalChessMove(board, { row: r, col: c }, { row: rr, col: cc }) && isChessMoveSafe(board, { row: r, col: c }, { row: rr, col: cc }, player)) {
            moves.push([{ row: r, col: c }, { row: rr, col: cc }]);
          }
        }
      }
    }
  }));
  return moves;
}

function pickChessMove(moves, difficulty) {
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  return moves.slice().sort((a, b) => scoreChessMove(b) - scoreChessMove(a))[0];
}

function scoreChessMove(move) {
  const [from, to] = move;
  return pieceValue(state.chess.board[to.row][to.col]) + (to.row === 3 ? 1 : 0) + (to.col === 3 ? 1 : 0);
}

function isLegalChessMove(board, from, to) {
  const piece = board[from.row][from.col];
  if (!piece) return false;
  const target = board[to.row][to.col];
  const color = piece.split('-')[0];
  if (target && target.startsWith(color)) return false;
  const type = piece.split('-')[1];
  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  const absoluteRow = Math.abs(rowDiff);
  const absoluteCol = Math.abs(colDiff);
  if (type === 'pawn') {
    const direction = color === 'white' ? -1 : 1;
    if (colDiff === 0 && rowDiff === direction && !target) return true;
    if (colDiff === 0 && from.row === (color === 'white' ? 6 : 1) && rowDiff === 2 * direction && !target && !board[from.row + direction][from.col]) return true;
    return absoluteCol === 1 && rowDiff === direction && !!target;
  }
  if (type === 'rook') {
    if (rowDiff !== 0 && colDiff !== 0) return false;
    return isPathClear(board, from, to);
  }
  if (type === 'bishop') {
    if (absoluteRow !== absoluteCol) return false;
    return isPathClear(board, from, to);
  }
  if (type === 'queen') {
    if (rowDiff !== 0 && colDiff !== 0 && absoluteRow !== absoluteCol) return false;
    return isPathClear(board, from, to);
  }
  if (type === 'knight') {
    return (absoluteRow === 2 && absoluteCol === 1) || (absoluteRow === 1 && absoluteCol === 2);
  }
  if (type === 'king') {
    return absoluteRow <= 1 && absoluteCol <= 1 && (absoluteRow + absoluteCol > 0);
  }
  return false;
}

function isPathClear(board, from, to) {
  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;
  while (row !== to.row || col !== to.col) {
    if (board[row][col]) return false;
    row += rowStep;
    col += colStep;
  }
  return true;
}

function pieceValue(piece) {
  if (!piece) return 0;
  const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
  return values[piece.split('-')[1]] || 0;
}

function pieceSymbol(piece) {
  const symbols = {
    'white-pawn': '♙', 'white-rook': '♖', 'white-knight': '♘', 'white-bishop': '♗', 'white-queen': '♕', 'white-king': '♔',
    'black-pawn': '♟', 'black-rook': '♜', 'black-knight': '♞', 'black-bishop': '♝', 'black-queen': '♛', 'black-king': '♚'
  };
  return symbols[piece] || '';
}

function getDifficultyLabel(level) {
  if (level === 'medium') return 'Medium';
  if (level === 'hard') return 'Hard';
  return 'Easy';
}

function generateMatchingLevel(level, levelIndex = 1) {
  const pairs = level === 'easy' ? 4 : level === 'medium' ? 6 : 8;
  const emojiPool = ['🍎', '🍌', '🍇', '🍒', '🍉', '🥝', '🍓', '🥑', '🍍', '🍋', '🍊', '🍐'];
  const selected = emojiPool.slice(0, pairs);
  const cards = shuffleList([...selected, ...selected], levelIndex);
  return { cards, label: getDifficultyLabel(level) };
}

function generatePuzzleLevel(level, levelIndex = 1) {
  const size = level === 'hard' ? 4 : 3;
  const shuffleSteps = level === 'easy' ? 15 + levelIndex : level === 'medium' ? 25 + levelIndex : 40 + levelIndex;
  return { board: shufflePuzzle(size, shuffleSteps), size, label: getDifficultyLabel(level) };
}

function generateBottleLevel(level, levelIndex = 1) {
  const bottleCount = level === 'hard' ? 4 : 3;
  const colors = level === 'hard' ? ['red', 'blue', 'green', 'yellow'] : level === 'medium' ? ['red', 'blue', 'green', 'yellow'] : ['red', 'blue', 'green'];
  const capacity = 4;
  const solved = Array.from({ length: bottleCount }, () => Array(capacity).fill(''));
  colors.slice(0, bottleCount).forEach((color, index) => {
    solved[index] = Array(capacity).fill(color);
  });
  let scrambled = solved.map((bottle) => [...bottle]);
  const moves = level === 'easy' ? 8 + levelIndex : level === 'medium' ? 12 + levelIndex : 18 + levelIndex;
  for (let step = 0; step < moves; step += 1) {
    const sourceIndex = Math.floor(Math.random() * bottleCount);
    const sourceBottle = scrambled[sourceIndex];
    const topColor = getTopColor(sourceBottle);
    if (!topColor) continue;
    const targetIndexes = scrambled
      .map((bottle, index) => ({ bottle, index }))
      .filter(({ bottle, index }) => index !== sourceIndex && canPourToBottle(bottle, topColor));
    if (!targetIndexes.length) continue;
    const { index: targetIndex } = targetIndexes[Math.floor(Math.random() * targetIndexes.length)];
    const sourceTopIndex = getTopIndex(sourceBottle);
    const targetEmptyIndex = getNextEmptyIndex(scrambled[targetIndex]);
    if (sourceTopIndex === -1 || targetEmptyIndex === -1) continue;
    scrambled[sourceIndex][sourceTopIndex] = '';
    scrambled[targetIndex][targetEmptyIndex] = topColor;
  }

  if (isAlreadySeparated(scrambled)) {
    const sourceIndex = Math.floor(Math.random() * bottleCount);
    const targetIndex = (sourceIndex + 1 + Math.floor(Math.random() * (bottleCount - 1))) % bottleCount;
    const sourceBottle = scrambled[sourceIndex];
    const targetBottle = scrambled[targetIndex];
    const sourceTopIndex = getTopIndex(sourceBottle);
    const targetEmptyIndex = getNextEmptyIndex(targetBottle);
    if (sourceTopIndex !== -1 && targetEmptyIndex !== -1) {
      const color = sourceBottle[sourceTopIndex];
      sourceBottle[sourceTopIndex] = '';
      targetBottle[targetEmptyIndex] = color;
    }
  }

  return { bottles: scrambled, label: getDifficultyLabel(level) };
}

function getTopIndex(bottle) {
  for (let index = bottle.length - 1; index >= 0; index -= 1) {
    if (bottle[index]) return index;
  }
  return -1;
}

function getTopColor(bottle) {
  const topIndex = getTopIndex(bottle);
  return topIndex >= 0 ? bottle[topIndex] : null;
}

function getNextEmptyIndex(bottle) {
  for (let index = 0; index < bottle.length; index += 1) {
    if (!bottle[index]) return index;
  }
  return -1;
}

function canPourToBottle(bottle, color) {
  const topColor = getTopColor(bottle);
  return !topColor || topColor === color;
}

function isAlreadySeparated(bottles) {
  return bottles.every((bottle) => {
    const filled = bottle.filter(Boolean);
    return filled.length === 0 || filled.every((color) => color === filled[0]);
  });
}

function shuffleList(items, seed = 1) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = (seed + index + copy.length) % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function renderMatching() {
  const completed = state.matching.matched.length === state.matching.cards.length;
  if (completed) state.matching.completed = true;
  const grid = document.createElement('div');
  grid.className = 'matching-grid';
  state.matching.cards.forEach((emoji, index) => {
    const button = document.createElement('button');
    button.className = `card ${state.matching.flipped.includes(index) || state.matching.matched.includes(index) ? '' : 'hidden'}`;
    button.textContent = state.matching.flipped.includes(index) || state.matching.matched.includes(index) ? emoji : '?';
    button.disabled = state.matching.completed || state.matching.lock || state.matching.matched.includes(index) || state.matching.flipped.includes(index);
    button.addEventListener('click', () => handleMatchingClick(index));
    grid.appendChild(button);
  });
  gameBoard.innerHTML = '';
  gameBoard.appendChild(grid);
  gameControls.innerHTML = buildControls();
  gameStatus.textContent = completed
    ? `AI level complete! ${state.matching.level} level ${state.matching.levelIndex}/${state.matching.maxLevels} solved.`
    : `AI generated ${state.matching.level} level ${state.matching.levelIndex}/${state.matching.maxLevels}. Flip two cards to find a matching pair.`;
  attachControlHandlers();
}

function handleMatchingClick(index) {
  if (state.matching.completed || state.matching.lock || state.matching.flipped.includes(index) || state.matching.matched.includes(index)) return;
  state.matching.flipped.push(index);
  if (state.matching.flipped.length === 2) {
    state.matching.lock = true;
    const [first, second] = state.matching.flipped;
    if (state.matching.cards[first] === state.matching.cards[second]) {
      state.matching.matched.push(first, second);
      state.matching.flipped = [];
      state.matching.lock = false;
    } else {
      setTimeout(() => {
        state.matching.flipped = [];
        state.matching.lock = false;
        renderMatching();
      }, 700);
    }
  }
  renderMatching();
}

function renderPuzzle() {
  const solved = isSolvedPuzzle(state.puzzle.board);
  if (solved) state.puzzle.completed = true;
  const container = document.createElement('div');
  container.className = 'puzzle-grid';
  container.style.setProperty('--puzzle-columns', state.puzzle.size);
  state.puzzle.board.forEach((tile, index) => {
    const button = document.createElement('button');
    button.className = `puzzle-tile ${tile === 0 ? 'empty' : ''}`;
    button.textContent = tile === 0 ? '' : tile;
    button.addEventListener('click', () => handlePuzzleMove(index));
    container.appendChild(button);
  });
  gameBoard.innerHTML = '';
  gameBoard.appendChild(container);
  gameControls.innerHTML = buildControls();
  gameStatus.textContent = solved
    ? `Puzzle solved! ${state.puzzle.level} level ${state.puzzle.levelIndex}/${state.puzzle.maxLevels} complete.`
    : `AI generated ${state.puzzle.level} level ${state.puzzle.levelIndex}/${state.puzzle.maxLevels}. Click a tile to slide it into place.`;
  attachControlHandlers();
}

function handlePuzzleMove(index) {
  if (state.puzzle.completed) return;
  const emptyIndex = state.puzzle.board.indexOf(0);
  if (isAdjacent(index, emptyIndex, state.puzzle.size)) {
    [state.puzzle.board[index], state.puzzle.board[emptyIndex]] = [state.puzzle.board[emptyIndex], state.puzzle.board[index]];
    renderPuzzle();
  }
}

function isAdjacent(a, b, size) {
  const rowA = Math.floor(a / size);
  const rowB = Math.floor(b / size);
  const colA = a % size;
  const colB = b % size;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
}

function shufflePuzzle(size, steps) {
  const board = Array.from({ length: size * size }, (_, index) => (index + 1) % (size * size));
  for (let step = 0; step < steps; step += 1) {
    const empty = board.indexOf(0);
    const neighbours = [];
    if (empty >= size) neighbours.push(empty - size);
    if (empty + size < board.length) neighbours.push(empty + size);
    if (empty % size !== 0) neighbours.push(empty - 1);
    if (empty % size !== size - 1) neighbours.push(empty + 1);
    const swap = neighbours[Math.floor(Math.random() * neighbours.length)];
    [board[empty], board[swap]] = [board[swap], board[empty]];
  }
  return board;
}

function isSolvedPuzzle(board) {
  return board.every((tile, index) => tile === (index + 1) % board.length);
}

function renderBottles() {
  const solved = isSolvedBottles(state.bottles.bottles);
  const container = document.createElement('div');
  container.className = 'bottle-row';
  state.bottles.bottles.forEach((bottle, index) => {
    const bottleEl = document.createElement('div');
    bottleEl.className = 'bottle';
    bottleEl.innerHTML = bottle.map((color) => `<div class="bottle-cell ${color || ''}"></div>`).join('');
    bottleEl.addEventListener('click', () => handleBottleClick(index));
    if (state.bottles.selected === index) bottleEl.style.borderColor = 'var(--accent)';
    container.appendChild(bottleEl);
  });
  gameBoard.innerHTML = '';
  gameBoard.appendChild(container);
  gameControls.innerHTML = buildControls();
  gameStatus.textContent = solved
    ? `Water colours solved! ${state.bottles.level} level ${state.bottles.levelIndex}/${state.bottles.maxLevels} complete.`
    : state.bottles.selected === null
      ? `AI generated ${state.bottles.level} level ${state.bottles.levelIndex}/${state.bottles.maxLevels}. Choose a bottle to pour from.`
      : 'Choose another bottle to pour into.';
  attachControlHandlers();
}

function handleBottleClick(index) {
  if (state.bottles.completed) return;
  if (state.bottles.selected === null) {
    const bottle = state.bottles.bottles[index];
    if (!getTopColor(bottle)) return;
    state.bottles.selected = index;
    renderBottles();
    return;
  }
  if (state.bottles.selected === index) {
    state.bottles.selected = null;
    renderBottles();
    return;
  }
  const fromBottle = state.bottles.bottles[state.bottles.selected];
  const toBottle = state.bottles.bottles[index];
  const sourceColor = getTopColor(fromBottle);
  if (!sourceColor || !canPourToBottle(toBottle, sourceColor)) {
    state.bottles.selected = null;
    renderBottles();
    return;
  }
  const sourceTopIndex = getTopIndex(fromBottle);
  const targetEmptyIndex = getNextEmptyIndex(toBottle);
  if (sourceTopIndex === -1 || targetEmptyIndex === -1) {
    state.bottles.selected = null;
    renderBottles();
    return;
  }
  fromBottle[sourceTopIndex] = '';
  toBottle[targetEmptyIndex] = sourceColor;
  state.bottles.selected = null;
  renderBottles();
}

function isSolvedBottles(bottles) {
  return bottles.every((bottle) => {
    const filled = bottle.filter(Boolean);
    return filled.length === bottle.length && filled.every((color) => color === filled[0]);
  });
}

initApp();
