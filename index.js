// index.js
require('dotenv').config();
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- GEMINI CONFIG ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
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
    console.log(answer);
    const room = rooms[roomCode];
    if (room.gameState !== "playing") {
      console.log("❌ Game not playing, state:", room.gameState);
      return
    } ; // Remove the currentProblem check

    const player = room.players[socket.id];
    if (!player) {
      console.log("❌ Player not found");
      return;
    } // Check player's problem instead

    if (!player.currentProblem) {
      console.log("❌ Player has no current problem");
      return;
    }

    console.log("🔍 Player's problem:", player.currentProblem);
  console.log("🔍 Expected answer:", player.currentProblem.answer);
  console.log("🔍 Player answer:", answer);

    player.totalAnswers++;
    player.totalTime += timeSpent || 0;


    if (parseInt(answer) === parseInt(player.currentProblem.answer)) {
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
        const player = room.players[socket.id];
        if (!player) return;
        player.roundNumber++;
        player.currentProblem = nextProblem;
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

      // const newProblem = await generateProblem();
      // room.currentProblem = newProblem;
      // io.to(roomCode).emit("new_problem", newProblem);

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

// --- PROBLEM GENERATION ---
async function generateProblem() {
  
  let questionType = '';
  const num = Math.random() * 3;
  console.log(num);
  if (num < 1) {
    questionType = `
Rules for DERIVATIVE of a POLYNOMIAL:
Look through these rules carefully before generating.
1. Generate a polynomial function f(x) of degree 2 with random integer coefficients (between -5 and 5).
   Example: f(x) = 2x^2 + 4x - 1
2. Choose a random integer x-value between -5 and 5.
3. Ask the question in this exact format:
   "f(x) = <polynomial>, find f'(<integer value>)"
   Example: "f(x) = 2x^2 + 4x - 1, find f'(2)"
4. Compute the correct numerical derivative value f'(<value>).
5. Output in valid JSON format:
   {
     "question": "f(x) = <LaTeX polynomial>, find f'(<value>)",
     "answer": "<numeric result>"
   }
6. Do NOT include the derivative formula or explanation — only the question and numeric answer.
7. Ensure the JSON is valid and LaTeX-ready (escape backslashes properly if any).
8. Final Answers must be whole numbers (no fractions or decimals).
9. If one condition is not met, try again
`;
  }
  else if (num < 2) {
    questionType = `
Rules for DERIVATIVE of a BASIC TRIGONOMETRIC FUNCTION:
Look through these rules carefully before generating.
1. Choose one trig base function at random: sin(x), cos(x), or tan(x).
2. Optionally include a scalar coefficient (between -5 and 5, not zero).
   Example: f(x) = 3sin(x), f(x) = -2cos(x)
3. Optionally multiply the inner argument by an integer factor (1–3).
   Example: sin(2x), cos(3x), etc.
4. Choose a random integer x-value between 0 and π (inclusive) for evaluation.
5. Ask the question in this exact format:
   "f(x) = <function>, find f'(<numeric value>)"
   Example: "f(x) = 2cos(3x), find f'(\\\\pi/3)"
6. Compute the derivative numerically at that value.
7. Output valid JSON:
   {
     "question": "f(x) = <LaTeX trig function>, find f'(<value>)",
     "answer": "<numeric result>"
   }
8. The function and evaluation point should be LaTeX-ready (e.g. use \\\\pi, not 'pi').
9. Escape all backslashes properly (e.g. \\\\\\\\pi, \\\\\\\\sin(x)).
10. Final Answers must be whole numbers (no fractions or decimals).
11. If one condition is not met, try again
`;
  }
  else {
    questionType = `
Rules for DEFINITE INTEGRAL of a POLYNOMIAL FUNCTION:
Look through these rules carefully before generating.
1. Create a simple polynomial (degree 1–3) with integer coefficients between -5 and 5.
   Example: 2x^2 - 3x + 1
2. Choose integer bounds between -5 and 5 for the integral, ensuring the lower bound < upper bound.
   Example: ∫₀³ (2x² - 3x + 1) dx
3. Ask the question using this exact format:
   "\\\\int_<lower>^<upper> <polynomial> \\\\, dx"
   Example: "\\\\int_0^3 (2x^2 - 3x + 1) \\\\, dx"
4. Compute the correct definite integral value (a single numeric result).
5. Output valid JSON:
   {
     "question": "\\\\int_<lower>^<upper> <LaTeX polynomial> \\\\, dx",
     "answer": "<numeric result>"
   }
6. Escape all backslashes properly so that the JSON is valid and LaTeX-ready.
7. Do not include intermediate steps or explanations — only the question and numeric answer.
8. Final Answers must be whole numbers (no fractions or decimals).
9. If one condition is not met, try again
`;
  }
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    try {

      const result = await model.generateContent(questionType);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("❌ JSON parse failed. Raw:", cleaned);
        throw e;
      }

      const { question, answer } = parsed;
      console.log("✅ Gemini generated:", question, answer);

      return { question, answer };

    } catch (err) {
      const result = await model.generateContent(questionType);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("❌ JSON parse failed. Raw:", cleaned);
        throw e;
      }

      const { question, answer } = parsed;
      console.log("✅ Gemini generated:", question, answer);

      return { question, answer };
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