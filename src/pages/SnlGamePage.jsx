import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  subscribeToSnlRoom,
  rollSnlDice,
  setSnlPlayerConnected,
  leaveSnlRoom,
  generatePlayerId,
} from '../snlFirebaseService'
import SnlBoard from '../components/SnlBoard'
import SnlDice from '../components/SnlDice'
import SnlEndOverlay from '../components/SnlEndOverlay'

const PLAYER_ID_KEY = 'snl_player_id'
const PLAYER_NAME_KEY = 'sos_player_name'

function getSnlPlayerId() {
  let id = sessionStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = generatePlayerId()
    sessionStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

function getStoredPlayer(roomCode) {
  try {
    const raw = sessionStorage.getItem(`snl_room_${roomCode}_player`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ─── Activity log entry renderer ─────────────────────────────────────────────

function ActionMessage({ action, players }) {
  if (!action) return null
  const actor = players?.[action.playerId]?.nickname || 'Someone'
  const { dice, fromPosition, newPosition, snake, ladder, stayed } = action

  let msg = `${actor} rolled a ${dice}`
  let detail = null
  let icon = '🎲'

  if (stayed) {
    detail = `Stayed at square ${fromPosition} (overshot!)`
    icon = '😬'
  } else if (snake) {
    detail = `🐍 Bitten! Slid from ${snake.from} → ${snake.to}`
    icon = '🐍'
  } else if (ladder) {
    detail = `🪜 Climbed up from ${ladder.from} → ${ladder.to}`
    icon = '🪜'
  } else {
    detail = `Moved to square ${newPosition}`
    icon = '📍'
  }

  return (
    <div className="snl-activity-item">
      <span className="snl-activity-icon">{icon}</span>
      <div>
        <span className="snl-activity-main">{msg}</span>
        <span className="snl-activity-detail"> — {detail}</span>
      </div>
    </div>
  )
}

// ─── Waiting room ─────────────────────────────────────────────────────────────

function WaitingRoom({ roomCode, myNickname }) {
  const navigate = useNavigate()
  const inviteUrl = `${window.location.origin}/snl?room=${roomCode}`

  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className="page">
      <div className="waiting-card glass-card">
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>⏳</div>
        <h2 className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>
          Waiting for Opponent
        </h2>
        <p style={{ color: 'var(--clr-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
          Share the room code or link with a friend to start!
        </p>

        <div className="room-code-box">{roomCode}</div>

        <p style={{ color: 'var(--clr-muted)', margin: '14px 0 10px', fontSize: '0.8rem' }}>
          Or share the invite link:
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
          <input
            readOnly
            value={inviteUrl}
            className="input-field"
            style={{ flex: 1, fontSize: '0.78rem' }}
            onFocus={(e) => e.target.select()}
            aria-label="Invite link"
          />
          <button className="btn btn-secondary" onClick={copy} style={{ whiteSpace: 'nowrap' }}>
            {copied ? '✅ Copied' : '📋 Copy'}
          </button>
        </div>

        <button
          className="btn btn-secondary"
          style={{ marginTop: 20, width: '100%' }}
          onClick={() => {
            leaveSnlRoom(roomCode).catch(() => {})
            navigate('/')
          }}
        >
          ← Back to Games
        </button>
      </div>
    </div>
  )
}

// ─── Main game page ───────────────────────────────────────────────────────────

export default function SnlGamePage() {
  const { roomCode } = useParams()
  const navigate = useNavigate()

  const myPlayerId = getSnlPlayerId()
  const stored = getStoredPlayer(roomCode)
  const myNickname = stored?.nickname || localStorage.getItem(PLAYER_NAME_KEY) || 'You'

  const [roomData, setRoomData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [rollError, setRollError] = useState('')
  const [toast, setToast] = useState(null)

  // Track last action to avoid showing stale toasts
  const lastActionTsRef = useRef(0)

  // ── Subscribe to room ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToSnlRoom(roomCode, (snap) => {
      if (!snap.exists()) {
        setRoomData(null)
        setLoading(false)
        return
      }
      const data = snap.val()
      setRoomData(data)
      setLoading(false)
    })
    return unsub
  }, [roomCode])

  // ── Toast for snakes / ladders / stayed ─────────────────────────────────
  useEffect(() => {
    if (!roomData?.lastAction) return
    const action = roomData.lastAction
    if (action.timestamp <= lastActionTsRef.current) return
    lastActionTsRef.current = action.timestamp

    const isMe = action.playerId === myPlayerId
    const name = isMe ? 'You' : (roomData.players?.[action.playerId]?.nickname || 'Opponent')

    let msg = null
    if (action.snake) {
      msg = `🐍 ${name} got bitten! ${action.snake.from} → ${action.snake.to}`
    } else if (action.ladder) {
      msg = `🪜 ${name} climbed a ladder! ${action.ladder.from} → ${action.ladder.to}`
    } else if (action.stayed) {
      msg = `😬 ${name} overshot — stays at ${action.fromPosition}`
    }

    if (msg) {
      setToast(msg)
      setTimeout(() => setToast(null), 3500)
    }
  }, [roomData?.lastAction, myPlayerId, roomData?.players])

  // ── Mark connected / disconnected ───────────────────────────────────────
  useEffect(() => {
    setSnlPlayerConnected(roomCode, myPlayerId, true)
    const handleVisibilityChange = () => {
      setSnlPlayerConnected(roomCode, myPlayerId, !document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      setSnlPlayerConnected(roomCode, myPlayerId, false)
    }
  }, [roomCode, myPlayerId])

  // ── Roll dice ────────────────────────────────────────────────────────────
  const handleRoll = useCallback(async () => {
    if (rolling) return
    setRollError('')
    setRolling(true)
    try {
      await rollSnlDice(roomCode, myPlayerId)
    } catch (err) {
      setRollError(err.message || 'Failed to roll.')
    } finally {
      // Keep animation for 900ms regardless
      setTimeout(() => setRolling(false), 900)
    }
  }, [rolling, roomCode, myPlayerId])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="loading-screen">
          <div className="spinner" aria-label="Loading" />
          <p className="loading-title">Connecting to game…</p>
        </div>
      </div>
    )
  }

  // ── Room not found ───────────────────────────────────────────────────────
  if (!roomData) {
    return (
      <div className="page">
        <div className="loading-screen">
          <div style={{ fontSize: '3rem' }}>😕</div>
          <p className="loading-title">Room not found or was deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  const { status, players, playerOrder, currentTurn, lastDice, lastAction, winner } = roomData

  // ── Waiting ──────────────────────────────────────────────────────────────
  if (status === 'waiting') {
    return <WaitingRoom roomCode={roomCode} myNickname={myNickname} />
  }

  // ── Derive player objects ────────────────────────────────────────────────
  const p1Id = playerOrder?.[0]
  const p2Id = playerOrder?.[1]
  const player1 = players?.[p1Id]
  const player2 = players?.[p2Id]

  const isMyTurn = currentTurn === myPlayerId
  const myPlayerObj = players?.[myPlayerId]
  const opponentId = p1Id === myPlayerId ? p2Id : p1Id
  const opponentObj = players?.[opponentId]

  // ── End overlay ──────────────────────────────────────────────────────────
  const showEnd = status === 'finished'

  return (
    <div className="snl-game-page page">
      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="snl-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="snl-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.4rem' }}>🐍</span>
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Snakes &amp; Ladders
          </span>
          <span className="snl-live-badge">● LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--clr-muted)' }}>
            Room: <strong style={{ color: 'var(--clr-text)', letterSpacing: 2 }}>{roomCode}</strong>
          </span>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '5px 12px' }}
            onClick={() => navigate('/')}
          >
            🏠 Home
          </button>
        </div>
      </header>

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <div className="snl-game-layout">
        {/* ── Left sidebar — players + dice ──────────────────────────── */}
        <aside className="snl-sidebar">
          {/* Player cards */}
          <div className="snl-player-cards">
            {/* Player 1 */}
            <div
              className={`snl-player-card snl-player-card-p1${currentTurn === p1Id ? ' snl-player-card-active' : ''}`}
            >
              <span className="snl-player-token">🔴</span>
              <div className="snl-player-info">
                <span className="snl-player-name">
                  {player1?.nickname || 'Player 1'}
                  {p1Id === myPlayerId ? ' (You)' : ''}
                </span>
                <span className="snl-player-pos">Square {player1?.position ?? 1}</span>
              </div>
              {currentTurn === p1Id && (
                <span className="snl-turn-arrow">←</span>
              )}
            </div>

            {/* Player 2 */}
            <div
              className={`snl-player-card snl-player-card-p2${currentTurn === p2Id ? ' snl-player-card-active' : ''}`}
            >
              <span className="snl-player-token">🔵</span>
              <div className="snl-player-info">
                <span className="snl-player-name">
                  {player2?.nickname || 'Player 2'}
                  {p2Id === myPlayerId ? ' (You)' : ''}
                </span>
                <span className="snl-player-pos">Square {player2?.position ?? 1}</span>
              </div>
              {currentTurn === p2Id && (
                <span className="snl-turn-arrow">←</span>
              )}
            </div>
          </div>

          {/* Turn indicator */}
          <div className="snl-status-bar">
            {isMyTurn
              ? '🎯 Your turn — roll the dice!'
              : `⏳ ${players?.[currentTurn]?.nickname || 'Opponent'}'s turn`}
          </div>

          {/* Dice */}
          <SnlDice
            value={lastDice}
            rolling={rolling}
            onRoll={handleRoll}
            disabled={!isMyTurn || rolling}
            isMyTurn={isMyTurn}
          />

          {rollError && (
            <div className="error-box" role="alert" style={{ marginTop: 10 }}>{rollError}</div>
          )}

          {/* Activity log */}
          <div className="snl-activity-log">
            <p className="snl-activity-title">Last Action</p>
            {lastAction ? (
              <ActionMessage action={lastAction} players={players} />
            ) : (
              <p style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>No moves yet.</p>
            )}
          </div>
        </aside>

        {/* ── Board ─────────────────────────────────────────────────────── */}
        <main className="snl-board-area">
          <SnlBoard
            player1={player1}
            player2={player2}
            playerOrder={playerOrder}
            myPlayerId={myPlayerId}
            lastAction={lastAction}
          />
        </main>
      </div>

      {/* ── End overlay ───────────────────────────────────────────────── */}
      {showEnd && (
        <SnlEndOverlay
          roomCode={roomCode}
          players={players}
          playerOrder={playerOrder}
          winner={winner}
          myPlayerId={myPlayerId}
          onLeave={() => navigate('/')}
        />
      )}
    </div>
  )
}

