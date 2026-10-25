import { useState, useCallback } from 'react'
import { resetGame, leaveRoom } from '../firebaseService'

/**
 * End-game overlay shown when status === 'finished'
 * Props:
 *  roomCode    – string
 *  players     – { [id]: { nickname, score } }
 *  playerOrder – [p1Id, p2Id]
 *  winner      – player id or null
 *  draw        – bool
 *  myPlayerId  – string
 *  inviteLink  – string
 *  onLeave     – () => void (navigate away)
 */
export default function EndGameOverlay({
  roomCode,
  players,
  playerOrder,
  winner,
  draw,
  myPlayerId,
  inviteLink,
  onLeave,
}) {
  const [resetting, setResetting] = useState(false)
  const [copyLabel, setCopyLabel] = useState('📋 Copy Invite Link')
  const [leaveError, setLeaveError] = useState('')

  const [p1Id, p2Id] = playerOrder
  const p1 = players[p1Id] || {}
  const p2 = players[p2Id] || {}
  const myWin = winner === myPlayerId

  const emoji = draw ? '🤝' : myWin ? '🏆' : '😔'
  const title = draw
    ? "It's a Draw!"
    : myWin
    ? 'You Win!'
    : `${players[winner]?.nickname ?? 'Opponent'} Wins!`

  const handlePlayAgain = useCallback(async () => {
    setResetting(true)
    try {
      await resetGame(roomCode)
    } catch (e) {
      console.error(e)
    } finally {
      setResetting(false)
    }
  }, [roomCode])

  const handleCopyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopyLabel('✓ Copied!')
      setTimeout(() => setCopyLabel('📋 Copy Invite Link'), 2000)
    } catch {
      setCopyLabel('✓ Copied!')
      setTimeout(() => setCopyLabel('📋 Copy Invite Link'), 2000)
    }
  }, [inviteLink])

  const handleLeave = useCallback(async () => {
    try {
      await leaveRoom(roomCode)
    } catch {
      // ignore
    }
    onLeave()
  }, [roomCode, onLeave])

  return (
    <div className="end-overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="glass-card end-card">
        <div className="end-emoji" aria-hidden="true">{emoji}</div>
        <h1 className="end-title gradient-text">{title}</h1>
        <p className="end-subtitle">Final Scores</p>

        <div className="end-scores">
          <div className="end-score-item">
            <span className="end-score-name">{p1.nickname || 'Player 1'}</span>
            <span className="end-score-value" style={{ color: 'var(--clr-primary-lt)' }}>
              {p1.score ?? 0}
            </span>
          </div>
          <div className="end-score-item">
            <span className="end-score-name">{p2.nickname || 'Player 2'}</span>
            <span className="end-score-value" style={{ color: 'var(--clr-accent-lt)' }}>
              {p2.score ?? 0}
            </span>
          </div>
        </div>

        {leaveError && <div className="error-box" style={{ marginBottom: 12 }}>{leaveError}</div>}

        <div className="end-actions">
          <button
            id="play-again-btn"
            className="btn btn-primary btn-lg btn-full"
            onClick={handlePlayAgain}
            disabled={resetting}
          >
            {resetting ? 'Resetting...' : '🎮 Play Again'}
          </button>

          <button
            id="copy-invite-end-btn"
            className="btn btn-teal btn-full"
            onClick={handleCopyInvite}
          >
            {copyLabel}
          </button>

          <button
            id="leave-game-btn"
            className="btn btn-secondary btn-full"
            onClick={handleLeave}
          >
            🚪 Leave Game
          </button>
        </div>
      </div>
    </div>
  )
}
