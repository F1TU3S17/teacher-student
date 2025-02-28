const request = require('supertest');
const app = require('../server/server');
const db = require('../db/database');

let teacherToken;
let studentToken;
let teacherId;
let studentId;
let lessonIds = [];

describe('Тесты управления уроками', () => {
  // Подготовка тестовых данных
  beforeAll(async () => {
    // Очистка тестовых данных
    // await new Promise((resolve) => {
    //   db.serialize(() => {
    //     db.run('DELETE FROM grades WHERE lesson_id IN (SELECT id FROM lessons WHERE title LIKE "Тест%")');
    //     db.run('DELETE FROM enrollments WHERE lesson_id IN (SELECT id FROM lessons WHERE title LIKE "Тест%")');
    //     db.run('DELETE FROM lessons WHERE title LIKE "Тест%"');
    //     db.run('DELETE FROM users WHERE email LIKE "test.lesson%@example.com"', resolve);
    //   });
    // });

    // Регистрация тестового преподавателя
    const teacherRes = await request(app)
      .post('/auth/register')
      .send({
        name: 'Тестовый Преподаватель Уроков',
        email: 'test.lesson.teacher@example.com',
        password: 'password123',
        role: 'teacher'
      });
    
    teacherToken = teacherRes.body.token;
    teacherId = teacherRes.body.userId;

    // Регистрация тестового студента
    const studentRes = await request(app)
      .post('/auth/register')
      .send({
        name: 'Тестовый Студент Уроков',
        email: 'test.lesson.student@example.com',
        password: 'password123',
        role: 'student'
      });
    
    studentToken = studentRes.body.token;
    studentId = studentRes.body.userId;
  });

  // Тест создания трех уроков преподавателем
  test('Создание 3 уроков преподавателем', async () => {
    // Создаем первый урок
    const res1 = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Тестовый урок 1',
        description: 'Описание тестового урока 1',
        date: '2023-07-01T10:00:00',
        duration: 60,
        studentIds: [studentId],
        homework_text: 'Домашнее задание для урока 1'
      });
    
    expect(res1.statusCode).toEqual(201);
    expect(res1.body).toHaveProperty('id');
    lessonIds.push(res1.body.id);

    // Создаем второй и третий уроки аналогично
    const res2 = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Тестовый урок 2',
        description: 'Описание тестового урока 2',
        date: '2023-07-02T10:00:00',
        duration: 90,
        studentIds: [studentId],
        homework_text: 'Домашнее задание для урока 2'
      });
    
    expect(res2.statusCode).toEqual(201);
    expect(res2.body).toHaveProperty('id');
    lessonIds.push(res2.body.id);

    const res3 = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Тестовый урок 3',
        description: 'Описание тестового урока 3',
        date: '2023-07-03T10:00:00',
        duration: 120,
        studentIds: [studentId],
        homework_text: 'Домашнее задание для урока 3'
      });
    
    expect(res3.statusCode).toEqual(201);
    expect(res3.body).toHaveProperty('id');
    lessonIds.push(res3.body.id);
  });

  // Тест получения списка уроков преподавателем
  test('Получение списка уроков преподавателем', async () => {
    const res = await request(app)
      .get('/lessons')
      .set('Authorization', `Bearer ${teacherToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    
    // Проверяем, что созданные уроки присутствуют в ответе
    const testLessons = res.body.filter(lesson => lesson.title.startsWith('Тестовый урок'));
    expect(testLessons.length).toBeGreaterThanOrEqual(3);
    
    // Проверяем содержимое уроков
    expect(testLessons[0]).toHaveProperty('title');
    expect(testLessons[0]).toHaveProperty('description');
    expect(testLessons[0]).toHaveProperty('date');
  });

  // Тест получения списка уроков студентом
  test('Получение списка уроков студентом', async () => {
    const res = await request(app)
      .get('/lessons')
      .set('Authorization', `Bearer ${studentToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    
    // Проверяем, что назначенные студенту уроки присутствуют в ответе
    const testLessons = res.body.filter(lesson => lesson.title.startsWith('Тестовый урок'));
    expect(testLessons.length).toBeGreaterThanOrEqual(3);
  });

  // Тест получения информации о конкретном уроке
  test('Получение информации о конкретном уроке', async () => {
    const lessonId = lessonIds[0];
    
    const res = await request(app)
      .get(`/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('description');
    expect(res.body).toHaveProperty('homework_text');
    expect(res.body).toHaveProperty('students');
    expect(Array.isArray(res.body.students)).toBeTruthy();
    
    // Проверяем, что в уроке есть наш студент
    const student = res.body.students.find(s => s.id === studentId);
    expect(student).toBeTruthy();
    expect(student.name).toEqual('Тестовый Студент Уроков');
  });

  // Тест обновления информации об уроке
  test('Обновление информации об уроке', async () => {
    const lessonId = lessonIds[0];
    
    // Обновляем урок
    const updateRes = await request(app)
      .put(`/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Обновленный тестовый урок 1',
        description: 'Обновленное описание урока',
        homework_text: 'Обновленное домашнее задание'
      });
    
    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body).toHaveProperty('message');
    expect(updateRes.body.message).toContain('Урок успешно обновлен');
    
    // Проверяем, что изменения сохранились
    const getRes = await request(app)
      .get(`/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    
    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.title).toEqual('Обновленный тестовый урок 1');
    expect(getRes.body.description).toEqual('Обновленное описание урока');
    expect(getRes.body.homework_text).toEqual('Обновленное домашнее задание');
  });

  // Тест выставления оценки студенту за урок
  test('Выставление оценки за урок', async () => {
    const lessonId = lessonIds[0];
    
    // Выставляем оценку
    const gradeRes = await request(app)
      .post(`/lessons/${lessonId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId: studentId,
        grade: 5,
        feedback: 'Отлично выполненная работа!'
      });
    
    expect(gradeRes.statusCode).toEqual(200);
    expect(gradeRes.body).toHaveProperty('grade');
    expect(gradeRes.body.grade).toEqual(5);
    
    // Проверяем, что оценка отображается в информации о уроке
    const getRes = await request(app)
      .get(`/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    
    const student = getRes.body.students.find(s => s.id === studentId);
    expect(student).toHaveProperty('grade');
    expect(student.grade).toEqual(5);
    expect(student).toHaveProperty('feedback');
    expect(student.feedback).toEqual('Отлично выполненная работа!');
  });

  // Тест получения оценок студентом
  test('Получение оценок студентом', async () => {
    const res = await request(app)
      .get(`/lessons/grades/student/${studentId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    
    // Проверяем, что оценка за первый урок присутствует
    const grade = res.body.find(g => g.lesson_id === lessonIds[0]);
    expect(grade).toBeTruthy();
    expect(grade.grade).toEqual(5);
    expect(grade.feedback).toEqual('Отлично выполненная работа!');
  });

  // Очистка после тестов
  afterAll(async () => {
    await new Promise((resolve) => {
      db.serialize(() => {
        db.run('DELETE FROM grades WHERE lesson_id IN (SELECT id FROM lessons WHERE title LIKE "Тест%" OR title LIKE "Обновленный%")');
        db.run('DELETE FROM enrollments WHERE lesson_id IN (SELECT id FROM lessons WHERE title LIKE "Тест%" OR title LIKE "Обновленный%")');
        db.run('DELETE FROM lessons WHERE title LIKE "Тест%" OR title LIKE "Обновленный%"');
        db.run('DELETE FROM users WHERE email LIKE "test.lesson%@example.com"', resolve);
      });
    });
  });
});
