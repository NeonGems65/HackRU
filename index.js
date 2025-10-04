import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());

// Example API route
app.get("/api/ping", (req, res) => res.json({ ok: true, time: Date.now() }));

// Create HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // for hackathon/dev. Lock this down in prod.
    methods: ["GET", "POST"]
  }
});

// Simple in-memory rooms (expand as needed)
const rooms = {};

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("join_room", (roomCode, username) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = { players: {} };
    rooms[roomCode].players[socket.id] = { username, score: 0 };
    io.to(roomCode).emit("room_update", rooms[roomCode]);
  });

  socket.on("start_game", (roomCode) => {
    const problem = generateProblem();
    rooms[roomCode].currentProblem = problem;
    io.to(roomCode).emit("new_problem", problem);
  });

  socket.on("submit_answer", ({ roomCode, answer }) => {
    const problem = rooms[roomCode]?.currentProblem;
    if (!problem) return;
    if (Number(answer) === problem.answer) {
      rooms[roomCode].players[socket.id].score += 1;
    }
    io.to(roomCode).emit("room_update", rooms[roomCode]);
    const next = generateProblem();
    rooms[roomCode].currentProblem = next;
    io.to(roomCode).emit("new_problem", next);
  });

  socket.on("disconnect", () => {
    for (const rc of Object.keys(rooms)) {
      if (rooms[rc].players[socket.id]) {
        delete rooms[rc].players[socket.id];
        io.to(rc).emit("room_update", rooms[rc]);
      }
    }
  });
});

// Very simple problem generator
function generateProblem() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: a + b };
}

// Serve the client (Vite builds to client/dist)
const clientDist = path.join(process.cwd(), "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Render/Heroku provide PORT in env
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
