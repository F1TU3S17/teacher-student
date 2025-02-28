const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Получение сообщений для конкретного чата
router.get('/:chatId', auth, (req, res) => {
  const chatId = req.params.chatId;
  const userId = req.user.id;
  
  // Проверяем, есть ли у пользователя доступ к этому чату
  db.get(
    `SELECT id FROM chats WHERE id = ? AND (teacher_id = ? OR student_id = ?)`,
    [chatId, userId, userId],
    (err, chat) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!chat) return res.status(403).send('Доступ запрещен');
      
      // Получаем сообщения
      db.all(
        `SELECT m.id, m.chat_id, m.sender_id, m.content, m.created_at, u.name as sender_name 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.chat_id = ?
         ORDER BY m.created_at ASC`,
        [chatId],
        (err, messages) => {
          if (err) return res.status(500).send('Ошибка при получении сообщений');
          res.send(messages);
        }
      );
    }
  );
});

// Отправка сообщения в чат
router.post('/', auth, (req, res) => {
  const { chatId, content } = req.body;
  const userId = req.user.id;
  
  if (!chatId || !content) {
    return res.status(400).send('Отсутствуют обязательные поля');
  }
  
  // Проверяем, есть ли у пользователя доступ к этому чату
  db.get(
    `SELECT id FROM chats WHERE id = ? AND (teacher_id = ? OR student_id = ?)`,
    [chatId, userId, userId],
    (err, chat) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!chat) return res.status(403).send('Доступ запрещен');
      
      // Добавляем сообщение
      db.run(
        `INSERT INTO messages (chat_id, sender_id, content, created_at) VALUES (?, ?, ?, datetime('now'))`,
        [chatId, userId, content],
        function(err) {
          if (err) return res.status(500).send('Ошибка при отправке сообщения');
          
          // Получаем имя отправителя для ответа
          db.get(
            `SELECT name FROM users WHERE id = ?`, 
            [userId],
            (err, user) => {
              if (err) return res.status(500).send('Ошибка сервера');
              
              const messageData = {
                id: this.lastID,
                chat_id: chatId,
                sender_id: userId,
                sender_name: user.name,
                content,
                created_at: new Date().toISOString()
              };
              
              // Отправляем сообщение через WebSocket
              req.io.to(`chat_${chatId}`).emit('new_message', messageData);
              
              res.status(201).send(messageData);
            }
          );
        }
      );
    }
  );
});

// Удаление сообщения
router.delete('/:id', auth, (req, res) => {
  const messageId = req.params.id;
  const userId = req.user.id;
  
  db.run(
    `DELETE FROM messages WHERE id = ? AND sender_id = ?`,
    [messageId, userId],
    function(err) {
      if (err) return res.status(500).send('Ошибка при удалении сообщения');
      if (this.changes === 0) return res.status(404).send('Сообщение не найдено или доступ запрещен');
      
      res.send({ message: 'Сообщение успешно удалено' });
    }
  );
});

module.exports = router;
