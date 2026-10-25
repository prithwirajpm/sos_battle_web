import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { generateRoomCode, generatePlayerId } from '../gameLogic'
import { createRoom, joinRoom } from '../firebaseService'
import { isFirebaseConfigured } from '../firebase'

const PLAYER_ID_KEY = 'sos_player_id'
const PLAYER_NAME_KEY = 'sos_player_name'

function getOrCreatePlayerId() {
  let id = sessionStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = generatePlayerId()
    sessionStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [nickname, setNickname] = useState(() => localStorage.getItem(PLAYER_NAME_KEY) || '')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill join code from URL param
  useEffect(() => {
    const code = searchParams.get('room')
    if (code) {
      setTab('join')
      setJoinCode(code.toUpperCase())
    }
  }, [searchParams])

  const saveNickname = (name) => {
    setNickname(name)
    localStorage.setItem(PLAYER_NAME_KEY, name)
  }

  const handleCreate = useCallback(async (e) => {
    e.preventDefault()
    if (!nickname.trim()) { setError('Please enter a nickname.'); return }
    if (!isFirebaseConfigured) { setError('Firebase is not configured. See the banner above.'); return }

    setError('')
    setLoading(true)
    try {
      const playerId = getOrCreatePlayerId()
      const roomCode = generateRoomCode()
      await createRoom(roomCode, playerId, nickname.trim())
      // Store player info for reconnect
      sessionStorage.setItem(`room_${roomCode}_player`, JSON.stringify({ id: playerId, nickname: nickname.trim() }))
      navigate(`/game/${roomCode}`)
    } catch (err) {
      setError(err.message || 'Failed to create room.')
    } finally {
      setLoading(false)
    }
  }, [nickname, navigate])

  const handleJoin = useCallback(async (e) => {
    e.preventDefault()
    if (!nickname.trim()) { setError('Please enter a nickname.'); return }
    if (!joinCode.trim()) { setError('Please enter a room code.'); return }
    if (!isFirebaseConfigured) { setError('Firebase is not configured. See the banner above.'); return }

    setError('')
    setLoading(true)
    try {
      const playerId = getOrCreatePlayerId()
      const code = joinCode.trim().toUpperCase()
      await joinRoom(code, playerId, nickname.trim())
      sessionStorage.setItem(`room_${code}_player`, JSON.stringify({ id: playerId, nickname: nickname.trim() }))
      navigate(`/game/${code}`)
    } catch (err) {
      setError(err.message || 'Failed to join room.')
    } finally {
      setLoading(false)
    }
  }, [nickname, joinCode, navigate])

  return (
    <main className="page" id="home-page">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-logo gradient-text">SOS</div>
        <p style={{ color: 'var(--clr-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Real-Time Multiplayer · 6×6 Board · No Login Required
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          {['🎮 Multiplayer', '⚡ Real-Time', '📱 Mobile-Friendly'].map(tag => (
            <span key={tag} style={{
              fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px',
              borderRadius: '999px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid var(--clr-border)', color: 'var(--clr-muted)'
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="home-card glass-card">
        <div className="home-card-inner">
          {/* Tabs */}
          <div className="home-tabs" role="tablist">
            <button
              id="tab-create"
              className={`home-tab ${tab === 'create' ? 'active' : ''}`}
              role="tab"
              aria-selected={tab === 'create'}
              onClick={() => { setTab('create'); setError('') }}
            >
              ✨ Create Game
            </button>
            <button
              id="tab-join"
              className={`home-tab ${tab === 'join' ? 'active' : ''}`}
              role="tab"
              aria-selected={tab === 'join'}
              onClick={() => { setTab('join'); setError('') }}
            >
              🔗 Join Game
            </button>
          </div>

          {/* Form */}
          <form
            className="home-form"
            onSubmit={tab === 'create' ? handleCreate : handleJoin}
            aria-label={tab === 'create' ? 'Create a new game room' : 'Join an existing game room'}
          >
            {/* Nickname */}
            <div className="input-group">
              <label className="input-label" htmlFor="nickname-input">Your Nickname</label>
              <input
                id="nickname-input"
                className="input-field"
                type="text"
                placeholder="e.g. DragonSlayer"
                value={nickname}
                onChange={(e) => saveNickname(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
                autoFocus
              />
            </div>

            {/* Join code (only on join tab) */}
            {tab === 'join' && (
              <div className="input-group">
                <label className="input-label" htmlFor="room-code-input">Room Code</label>
                <input
                  id="room-code-input"
                  className="input-field"
                  type="text"
                  placeholder="e.g. AB3C7X"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 800, fontSize: '1.1rem' }}
                />
              </div>
            )}

            {/* Error */}
            {error && <div className="error-box" role="alert">{error}</div>}

            {/* Submit */}
            <button
              id={tab === 'create' ? 'create-game-btn' : 'join-game-btn'}
              className="btn btn-primary btn-lg btn-full"
              type="submit"
              disabled={loading}
            >
              {loading
                ? (tab === 'create' ? 'Creating...' : 'Joining...')
                : (tab === 'create' ? '✨ Create New Game' : '🚀 Join Game')}
            </button>
          </form>

          {/* How to play */}
          <div style={{ marginTop: 24, padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              How to Play
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Take turns placing <strong style={{ color: 'var(--clr-primary-lt)' }}>S</strong> or <strong style={{ color: 'var(--clr-accent-lt)' }}>O</strong> on the 6×6 board</li>
              <li>Score a point for every <strong style={{ color: 'var(--clr-text)' }}>S–O–S</strong> sequence you complete</li>
              <li>Scoring a sequence earns you <strong>an extra turn</strong></li>
              <li>Most points when the board is full wins!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 20, color: 'var(--clr-muted)', fontSize: '0.75rem', opacity: 0.6 }}>
        Powered by Firebase Realtime Database · Built with React + Vite
      </p>
    </main>
  )
}
