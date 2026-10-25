import { useCallback } from 'react'
import { BOARD_SIZE } from '../gameLogic'

/**
 * Props:
 *  board          – 2D array [row][col] of '', 'S', 'O'
 *  sosCells       – Set of "r,c" strings that are part of a completed SOS
 *  lastMove       – { row, col } of the most recently placed letter
 *  onCellClick    – (row, col) => void
 *  disabled       – bool: disable all clicks
 *  selectedLetter – 'S' | 'O'
 */
export default function Board({ board, sosCells, lastMove, onCellClick, disabled, selectedLetter }) {
  const handleClick = useCallback(
    (r, c) => {
      if (disabled || board[r][c] !== '') return
      onCellClick(r, c)
    },
    [disabled, board, onCellClick]
  )

  return (
    <div className="board-grid" role="grid" aria-label="SOS game board">
      {board.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`
          const filled = cell !== ''
          const isSos = sosCells.has(key)
          const isLast = lastMove && lastMove.row === r && lastMove.col === c
          const cellClass = [
            'cell',
            filled ? 'filled' : '',
            filled ? cell.toLowerCase() : '',
            isSos ? 'sos-cell' : '',
            isLast ? 'last-move' : '',
            disabled && !filled ? 'disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={key}
              className={cellClass}
              role="gridcell"
              aria-label={filled ? `${cell} at row ${r + 1} col ${c + 1}` : `Empty cell row ${r + 1} col ${c + 1}`}
              onClick={() => handleClick(r, c)}
              tabIndex={filled || disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClick(r, c)
              }}
            >
              {cell}
            </div>
          )
        })
      )}
    </div>
  )
}
