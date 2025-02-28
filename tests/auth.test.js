const request = require('supertest');
const app = require('../server/server');
const db = require('../db/database');

// Очистка тестовых данных перед запуском тестов
beforeAll(async () => {
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE email LIKE "test%@example.com"', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
});

describe('Тесты авторизации и регистрации', () => {
  
  // Тест регистрации студента
  test('Регистрация нового студента', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Тестовый Студент',
        email: 'test.student@example.com',
        password: 'password123',
        role: 'student'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId');
    expect(res.body.role).toEqual('student');
  });

  // Тест регистрации преподавателя
  test('Регистрация нового преподавателя', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Тестовый Преподаватель',
        email: 'test.teacher@example.com',
        password: 'password123',
        role: 'teacher'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId');
    expect(res.body.role).toEqual('teacher');
  });

  // Тест авторизации студента
  test('Авторизация существующего студента', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test.student@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toEqual('student');
  });

  // Тест авторизации преподавателя
  test('Авторизация существующего преподавателя', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test.teacher@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toEqual('teacher');
  });

  // Негативные тесты
  test('Ошибка при регистрации с существующим email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Дубликат',
        email: 'test.student@example.com',
        password: 'password123',
        role: 'student'
      });
    
    expect(res.statusCode).toEqual(400);
    expect(res.text).toContain('уже существует');
  });

  test('Ошибка при авторизации с неверным паролем', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test.student@example.com',
        password: 'неверный_пароль'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.text).toContain('Неверный пароль');
  });

  test('Ошибка при авторизации с несуществующим email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'несуществующий@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.text).toContain('Пользователь не найден');
  });

  // Тест получения профиля
  test('Получение профиля пользователя с валидным токеном', async () => {
    // Сначала авторизуемся и получаем токен
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'test.student@example.com',
        password: 'password123'
      });
    
    const token = loginRes.body.token;
    
    // Используем токен для запроса профиля
    const profileRes = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(profileRes.statusCode).toEqual(200);
    expect(profileRes.body).toHaveProperty('name');
    expect(profileRes.body).toHaveProperty('email');
    expect(profileRes.body.email).toEqual('test.student@example.com');
  });
});

// Очистка данных после тестов
afterAll(async () => {
  await new Promise((resolve) => {
    db.close(() => resolve());
  });
});
