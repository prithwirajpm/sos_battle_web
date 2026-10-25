/**
 * Props:
 *  players       – { [id]: { nickname, score } }
 *  playerOrder   – [p1Id, p2Id]
 *  currentTurn   – id of player whose turn it is
 *  myPlayerId    – my own player id
 */
export default function Scoreboard({ players, playerOrder, currentTurn, myPlayerId }) {
  if (!players || playerOrder.length < 2) return null

  const [p1Id, p2Id] = playerOrder
  const p1 = players[p1Id] || {}
  const p2 = players[p2Id] || {}

  const isMyTurn = currentTurn === myPlayerId
  const turnName = players[currentTurn]?.nickname ?? 'Unknown'

  return (
    <div className="scoreboard glass-card">
      {/* Player 1 */}
      <div className={`player-score-card p1 ${currentTurn === p1Id ? 'active' : ''}`}>
        <span className="player-name" title={p1.nickname}>
          {p1Id === myPlayerId ? '👤 ' : ''}
          {p1.nickname || 'Player 1'}
          {p1.connected === false ? ' 🔴' : ''}
        </span>
        <span className="player-score-num">{p1.score ?? 0}</span>
        {currentTurn === p1Id && (
          <span className={`turn-indicator p1-turn ${p1Id === myPlayerId ? 'your-turn' : ''}`}>
            {p1Id === myPlayerId ? '⭐ Your Turn' : '⏳ Their Turn'}
          </span>
        )}
      </div>

      {/* VS */}
      <div className="score-vs">VS</div>

      {/* Player 2 */}
      <div className={`player-score-card p2 ${currentTurn === p2Id ? 'active' : ''}`}>
        <span className="player-name" title={p2.nickname}>
          {p2Id === myPlayerId ? '👤 ' : ''}
          {p2.nickname || 'Player 2'}
          {p2.connected === false ? ' 🔴' : ''}
        </span>
        <span className="player-score-num">{p2.score ?? 0}</span>
        {currentTurn === p2Id && (
          <span className={`turn-indicator p2-turn ${p2Id === myPlayerId ? 'your-turn' : ''}`}>
            {p2Id === myPlayerId ? '⭐ Your Turn' : '⏳ Their Turn'}
          </span>
        )}
      </div>
    </div>
  )
}
