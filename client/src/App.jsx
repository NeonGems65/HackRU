// src/App.jsx
import "./App.css";
import Game from "./components/lobby";


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
      <Game />
      
    </div>
  );
}