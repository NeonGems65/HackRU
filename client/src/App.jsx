// src/App.jsx
import "./App.css";
import { Routes, Route } from "react-router-dom";
import Lobby from "./components/lobby";
import LiveGame from "./components/liveGame";
import Leaderboard from "./components/leaderboard";
import PrismaticBurst from "./components/PrismaticBurst";
import Waves from "./components/Waves";

export default function App() {
  return (
    <div className="app">
      {/* Fullscreen animated background - sits behind all UI */}
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* <Waves
  lineColor="#fff"
  backgroundColor="rgba(255, 255, 255, 0.2)"
  waveSpeedX={0.02}
  waveSpeedY={0.01}
  waveAmpX={40}
  waveAmpY={20}
  friction={0.9}
  tension={0.01}
  maxCursorMove={120}
  xGap={12}
  yGap={36}
/> */}
      </div>


      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game" element={<LiveGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  );
}