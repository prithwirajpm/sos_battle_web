/**
 * Props:
 *  selected  – 'S' | 'O'
 *  onChange  – (letter) => void
 *  disabled  – bool
 */
export default function LetterPicker({ selected, onChange, disabled }) {
  return (
    <div className="letter-picker" aria-label="Choose a letter to place">
      {['S', 'O'].map((letter) => (
        <button
          key={letter}
          id={`letter-btn-${letter}`}
          className={`letter-btn ${selected === letter ? `selected ${letter.toLowerCase()}` : ''}`}
          onClick={() => !disabled && onChange(letter)}
          disabled={disabled}
          aria-pressed={selected === letter}
          aria-label={`Place letter ${letter}`}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}
