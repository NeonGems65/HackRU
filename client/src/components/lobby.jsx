// client/src/components/lobby.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import GlassSurface from "./GlassSurface";
import Prism from "./Prism";

export default function Lobby() {
  const [gameState, setGameState] = useState("lobby");
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("room_update", (data) => {
      if (data?.players) {
        setPlayers(Object.values(data.players));
        setGameState(data.gameState || "waiting");
        const me = Object.values(data.players).find((p) => p.username === username);
        setCurrentPlayer(me);
      }
    });

    socket.on("game_started", () => navigate("/game"));
    socket.on("disconnect", () => {
      setGameState("lobby");
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

  const generateRoomCode = () => setRoom(Math.random().toString(36).substring(2, 8).toUpperCase());
  const joinRoom = () => { if (!room || !username) return; socket.emit("join_room", room, username); setGameState("waiting"); };
  const markReady = () => { if (!room || !username) return; socket.emit("player_ready", room); setCurrentPlayer((p)=> p ? { ...p, isReady: true } : p); };
  const leaveRoom = () => { if (room) socket.emit("leave_room", room); setGameState("lobby"); setPlayers([]); setRoom(""); setUsername(""); setCurrentPlayer(null); };
  const startGameNow = () => { if (!room) return; socket.emit("start_game", room); localStorage.setItem("room", room); localStorage.setItem("username", username); localStorage.setItem("players", JSON.stringify(players)); navigate("/game"); };

  const innerCenterStyle = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" };
  const controlsWidthStyle = { width: "100%", maxWidth: "600px" };
  const buttonBaseStyle = { background: "transparent", border: "none", color: "white", padding: "14px 18px", 
    fontSize: "18px", fontWeight: 700, borderRadius: "12px", cursor: "pointer" };

  if (gameState === "lobby") {
    return (
      <div>
        <div className="w-screen h-screen absolute z-[-1] top-0 left-0 hidden "
         />

        <div className="glass-card fade-in bg-[#000000] z-[1]  w-screen h-screen p-[2.5rem]">
          <div className="h-full justify-center flex flex-col items-center">
            <div className="absolute inset-0 overflow-hidden z-[-1] ">
              <Prism className="" animationType="hover" timeScale={0.5} height={4.5} baseWidth={5.5} scale={3.6} hueShift={0.96} colorFrequency={4} noise={0} glow={0.6} />
            </div>

            <h1 className="title font-[3.5rem]" >Math Battle</h1>
            <p className="subtitle">Compete in multiplayer real-time math challenges</p>

             
            <div className="w-[100%] max-w-[600px] flex-col flex gap-[1rem] mb-[2rem]">
              <div className="flex gap-[0.5rem]">
                <input className="input flex-1" placeholder="Room Code" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())}  />
                <GlassSurface>
                  <button onClick={generateRoomCode} className="pl-[8x] pr-[12px] button" >Generate</button>
                </GlassSurface>
              </div>

              <input className="input w-[100%] box-border h-[90px]" placeholder="Nickname" value={username} onChange={(e) => setUsername(e.target.value)}  />

              <GlassSurface width={600}>
                <button className="w-[100%] border-box button" onClick={joinRoom} disabled={!room || !username} style={{opacity: !room || !username ? 0.5 : 1 }}>Join Battle</button>
              </GlassSurface>
            </div>

             
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "waiting") {
    return (
      <div>
        <div className="w-[100%] h-[100vh] absolute z-[-1] top-0 left-0 overflow-hidden " />

        <div className="glass-card fade-in background-[#000000] z-[1]  w-screen h-screen p-[2.5rem]">
          <div className="h-full justify-center flex flex-col items-center" >
            <div className="absolute inset-0 overflow-hidden z-[-1] ">
              <Prism animationType="hover" timeScale={0.5} height={3.5} baseWidth={5.5} scale={3.6} hueShift={0.96} colorFrequency={4} noise={0} glow={0.6} />
            </div>

            <div className="mb-8" >
              <h1 className="title  ">Waiting Room</h1>
              <p className="subtitle">Room: {room}</p>
              <h3 className="mb-8 text-center" >Players ({players.length}/8)</h3>

              <div className="flex flex-wrap gap-[0.5rem] justify-center">
                {players.map((player, index) => (
                  <div key={index} className="p-[20px] border-[20px] rounded-lg "
                   style={{ background: player.isReady ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.1)", 
                   border: player.isReady ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.2)", 
                   transition: "all 0.3s ease", 
                   transform: player.isReady ? "scale(1.05)" : "scale(1)" }}>

                    <div className="flex items-center gap-[0.5rem]"> 
                      <span className="text-[1.2rem] font-[600]"
                      style={{ color: player.isReady ? "#22c55e" : "#ffffff" }}>{player.isReady ? "✅" : "⏳"}</span>
                      <span style={{ fontWeight: "600", color: player.isReady ? "#22c55e" : "#ffffff" }}>{player.username}</span>
                      {player.isReady && <span style={{ fontSize: "0.8rem", color: "#22c55e", fontWeight: "500" }}>READY</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {currentPlayer && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                {!currentPlayer.isReady ? (
                  <GlassSurface>
                    <button onClick={markReady} style={{ ...buttonBaseStyle, boxShadow: "none" }}>I'm Ready!</button>
                  </GlassSurface>
                ) : (
                  <GlassSurface>
                    <button disabled style={{ ...buttonBaseStyle, opacity: 0.6, cursor: "not-allowed" }}>✅ Ready!</button>
                  </GlassSurface>
                )}

                <GlassSurface>
                  <button onClick={leaveRoom} style={{ ...buttonBaseStyle }}>Leave Room</button>
                </GlassSurface>
              </div>
            )}

            {players.length >= 2 && players.every((p) => p.isReady) && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <div style={{ padding: "1rem", background: "rgba(34, 197, 94, 0.2)", border: "2px solid #22c55e", borderRadius: "12px", marginBottom: "1rem" }}>
                  <p style={{ color: "#22c55e", fontWeight: "600", margin: 0 }}>🎉 All players ready! Click below to start the battle!</p>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <GlassSurface>
                    <button onClick={startGameNow} style={{ ...buttonBaseStyle, padding: "12px 24px", fontSize: "16px", fontWeight: 700 }}>🚀 START BATTLE!</button>
                  </GlassSurface>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
