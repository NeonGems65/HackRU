// client/src/components/Game.jsx
import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";

export default function Game() {
  const [gameState, setGameState] = useState('lobby'); // lobby, waiting, playing, finished
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [gameResults, setGameResults] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  
  const problemStartTime = useRef(null);
  const answerInputRef = useRef(null);

  useEffect(() => {
    // Socket event listeners
    socket.on("new_problem", (newProblem) => {
      setProblem(newProblem);
      setAnswer("");
      problemStartTime.current = Date.now();
      if (answerInputRef.current) {
        answerInputRef.current.focus();
      }
    });

    socket.on("room_update", (data) => {
      if (data?.players) {
        setPlayers(Object.values(data.players));
        setGameState(data.gameState || 'waiting');
        setTimeRemaining(data.timeRemaining || 0);
        
        // Find current player
        const currentPlayerData = Object.values(data.players).find(p => 
          p.username === username
        );
        setCurrentPlayer(currentPlayerData);
      }
    });

    socket.on("countdown", (num) => {
      setCountdown(num);
    });

    socket.on("time_update", (time) => {
      setTimeRemaining(time);
    });

    socket.on("game_started", () => {
      setGameState('playing');
      setCountdown(0);
    });

    socket.on("game_ended", (results) => {
      setGameState('finished');
      setGameResults(results);
    });

    socket.on("answer_correct", (data) => {
      setFeedback({ type: 'correct', message: `+${data.score} points! Streak: ${data.streak}` });
      setTimeout(() => setFeedback(null), 2000);
    });

    socket.on("answer_incorrect", () => {
      setFeedback({ type: 'incorrect', message: 'Wrong answer!' });
      setTimeout(() => setFeedback(null), 2000);
    });

    return () => {
      socket.off("new_problem");
      socket.off("room_update");
      socket.off("countdown");
      socket.off("time_update");
      socket.off("game_started");
      socket.off("game_ended");
      socket.off("answer_correct");
      socket.off("answer_incorrect");
    };
  }, [username]);

  const joinRoom = () => {
    if (room && username) {
      socket.emit("join_room", room, username);
      setGameState('waiting');
    }
  };

  const markReady = () => {
    if (room && username) {
      socket.emit("player_ready", room);
    }
  };

  const leaveRoom = () => {
    if (room) {
      socket.emit("leave_room", room);
      // Reset to lobby state
      setGameState('lobby');
      setGameResults(null);
      setProblem(null);
      setAnswer("");
      setPlayers([]);
      setCountdown(0);
      setTimeRemaining(0);
      setFeedback(null);
      setRoom("");
      setUsername("");
    }
  };

  const submitAnswer = () => {
    if (answer && problemStartTime.current) {
      const timeSpent = Date.now() - problemStartTime.current;
      socket.emit("submit_answer", { 
        roomCode: room, 
        answer: parseInt(answer),
        timeSpent 
      });
      setAnswer("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && gameState === 'playing') {
      submitAnswer();
    }
  };


  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoom(code);
  };

  if (gameState === 'lobby') {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '500px', width: '100%' }}>
        <h1 className="title">🧮 Math Battle</h1>
        <p className="subtitle">Compete in real-time math challenges!</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="Room Code"
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={generateRoomCode}>
              Generate
            </button>
          </div>
          
          <input
            className="input"
            placeholder="Your Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          
          <button 
            className="btn" 
            onClick={joinRoom}
            disabled={!room || !username}
            style={{ opacity: (!room || !username) ? 0.5 : 1 }}
          >
            Join Battle
          </button>
        </div>

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <p>🎯 Answer math problems as fast as possible</p>
          <p>⚡ Get bonus points for speed and streaks</p>
          <p>🏆 Compete against other players in real-time</p>
        </div>
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '600px', width: '100%' }}>
        <h1 className="title">Waiting Room</h1>
        <p className="subtitle">Room: {room}</p>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.9)' }}>
            Players ({players.length}/8)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {players.map((player, index) => (
              <div 
                key={index}
                style={{
                  background: player.isReady ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                  padding: '0.75rem 1rem',
                  borderRadius: '20px',
                  border: player.isReady ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  transform: player.isReady ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: player.isReady ? '#22c55e' : '#ffffff'
                  }}>
                    {player.isReady ? '✅' : '⏳'}
                  </span>
                  <span style={{ 
                    fontWeight: '600',
                    color: player.isReady ? '#22c55e' : '#ffffff'
                  }}>
                    {player.username}
                  </span>
                  {player.isReady && (
                    <span style={{ 
                      fontSize: '0.8rem',
                      color: '#22c55e',
                      fontWeight: '500'
                    }}>
                      READY
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {currentPlayer && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem',
            marginBottom: '1rem' 
          }}>
            {!currentPlayer.isReady ? (
              <button 
                className="btn" 
                onClick={markReady}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                I'm Ready!
              </button>
            ) : (
              <button 
                className="btn" 
                disabled
                style={{ 
                  background: '#6b7280',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#9ca3af',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }}
              >
                ✅ Ready!
              </button>
            )}
            
            <button 
              className="btn btn-secondary" 
              onClick={leaveRoom}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Leave Room
            </button>
          </div>
        )}

        {players.length >= 2 && players.every(p => p.isReady) && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <div style={{ 
              padding: '1rem',
              background: 'rgba(34, 197, 94, 0.2)',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#22c55e', fontWeight: '600', margin: 0 }}>
                🎉 All players ready! Click below to start the battle!
              </p>
            </div>
            <button 
              className="btn" 
              onClick={() => socket.emit("start_game", room)}
              style={{ 
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                padding: '14px 28px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
                animation: 'pulse 2s infinite'
              }}
            >
              🚀 START BATTLE!
            </button>
          </div>
        )}

      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '700px', width: '100%' }}>
        {countdown > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              fontSize: '4rem', 
              fontWeight: '800', 
              color: countdown === 1 ? '#ef4444' : '#ffffff',
              textShadow: '0 0 20px rgba(255,255,255,0.5)'
            }}>
              {countdown}
            </div>
          </div>
        )}

        {countdown === 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Round {problem?.roundNumber || 1}</h2>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '600',
                  color: timeRemaining <= 10 ? '#ef4444' : '#ffffff'
                }}>
                  ⏱️ {timeRemaining}s
                </div>
              </div>
              
              {currentPlayer && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                    Score: {currentPlayer.score}
                  </div>
                  <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                    Streak: {currentPlayer.streak}
                  </div>
                </div>
              )}
            </div>

            {problem && (
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: '800', 
                  marginBottom: '1rem',
                  textShadow: '0 0 20px rgba(255,255,255,0.3)'
                }}>
                  {problem.question} = ?
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
                  <input
                    ref={answerInputRef}
                    className="input"
                    type="number"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Your answer"
                    style={{ 
                      fontSize: '1.5rem', 
                      textAlign: 'center',
                      width: '200px'
                    }}
                    autoFocus
                  />
                  <button className="btn" onClick={submitAnswer} disabled={!answer}>
                    Submit
                  </button>
                </div>
              </div>
            )}

            {feedback && (
              <div style={{ 
                textAlign: 'center',
                padding: '1rem',
                borderRadius: '12px',
                background: feedback.type === 'correct' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${feedback.type === 'correct' ? '#22c55e' : '#ef4444'}`,
                color: feedback.type === 'correct' ? '#22c55e' : '#ef4444',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                {feedback.message}
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Live Leaderboard</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: player.username === username ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        border: player.username === username ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#ffffff'
                        }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <span style={{ fontWeight: '600' }}>{player.username}</span>
                        {player.username === username && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>(You)</span>}
                      </div>
                      <div style={{ fontWeight: '600' }}>{player.score} pts</div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (gameState === 'finished' && gameResults) {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '600px', width: '100%' }}>
        <h1 className="title">🏆 Game Over!</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Final Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {gameResults.rankings.map((player, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: index === 0 ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#ffffff'
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{player.username}</span>
                  {player.username === username && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>(You)</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{player.score} pts</div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                    {player.correctAnswers}/{player.totalAnswers} correct
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'rgba(255,255,255,0.7)' }}>
          <p>Game Duration: {Math.round(gameResults.gameStats.duration / 1000)}s</p>
          <p>Total Rounds: {gameResults.gameStats.totalRounds}</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn" onClick={() => socket.emit("start_game", room)}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={leaveRoom}>
            New Room
          </button>
        </div>
      </div>
    );
  }

  return null;
}
