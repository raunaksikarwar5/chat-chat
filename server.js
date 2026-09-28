const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3005;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Couple chat server is running'
  });
});

const roomHistory = new Map();

function getUsersInRoom(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];

  return Array.from(room.values)
    .map((id) => io.sockets.sockets.get(id)?.data?.username)
    .filter(Boolean);
}

io.on('connection', (socket) => {
  socket.on('join_room', ({ username, room }) => {
    const safeUsername = String(username || 'Lovebird').trim().slice(0, 20) || 'Lovebird';
    const safeRoom = String(room || 'love-room').trim().slice(0, 25) || 'love-room';

    socket.join(safeRoom);
    socket.data.username = safeUsername;
    socket.data.room = safeRoom;

    const users = getUsersInRoom(safeRoom);
    io.to(safeRoom).emit('room_users', users);
    socket.emit('chat_history', roomHistory.get(safeRoom) || []);
    socket.emit('welcome_message', `Welcome, ${safeUsername}! Your little corner is online.`);
    socket.broadcast.to(safeRoom).emit('presence', {
      type: 'join',
      username: safeUsername
    });
  });

  socket.on('send_message', (message) => {
    const room = socket.data.room;
    if (!room) return;

    const text = String(message || '').trim().slice(0, 500);
    if (!text) return;

    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      username: socket.data.username || 'Lovebird',
      text,
      sentAt: new Date().toISOString()
    };

    const history = roomHistory.get(room) || [];
    history.push(newMessage);
    if (history.length > 50) history.shift();
    roomHistory.set(room, history);

    io.to(room).emit('receive_message', newMessage);
  });

  socket.on('typing', (isTyping) => {
    const room = socket.data.room;
    if (!room) return;

    socket.broadcast.to(room).emit('typing_status', {
      username: socket.data.username || 'Someone',
      typing: !!isTyping
    });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (!room) return;

    const users = getUsersInRoom(room);
    io.to(room).emit('room_users', users);
    io.to(room).emit('presence', {
      type: 'leave',
      username: socket.data.username || 'Someone'
    });
  });
});

server.listen(PORT, () => {
  console.log(`Couple chat app is running at http://localhost:${PORT}`);
});
