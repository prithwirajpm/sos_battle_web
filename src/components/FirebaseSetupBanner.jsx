export default function FirebaseSetupBanner() {
  return (
    <div className="firebase-banner" role="alert">
      <span>⚠️</span>
      <span>
        Firebase is not configured. Copy{' '}
        <strong>.env.example</strong> → <strong>.env</strong> and add your Firebase
        credentials to enable real-time multiplayer.{' '}
        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Firebase Console →
        </a>
      </span>
    </div>
  )
}
