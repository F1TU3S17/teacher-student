module.exports = {
  port: 3000,
  dbFile: 'teacherStudent.db',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key', // Лучше использовать переменные окружения
  saltRounds: 10 
};
