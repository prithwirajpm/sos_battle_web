import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import SnlLobbyPage from './pages/SnlLobbyPage'
import SnlGamePage from './pages/SnlGamePage'
import { isFirebaseConfigured } from './firebase'
import FirebaseSetupBanner from './components/FirebaseSetupBanner'

function App() {
  return (
    <div className="app-root">
      {!isFirebaseConfigured && <FirebaseSetupBanner />}
      <Routes>
        {/* SOS routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />

        {/* Snakes & Ladders routes */}
        <Route path="/snl" element={<SnlLobbyPage />} />
        <Route path="/snl/game/:roomCode" element={<SnlGamePage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
