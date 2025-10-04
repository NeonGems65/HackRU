// index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // ⚠️ for dev/hackathon; restrict in prod
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// 🧮 Simple in-memory game state
const rooms = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_room", (roomCode, username) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = { players: {}, currentProblem: null };
    rooms[roomCode].players[socket.id] = { username, score: 0 };
    io.to(roomCode).emit("room_update", rooms[roomCode]);
  });

  socket.on("start_game", (roomCode) => {
    const problem = generateProblem();
    rooms[roomCode].currentProblem = problem;
    io.to(roomCode).emit("new_problem", problem);
  });

  socket.on("submit_answer", ({ roomCode, answer }) => {
    const room = rooms[roomCode];
    if (!room?.currentProblem) return;

    if (Number(answer) === room.currentProblem.answer) {
      room.players[socket.id].score += 1;
    }

    io.to(roomCode).emit("room_update", room);

    const nextProblem = generateProblem();
    room.currentProblem = nextProblem;
    io.to(roomCode).emit("new_problem", nextProblem);
  });

  socket.on("disconnect", () => {
    for (const [roomCode, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomCode).emit("room_update", room);
      }
    }
  });
});

function generateProblem() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: a + b };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
