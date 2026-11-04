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
import { generateRoomCode, generatePlayerId } from './gameLogic'
import { applyMove } from './snlLogic'

// ─── Room ref ────────────────────────────────────────────────────────────────

export function snlRoomRef(roomCode) {
  return ref(database, `snl_rooms/${roomCode}`)
}

// ─── Create a new S&L room ───────────────────────────────────────────────────

export async function createSnlRoom(roomCode, playerId, nickname) {
  const roomData = {
    roomCode,
    gameType: 'snl',
    status: 'waiting', // waiting | playing | finished
    players: {
      [playerId]: {
        id: playerId,
        nickname,
        position: 1,
        connected: true,
        joinedAt: serverTimestamp(),
      },
    },
    playerOrder: [playerId],
    currentTurn: playerId,
    createdAt: serverTimestamp(),
    lastAction: null,
    lastDice: null,
    winner: null,
  }
  await set(snlRoomRef(roomCode), roomData)
  return roomData
}

// ─── Join an existing S&L room ───────────────────────────────────────────────

export async function joinSnlRoom(roomCode, playerId, nickname) {
  const snap = await get(snlRoomRef(roomCode))
  if (!snap.exists()) throw new Error('Room not found.')

  const data = snap.val()

  if (data.status === 'finished') throw new Error('This game has already ended.')
  if (data.gameType !== 'snl') throw new Error('This is not a Snakes and Ladders room.')

  const existingPlayers = data.players || {}
  const playerIds = Object.keys(existingPlayers)

  // Allow reconnect
  if (existingPlayers[playerId]) {
    await update(ref(database, `snl_rooms/${roomCode}/players/${playerId}`), {
      connected: true,
      nickname,
    })
    return { reconnected: true, roomData: data }
  }

  if (playerIds.length >= 2) throw new Error('Room is full (2 players max).')

  const updates = {}
  updates[`snl_rooms/${roomCode}/players/${playerId}`] = {
    id: playerId,
    nickname,
    position: 1,
    connected: true,
    joinedAt: serverTimestamp(),
  }
  updates[`snl_rooms/${roomCode}/playerOrder`] = [...(data.playerOrder || playerIds), playerId]
  updates[`snl_rooms/${roomCode}/status`] = 'playing'

  await update(ref(database, '/'), updates)
  return { reconnected: false, roomData: data }
}

// ─── Roll dice (Firebase transaction for server-side validation) ─────────────

export async function rollSnlDice(roomCode, playerId) {
  const rRef = snlRoomRef(roomCode)

  const result = await runTransaction(rRef, (currentData) => {
    if (!currentData) return // abort

    const { status, currentTurn, players } = currentData

    if (status !== 'playing') return      // abort
    if (currentTurn !== playerId) return  // abort – not your turn
    if (!players || !players[playerId]) return // abort

    const dice = Math.floor(Math.random() * 6) + 1
    const currentPosition = players[playerId].position || 1

    const { newPosition, snake, ladder, win, stayed } = applyMove(currentPosition, dice)

    const playerOrder = currentData.playerOrder || Object.keys(players)
    const currentIndex = playerOrder.indexOf(playerId)
    const otherIndex = 1 - currentIndex
    const otherPlayerId = playerOrder[otherIndex]

    // Update player position
    currentData.players[playerId].position = newPosition

    // Switch turn (even if stayed, turn switches)
    currentData.currentTurn = otherPlayerId
    currentData.lastDice = dice
    currentData.lastAction = {
      playerId,
      dice,
      fromPosition: currentPosition,
      newPosition,
      snake: snake || null,
      ladder: ladder || null,
      stayed: stayed || false,
      timestamp: Date.now(),
    }

    if (win) {
      currentData.status = 'finished'
      currentData.winner = playerId
    }

    return currentData
  })

  if (!result.committed) {
    throw new Error('Move rejected: not your turn or game not active.')
  }

  return result.snapshot.val()
}

// ─── Reset / play again ──────────────────────────────────────────────────────

export async function resetSnlGame(roomCode) {
  const snap = await get(snlRoomRef(roomCode))
  if (!snap.exists()) throw new Error('Room not found.')

  const data = snap.val()
  const players = data.players || {}

  const updates = {}
  for (const pid of Object.keys(players)) {
    updates[`snl_rooms/${roomCode}/players/${pid}/position`] = 1
  }
  updates[`snl_rooms/${roomCode}/status`] = 'playing'
  updates[`snl_rooms/${roomCode}/winner`] = null
  updates[`snl_rooms/${roomCode}/lastDice`] = null
  updates[`snl_rooms/${roomCode}/lastAction`] = null
  updates[`snl_rooms/${roomCode}/currentTurn`] = (data.playerOrder || Object.keys(players))[0]

  await update(ref(database, '/'), updates)
}

// ─── Mark player connected / disconnected ────────────────────────────────────

export async function setSnlPlayerConnected(roomCode, playerId, connected) {
  try {
    await update(ref(database, `snl_rooms/${roomCode}/players/${playerId}`), { connected })
  } catch {
    // ignore – room may no longer exist
  }
}

// ─── Leave / delete room ─────────────────────────────────────────────────────

export async function leaveSnlRoom(roomCode) {
  try {
    await remove(snlRoomRef(roomCode))
  } catch {
    // ignore
  }
}

// ─── Subscribe to room (real-time) ───────────────────────────────────────────

export function subscribeToSnlRoom(roomCode, callback) {
  const rRef = snlRoomRef(roomCode)
  onValue(rRef, callback)
  return () => off(rRef, 'value', callback)
}

// Re-export helpers so lobby/game pages don't need to import from two files
export { generateRoomCode, generatePlayerId }

