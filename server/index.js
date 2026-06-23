import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import db from './db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Socket.IO
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// 生产环境: 提供前端静态文件
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ===== Socket.IO 事件处理 =====
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('🔌 用户连接:', socket.id);

  // 用户上线
  socket.on('user_online', (userId) => {
    onlineUsers.set(String(userId), socket.id);
    socket.userId = String(userId);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  // 群聊消息
  socket.on('group_message', (data) => {
    const { userId, content } = data;
    if (!userId || !content) return;

    const user = db.prepare('SELECT id, username, nickname, avatar FROM users WHERE id = ?').get(userId);
    if (!user || user.is_banned) return;

    const result = db.prepare('INSERT INTO group_messages (user_id, content) VALUES (?, ?)').run(userId, content);
    const message = {
      id: result.lastInsertRowid,
      user_id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      content,
      created_at: new Date().toISOString(),
    };
    io.emit('group_message', message);
  });

  // 私聊消息
  socket.on('private_message', (data) => {
    const { senderId, receiverId, content } = data;
    if (!senderId || !receiverId || !content) return;

    const sender = db.prepare('SELECT id, username, nickname, avatar FROM users WHERE id = ?').get(senderId);
    if (!sender || sender.is_banned) return;

    const result = db.prepare(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
    ).run(senderId, receiverId, content);

    const message = {
      id: result.lastInsertRowid,
      sender_id: sender.id,
      sender_username: sender.username,
      sender_nickname: sender.nickname,
      sender_avatar: sender.avatar,
      receiver_id: Number(receiverId),
      content,
      created_at: new Date().toISOString(),
    };

    // 发送给接收者
    const receiverSocketId = onlineUsers.get(String(receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('private_message', message);
    }
    // 也发给自己
    const senderSocketId = onlineUsers.get(String(senderId));
    if (senderSocketId) {
      io.to(senderSocketId).emit('private_message', message);
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    }
    console.log('🔌 用户断开:', socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🍵 二次元茶话会 服务器已启动 → http://localhost:${PORT}`);
});

export { io };
