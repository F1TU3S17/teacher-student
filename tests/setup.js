// Этот файл будет запускаться перед тестами для настройки тестового окружения

// Устанавливаем тестовый режим
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Используем другой порт для тестов

// Импортируем необходимые модули
const db = require('../db/database');

// Очищаем тестовую БД перед запуском тестов
beforeAll(async () => {
  return new Promise((resolve) => {
    console.log('Подготовка тестовой среды...');
    db.serialize(() => {
      // Убедимся, что таблицы существуют
      db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, password TEXT)');
      db.run('CREATE TABLE IF NOT EXISTS grades (id INTEGER PRIMARY KEY, lesson_id INTEGER, student_id INTEGER, grade INTEGER, feedback TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
      resolve();
    });
  });
});

// Закрываем соединение с БД после всех тестов
afterAll(async () => {
  return new Promise((resolve) => {
    db.close(() => {
      console.log('Тестовое соединение с БД закрыто');
      resolve();
    });
  });
});
