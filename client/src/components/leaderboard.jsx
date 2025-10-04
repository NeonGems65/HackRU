// client/src/components/leaderboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

export default function Leaderboard() {
  const [gameResults, setGameResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  console.log("Rendering Leaderboard, gameResults:", gameResults);


  useEffect(() => {
    console.log('Leaderboard mounted');
    // Check for stored game results first
    const storedResults = localStorage.getItem('gameResults');
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults);
        setGameResults(results);
        setLoading(false);
        return; // we already have results, no need to set up socket listener
      } catch (error) {
        console.error('Error parsing stored game results:', error);
      }
    }

    // Listen for game results from socket (only on mount)
    const onGameEnded = (results) => {
      console.log("Game results received:", results);
      setGameResults(results);
      setLoading(false);
      // persist so user can revisit leaderboard
      try {
        localStorage.setItem('gameResults', JSON.stringify(results));
      } catch (e) {
        console.warn('Unable to persist game results:', e);
      }
    };

    socket.on("game_ended", onGameEnded);

    // If no results after 2 seconds, show empty state (check storage not state)
    const timeout = setTimeout(() => {
      const stored = localStorage.getItem('gameResults');
      if (!stored) {
        setLoading(false);
      }
    }, 2000);

    return () => {
      socket.off("game_ended", onGameEnded);
      clearTimeout(timeout);
    };
  }, []);

  const goToLobby = () => {
    navigate("/");
  };

  const playAgain = () => {
    // Clear stored results when starting new game
    localStorage.removeItem('gameResults');
    navigate("/");
  };

  if (loading) {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="title">Loading Results...</h1>
          <div style={{ 
            fontSize: '2rem', 
            margin: '2rem 0',
            animation: 'spin 1s linear infinite'
          }}>
            ⏳
          </div>
        </div>
      </div>
    );
  }

  if (!gameResults) {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="title">🏆 Leaderboard</h1>
          <p className="subtitle">No game results available</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
            Play a game to see the leaderboard!
          </p>
          <button className="btn" onClick={goToLobby}>
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card fade-in" style={{ maxWidth: '700px', width: '100%' }}>
      <h1 className="title">🏆 Final Results</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          {gameResults.rankings.map((player, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem',
                background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : 
                           index === 1 ? 'rgba(192, 192, 192, 0.2)' : 
                           index === 2 ? 'rgba(205, 127, 50, 0.2)' : 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: index === 0 ? '2px solid #ffd700' : 
                        index === 1 ? '2px solid #c0c0c0' : 
                        index === 2 ? '2px solid #cd7f32' : '1px solid rgba(255,255,255,0.1)',
                transform: index === 0 ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
            >
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: index === 0 ? '#ffd700' : 
                         index === 1 ? '#c0c0c0' : 
                         index === 2 ? '#cd7f32' : '#ffffff'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                </span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{player.username}</div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                    {player.correctAnswers}/{player.totalAnswers} correct answers
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', fontSize: '1.5rem' }}>{player.score} pts</div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  {Math.round((player.correctAnswers / player.totalAnswers) * 100)}% accuracy
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginBottom: '2rem', 
        padding: '1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        color: 'rgba(255,255,255,0.8)'
      }}>
        <p><strong>Game Duration:</strong> {Math.round(gameResults.gameStats.duration / 1000)}s</p>
        <p><strong>Total Rounds:</strong> {gameResults.gameStats.totalRounds}</p>
        <p><strong>Players:</strong> {gameResults.rankings.length}</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={playAgain}>
          Play Again
        </button>
        <button type="button" className="btn btn-secondary" onClick={goToLobby}>
          New Room
        </button>
      </div>
    </div>
  );
}
