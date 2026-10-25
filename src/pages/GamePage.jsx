import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { subscribeToRoom, makeMove, setPlayerConnected, joinRoom } from '../firebaseService'
import { deserializeBoard, findSOSSequences, BOARD_SIZE, createEmptyBoard } from '../gameLogic'
import { isFirebaseConfigured } from '../firebase'
import Board from '../components/Board'
import Scoreboard from '../components/Scoreboard'
import LetterPicker from '../components/LetterPicker'
import EndGameOverlay from '../components/EndGameOverlay'
import InviteLink from '../components/InviteLink'
import Toast from '../components/Toast'

const PLAYER_ID_KEY = 'sos_player_id'
const PLAYER_NAME_KEY = 'sos_player_name'

function getStoredPlayer(roomCode) {
  try {
    const raw = sessionStorage.getItem(`room_${roomCode}_player`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function getPlayerId() {
  return sessionStorage.getItem(PLAYER_ID_KEY)
}

export default function GamePage() {
  const { roomCode } = useParams()
  const navigate = useNavigate()

  // Player identity
  const storedPlayer = useMemo(() => getStoredPlayer(roomCode), [roomCode])
  const myPlayerId = useMemo(() => storedPlayer?.id || getPlayerId(), [storedPlayer])
  const myNickname = useMemo(() => storedPlayer?.nickname || localStorage.getItem(PLAYER_NAME_KEY) || 'Guest', [storedPlayer])

  // Game state
  const [roomData, setRoomData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [moveError, setMoveError] = useState('')
  const [movePending, setMovePending] = useState(false)

  // UI state
  const [selectedLetter, setSelectedLetter] = useState('S')
  const [sosCells, setSosCells] = useState(new Set())       // highlighted SOS cells
  const [lastMove, setLastMove] = useState(null)             // {row, col}
  const [toast, setToast] = useState(null)                   // { message }
  const toastTimerRef = useRef(null)
  const prevBoardRef = useRef(null)

  // Derived
  const inviteLink = `${window.location.origin}/game/${roomCode}?room=${roomCode}`
  const board2D = useMemo(() => {
    if (!roomData?.board) return createEmptyBoard()
    return deserializeBoard(roomData.board)
  }, [roomData?.board])

  const players = roomData?.players || {}
  const playerOrder = roomData?.playerOrder || []
  const currentTurn = roomData?.currentTurn
  const isMyTurn = currentTurn === myPlayerId
  const status = roomData?.status
  const playerCount = Object.keys(players).length

  // ── Subscribe to room ────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      setLoadError('Firebase is not configured. Please set up environment variables.')
      return
    }
    if (!roomCode) { navigate('/'); return }

    // Attempt reconnect if session data exists but we need to be in players
    const attemptReconnect = async () => {
      if (storedPlayer) {
        try {
          await joinRoom(roomCode, storedPlayer.id, storedPlayer.nickname)
        } catch {
          // May already be in room — ignore errors
        }
      }
    }
    attemptReconnect()

    const unsub = subscribeToRoom(roomCode, (snap) => {
      if (!snap.exists()) {
        setLoadError('Room not found or has been deleted.')
        setLoading(false)
        return
      }
      const data = snap.val()
      setRoomData(data)
      setLoading(false)
      setLoadError('')
    })

    return () => {
      unsub()
    }
  }, [roomCode, navigate, storedPlayer])

  // ── Presence: mark connected/disconnected ────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !roomCode || !myPlayerId) return

    setPlayerConnected(roomCode, myPlayerId, true)

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPlayerConnected(roomCode, myPlayerId, false)
      } else {
        setPlayerConnected(roomCode, myPlayerId, true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', () => setPlayerConnected(roomCode, myPlayerId, false))

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      setPlayerConnected(roomCode, myPlayerId, false)
    }
  }, [roomCode, myPlayerId])

  // ── Detect new SOS sequences formed by last move ─────────────
  useEffect(() => {
    if (!roomData?.board || !roomData?.lastMoveAt) return

    // Find cells that changed since last render
    const flatBoard = roomData.board
    const prevFlat = prevBoardRef.current
    if (!prevFlat) { prevBoardRef.current = flatBoard; return }

    // Find the newly placed cell
    let changedIndex = -1
    for (let i = 0; i < flatBoard.length; i++) {
      if (flatBoard[i] !== prevFlat[i] && flatBoard[i] !== '') {
        changedIndex = i
        break
      }
    }
    prevBoardRef.current = flatBoard

    if (changedIndex === -1) return

    const row = Math.floor(changedIndex / BOARD_SIZE)
    const col = changedIndex % BOARD_SIZE

    setLastMove({ row, col })

    // Find SOS sequences that include this cell
    const sequences = findSOSSequences(board2D, row, col)
    if (sequences.length > 0) {
      const newSet = new Set()
      sequences.forEach((seq) => seq.forEach(([r, c]) => newSet.add(`${r},${c}`)))
      setSosCells(newSet)

      // Clear highlight after 2s
      setTimeout(() => setSosCells(new Set()), 2200)

      // Show toast
      const scorer = roomData.players?.[currentTurn]?.nickname ?? 'Someone'
      const pts = sequences.length
      const msg = isMyTurn
        ? `⭐ You scored ${pts} SOS${pts > 1 ? 'es' : ''}! Extra turn!`
        : `${scorer} scored ${pts} SOS${pts > 1 ? 'es' : ''}!`
      setToast({ message: msg })
    }
  }, [roomData?.lastMoveAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle cell click ────────────────────────────────────────
  const handleCellClick = useCallback(async (row, col) => {
    if (!isMyTurn || movePending) return
    if (status !== 'playing') return
    if (board2D[row][col] !== '') return

    setMoveError('')
    setMovePending(true)
    try {
      await makeMove(roomCode, myPlayerId, row, col, selectedLetter)
    } catch (err) {
      setMoveError(err.message || 'Move failed. Try again.')
      setTimeout(() => setMoveError(''), 3000)
    } finally {
      setMovePending(false)
    }
  }, [isMyTurn, movePending, status, board2D, roomCode, myPlayerId, selectedLetter])

  const handleLeave = useCallback(() => {
    navigate('/')
  }, [navigate])

  // ── Guard: not in this room ──────────────────────────────────
  const amInRoom = myPlayerId && players[myPlayerId]

  // ── Loading / error states ───────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="loading-screen">
          <div className="spinner" />
          <p className="loading-title">Connecting to game room...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page">
        <div style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="error-box">{loadError}</div>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="page">
        <div className="info-box" style={{ maxWidth: 420 }}>
          Firebase is not configured. Please follow the setup instructions in README.md.
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>
    )
  }

  // ── Waiting for second player ────────────────────────────────
  if (status === 'waiting' || playerCount < 2) {
    return (
      <div className="page">
        <div className="waiting-container">
          <div className="glass-card waiting-card">
            <div style={{ marginBottom: 6 }}>
              <span className="pulse-dot" />
              <span style={{ fontSize: '0.82rem', color: 'var(--clr-muted)', fontWeight: 600 }}>
                Waiting for opponent…
              </span>
            </div>
            <h1 className="waiting-title gradient-text">Game Room Created!</h1>
            <p className="waiting-sub">Share the code or link below to invite a friend</p>

            <div className="room-code-box">{roomCode}</div>

            <div style={{ width: '100%', marginBottom: 16 }}>
              <p className="input-label" style={{ marginBottom: 8, textAlign: 'left' }}>
                Invite Link
              </p>
              <InviteLink roomCode={roomCode} inviteLink={inviteLink} />
            </div>

            <div className="info-box" style={{ marginBottom: 16, textAlign: 'left' }}>
              👤 You are: <strong>{myNickname}</strong> (Host)
            </div>

            <button
              id="leave-waiting-btn"
              className="btn btn-secondary btn-full"
              onClick={() => navigate('/')}
            >
              ← Leave Room
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Determine board disabled state ───────────────────────────
  const boardDisabled = !isMyTurn || movePending || status !== 'playing'

  // ── Status bar text ──────────────────────────────────────────
  const turnPlayer = players[currentTurn]
  let statusMsg = ''
  let statusClass = ''
  if (status === 'playing') {
    if (isMyTurn) {
      statusMsg = movePending ? '⏳ Placing...' : `⭐ Your turn — place an ${selectedLetter}`
      statusClass = 'status-your-turn'
    } else {
      statusMsg = `⏳ ${turnPlayer?.nickname ?? 'Opponent'}'s turn...`
      statusClass = 'status-their-turn'
    }
  }

  return (
    <div className="game-page" id="game-page">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} onDone={() => setToast(null)} />
      )}

      {/* End-game overlay */}
      {status === 'finished' && (
        <EndGameOverlay
          roomCode={roomCode}
          players={players}
          playerOrder={playerOrder}
          winner={roomData.winner}
          draw={roomData.draw}
          myPlayerId={myPlayerId}
          inviteLink={inviteLink}
          onLeave={handleLeave}
        />
      )}

      {/* Header */}
      <header className="game-header glass-card">
        <div>
          <div className="game-brand gradient-text">SOS</div>
          <div className="game-room-code">Room: {roomCode}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="connection-badge connected">
            <span className="connection-dot" />
            Live
          </div>
          <button
            id="leave-game-header-btn"
            className="btn btn-sm btn-secondary"
            onClick={handleLeave}
            aria-label="Leave game"
          >
            ✕ Leave
          </button>
        </div>
      </header>

      {/* Scoreboard */}
      <Scoreboard
        players={players}
        playerOrder={playerOrder}
        currentTurn={currentTurn}
        myPlayerId={myPlayerId}
      />

      {/* Status bar */}
      {statusMsg && (
        <div className={`status-bar ${statusClass}`} role="status" aria-live="polite">
          {statusMsg}
        </div>
      )}

      {/* Move error */}
      {moveError && (
        <div className="error-box" style={{ maxWidth: 680, width: '100%' }} role="alert">
          {moveError}
        </div>
      )}

      {/* Board area */}
      <div className="board-wrapper">
        {/* Letter picker */}
        {status === 'playing' && isMyTurn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--clr-muted)', fontWeight: 600 }}>
              Place:
            </span>
            <LetterPicker
              selected={selectedLetter}
              onChange={setSelectedLetter}
              disabled={boardDisabled}
            />
          </div>
        )}

        <div className="board-container glass-card">
          <Board
            board={board2D}
            sosCells={sosCells}
            lastMove={lastMove}
            onCellClick={handleCellClick}
            disabled={boardDisabled}
            selectedLetter={selectedLetter}
          />
        </div>

        {/* Invite link for playing game */}
        <details style={{ width: '100%' }}>
          <summary style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}>
            📋 Share invite link
          </summary>
          <InviteLink roomCode={roomCode} inviteLink={inviteLink} />
        </details>
      </div>
    </div>
  )
}
