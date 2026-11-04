import { useMemo } from 'react'
import { SNAKES, LADDERS } from '../snlLogic'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the square number for a visual row + col.
 * Visual row 0 = top (squares 91-100), visual row 9 = bottom (squares 1-10).
 */
function cellNumber(visualRow, col) {
  const boardRow = 9 - visualRow
  if (boardRow % 2 === 0) {
    return boardRow * 10 + col + 1
  } else {
    return boardRow * 10 + (9 - col) + 1
  }
}

/** Colour palette — one shade per row group for visual warmth. */
function getCellBg(sq) {
  const palette = [
    'rgba(124,58,237,0.13)',   // row 1-10  — purple
    'rgba(6,182,212,0.12)',    // row 11-20 — teal
    'rgba(16,185,129,0.12)',   // row 21-30 — emerald
    'rgba(245,158,11,0.11)',   // row 31-40 — amber
    'rgba(236,72,153,0.12)',   // row 41-50 — pink
    'rgba(99,102,241,0.12)',   // row 51-60 — indigo
    'rgba(20,184,166,0.12)',   // row 61-70 — teal-2
    'rgba(249,115,22,0.11)',   // row 71-80 — orange
    'rgba(139,92,246,0.13)',   // row 81-90 — violet
    'rgba(239,68,68,0.10)',    // row 91-100— red
  ]
  const rowIdx = Math.floor((sq - 1) / 10)
  return palette[rowIdx % palette.length]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SnlBoard({ player1, player2, playerOrder, lastAction }) {
  const p1Pos = player1?.position ?? 1
  const p2Pos = player2?.position ?? 1

  // Determine which square was last-landed (highlight window: 4 s)
  const highlightSq = useMemo(() => {
    if (!lastAction) return null
    if (Date.now() - (lastAction.timestamp || 0) > 4000) return null
    return lastAction.newPosition
  }, [lastAction])

  // Build the full 100-cell grid
  const cells = useMemo(() => {
    const grid = []
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const sq = cellNumber(row, col)
        const isSnakeHead = SNAKES[sq] !== undefined
        const isSnakeTail = Object.values(SNAKES).includes(sq)
        const isLadderBottom = LADDERS[sq] !== undefined
        const isLadderTop = Object.values(LADDERS).includes(sq)
        grid.push({ row, col, sq, isSnakeHead, isSnakeTail, isLadderBottom, isLadderTop })
      }
    }
    return grid
  }, [])

  return (
    <div className="snl-board-wrapper">
      <div className="snl-board-grid" role="grid" aria-label="Snakes and Ladders board">
        {cells.map(({ row, col, sq, isSnakeHead, isSnakeTail, isLadderBottom, isLadderTop }) => {
          let bg = getCellBg(sq)
          let borderColor = 'rgba(255,255,255,0.08)'
          let icon = null
          let extraClass = ''

          if (isSnakeHead) {
            bg = 'rgba(239,68,68,0.22)'
            borderColor = 'rgba(239,68,68,0.45)'
            icon = '🐍'
          } else if (isLadderBottom) {
            bg = 'rgba(16,185,129,0.22)'
            borderColor = 'rgba(16,185,129,0.45)'
            icon = '🪜'
          } else if (isSnakeTail) {
            bg = 'rgba(239,68,68,0.07)'
          } else if (isLadderTop) {
            bg = 'rgba(16,185,129,0.07)'
          }

          if (sq === highlightSq) extraClass = 'snl-cell-highlight'

          const hasP1 = p1Pos === sq
          const hasP2 = p2Pos === sq

          return (
            <div
              key={`${row}-${col}`}
              className={`snl-cell${extraClass ? ' ' + extraClass : ''}`}
              style={{ background: bg, borderColor }}
              data-square={sq}
              role="gridcell"
              aria-label={`Square ${sq}${isSnakeHead ? ' (snake)' : ''}${isLadderBottom ? ' (ladder)' : ''}`}
            >
              <span className="snl-cell-num">{sq}</span>
              {icon && <span className="snl-cell-icon">{icon}</span>}
              {(hasP1 || hasP2) && (
                <div className="snl-tokens">
                  {hasP1 && (
                    <span
                      className="snl-token snl-token-p1"
                      title={player1?.nickname || 'Player 1'}
                    >
                      🔴
                    </span>
                  )}
                  {hasP2 && (
                    <span
                      className="snl-token snl-token-p2"
                      title={player2?.nickname || 'Player 2'}
                    >
                      🔵
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="snl-legend">
        <div className="snl-legend-item">
          <span>🐍</span>
          <span>Snake (slide down)</span>
        </div>
        <div className="snl-legend-item">
          <span>🪜</span>
          <span>Ladder (climb up)</span>
        </div>
        <div className="snl-legend-item">
          <span>🔴</span>
          <span>{player1?.nickname || 'Player 1'}</span>
        </div>
        {player2 && (
          <div className="snl-legend-item">
            <span>🔵</span>
            <span>{player2?.nickname || 'Player 2'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

