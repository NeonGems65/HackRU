// index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

var problem = null;
// --- GEMINI CONFIG ---
const GEMINI_API_KEY = "AIzaSyBTPo7ow_5wZZWiSadpFkDmG1SelAa8rWU";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- PATH SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- EXPRESS SETUP ---
const app = express();
const server = http.createServer(app);

// --- SOCKET.IO SERVER ---
const io = new Server(server, {
  cors: {
    origin: "*", // For dev only — replace with your frontend URL on Vercel in prod
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// --- GAME STATE ---
const rooms = {};
const gameTimers = {};

// --- SOCKET.IO EVENTS ---
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
      // per-player state:
      currentProblem: null,
      roundNumber: 0,
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

  // --- MANUAL LEAVE ---
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
    console.log('sdlkfjsdlkfjs;ldjf')
    console.log(answer);
    console.log(problem.answer);
    const room = rooms[roomCode];
    if (!room?.currentProblem || room.gameState !== "playing") return;

    const player = room.players[socket.id];
    if (!player) return;

    player.totalAnswers++;
    player.totalTime += timeSpent || 0;


    if (answer === answer) {
      player.correctAnswers++;
      player.streak++;
      console.log("Correct answer by", player.username);


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

    // ✅ Generate a *new problem just for this player*, not globally
    (async () => {
      try {
        const nextProblem = await generateProblem();
        problem = nextProblem
        const player = room.players[socket.id];
        if (!player) return;
        player.currentProblem = nextProblem;
        player.roundNumber++;
        io.to(socket.id).emit("new_problem", {
          ...nextProblem,
          roundNumber: player.roundNumber,
        });
      } catch (err) {
        console.error("Problem generation failed:", err);
      }
    })();
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

async function startGame(roomCode) {
  const room = rooms[roomCode];

  if (room.isCountingDown) return;
  room.isCountingDown = true;

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
  const countdownInterval = setInterval(async () => {
    io.to(roomCode).emit("countdown", countdown);
    countdown--;

    if (countdown < 0) {
      room.isCountingDown = false;
      clearInterval(countdownInterval);
      const problem = await generateProblem();
      room.currentProblem = problem;
      io.to(roomCode).emit("new_problem", problem);
      io.to(roomCode).emit("game_started");

      room.timeRemaining = 90;

      // Initialize per-player state and send initial per-player problems once
      const playerIds = Object.keys(room.players);
      for (const playerSocketId of playerIds) {
        const p = room.players[playerSocketId];
        p.score = 0;
        p.streak = 0;
        p.totalTime = 0;
        p.correctAnswers = 0;
        p.totalAnswers = 0;
        p.roundNumber = 1;

        const perPlayerProblem = await generateProblem();
    
        p.currentProblem = perPlayerProblem;

        io.to(playerSocketId).emit("new_problem", {
          ...perPlayerProblem,
          roundNumber: p.roundNumber,
        });
      }

      // Start the game timer
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

// --- UTILITY: FORMAT MATH ---
function formatMath(question) {
  let formatted = question;

  formatted = formatted.replace(/\*/g, "·");
  formatted = formatted.replace(/\^(\d+)/g, "^{$1}");
  formatted = formatted.replace(/find/gi, "\\text{find}");
  formatted = formatted.replace(/f\((.*?)\)/g, "f($1)");
  formatted = formatted.replace(/=/g, "=");

  return `$$${formatted}$$`;
}

// --- PROBLEM GENERATION ---
async function generateProblem() {
  // Make model visible to both try and catch
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  try {
    const promptQuestion = `
Generate ONE derivative question and answer in strict JSON format:
{
  "question": "f(x) = 3x^2 + 2x + 1, find f'(2)",
  "answer": 14
}

Rules:
- Ensure the answer is correct for the question.
- The function f(x) must be a polynomial (degree ≤ 4).
- Pick a random integer x value between -5 and 5.
- Calculate f'(x) correctly.
- Return ONLY the JSON object, nothing else.
`;

    const result = await model.generateContent(promptQuestion);
    const text = result.response.text().trim();

    const cleaned = text.replace(/```json|```/g, "").trim();
    const problem = JSON.parse(cleaned);

    console.log("✅ Gemini generated:", problem);
    return problem;

  } catch (err) {
    console.error("⚠️ Gemini generation failed, using fallback:", err);

    // --- fallback local generator (no model call here) ---
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const x = Math.floor(Math.random() * 11) - 5;
    const answer = 2 * a * x + b;

    return {
      question: `f(x) = ${a}x^2 + ${b}x + 1, find f'(${x})`,
      answer,
    };
  }
}


// --- SERVER LISTEN ---
const PORT = process.env.PORT || 3000;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Is another server running?`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});