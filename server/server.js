const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const config = require('../config');

// Импорт модулей
const db = require('../db/database');
const authRoutes = require('../routes/auth');
const chatRoutes = require('../routes/chats');
const messageRoutes = require('../routes/messages');
const lessonRoutes = require('../routes/lessons');
const setupSocket = require('../socket/index');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// Middleware для доступа к io из маршрутов
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Маршруты
app.use('/auth', authRoutes);
app.use('/chats', chatRoutes);
app.use('/messages', messageRoutes);
app.use('/lessons', lessonRoutes);

// Настройка WebSocket
setupSocket(io);

// Запуск сервера
server.listen(config.port, () => {
  console.log(`Сервер запущен на порту ${config.port}`);
});

// Обработка ошибок
process.on('uncaughtException', (err) => {
  console.error('Необработанное исключение:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение промиса:', reason);
});