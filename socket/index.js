const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = function setupSocket(io) {
  // Middleware для аутентификации пользователей через WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Требуется аутентификация'));
    }
    
    try {
      const user = jwt.verify(token, config.jwtSecret);
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Недействительный токен'));
    }
  });
  
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`Пользователь ${userId} подключен`);
    
    // Подписка на личные сообщения
    socket.join(`user_${userId}`);
    
    // Подписка на комнаты чатов
    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`Пользователь ${userId} присоединился к чату ${chatId}`);
    });
    
    // Отписка от чата
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`Пользователь ${userId} покинул чат ${chatId}`);
    });
    
    // Обработка отключения
    socket.on('disconnect', () => {
      console.log(`Пользователь ${userId} отключен`);
    });
  });
};
