const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Получение всех уроков (для преподавателя - все его уроки, для студента - все уроки, назначенные ему)
router.get('/', auth, (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query;
  if (userRole === 'teacher') {
    query = `
      SELECT l.*, COUNT(e.student_id) as enrolled_students 
      FROM lessons l 
      LEFT JOIN enrollments e ON l.id = e.lesson_id 
      WHERE l.teacher_id = ? 
      GROUP BY l.id
      ORDER BY l.date DESC
    `;
  } else {
    query = `
      SELECT l.*, u.name as teacher_name, e.status as enrollment_status
      FROM lessons l
      JOIN enrollments e ON l.id = e.lesson_id
      JOIN users u ON l.teacher_id = u.id
      WHERE e.student_id = ?
      ORDER BY l.date DESC
    `;
  }
  
  db.all(query, [userId], (err, lessons) => {
    if (err) return res.status(500).send('Ошибка при получении уроков');
    res.send(lessons);
  });
});

// Создание урока (только для преподавателей, с указанием студентов)
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут создавать уроки');
  }
  
  const { title, description, date, duration, studentIds, homework_text } = req.body;
  const teacherId = req.user.id;
  
  if (!title || !date || !duration) {
    return res.status(400).send('Отсутствуют обязательные поля');
  }
  
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).send('Необходимо указать хотя бы одного студента');
  }
  
  // Начинаем транзакцию для создания урока и записи студентов
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) return res.status(500).send('Ошибка сервера');
    
    // Создаем урок с поддержкой homework_text
    db.run(
      `INSERT INTO lessons (title, description, teacher_id, date, duration, homework_text, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [title, description, teacherId, date, duration, homework_text || ''],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).send('Ошибка при создании урока');
        }
        
        const lessonId = this.lastID;
        let completed = 0;
        let hasError = false;
        
        // Записываем всех указанных студентов
        studentIds.forEach(studentId => {
          db.run(
            `INSERT INTO enrollments (lesson_id, student_id, status, enrolled_at) 
             VALUES (?, ?, 'enrolled', datetime('now'))`,
            [lessonId, studentId],
            (err) => {
              completed++;
              
              if (err && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).send('Ошибка при назначении студентов');
              }
              
              // Завершаем транзакцию, когда все студенты будут записаны
              if (completed === studentIds.length && !hasError) {
                db.run('COMMIT', (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).send('Ошибка при завершении транзакции');
                  }
                  
                  // Возвращаем информацию о созданном уроке
                  res.status(201).send({ 
                    id: lessonId,
                    title,
                    description,
                    teacher_id: teacherId,
                    date,
                    duration,
                    homework_text: homework_text || '',
                    studentIds,
                    created_at: new Date().toISOString()
                  });
                });
              }
            }
          );
        });
      }
    );
  });
});

// Получение информации о конкретном уроке
router.get('/:id', auth, (req, res) => {
  const lessonId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query, params;
  if (userRole === 'teacher') {
    query = `
      SELECT l.*, COUNT(e.student_id) as enrolled_students
      FROM lessons l
      LEFT JOIN enrollments e ON l.id = e.lesson_id
      WHERE l.id = ? AND l.teacher_id = ?
      GROUP BY l.id
    `;
    params = [lessonId, userId];
  } else {
    query = `
      SELECT l.*, u.name as teacher_name, e.status as enrollment_status
      FROM lessons l
      JOIN enrollments e ON l.id = e.lesson_id
      JOIN users u ON l.teacher_id = u.id
      WHERE l.id = ? AND e.student_id = ?
    `;
    params = [lessonId, userId];
  }
  
  db.get(query, params, (err, lesson) => {
    if (err) return res.status(500).send('Ошибка при получении урока');
    if (!lesson) return res.status(404).send('Урок не найден или доступ запрещен');
    
    // Получаем список студентов для урока вместе с их оценками
    db.all(
      `SELECT u.id, u.name, u.email, e.status, g.grade, g.feedback
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN grades g ON g.lesson_id = e.lesson_id AND g.student_id = e.student_id
       WHERE e.lesson_id = ?`,
      [lessonId],
      (err, students) => {
        if (err) return res.status(500).send('Ошибка при получении списка студентов');
        lesson.students = students;
        res.send(lesson);
      }
    );
  });
});

// Обновление урока (только для преподавателей)
router.put('/:id', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут обновлять уроки');
  }
  
  const lessonId = req.params.id;
  const teacherId = req.user.id;
  const { title, description, date, duration, studentIds, homework_text } = req.body;
  
  // Проверяем, владеет ли преподаватель этим уроком
  db.get(
    `SELECT id FROM lessons WHERE id = ? AND teacher_id = ?`,
    [lessonId, teacherId],
    function(err, lesson) {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!lesson) return res.status(404).send('Урок не найден или доступ запрещен');
      
      // Начинаем транзакцию
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) return res.status(500).send('Ошибка сервера');
        
        // Обновляем основную информацию урока, включая домашнее задание
        db.run(
          `UPDATE lessons 
           SET title = COALESCE(?, title),
               description = COALESCE(?, description),
               date = COALESCE(?, date),
               duration = COALESCE(?, duration),
               homework_text = COALESCE(?, homework_text)
           WHERE id = ?`,
          [title, description, date, duration, homework_text, lessonId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).send('Ошибка при обновлении урока');
            }
            
            // Если не указан новый список студентов, завершаем обновление
            if (!Array.isArray(studentIds)) {
              db.run('COMMIT');
              return res.send({ message: 'Урок успешно обновлен' });
            }
            
            // Удаляем существующие записи и добавляем новые
            db.run(`DELETE FROM enrollments WHERE lesson_id = ?`, [lessonId], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).send('Ошибка при обновлении списка студентов');
              }
              
              if (studentIds.length === 0) {
                db.run('COMMIT');
                return res.send({ message: 'Урок успешно обновлен, список студентов пуст' });
              }
              
              let completed = 0;
              let hasError = false;
              
              // Добавляем новые записи о студентах
              studentIds.forEach(studentId => {
                db.run(
                  `INSERT INTO enrollments (lesson_id, student_id, status, enrolled_at)
                   VALUES (?, ?, 'enrolled', datetime('now'))`,
                  [lessonId, studentId],
                  function(err) {
                    completed++;
                    
                    if (err && !hasError) {
                      hasError = true;
                      db.run('ROLLBACK');
                      return res.status(500).send('Ошибка при обновлении списка студентов');
                    }
                    
                    if (completed === studentIds.length && !hasError) {
                      db.run('COMMIT');
                      res.send({ message: 'Урок и список студентов успешно обновлены' });
                    }
                  }
                );
              });
            });
          }
        );
      });
    }
  );
});

// Добавление/обновление домашнего задания (только для преподавателей)
router.put('/:id/homework', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут добавлять домашние задания');
  }
  
  const lessonId = req.params.id;
  const teacherId = req.user.id;
  const { homework_text } = req.body;
  
  if (!homework_text) {
    return res.status(400).send('Текст домашнего задания не может быть пустым');
  }
  
  db.run(
    `UPDATE lessons 
     SET homework_text = ?
     WHERE id = ? AND teacher_id = ?`,
    [homework_text, lessonId, teacherId],
    function(err) {
      if (err) return res.status(500).send('Ошибка при обновлении домашнего задания');
      if (this.changes === 0) return res.status(404).send('Урок не найден или доступ запрещен');
      
      res.send({ message: 'Домашнее задание успешно обновлено' });
    }
  );
});

// Удаление урока (только для преподавателей)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут удалять уроки');
  }
  
  const lessonId = req.params.id;
  const teacherId = req.user.id;
  
  // Начинаем транзакцию для удаления урока и всех связанных записей
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) return res.status(500).send('Ошибка сервера');
    
    // Удаляем все записи студентов на урок
    db.run(`DELETE FROM enrollments WHERE lesson_id = ?`, [lessonId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).send('Ошибка при удалении записей на урок');
      }
      
      // Удаляем урок
      db.run(
        `DELETE FROM lessons WHERE id = ? AND teacher_id = ?`,
        [lessonId, teacherId],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).send('Ошибка при удалении урока');
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(404).send('Урок не найден или доступ запрещен');
          }
          
          db.run('COMMIT');
          res.send({ message: 'Урок успешно удален' });
        }
      );
    });
  });
});

// Получение всех студентов (для удобства выбора при создании/обновлении урока)
router.get('/students/all', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Доступ запрещен');
  }
  
  db.all(
    `SELECT id, name, email FROM users WHERE role = 'student'`,
    [],
    (err, students) => {
      if (err) return res.status(500).send('Ошибка при получении списка студентов');
      res.send(students);
    }
  );
});

// Выставление оценки студенту за урок (только для преподавателей)
router.post('/:id/grade', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Только преподаватели могут выставлять оценки');
  }
  
  const lessonId = req.params.id;
  const teacherId = req.user.id;
  const { studentId, grade, feedback } = req.body;
  
  if (!studentId || !grade) {
    return res.status(400).send('Отсутствуют обязательные поля');
  }
  
  // Проверяем, что урок принадлежит преподавателю
  db.get(
    `SELECT id FROM lessons WHERE id = ? AND teacher_id = ?`,
    [lessonId, teacherId],
    (err, lesson) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!lesson) return res.status(404).send('Урок не найден или доступ запрещен');
      
      // Проверяем, что студент записан на этот урок
      db.get(
        `SELECT id FROM enrollments WHERE lesson_id = ? AND student_id = ?`,
        [lessonId, studentId],
        (err, enrollment) => {
          if (err) return res.status(500).send('Ошибка сервера');
          if (!enrollment) return res.status(404).send('Студент не записан на этот урок');
          
          // Проверяем, не выставлена ли уже оценка
          db.get(
            `SELECT id FROM grades WHERE lesson_id = ? AND student_id = ?`,
            [lessonId, studentId],
            (err, existingGrade) => {
              if (err) return res.status(500).send('Ошибка сервера');
              
              let query, params;
              if (existingGrade) {
                // Обновляем существующую оценку
                query = `
                  UPDATE grades 
                  SET grade = ?, feedback = ?, created_at = datetime('now')
                  WHERE lesson_id = ? AND student_id = ?
                `;
                params = [grade, feedback || '', lessonId, studentId];
              } else {
                // Создаем новую оценку
                query = `
                  INSERT INTO grades (lesson_id, student_id, grade, feedback, created_at)
                  VALUES (?, ?, ?, ?, datetime('now'))
                `;
                params = [lessonId, studentId, grade, feedback || ''];
              }
              
              db.run(query, params, function(err) {
                if (err) return res.status(500).send('Ошибка при выставлении оценки');
                
                // Отправляем уведомление студенту через WebSocket
                req.io.to(`user_${studentId}`).emit('grade_updated', {
                  lesson_id: lessonId,
                  grade,
                  feedback: feedback || ''
                });
                
                res.send({
                  id: existingGrade ? existingGrade.id : this.lastID,
                  lesson_id: lessonId,
                  student_id: studentId,
                  grade,
                  feedback: feedback || '',
                  created_at: new Date().toISOString()
                });
              });
            }
          );
        }
      );
    }
  );
});

// Получение оценок студента за все уроки (для студентов - свои оценки, для преподавателей - оценки своих уроков)
router.get('/grades/student/:studentId', auth, (req, res) => {
  const requesterId = req.user.id;
  const requesterRole = req.user.role;
  const studentId = req.params.studentId;
  
  // Студенты могут видеть только свои оценки
  if (requesterRole === 'student' && requesterId != studentId) {
    return res.status(403).send('Доступ запрещен');
  }
  
  let query, params;
  if (requesterRole === 'teacher') {
    // Преподаватель видит оценки студента только за свои уроки
    query = `
      SELECT g.*, l.title as lesson_title, l.date as lesson_date
      FROM grades g
      JOIN lessons l ON g.lesson_id = l.id
      WHERE g.student_id = ? AND l.teacher_id = ?
      ORDER BY l.date DESC
    `;
    params = [studentId, requesterId];
  } else {
    // Студент видит все свои оценки
    query = `
      SELECT g.*, l.title as lesson_title, l.date as lesson_date, 
             u.name as teacher_name
      FROM grades g
      JOIN lessons l ON g.lesson_id = l.id
      JOIN users u ON l.teacher_id = u.id
      WHERE g.student_id = ?
      ORDER BY l.date DESC
    `;
    params = [studentId];
  }
  
  db.all(query, params, (err, grades) => {
    if (err) return res.status(500).send('Ошибка при получении оценок');
    res.send(grades);
  });
});

// Получение всех оценок за конкретный урок (только для преподавателя)
router.get('/:id/grades', auth, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).send('Доступ запрещен');
  }
  
  const lessonId = req.params.id;
  const teacherId = req.user.id;
  
  // Проверяем, что урок принадлежит преподавателю
  db.get(
    `SELECT id FROM lessons WHERE id = ? AND teacher_id = ?`,
    [lessonId, teacherId],
    (err, lesson) => {
      if (err) return res.status(500).send('Ошибка сервера');
      if (!lesson) return res.status(404).send('Урок не найден или доступ запрещен');
      
      // Получаем все оценки за этот урок
      db.all(
        `SELECT g.*, u.name as student_name, u.email as student_email
         FROM grades g
         JOIN users u ON g.student_id = u.id
         WHERE g.lesson_id = ?
         ORDER BY u.name`,
        [lessonId],
        (err, grades) => {
          if (err) return res.status(500).send('Ошибка при получении оценок');
          res.send(grades);
        }
      );
    }
  );
});

module.exports = router;
