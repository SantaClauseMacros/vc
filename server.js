const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; 
// rooms[roomId] = { passwordHash, users: [] }

io.on("connection", socket => {

  socket.on("create-room", async ({ roomId, password }) => {
    if (rooms[roomId]) return;

    rooms[roomId] = {
      passwordHash: await bcrypt.hash(password, 10),
      users: []
    };

    socket.join(roomId);
    rooms[roomId].users.push(socket.id);

    socket.emit("room-joined", rooms[roomId].users);
  });

  socket.on("join-room", async ({ roomId, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error-msg", "Room not found");

    const ok = await bcrypt.compare(password, room.passwordHash);
    if (!ok) return socket.emit("error-msg", "Wrong password");

    socket.join(roomId);
    room.users.push(socket.id);

    socket.emit("room-joined", room.users);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("signal", data => {
    io.to(data.to).emit("signal", data);
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.users = room.users.filter(id => id !== socket.id);
      if (room.users.length === 0) delete rooms[roomId];
    }
  });

});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
