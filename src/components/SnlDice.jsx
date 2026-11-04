import { useState, useEffect, useRef } from 'react'

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

/**
 * Animated dice component.
 *
 * Props:
 *   value    — current dice value (1-6)
 *   rolling  — boolean; true while the roll animation should play
 *   onRoll   — callback when the user clicks Roll Dice
 *   disabled — disable the button (not player's turn, etc.)
 *   isMyTurn — whether it's this client's turn (shows/hides the button)
 */
export default function SnlDice({ value, rolling, onRoll, disabled, isMyTurn }) {
  const [displayValue, setDisplayValue] = useState(value || 1)
  const [isAnimating, setIsAnimating] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (rolling) {
      setIsAnimating(true)
      let count = 0
      intervalRef.current = setInterval(() => {
        setDisplayValue(Math.ceil(Math.random() * 6))
        count++
        if (count > 10) {
          clearInterval(intervalRef.current)
          setDisplayValue(value || 1)
          setIsAnimating(false)
        }
      }, 75)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setDisplayValue(value || 1)
      setIsAnimating(false)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [rolling, value])

  return (
    <div className="snl-dice-container">
      <div
        className={`snl-dice${isAnimating ? ' snl-dice-rolling' : ''}`}
        aria-label={`Dice showing ${displayValue}`}
        role="img"
      >
        {DICE_FACES[(displayValue || 1) - 1]}
      </div>

      {isMyTurn && (
        <button
          className="btn btn-primary snl-roll-btn"
          onClick={onRoll}
          disabled={disabled || rolling}
          aria-label="Roll dice"
        >
          {rolling ? '🎲 Rolling…' : '🎲 Roll Dice'}
        </button>
      )}

      {!isMyTurn && (
        <p className="snl-waiting-turn">Waiting for opponent…</p>
      )}
    </div>
  )
}

