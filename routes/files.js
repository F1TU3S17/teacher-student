const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const auth = require('../middleware/auth');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

// Создание директории для загрузок, если она не существует
const uploadDir = path.join(__dirname, '..', config.uploadsDir);
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Генерация уникального имени файла
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
  // Разрешаем только PDF файлы
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Поддерживаются только PDF файлы'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Ограничение размера файла - 10 МБ
  }
});

// Загрузка файла для урока (только для учителей)
router.post('/upload/:lessonId', auth, upload.single('file'), (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут загружать файлы');
  }
  
  const lessonId = req.params.lessonId;
  const userId = req.user.id;
  
  // Проверка, что урок принадлежит преподавателю
  db.get(
    `SELECT id FROM lessons WHERE id = ? AND teacher_id = ?`,
    [lessonId, userId],
    (err, lesson) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!lesson) return res.status(404).send('Урок не найден или доступ запрещен');
      
      if (!req.file) {
        return res.status(400).send('Файл не был загружен');
      }
      
      // Сохранение информации о файле в БД
      db.run(
        `INSERT INTO files (lesson_id, filename, original_name, mime_type, size, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          lessonId, 
          req.file.filename, 
          req.file.originalname, 
          req.file.mimetype, 
          req.file.size, 
          userId
        ],
        function(err) {
          if (err) return res.status(500).send('Ошибка при сохранении файла');
          
          res.status(201).send({
            id: this.lastID,
            lesson_id: lessonId,
            filename: req.file.filename,
            original_name: req.file.originalname,
            mime_type: req.file.mimetype,
            size: req.file.size,
            created_at: new Date().toISOString()
          });
        }
      );
    }
  );
});

// Получение списка файлов для урока
router.get('/lesson/:lessonId', auth, (req, res) => {
  const lessonId = req.params.lessonId;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query, params;
  if (userRole === 'teacher') {
    // Для преподавателя - проверка, что он ведёт этот урок
    query = `
      SELECT f.*, u.name as uploaded_by_name
      FROM files f
      JOIN users u ON f.uploaded_by = u.id
      JOIN lessons l ON f.lesson_id = l.id
      WHERE f.lesson_id = ? AND l.teacher_id = ?
      ORDER BY f.created_at DESC
    `;
    params = [lessonId, userId];
  } else {
    // Для студента - проверка, что он записан на этот урок
    query = `
      SELECT f.*, u.name as uploaded_by_name
      FROM files f
      JOIN users u ON f.uploaded_by = u.id
      JOIN lessons l ON f.lesson_id = l.id
      JOIN enrollments e ON l.id = e.lesson_id
      WHERE f.lesson_id = ? AND e.student_id = ?
      ORDER BY f.created_at DESC
    `;
    params = [lessonId, userId];
  }
  
  db.all(query, params, (err, files) => {
    if (err) return res.status(500).send('Ошибка при получении файлов');
    res.send(files);
  });
});

// Скачивание файла
router.get('/download/:fileId', auth, (req, res) => {
  const fileId = req.params.fileId;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query, params;
  if (userRole === 'teacher') {
    // Проверка для преподавателя
    query = `
      SELECT f.*, l.teacher_id
      FROM files f
      JOIN lessons l ON f.lesson_id = l.id
      WHERE f.id = ? AND l.teacher_id = ?
    `;
    params = [fileId, userId];
  } else {
    // Проверка для студента
    query = `
      SELECT f.*
      FROM files f
      JOIN lessons l ON f.lesson_id = l.id
      JOIN enrollments e ON l.id = e.lesson_id
      WHERE f.id = ? AND e.student_id = ?
    `;
    params = [fileId, userId];
  }
  
  db.get(query, params, (err, file) => {
    if (err) return res.status(500).send('Ошибка сервера');
    if (!file) return res.status(404).send('Файл не найден или доступ запрещен');
    
    const filePath = path.join(uploadDir, file.filename);
    
    // Проверка существования файла на сервере
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Файл не найден на сервере');
    }
    
    // Установка заголовков для скачивания
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type);
    
    // Отправка файла
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
});

// Удаление файла (только для учителя, который загрузил файл)
router.delete('/:fileId', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут удалять файлы');
  }
  
  const fileId = req.params.fileId;
  const userId = req.user.id;
  
  db.get(
    `SELECT filename FROM files WHERE id = ? AND uploaded_by = ?`,
    [fileId, userId],
    (err, file) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!file) return res.status(404).send('Файл не найден или доступ запрещен');
      
      // Удаление файла из БД
      db.run(
        `DELETE FROM files WHERE id = ?`,
        [fileId],
        function(err) {
          if (err) return res.status(500).send('Ошибка при удалении файла');
          
          // Удаление файла из файловой системы
          const filePath = path.join(uploadDir, file.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error('Не удалось удалить файл из системы:', err);
          });
          
          res.send({ message: 'Файл успешно удален' });
        }
      );
    }
  );
});

module.exports = router;
