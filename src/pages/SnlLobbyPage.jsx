import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createSnlRoom,
  joinSnlRoom,
  generateRoomCode,
  generatePlayerId,
} from '../snlFirebaseService'
import { isFirebaseConfigured } from '../firebase'

const PLAYER_ID_KEY = 'snl_player_id'
const PLAYER_NAME_KEY = 'sos_player_name' // share nickname with SOS for convenience

function getOrCreateSnlPlayerId() {
  let id = sessionStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = generatePlayerId()
    sessionStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export default function SnlLobbyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState('create')
  const [nickname, setNickname] = useState(() => localStorage.getItem(PLAYER_NAME_KEY) || '')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill join code from ?room= query param
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
      const playerId = getOrCreateSnlPlayerId()
      const roomCode = generateRoomCode()
      await createSnlRoom(roomCode, playerId, nickname.trim())
      sessionStorage.setItem(`snl_room_${roomCode}_player`, JSON.stringify({ id: playerId, nickname: nickname.trim() }))
      navigate(`/snl/game/${roomCode}`)
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
      const playerId = getOrCreateSnlPlayerId()
      const code = joinCode.trim().toUpperCase()
      await joinSnlRoom(code, playerId, nickname.trim())
      sessionStorage.setItem(`snl_room_${code}_player`, JSON.stringify({ id: playerId, nickname: nickname.trim() }))
      navigate(`/snl/game/${code}`)
    } catch (err) {
      setError(err.message || 'Failed to join room.')
    } finally {
      setLoading(false)
    }
  }, [nickname, joinCode, navigate])

  return (
    <main className="page" id="snl-lobby-page">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-logo gradient-text" style={{ fontSize: '3rem' }}>🐍 S&L</div>
        <p style={{ color: 'var(--clr-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Snakes &amp; Ladders · Real-Time Multiplayer · No Login Required
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          {['🎮 2 Players', '🐍 Snakes', '🪜 Ladders', '⚡ Real-Time'].map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px',
                borderRadius: '999px', background: 'rgba(255,255,255,0.07)',
                border: '1px solid var(--clr-border)', color: 'var(--clr-muted)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Back to games */}
        <button
          className="btn btn-secondary"
          style={{ marginTop: 16, fontSize: '0.8rem', padding: '6px 16px' }}
          onClick={() => navigate('/')}
        >
          ← All Games
        </button>
      </div>

      {/* Card */}
      <div className="home-card glass-card">
        <div className="home-card-inner">
          {/* Tabs */}
          <div className="home-tabs" role="tablist">
            <button
              id="snl-tab-create"
              className={`home-tab${tab === 'create' ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === 'create'}
              onClick={() => { setTab('create'); setError('') }}
            >
              ✨ Create Game
            </button>
            <button
              id="snl-tab-join"
              className={`home-tab${tab === 'join' ? ' active' : ''}`}
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
            aria-label={tab === 'create' ? 'Create a new S&L room' : 'Join an existing S&L room'}
          >
            {/* Nickname */}
            <div className="input-group">
              <label className="input-label" htmlFor="snl-nickname-input">Your Nickname</label>
              <input
                id="snl-nickname-input"
                className="input-field"
                type="text"
                placeholder="e.g. SnakeMaster"
                value={nickname}
                onChange={(e) => saveNickname(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
                autoFocus
              />
            </div>

            {/* Join code (join tab only) */}
            {tab === 'join' && (
              <div className="input-group">
                <label className="input-label" htmlFor="snl-room-code-input">Room Code</label>
                <input
                  id="snl-room-code-input"
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

            {error && <div className="error-box" role="alert">{error}</div>}

            <button
              id={tab === 'create' ? 'snl-create-game-btn' : 'snl-join-game-btn'}
              className="btn btn-primary btn-lg btn-full"
              type="submit"
              disabled={loading}
            >
              {loading
                ? (tab === 'create' ? 'Creating…' : 'Joining…')
                : (tab === 'create' ? '✨ Create New Game' : '🚀 Join Game')}
            </button>
          </form>

          {/* How to play */}
          <div style={{ marginTop: 24, padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              How to Play
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Start at square <strong style={{ color: 'var(--clr-text)' }}>1</strong>, race to square <strong style={{ color: 'var(--clr-primary-lt)' }}>100</strong></li>
              <li>Roll the dice on your turn — land on a <strong style={{ color: 'var(--clr-accent-lt)' }}>🪜 Ladder</strong> to climb up!</li>
              <li>Beware of <strong style={{ color: 'var(--clr-red)' }}>🐍 Snakes</strong> — they send you sliding down</li>
              <li>First player to land exactly on 100 wins!</li>
            </ul>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 20, color: 'var(--clr-muted)', fontSize: '0.75rem', opacity: 0.6 }}>
        Powered by Firebase Realtime Database · Built with React + Vite
      </p>
    </main>
  )
}

