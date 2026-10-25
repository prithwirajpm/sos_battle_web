import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Validate that required env vars are present
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
]
export const isFirebaseConfigured = requiredVars.every(
  (key) => import.meta.env[key] && import.meta.env[key] !== `your_${key.toLowerCase().replace('vite_firebase_', '')}_here`
)

let app = null
let database = null

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    database = getDatabase(app)
  } catch (e) {
    console.error('Firebase init error:', e)
  }
}

export { database }
export default app
