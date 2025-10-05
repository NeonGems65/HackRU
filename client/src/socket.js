// client/src/socket.js
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.PROD
  ? "https://math-battle-backend.onrender.com"
  : `http://${window.location.hostname}:3000`;

//✅ LOCAL development
const socket = io(BACKEND_URL, {
  transports: ["websocket"],
    withCredentials: true,
   // force websocket (fixes xhr poll errors)
});

// const socket = io(`74.220.49.0/24`, {
//   transports: ["websocket"], // force websocket (fixes xhr poll errors)
// });

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
