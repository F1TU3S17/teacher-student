module.exports = {
  port: 3000,
  dbFile: 'db/teacherStudent.db',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key', // Лучше использовать переменные окружения
  saltRounds: 10 
};
