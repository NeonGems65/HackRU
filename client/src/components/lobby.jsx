// client/src/components/lobby.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import GlassSurface from "./GlassSurface";
import PixelCard from "./PixelCard";

export default function Lobby() {
  const [gameState, setGameState] = useState('lobby'); // lobby, waiting
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [players, setPlayers] = useState([]);

  // Navigation to leaderboard - define before JSX that uses it
  const navigate = useNavigate();
  const goToLeaderboard = () => {
    console.log('Lobby: goToLeaderboard clicked');
    navigate("/leaderboard");
  };
  const [currentPlayer, setCurrentPlayer] = useState(null);

  // Test function to jump directly to game
  const testGame = () => {
    console.log("Starting test game");
    setRoom("TEST123");
    setUsername("TestPlayer");
    setPlayers([
      { username: "TestPlayer", score: 0, streak: 0, isReady: true },
      { username: "BotPlayer", score: 0, streak: 0, isReady: true }
    ]);
    setCurrentPlayer({ username: "TestPlayer", score: 0, streak: 0, isReady: true });
    // Navigate to game page
    navigate("/game");
  };

  useEffect(() => {
    // Socket event listeners for lobby/waiting room
    socket.on("room_update", (data) => {
      console.log("Room update received:", data);
      if (data?.players) {
        setPlayers(Object.values(data.players));
        setGameState(data.gameState || 'waiting');
        
        // Find current player
        const currentPlayerData = Object.values(data.players).find(p => 
          p.username === username
        );
        setCurrentPlayer(currentPlayerData);
      }
    });

    socket.on("game_started", () => {
      console.log("Game started!");
      // Navigate to game page when game starts
      navigate("/game");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setGameState('lobby');
      setPlayers([]);
      setRoom("");
      setUsername("");
    });

    return () => {
      socket.off("room_update");
      socket.off("game_started");
      socket.off("disconnect");
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
      // Immediately update local state to show ready
      setCurrentPlayer(prev => prev ? { ...prev, isReady: true } : null);
    }
  };

  const leaveRoom = () => {
    console.log("Leaving room:", room);
    if (room) {
      socket.emit("leave_room", room);
    }
    // Always reset to lobby state
    setGameState('lobby');
    setPlayers([]);
    setRoom("");
    setUsername("");
    setCurrentPlayer(null);
  };

  const startGameNow = () => {
    console.log("Starting game for room:", room);
    if (room) {
      socket.emit("start_game", room);
      localStorage.setItem("room", room);
      localStorage.setItem("username", username);
      localStorage.setItem("players", JSON.stringify(players));
      // Navigate to game page
      navigate("/game");
    }
  };

  const handleGameEnd = () => {
    setGameState('lobby');
    setPlayers([]);
    setRoom("");
    setUsername("");
  };


  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoom(code);
  };

  if (gameState === 'lobby') {
    return (
      <div>
       
      <div className="glass-card fade-in" style={{  maxWidth: '600px', width: '100%'}}>

{/* <GlassSurface 
  width={300} 
  height={200}
  borderRadius={24}
  className="my-custom-class"
>
  <h2>Glass Surface Content</h2>
</GlassSurface> */}


        
        <h1 className="title ">🧮 Math Battle</h1>
        <p className="subtitle">Compete in multiplayer real-time math challenges</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>



            
            <input
              className="input"
              placeholder="Room Code"
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              style={{ flex: 1 }}
            />
            <GlassSurface className="btn btn-secondary" onClick={generateRoomCode}>
              Generate
            </GlassSurface>
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

      <div style={{ 
        textAlign: 'left', 
        color: 'rgba(255,255,255,0.7)', 
        maxWidth: '400px', 
        margin: '0 auto'  // centers the list block on the page
      }}>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Answer math problems as fast as possible.</li>
          <li>Compete against other players in real-time.</li>
          <li>Learn what it takes to become an expert mathematician.</li>
        </ul>
      </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={() => { console.log('View Leaderboard clicked'); goToLeaderboard(); }}
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
            View Leaderboard
          </button>
        </div>
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
              onClick={startGameNow}
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

  return null;
}
