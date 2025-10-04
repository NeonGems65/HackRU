// src/App.jsx
import "./App.css";
import { Routes, Route } from "react-router-dom";
import Lobby from "./components/lobby";
import LiveGame from "./components/liveGame";
import Leaderboard from "./components/leaderboard";

export default function App() {
  return (
    <div className="app">
      <div className="background-gradient">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game" element={<LiveGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  );
}