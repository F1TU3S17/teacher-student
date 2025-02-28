const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const config = require('../config');

// Регистрация
router.post('/register', async (req, res) => {
  const { name, email, role, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).send('Отсутствуют обязательные поля');
  }
  
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).send('Неверная роль');
  }
  
  // Проверка существования пользователя с таким email
  db.get(`SELECT id FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).send('Ошибка сервера');
    if (user) return res.status(400).send('Пользователь с таким email уже существует');
    
    try {
      const hashedPassword = await bcrypt.hash(password, config.saltRounds);
      db.run(
        `INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)`,
        [name, email, role, hashedPassword],
        function(err) {
          if (err) return res.status(500).send('Ошибка при регистрации');
          
          // Создаем токен для автоматического входа после регистрации
          const token = jwt.sign({ 
            id: this.lastID, 
            role, 
            email 
          }, config.jwtSecret);
          
          res.status(201).send({ 
            token, 
            userId: this.lastID, 
            role, 
            name, 
            email 
          });
        }
      );
    } catch (error) {
      res.status(500).send('Ошибка сервера');
    }
  });
});

// Вход
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).send('Отсутствуют обязательные поля');
  }
  
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).send('Ошибка сервера');
    if (!user) return res.status(401).send('Пользователь не найден');
    
    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ 
          id: user.id, 
          role: user.role, 
          email: user.email 
        }, config.jwtSecret);
        
        res.send({ 
          token, 
          userId: user.id, 
          role: user.role, 
          name: user.name,
          email: user.email
        });
      } else {
        res.status(401).send('Неверный пароль');
      }
    } catch (error) {
      res.status(500).send('Ошибка сервера');
    }
  });
});

// Получение профиля пользователя
router.get('/profile', require('../middleware/auth'), (req, res) => {
  const userId = req.user.id;
  
  db.get(`SELECT id, name, email, role FROM users WHERE id = ?`, 
    [userId], (err, user) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!user) return res.status(404).send('Пользователь не найден');
      
      res.send(user);
  });
});

// Обновление профиля
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  
  db.run(
    `UPDATE users SET name = COALESCE(?, name) WHERE id = ?`,
    [name, userId],
    function(err) {
      if (err) return res.status(500).send('Ошибка при обновлении профиля');
      
      if (this.changes === 0) {
        return res.status(404).send('Пользователь не найден');
      }
      
      res.send({ message: 'Профиль успешно обновлен' });
    }
  );
});

module.exports = router;
