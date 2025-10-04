// client/src/socket.js
import { io } from "socket.io-client";

// ✅ LOCAL development
const socket = io("http://10.74.130.215:3000",
  {  transports: ["websocket"], // force websocket (fixes xhr poll errors)
}
);

// When leaving the page or refreshing
window.addEventListener("beforeunload", () => {
  socket.disconnect();
});

// ✅ When deployed separately:
// const socket = io("https://math-game-backend.onrender.com");

socket.on("connect", () => {
  console.log("✅ Connected to backend:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});

export default socket;
