import { useState, useCallback } from 'react'

/**
 * Props:
 *  roomCode   – string
 *  inviteLink – string (full URL)
 */
export default function InviteLink({ roomCode, inviteLink }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = inviteLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteLink])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      <div className="invite-link-box">
        <code>{inviteLink}</code>
        <button
          className="btn btn-sm btn-secondary"
          onClick={handleCopy}
          id="copy-invite-btn"
          aria-label="Copy invite link"
          style={{ flexShrink: 0 }}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
    </div>
  )
}
