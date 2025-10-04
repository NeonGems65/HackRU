// client/src/components/liveGame.jsx
import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";

export default function LiveGame({ room, username, onGameEnd }) {
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [gameResults, setGameResults] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameState, setGameState] = useState('countdown'); // countdown, playing, finished
  
  const problemStartTime = useRef(null);
  const answerInputRef = useRef(null);
  const gameTimer = useRef(null);
  const countdownTimer = useRef(null);

  // Initialize game when component mounts
  useEffect(() => {
    console.log("LiveGame mounted, starting game for room:", room);
    startGame();
    
    return () => {
      // Cleanup timers
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (gameTimer.current) clearInterval(gameTimer.current);
    };
  }, []);

  const startGame = () => {
    console.log("Starting game countdown");
    setGameState('countdown');
    setCountdown(3);
    
    // Start countdown
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          setGameState('playing');
          generateNewProblem();
          startGameTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generateNewProblem = () => {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let a, b, answer, question;
    
    switch(operation) {
      case '+':
        a = Math.floor(Math.random() * 20) + 1;
        b = Math.floor(Math.random() * 20) + 1;
        answer = a + b;
        question = `${a} + ${b}`;
        break;
      case '-':
        a = Math.floor(Math.random() * 20) + 10;
        b = Math.floor(Math.random() * 10) + 1;
        answer = a - b;
        question = `${a} - ${b}`;
        break;
      case '*':
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        answer = a * b;
        question = `${a} × ${b}`;
        break;
    }
    
    const newProblem = { question, answer, roundNumber: 1 };
    setProblem(newProblem);
    setAnswer("");
    problemStartTime.current = Date.now();
    
    if (answerInputRef.current) {
      answerInputRef.current.focus();
    }
  };

  const startGameTimer = () => {
    setTimeRemaining(30);
    gameTimer.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    clearInterval(gameTimer.current);
    setGameState('finished');
    
    // Create mock results for testing
    const mockResults = {
      rankings: [
        { username: username, score: 150, correctAnswers: 5, totalAnswers: 8 },
        { username: "BotPlayer", score: 120, correctAnswers: 4, totalAnswers: 8 }
      ],
      gameStats: {
        duration: 30000,
        totalRounds: 8
      }
    };
    
    setGameResults(mockResults);
  };

  useEffect(() => {
    // Socket event listeners
    socket.on("new_problem", (newProblem) => {
      console.log("New problem received:", newProblem);
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

  const submitAnswer = () => {
    if (answer && problem && problemStartTime.current) {
      const timeSpent = Date.now() - problemStartTime.current;
      const userAnswer = parseInt(answer);
      
      console.log("Submitting answer:", userAnswer, "Correct:", problem.answer);
      
      if (userAnswer === problem.answer) {
        setFeedback({ type: 'correct', message: `+10 points! Correct!` });
        setTimeout(() => setFeedback(null), 2000);
        
        // Generate next problem after a short delay
        setTimeout(() => {
          generateNewProblem();
        }, 1000);
      } else {
        setFeedback({ type: 'incorrect', message: 'Wrong answer!' });
        setTimeout(() => setFeedback(null), 2000);
        
        // Generate next problem after a short delay
        setTimeout(() => {
          generateNewProblem();
        }, 1000);
      }
      
      setAnswer("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && gameState === 'playing') {
      submitAnswer();
    }
  };

  const leaveRoom = () => {
    if (room) {
      socket.emit("leave_room", room);
      onGameEnd();
    }
  };

  const playAgain = () => {
    socket.emit("start_game", room);
    setGameState('playing');
    setGameResults(null);
  };

  if (gameState === 'countdown') {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '700px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="title">Get Ready!</h1>
          <div style={{ 
            fontSize: '6rem', 
            fontWeight: '800', 
            color: countdown === 1 ? '#ef4444' : '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
            margin: '2rem 0'
          }}>
            {countdown}
          </div>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)' }}>
            Math Battle starting in {countdown} seconds...
          </p>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="glass-card fade-in" style={{ maxWidth: '700px', width: '100%' }}>
        {problem && (
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
          <button className="btn" onClick={playAgain}>
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
