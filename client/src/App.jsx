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
      <div className="fixed inset-0 -z-10 pointer-events-none w-screen h-screen overflow-hidden">
        {/* <PrismaticBurst
          animationType="rotate3d"
          intensity={2}
          speed={0.5}
          distort={1.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={24}
          mixBlendMode="lighten"
          colors={['#ff007a', '#4d3dff', '#ffffff']}
        /> */}
        {/* Optional waves overlay (disabled) */}
        {/* <Waves ... /> */}
      </div>


      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game" element={<LiveGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  );
}