import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import { isFirebaseConfigured } from './firebase'
import FirebaseSetupBanner from './components/FirebaseSetupBanner'

function App() {
  return (
    <div className="app-root">
      {!isFirebaseConfigured && <FirebaseSetupBanner />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
