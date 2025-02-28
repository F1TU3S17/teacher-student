const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = function auth(req, res, next) {
  // Получаем токен из заголовка Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Формат: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).send('Доступ запрещен. Токен не предоставлен.');
  }

  try {
    // Проверка токена
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Добавляем данные пользователя в объект запроса
    next(); // Переходим к следующему обработчику
  } catch (error) {
    res.status(401).send('Недействительный токен');
  }
};
