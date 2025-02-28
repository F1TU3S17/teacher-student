const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

// Инициализация базы данных
const db = new sqlite3.Database(config.dbFile);

// Создание таблиц
db.serialize(() => {
  // Упрощенная таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    name TEXT, 
    email TEXT UNIQUE, 
    role TEXT, 
    password TEXT
  )`);
  
  // Таблица чатов
  db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY, 
    teacher_id INTEGER, 
    student_id INTEGER,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users (id),
    FOREIGN KEY (student_id) REFERENCES users (id)
  )`);
  
  // Таблица сообщений
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY, 
    chat_id INTEGER, 
    sender_id INTEGER, 
    content TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats (id),
    FOREIGN KEY (sender_id) REFERENCES users (id)
  )`);
  
  // Таблица уроков
  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY,
    teacher_id INTEGER,
    title TEXT,
    description TEXT,
    date DATETIME,
    duration INTEGER,
    homework_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users (id)
  )`);
  
  // Таблица записи на уроки (связь уроков и студентов)
  db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY,
    lesson_id INTEGER,
    student_id INTEGER,
    status TEXT DEFAULT 'enrolled',
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons (id),
    FOREIGN KEY (student_id) REFERENCES users (id),
    UNIQUE(lesson_id, student_id)
  )`);
  
  // Таблица для оценок учеников за уроки
  db.run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY,
    lesson_id INTEGER,
    student_id INTEGER,
    grade INTEGER,
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons (id),
    FOREIGN KEY (student_id) REFERENCES users (id),
    UNIQUE(lesson_id, student_id)
  )`);
});

module.exports = db;
