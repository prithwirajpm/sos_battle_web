// Snakes and Ladders game logic

// Classic board positions
// SNAKES: key = head (higher number), value = tail (lower number) — you slide DOWN
export const SNAKES = {
  99: 54,
  70: 55,
  52: 42,
  25: 5,
  95: 75,
  61: 19,
  87: 24,
  17: 7,
}

// LADDERS: key = bottom (lower number), value = top (higher number) — you climb UP
export const LADDERS = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
}

export const BOARD_SIZE_SNL = 100

/**
 * Get the square number for a given visual row & col.
 * Visual row 0 = top of board (squares 91-100)
 * Visual row 9 = bottom of board (squares 1-10)
 * Even board rows go left-to-right, odd board rows right-to-left (zigzag).
 */
export function cellNumber(visualRow, col) {
  const boardRow = 9 - visualRow // 0 = bottom, 9 = top
  if (boardRow % 2 === 0) {
    return boardRow * 10 + col + 1
  } else {
    return boardRow * 10 + (9 - col) + 1
  }
}

/**
 * Given a square number (1-100), return its visual row and col.
 * Visual row 0 = top, visual row 9 = bottom.
 */
export function squareToPosition(square) {
  const idx = square - 1
  const boardRow = Math.floor(idx / 10)
  const col = boardRow % 2 === 0 ? idx % 10 : 9 - (idx % 10)
  const row = 9 - boardRow // visual row (0=top, 9=bottom)
  return { row, col }
}

/** Roll a single six-sided die; returns 1-6. */
export function rollDice() {
  return Math.floor(Math.random() * 6) + 1
}

/**
 * Apply a dice roll to the current position.
 * Returns { newPosition, snake, ladder, win, stayed }
 *
 * - stayed: true if tentative > 100 (must roll exactly to win)
 * - snake: { from, to } if the player landed on a snake's head
 * - ladder: { from, to } if the player landed on a ladder's bottom
 * - win: true if newPosition === 100
 */
export function applyMove(currentPosition, diceValue) {
  const tentative = currentPosition + diceValue

  if (tentative > 100) {
    // Overshoot — stay put
    return { newPosition: currentPosition, snake: null, ladder: null, win: false, stayed: true }
  }

  if (tentative === 100) {
    return { newPosition: 100, snake: null, ladder: null, win: true, stayed: false }
  }

  // Check snake
  if (SNAKES[tentative] !== undefined) {
    return {
      newPosition: SNAKES[tentative],
      snake: { from: tentative, to: SNAKES[tentative] },
      ladder: null,
      win: false,
      stayed: false,
    }
  }

  // Check ladder
  if (LADDERS[tentative] !== undefined) {
    return {
      newPosition: LADDERS[tentative],
      snake: null,
      ladder: { from: tentative, to: LADDERS[tentative] },
      win: false,
      stayed: false,
    }
  }

  return { newPosition: tentative, snake: null, ladder: null, win: false, stayed: false }
}

