import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  runTransaction,
  serverTimestamp,
  remove,
} from 'firebase/database'
import { database } from './firebase'
import {
  createEmptyBoard,
  serializeBoard,
  deserializeBoard,
  findSOSSequences,
  isBoardFull,
  BOARD_SIZE,
} from './gameLogic'

// ─── Room helpers ────────────────────────────────────────────────────────────

export function roomRef(roomCode) {
  return ref(database, `rooms/${roomCode}`)
}

export function roomPlayersRef(roomCode) {
  return ref(database, `rooms/${roomCode}/players`)
}

export function roomBoardRef(roomCode) {
  return ref(database, `rooms/${roomCode}/board`)
}

// ─── Create a new room ───────────────────────────────────────────────────────

export async function createRoom(roomCode, playerId, nickname) {
  const emptyBoard = serializeBoard(createEmptyBoard())
  const roomData = {
    roomCode,
    status: 'waiting', // waiting | playing | finished
    players: {
      [playerId]: {
        id: playerId,
        nickname,
        score: 0,
        connected: true,
        joinedAt: serverTimestamp(),
      },
    },
    playerOrder: [playerId],
    currentTurn: playerId,       // whose turn it is
    board: emptyBoard,           // flat array of BOARD_SIZE*BOARD_SIZE cells
    createdAt: serverTimestamp(),
    lastMoveAt: null,
    winner: null,
    draw: false,
  }
  await set(roomRef(roomCode), roomData)
  return roomData
}

// ─── Join an existing room ───────────────────────────────────────────────────

export async function joinRoom(roomCode, playerId, nickname) {
  const snap = await get(roomRef(roomCode))
  if (!snap.exists()) throw new Error('Room not found.')

  const data = snap.val()

  if (data.status === 'finished') throw new Error('This game has already ended.')

  const existingPlayers = data.players || {}
  const playerIds = Object.keys(existingPlayers)

  // Allow reconnect: if player was already in the room
  if (existingPlayers[playerId]) {
    await update(ref(database, `rooms/${roomCode}/players/${playerId}`), {
      connected: true,
      nickname,
    })
    return { reconnected: true, roomData: data }
  }

  if (playerIds.length >= 2) throw new Error('Room is full (2 players max).')

  // Add the second player and start the game
  const updates = {}
  updates[`rooms/${roomCode}/players/${playerId}`] = {
    id: playerId,
    nickname,
    score: 0,
    connected: true,
    joinedAt: serverTimestamp(),
  }
  updates[`rooms/${roomCode}/playerOrder`] = [...(data.playerOrder || playerIds), playerId]
  updates[`rooms/${roomCode}/status`] = 'playing'

  await update(ref(database, '/'), updates)
  return { reconnected: false, roomData: data }
}

// ─── Make a move (with Firebase transaction for safety) ─────────────────────

export async function makeMove(roomCode, playerId, row, col, letter) {
  const rRef = roomRef(roomCode)

  let newSequences = []

  const result = await runTransaction(rRef, (currentData) => {
    if (!currentData) return // abort

    const { status, currentTurn, board, players } = currentData

    // Validations
    if (status !== 'playing') return           // abort – game not active
    if (currentTurn !== playerId) return       // abort – not this player's turn
    if (!players || !players[playerId]) return // abort – player not in room

    const cellIndex = row * BOARD_SIZE + col
    if (board[cellIndex] !== '') return        // abort – cell occupied

    // Apply move
    const newBoard = [...board]
    newBoard[cellIndex] = letter

    // Find SOS sequences formed by this move
    const board2D = deserializeBoard(newBoard)
    newSequences = findSOSSequences(board2D, row, col)
    const scored = newSequences.length

    // Update score
    const newScore = (players[playerId].score || 0) + scored

    // Determine next state
    const playerOrder = currentData.playerOrder || Object.keys(players)
    const currentIndex = playerOrder.indexOf(playerId)
    const otherIndex = 1 - currentIndex
    const otherPlayerId = playerOrder[otherIndex]

    // Extra turn if scored, otherwise switch
    const nextTurn = scored > 0 ? playerId : otherPlayerId

    const boardFull = isBoardFull(board2D)
    const newStatus = boardFull ? 'finished' : 'playing'

    let winner = null
    let draw = false
    if (boardFull) {
      const scores = {
        [playerId]: newScore,
        [otherPlayerId]: players[otherPlayerId]?.score || 0,
      }
      const myScore = scores[playerId]
      const theirScore = scores[otherPlayerId]
      if (myScore > theirScore) winner = playerId
      else if (theirScore > myScore) winner = otherPlayerId
      else draw = true
    }

    // Write back
    currentData.board = newBoard
    currentData.players[playerId].score = newScore
    currentData.currentTurn = nextTurn
    currentData.status = newStatus
    currentData.lastMoveAt = Date.now()
    if (boardFull) {
      currentData.winner = winner
      currentData.draw = draw
    }

    return currentData
  })

  if (!result.committed) {
    throw new Error('Move rejected: invalid turn or cell already taken.')
  }

  return { sequences: newSequences }
}

// ─── Reset / play again ──────────────────────────────────────────────────────

export async function resetGame(roomCode) {
  const snap = await get(roomRef(roomCode))
  if (!snap.exists()) throw new Error('Room not found.')

  const data = snap.val()
  const players = data.players || {}

  // Reset scores and board
  const updates = {}
  for (const pid of Object.keys(players)) {
    updates[`rooms/${roomCode}/players/${pid}/score`] = 0
  }
  updates[`rooms/${roomCode}/board`] = serializeBoard(createEmptyBoard())
  updates[`rooms/${roomCode}/status`] = 'playing'
  updates[`rooms/${roomCode}/winner`] = null
  updates[`rooms/${roomCode}/draw`] = false
  updates[`rooms/${roomCode}/lastMoveAt`] = null
  // First player in playerOrder goes first
  updates[`rooms/${roomCode}/currentTurn`] = (data.playerOrder || Object.keys(players))[0]

  await update(ref(database, '/'), updates)
}

// ─── Mark player disconnected ────────────────────────────────────────────────

export async function setPlayerConnected(roomCode, playerId, connected) {
  try {
    await update(ref(database, `rooms/${roomCode}/players/${playerId}`), { connected })
  } catch {
    // ignore – room may no longer exist
  }
}

// ─── Leave / delete room ─────────────────────────────────────────────────────

export async function leaveRoom(roomCode) {
  try {
    await remove(roomRef(roomCode))
  } catch {
    // ignore
  }
}

// ─── Subscribe to room ───────────────────────────────────────────────────────

export function subscribeToRoom(roomCode, callback) {
  const rRef = roomRef(roomCode)
  onValue(rRef, callback)
  return () => off(rRef, 'value', callback)
}
