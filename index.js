// index.js

const http = require("http");
const WebSocket = require("ws");

// Serve a basic HTTP response for testing
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("✅ WebRTC Signaling Server is running on Replit.");
});

const wss = new WebSocket.Server({ server });

const rooms = {}; // roomCode -> [socket1, socket2]

wss.on("connection", socket => {
  socket.on("message", msg => {
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

      if (rooms[room].length === 2) {
        rooms[room].forEach(s =>
          s.send(JSON.stringify({ type: "ready" }))
        );
      }
    } else if (data.type === "signal") {
      const room = socket.room;
      if (!room || !rooms[room]) return;
      rooms[room].forEach(s => {
        if (s !== socket && s.readyState === WebSocket.OPEN) {
          s.send(JSON.stringify({ type: "signal", data: data.data }));
        }
      });
    }
  });

  socket.on("close", () => {
    const room = socket.room;
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter(s => s !== socket);
      if (rooms[room].length === 0) delete rooms[room];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server is running at port ${PORT}`);
});
