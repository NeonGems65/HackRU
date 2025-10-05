// client/src/components/lobby.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import GlassSurface from "./GlassSurface";
import Prism from "./Prism";



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

  // Small wrapper: glass surface that brightens on hover
  function ButtonGlass({ children, glassProps = {}, className = '', fullWidth = false }) {
    const [hover, setHover] = useState(false);
    const baseStyle = { filter: hover ? 'brightness(1.3)' : 'brightness(1)', transition: 'filter 140ms ease' };
    const mergedStyle = fullWidth ? { ...baseStyle, width: '100%', display: 'block' } : baseStyle;
    return (
      <GlassSurface
        className={className}
        style={mergedStyle}
        {...glassProps}
      >
        <div style={{ width: fullWidth ? '100%' : undefined }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          {children}
        </div>
      </GlassSurface>
    );
  }

  // base style to make inner buttons consistent and avoid global .btn styles
  const buttonBaseStyle = {
    background: 'transparent',
    border: 'none',
    color: 'white',
    padding: '14px 18px',
    fontSize: '18px',
    fontWeight: 700,
    borderRadius: '12px',
    cursor: 'pointer'
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

        <div style={{ width: '100%', height: '1000px', position: 'absolute', zIndex: -1, top: 0, left: 0, overflow: 'hidden' }}>
  
</div>


       
      <div className="glass-card fade-in" style={{background:"#000000", zIndex:1, height:"800px", maxWidth: '1200px', width: '900px', padding: '2.5rem' }}>

<div style={{ width: '100%', height: '800px', position: 'absolute', zIndex: -1, top: 0, left: 0, overflow: 'hidden' }}>
  <Prism
    animationType="hover"
    timeScale={0.5}
    height={4.5}
    baseWidth={5.5}
    scale={3.6}
    hueShift={0.96}
    colorFrequency={4}
    noise={0}
    glow={0.6}
  />
</div>
{/* <GlassSurface 
  width={300} 
  height={200}
  borderRadius={24}
  className="my-custom-class"
>
  <h2>Glass Surface Content</h2>
</GlassSurface> */}


        
  <h1 className="title " style={{ fontSize: '3.5rem' }}>Math Battle</h1>
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
            <ButtonGlass>
              <button onClick={generateRoomCode} style={{ ...buttonBaseStyle, padding: '8px 12px' }}>Generate</button>
            </ButtonGlass>
          </div>
          
          <input
            className="input"
            placeholder="Your Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', height: '90px' }}
          />
          
          <ButtonGlass fullWidth>
            <button
              onClick={joinRoom}
              disabled={!room || !username}
              style={{ ...buttonBaseStyle, opacity: (!room || !username) ? 0.5 : 1, width: '100%', boxSizing: 'border-box' }}
            >
              Join Battle
            </button>
          </ButtonGlass>
        </div>

      <div style={{ 
        textAlign: 'left', 
        color: 'rgba(255,255,255,0.7)', 
        maxWidth: '400px', 
        margin: '0 auto'  // centers the list block on the page
      }}>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Answer math problems as fast as possible</li>
          <li>Compete against other players in real-time</li>
        </ul>
      </div>
      </div>

    </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="glass-card fade-in" style={{background:"#000000", zIndex:1, height:"800px", maxWidth: '1200px', width: '900px', padding: '2.5rem' }}>
        <div style={{ width: '100%', height: '800px', position: 'absolute', zIndex: -1, top: 0, left: 0, overflow: 'hidden' }}>
  <Prism
    animationType="hover"
    timeScale={0.5}
    height={3.5}
    baseWidth={5.5}
    scale={3.6}
    hueShift={0.96}
    colorFrequency={4}
    noise={0}
    glow={0.6}
  />
</div>
        
        
        <div style={{ marginBottom: '2rem', marginTop: '10rem' }}>
          <h1 className="title">Waiting Room</h1>
        <p className="subtitle">Room: {room}</p>
          <h3 style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
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
              <ButtonGlass>
                <button 
                  onClick={markReady}
                  style={{ ...buttonBaseStyle, boxShadow: 'none' }}
                >
                  I'm Ready!
                </button>
              </ButtonGlass>
            ) : (
              <ButtonGlass>
                <button
                  disabled
                  style={{ ...buttonBaseStyle, opacity: 0.6, cursor: 'not-allowed' }}
                >
                  ✅ Ready!
                </button>
              </ButtonGlass>
            )}
            
            <ButtonGlass>
              <button
                onClick={leaveRoom}
                style={{ ...buttonBaseStyle }}
              >
                Leave Room
              </button>
            </ButtonGlass>
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
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ButtonGlass>
                <button 
                  onClick={startGameNow}
                  style={{ ...buttonBaseStyle, padding: '12px 24px', fontSize: '16px', fontWeight: 700 }}
                >
                  🚀 START BATTLE!
                </button>
              </ButtonGlass>
            </div>
          </div>
        )}

        </div>
    );
  }

  return null;
}
