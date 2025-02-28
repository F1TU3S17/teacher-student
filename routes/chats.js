const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Получение всех чатов пользователя
router.get('/', auth, (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query;
  if (userRole === 'teacher') {
    query = `
      SELECT c.id, c.title, c.created_at, u.name as student_name, u.id as student_id
      FROM chats c
      JOIN users u ON c.student_id = u.id
      WHERE c.teacher_id = ?
      ORDER BY c.created_at DESC
    `;
  } else {
    query = `
      SELECT c.id, c.title, c.created_at, u.name as teacher_name, u.id as teacher_id
      FROM chats c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.student_id = ?
      ORDER BY c.created_at DESC
    `;
  }
  
  db.all(query, [userId], (err, chats) => {
    if (err) return res.status(500).send('Ошибка при получении чатов');
    res.send(chats);
  });
});

// Создание нового чата
router.post('/', auth, (req, res) => {
  const { title, participantId } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  if (!title || !participantId) {
    return res.status(400).send('Отсутствуют обязательные поля');
  }
  
  let teacherId, studentId;
  if (userRole === 'teacher') {
    teacherId = userId;
    studentId = participantId;
  } else {
    teacherId = participantId;
    studentId = userId;
  }
  
  db.run(
    `INSERT INTO chats (title, teacher_id, student_id, created_at) VALUES (?, ?, ?, datetime('now'))`,
    [title, teacherId, studentId],
    function(err) {
      if (err) return res.status(500).send('Ошибка при создании чата');
      
      res.status(201).send({ 
        id: this.lastID,
        title,
        teacher_id: teacherId,
        student_id: studentId,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Получение информации о конкретном чате
router.get('/:id', auth, (req, res) => {
  const chatId = req.params.id;
  const userId = req.user.id;
  
  db.get(
    `SELECT * FROM chats WHERE id = ? AND (teacher_id = ? OR student_id = ?)`,
    [chatId, userId, userId],
    (err, chat) => {
      if (err) return res.status(500).send('Ошибка при получении чата');
      if (!chat) return res.status(404).send('Чат не найден или доступ запрещен');
      
      res.send(chat);
    }
  );
});

// Удаление чата
router.delete('/:id', auth, (req, res) => {
  const chatId = req.params.id;
  const userId = req.user.id;
  
  db.run(
    `DELETE FROM chats WHERE id = ? AND (teacher_id = ? OR student_id = ?)`,
    [chatId, userId, userId],
    function(err) {
      if (err) return res.status(500).send('Ошибка при удалении чата');
      if (this.changes === 0) return res.status(404).send('Чат не найден или доступ запрещен');
      
      res.send({ message: 'Чат успешно удален' });
    }
  );
});

module.exports = router;
