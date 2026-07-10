import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

let socket = null;

// Lazily creates a single shared socket, authenticated with the current
// JWT. Call disconnectSocket() on logout so a stale token isn't reused.
export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("token");
  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    transports: ["websocket", "polling"],
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
