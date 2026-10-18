'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Mark = 'X' | 'O';
type Cell = Mark | null;
type Result = { id: number; winner: Mark | null; isDraw: boolean; playedAt: string };
const winningLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function getWinner(board: Cell[]): { winner: Mark | null; line: number[] } {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line };
  }
  return { winner: null, line: [] };
}

export default function Home() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Mark>('X');
  const [gameOver, setGameOver] = useState(false);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [history, setHistory] = useState<Result[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/games').then(async (response) => {
      if (active && response.ok) setHistory((await response.json()).games ?? []);
    }).catch(() => { if (active) setSaveError(true); });
    return () => { active = false; };
  }, []);
  const score = useMemo(() => ({ X: history.filter((game) => game.winner === 'X').length, O: history.filter((game) => game.winner === 'O').length, draws: history.filter((game) => game.isDraw).length }), [history]);

  const saveResult = async (winner: Mark | null, isDraw: boolean) => {
    setIsSaving(true); setSaveError(false);
    try {
      const response = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winner, isDraw }) });
      if (!response.ok) throw new Error('Could not save game');
      const data = await response.json(); setHistory((current) => [data.game, ...current]);
    } catch { setSaveError(true); } finally { setIsSaving(false); }
  };

  const play = (index: number) => {
    if (board[index] || gameOver) return;
    const nextBoard = [...board]; nextBoard[index] = currentPlayer;
    const result = getWinner(nextBoard); const draw = !result.winner && nextBoard.every(Boolean);
    setBoard(nextBoard);
    if (result.winner || draw) { setGameOver(true); setWinningLine(result.line); void saveResult(result.winner, draw); }
    else setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
  };
  const newGame = () => { setBoard(Array(9).fill(null)); setCurrentPlayer('X'); setGameOver(false); setWinningLine([]); setSaveError(false); };
  const status = gameOver ? winningLine.length ? `Player ${getWinner(board).winner} wins!` : 'It’s a draw.' : `Player ${currentPlayer}’s turn`;

  return <main className={styles.page}>
    <header className={styles.topbar}><div className={styles.wordmark}><span className={styles.logoMark}>✳</span><span>tic / tac</span></div><span className={styles.live}><i /> live match</span></header>
    <section className={styles.hero}><div><p className={styles.kicker}>Two players · one board</p><h1>MAKE YOUR MOVE.</h1><p className={styles.intro}>A tiny game of big decisions. Pass the screen, take your turn, and see who owns the grid.</p></div><div className={styles.scoreboard} aria-label="Match score"><div><span className={styles.scoreLabel}>X wins</span><strong>{score.X}</strong></div><div className={styles.scoreDivider} /><div><span className={styles.scoreLabel}>O wins</span><strong>{score.O}</strong></div><div className={styles.scoreDivider} /><div><span className={styles.scoreLabel}>Draws</span><strong>{score.draws}</strong></div></div></section>
    <section className={styles.playArea}><div className={styles.gameCard}><div className={styles.gameHeader}><div><span className={styles.roundLabel}>Current round</span><h2>{status}</h2></div><span className={`${styles.turnBadge} ${currentPlayer === 'O' ? styles.oBadge : ''}`}>{gameOver ? 'over' : currentPlayer}</span></div><div className={styles.board} role="grid" aria-label="Tic tac toe board">{board.map((cell, index) => <button key={index} className={`${styles.cell} ${cell === 'X' ? styles.xCell : styles.oCell} ${winningLine.includes(index) ? styles.winnerCell : ''}`} onClick={() => play(index)} disabled={Boolean(cell) || gameOver} aria-label={cell ? `Cell ${index + 1}: ${cell}` : `Cell ${index + 1}: empty`}>{cell}</button>)}</div><div className={styles.gameFooter}><span>{isSaving ? 'Saving result…' : saveError ? 'Result saved for this session' : gameOver ? 'Round recorded' : 'Tap an empty square to play'}</span><button className={styles.resetButton} onClick={newGame}>{gameOver ? 'Play again' : 'Reset board'} <span>↗</span></button></div></div>
      <aside className={styles.historyCard}><div className={styles.historyHeader}><div><span className={styles.roundLabel}>The archive</span><h2>Recent rounds</h2></div><span className={styles.count}>{history.length}</span></div>{history.length === 0 ? <p className={styles.empty}>Your first round will appear here.</p> : <div className={styles.historyList}>{history.slice(0, 6).map((game, index) => <div className={styles.historyRow} key={`${game.id}-${index}`}><span className={`${styles.resultIcon} ${game.winner === 'O' ? styles.oResult : game.isDraw ? styles.drawResult : ''}`}>{game.isDraw ? '—' : game.winner}</span><div><strong>{game.isDraw ? 'Draw game' : `Player ${game.winner} wins`}</strong><small>{new Date(game.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div><span className={styles.rowArrow}>↗</span></div>)}</div>}<p className={styles.archiveNote}>Results are saved automatically after every round.</p></aside></section>
    <footer className={styles.footer}><span>tic / tac</span><span>Built for friendly rivalries</span><span>v0.1 · MVP</span></footer>
  </main>;
}
