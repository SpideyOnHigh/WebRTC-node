const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

// Create an HTTP server (required for Render)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("✅ WebRTC Signaling Server is running on Render.");
});

// Attach WebSocket server to HTTP
const wss = new WebSocket.Server({ server });

const rooms = {}; // roomCode -> [socket1, socket2]

wss.on("connection", (socket) => {
  socket.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.log("❌ Invalid JSON:", msg);
      return;
    }

    if (data.type === "join") {
      const room = data.room;
      if (!rooms[room]) rooms[room] = [];
      rooms[room].push(socket);
      socket.room = room;

      console.log(`🔗 User joined room: ${room} (${rooms[room].length} clients)`);

      if (rooms[room].length === 2) {
        rooms[room].forEach((s) => {
          if (s.readyState === WebSocket.OPEN) {
            s.send(JSON.stringify({ type: "ready" }));
          }
        });
      }
    }

    if (data.type === "signal") {
      const room = socket.room;
      if (!room || !rooms[room]) return;

      rooms[room].forEach((s) => {
        if (s !== socket && s.readyState === WebSocket.OPEN) {
          s.send(JSON.stringify({ type: "signal", data: data.data }));
        }
      });
    }
  });

  socket.on("close", () => {
    const room = socket.room;
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter((s) => s !== socket);
      if (rooms[room].length === 0) {
        delete rooms[room];
        console.log(`❌ Room ${room} is now empty and removed.`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
