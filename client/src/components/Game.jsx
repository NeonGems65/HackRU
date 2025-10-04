// client/src/components/Game.jsx
import React, { useEffect, useState } from "react";
import socket from "../socket";

export default function Game() {
  const [room, setRoom] = useState("ROOM123");
  const [username, setUsername] = useState("Player1");
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.on("new_problem", setProblem);
    socket.on("room_update", (data) => {
      if (data?.players) {
        setPlayers(Object.values(data.players));
      }
    });

    return () => {
      socket.off("new_problem");
      socket.off("room_update");
    };
  }, []);

  const joinRoom = () => socket.emit("join_room", room, username);
  const startGame = () => socket.emit("start_game", room);
  const submitAnswer = () => {
    socket.emit("submit_answer", { roomCode: room, answer });
    setAnswer("");
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🧮 Math Battle</h1>

      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Room Code"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={joinRoom}>Join Room</button>
        <button onClick={startGame}>Start Game</button>
      </div>

      {problem && (
        <div style={{ margin: "1rem" }}>
          <h2>{problem.question}</h2>
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button onClick={submitAnswer}>Submit</button>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h3>Players</h3>
        <ul style={{ listStyle: "none" }}>
          {players.map((p, i) => (
            <li key={i}>
              {p.username}: {p.score}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
