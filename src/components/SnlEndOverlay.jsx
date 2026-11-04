import { useState, useCallback } from 'react'
import { resetSnlGame, leaveSnlRoom } from '../snlFirebaseService'

/**
 * End-game overlay shown when status === 'finished'.
 *
 * Props:
 *   roomCode    — Firebase room code
 *   players     — { [playerId]: { nickname, position } }
 *   playerOrder — [p1Id, p2Id]
 *   winner      — playerId of the winner
 *   myPlayerId  — this client's player ID
 *   onLeave     — callback to navigate back to home
 */
export default function SnlEndOverlay({ roomCode, players, playerOrder, winner, myPlayerId, onLeave }) {
  const [resetting, setResetting] = useState(false)

  const myWin = winner === myPlayerId
  const winnerPlayer = players?.[winner]

  const emoji = myWin ? '🏆' : '😔'
  const title = myWin ? 'You Win! 🎉' : `${winnerPlayer?.nickname ?? 'Opponent'} Wins!`
  const subtitle = myWin
    ? 'Congratulations! You reached square 100!'
    : 'Better luck next time!'

  const handlePlayAgain = useCallback(async () => {
    setResetting(true)
    try {
      await resetSnlGame(roomCode)
    } catch (e) {
      console.error('Reset failed:', e)
    } finally {
      setResetting(false)
    }
  }, [roomCode])

  const handleLeave = useCallback(async () => {
    try {
      await leaveSnlRoom(roomCode)
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
        <p className="end-subtitle" style={{ marginBottom: 32 }}>{subtitle}</p>

        <div className="end-scores">
          {(playerOrder || []).map((pid, i) => {
            const p = players?.[pid]
            const isWinner = pid === winner
            return (
              <div key={pid} className="end-score-item">
                <span className="end-score-name">
                  {i === 0 ? '🔴 ' : '🔵 '}
                  {p?.nickname || `Player ${i + 1}`}
                  {isWinner ? ' 🏆' : ''}
                </span>
                <span
                  className="end-score-value"
                  style={{
                    color: i === 0 ? 'var(--clr-primary-lt)' : 'var(--clr-accent-lt)',
                    fontSize: '1.3rem',
                  }}
                >
                  Sq. {p?.position ?? 1}
                </span>
              </div>
            )
          })}
        </div>

        <div className="end-actions">
          <button
            id="snl-play-again-btn"
            className="btn btn-primary btn-lg btn-full"
            onClick={handlePlayAgain}
            disabled={resetting}
          >
            {resetting ? 'Resetting…' : '🎮 Play Again'}
          </button>
          <button
            id="snl-leave-btn"
            className="btn btn-secondary btn-full"
            onClick={handleLeave}
          >
            🏠 Back to Games
          </button>
        </div>
      </div>
    </div>
  )
}

