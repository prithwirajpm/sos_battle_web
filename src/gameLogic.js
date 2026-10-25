// SOS Game Logic Utilities

export const BOARD_SIZE = 6
export const EMPTY = ''
export const LETTERS = ['S', 'O']

/** Create a fresh empty board */
export function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
}

/**
 * Find all SOS sequences formed by the last move at (row, col).
 * Returns array of sequences, each being array of [r,c] triples.
 */
export function findSOSSequences(board, row, col) {
  const sequences = []
  const letter = board[row][col]
  if (!letter) return sequences

  // All 8 directions (stored as pairs to check forward/backward)
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1],  // diagonal /
  ]

  for (const [dr, dc] of directions) {
    // For each direction, check all 3-cell windows containing [row, col]
    // Offsets: the placed cell can be at position 0, 1, or 2 of S-O-S
    for (let startOffset = -2; startOffset <= 0; startOffset++) {
      const cells = []
      let valid = true
      for (let i = 0; i < 3; i++) {
        const r = row + (startOffset + i) * dr
        const c = col + (startOffset + i) * dc
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
          valid = false
          break
        }
        cells.push([r, c])
      }
      if (!valid) continue

      const word = cells.map(([r, c]) => board[r][c]).join('')
      if (word === 'SOS') {
        // Deduplicate: check if this exact set of cells is already in sequences
        const key = cells.map(([r, c]) => `${r},${c}`).join('|')
        const alreadyFound = sequences.some(
          (seq) => seq.map(([r, c]) => `${r},${c}`).join('|') === key
        )
        if (!alreadyFound) {
          sequences.push(cells)
        }
      }
    }
  }

  return sequences
}

/** Count total SOS sequences on entire board (for scoring verification) */
export function countAllSOS(board) {
  let count = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'S') {
        count += findSOSSequences(board, r, c).length
      }
    }
  }
  // Each SOS is counted twice (once from each S), divide by 2
  return count / 2
}

/** Check if board is completely full */
export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== EMPTY))
}

/** Determine game result */
export function getGameResult(scores, playerIds) {
  const [p1, p2] = playerIds
  if (scores[p1] > scores[p2]) return { winner: p1 }
  if (scores[p2] > scores[p1]) return { winner: p2 }
  return { winner: null, draw: true }
}

/** Generate a random 6-character room code */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Generate a random short player ID */
export function generatePlayerId() {
  return Math.random().toString(36).slice(2, 10)
}

/** Serialize board (2D array → flat array for Firebase) */
export function serializeBoard(board) {
  return board.flat()
}

/** Deserialize board (flat array → 2D array) */
export function deserializeBoard(flat) {
  const board = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    board.push(flat.slice(r * BOARD_SIZE, (r + 1) * BOARD_SIZE))
  }
  return board
}
