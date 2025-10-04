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

// 🧠 Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // ⚠️ For dev only — replace with your frontend URL on Vercel in prod
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// 🧮 Game state
const rooms = {};
const gameTimers = {};

// ✅ SOCKET.IO EVENTS
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // --- JOIN ROOM ---
  socket.on("join_room", (roomCode, username) => {
    socket.join(roomCode);
    socket.currentRoom = roomCode; // Track player's room

    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: {},
        currentProblem: null,
        gameState: "waiting",
        roundNumber: 0,
        timeRemaining: 0,
        gameStartTime: null,
      };
    }

    rooms[roomCode].players[socket.id] = {
      username,
      score: 0,
      streak: 0,
      totalTime: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      isReady: false,
    };

    io.to(roomCode).emit("room_update", rooms[roomCode]);
  });

  // --- PLAYER READY ---
  socket.on("player_ready", (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.players[socket.id]) {
      room.players[socket.id].isReady = true;
      io.to(roomCode).emit("room_update", room);

      const allReady = Object.values(room.players).every((p) => p.isReady);
      if (allReady && Object.keys(room.players).length >= 2) {
        startGame(roomCode);
      }
    }
  });

  // --- MANUAL LEAVE (when user clicks “Leave Room”) ---
  socket.on("leave_room", (roomCode) => {
    console.log(`👋 ${socket.id} manually left ${roomCode}`);
    const room = rooms[roomCode];
    if (!room) return;

    delete room.players[socket.id];
    socket.leave(roomCode);

    if (Object.keys(room.players).length === 0) {
      if (gameTimers[roomCode]) {
        clearInterval(gameTimers[roomCode]);
        delete gameTimers[roomCode];
      }
      delete rooms[roomCode];
      console.log(`Room ${roomCode} deleted (empty)`);
    } else {
      io.to(roomCode).emit("room_update", room);
    }
  });

  // --- SUBMIT ANSWER ---
  socket.on("submit_answer", ({ roomCode, answer, timeSpent }) => {
    console.log("submit answer moment")
    const room = rooms[roomCode];
    if (!room?.currentProblem || room.gameState !== "playing") return;

    const player = room.players[socket.id];
    if (!player) return;

    player.totalAnswers++;
    player.totalTime += timeSpent || 0;

    if (Number(answer) === room.currentProblem.answer) {
      player.correctAnswers++;
      player.streak++;

      const baseScore = 10;
      const speedBonus = Math.max(0, 10 - Math.floor(timeSpent / 100));
      const streakBonus = Math.min(player.streak * 2, 20);

      player.score += baseScore + speedBonus + streakBonus;
      socket.emit("answer_correct", {
        score: baseScore + speedBonus + streakBonus,
        streak: player.streak,
      });
    } else {
      player.streak = 0;
      socket.emit("answer_incorrect");
    }

    io.to(roomCode).emit("room_update", room);

    // Generate next problem
    setTimeout(() => {
      const nextProblem = generateProblem();
      room.currentProblem = nextProblem;
      room.roundNumber++;
      io.to(roomCode).emit("new_problem", nextProblem);
    }, 1000);
  });

  // --- DISCONNECT HANDLER ---
  socket.on("disconnect", (reason) => {
    console.log(`🛑 Socket disconnected: ${socket.id}, reason: ${reason}`);

    const roomCode = socket.currentRoom;
    if (!roomCode) return;

    const room = rooms[roomCode];
    if (room && room.players[socket.id]) {
      console.log(`Removing ${room.players[socket.id].username} from ${roomCode}`);
      delete room.players[socket.id];

      if (Object.keys(room.players).length === 0) {
        if (gameTimers[roomCode]) {
          clearInterval(gameTimers[roomCode]);
          delete gameTimers[roomCode];
        }
        delete rooms[roomCode];
        console.log(`Room ${roomCode} deleted (empty)`);
      } else {
        io.to(roomCode).emit("room_update", room);
      }
    }
  });
});

// --- GAME LOGIC FUNCTIONS ---

function startGame(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.gameState === "playing") return;

  room.gameState = "playing";
  room.roundNumber = 1;
  room.gameStartTime = Date.now();

  Object.values(room.players).forEach((player) => {
    player.score = 0;
    player.streak = 0;
    player.totalTime = 0;
    player.correctAnswers = 0;
    player.totalAnswers = 0;
  });

  let countdown = 3;
  const countdownInterval = setInterval(() => {
    io.to(roomCode).emit("countdown", countdown);
    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);
      const problem = generateProblem();
      room.currentProblem = problem;
      io.to(roomCode).emit("new_problem", problem);
      io.to(roomCode).emit("game_started");

      room.timeRemaining = 30;
      gameTimers[roomCode] = setInterval(() => {
        room.timeRemaining--;
        io.to(roomCode).emit("time_update", room.timeRemaining);

        if (room.timeRemaining <= 0) {
          endGame(roomCode);
        }
      }, 1000);
    }
  }, 1000);
}

function endGame(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.gameState = "finished";

  if (gameTimers[roomCode]) {
    clearInterval(gameTimers[roomCode]);
    delete gameTimers[roomCode];
  }

  const players = Object.values(room.players);
  players.sort((a, b) => b.score - a.score);

  io.to(roomCode).emit("game_ended", {
    rankings: players,
    gameStats: {
      totalRounds: room.roundNumber,
      duration: Date.now() - room.gameStartTime,
    },
  });
}

function generateProblem() {
  const operations = ["+", "-", "*"];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let a, b, answer, question;

  switch (operation) {
    case "+":
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      question = `${a} + ${b}`;
      break;
    case "-":
      a = Math.floor(Math.random() * 20) + 10;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a - b;
      question = `${a} - ${b}`;
      break;
    case "*":
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
      question = `${a} × ${b}`;
      break;
  }

  return { question, answer };
}

// --- SERVER LISTEN ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
