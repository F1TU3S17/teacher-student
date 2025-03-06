📚 Документация API «Teacher-Student»

## 🔑 Авторизация (/auth)

### 📝 Регистрация пользователя
**POST** `/auth/register`
```json
{
  "name": "Иван Иванов", 
  "email": "ivan@example.com", 
  "password": "password123", 
  "role": "student" // или "teacher"
}
```
*Ответ (201):*
```json
{
  "token": "jwt_token_здесь",
  "userId": 1,
  "role": "student",
  "name": "Иван Иванов",
  "email": "ivan@example.com"
}
```

### 🔓 Вход в систему
**POST** `/auth/login`
```json
{
  "email": "ivan@example.com",
  "password": "password123"
}
```
*Ответ (200):*
```json
{
  "token": "jwt_token_здесь",
  "userId": 1,
  "role": "student",
  "name": "Иван Иванов",
  "email": "ivan@example.com"
}
```

### 👤 Получение профиля
**GET** `/auth/profile`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):*
```json
{
  "id": 1,
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "role": "student"
}
```

### ✏️ Обновление профиля
**PUT** `/auth/profile`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "name": "Иван Петров"
}
```
*Ответ (200):*
```json
{
  "message": "Профиль успешно обновлен"
}
```

## 💬 Чаты (/chats)
Soket.IO
Подключение с аутентификацией — передача JWT-токена при соединении
Подписка на обновления — присоединение к комнатам через join_chat
Получение обновлений — обработка событий new_message и других
Отписка от обновлений — отправка leave_chat при выходе из чата
### 📋 Получение всех чатов
**GET** `/chats`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Список чатов пользователя

### ➕ Создание чата
**POST** `/chats`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "title": "Консультация по математике",
  "participantId": 2 // ID второго участника (студента или преподавателя)
}
```
*Ответ (201):* Данные о созданном чате

### 📢 Информация о чате
**GET** `/chats/:id`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Данные чата

### 🗑️ Удаление чата
**DELETE** `/chats/:id`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Сообщение об успешном удалении

## 📨 Сообщения (/messages)

### 📖 Получение сообщений чата
**GET** `/messages/:chatId`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Список сообщений чата

### ✉️ Отправка сообщения
**POST** `/messages`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "chatId": 1,
  "content": "Привет! Как дела с домашним заданием?"
}
```
*Ответ (201):* Данные отправленного сообщения

### 🗑️ Удаление сообщения
**DELETE** `/messages/:id`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Сообщение об успешном удалении

## 📚 Уроки (/lessons)

### 📋 Получение уроков
**GET** `/lessons`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Список уроков (для учителя - все его уроки, для студента - все назначенные ему)

### ➕ Создание урока (только для учителя)
**POST** `/lessons`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "title": "Введение в алгебру",
  "description": "Первый урок по алгебре",
  "date": "2023-07-01T10:00:00",
  "duration": 60,
  "studentIds": [2, 3],
  "homework_text": "Решить задачи 1-5 на странице 10"
}
```
*Ответ (201):* Данные созданного урока

### 📝 Информация об уроке
**GET** `/lessons/:id`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Детальная информация об уроке, включая список студентов

### ✏️ Обновление урока (только для учителя)
**PUT** `/lessons/:id`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "title": "Обновленное название",
  "description": "Обновленное описание",
  "date": "2023-07-02T11:00:00",
  "duration": 90,
  "studentIds": [2, 3, 4],
  "homework_text": "Обновленное домашнее задание"
}
```
*Ответ (200):* Сообщение об успешном обновлении

### 📚 Обновление домашнего задания (только для учителя)
**PUT** `/lessons/:id/homework`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "homework_text": "Новое домашнее задание: решить задачи 6-10"
}
```
*Ответ (200):* Сообщение об успешном обновлении

### 🗑️ Удаление урока (только для учителя)
**DELETE** `/lessons/:id`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Сообщение об успешном удалении

### 👨‍🎓 Список всех студентов (только для учителя)
**GET** `/lessons/students/all`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Список всех доступных студентов

### 📊 Выставление оценки (только для учителя)
**POST** `/lessons/:id/grade`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`
```json
{
  "studentId": 2,
  "grade": 5,
  "feedback": "Отлично выполненная работа!"
}
```
*Ответ (200):* Данные о выставленной оценке

### 📊 Получение оценок студента
**GET** `/lessons/grades/student/:studentId`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Список всех оценок студента

### 📊 Получение оценок за урок (только для учителя)
**GET** `/lessons/:id/grades`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Список всех оценок за данный урок

## 📄 Файлы (/files)

### 📤 Загрузка файла для урока (только для учителей)
**POST** `/files/upload/:lessonId`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Тип запроса:* `multipart/form-data`  
*Форма:*  
- `file`: PDF-файл (поддерживаются только PDF, максимальный размер 10МБ)

*Пример запроса на C# для xmarin 
```C#
using Xamarin.Essentials;

async Task PickAndUploadPdfFileAsync()
{
    try
    {
        // Выбор файла с устройства
        var fileResult = await FilePicker.PickAsync(new PickOptions
        {
            FileTypes = FilePickerFileType.Pdf,
            PickerTitle = "Выберите PDF файл"
        });

        if (fileResult != null)
        {
            // Дальнейшая обработка файла и загрузка
            await UploadFileAsync(fileResult);
        }
    }
    catch (Exception ex)
    {
        // Обработка ошибок
        Console.WriteLine($"Ошибка при выборе файла: {ex.Message}");
    }
}
```

Отправка на сервер
```C#
async Task UploadFileAsync(FileResult fileResult)
{
    try
    {
        // Получаем токен авторизации из хранилища приложения
        string token = await SecureStorage.GetAsync("jwt_token");
        
        // ID урока, для которого загружается файл
        int lessonId = 123; // Замените на реальный ID урока
        
        // Создаем HttpClient с необходимым заголовком авторизации
        using (HttpClient client = new HttpClient())
        {
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            
            // Создаем multipart/form-data контент
            using (var content = new MultipartFormDataContent())
            {
                // Открываем поток файла
                var stream = await fileResult.OpenReadAsync();
                
                // Создаем контент из потока
                var fileContent = new StreamContent(stream);
                
                // Добавляем Content-Type заголовок, если нужно
                fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
                
                // Добавляем файл к multipart/form-data с ключом "file" (как в Postman)
                content.Add(fileContent, "file", fileResult.FileName);
                
                // Отправляем запрос на сервер
                var response = await client.PostAsync($"https://your-api-url.com/files/upload/{lessonId}", content);
                
                // Проверяем успешность запроса
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Успешная загрузка: {responseContent}");
                    // Обработка успешного ответа
                }
                else
                {
                    Console.WriteLine($"Ошибка: {response.StatusCode}");
                    // Обработка ошибок
                }
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Ошибка при загрузке файла: {ex.Message}");
    }
}
```


*Ответ (201):*
```json
{
  "id": 1,
  "lesson_id": 123,
  "filename": "a1b2c3d4.pdf",
  "original_name": "лекция.pdf",
  "mime_type": "application/pdf",
  "size": 157286,
  "created_at": "2023-06-20T14:30:15.000Z"
}
```

### 📋 Получение списка файлов для урока
**GET** `/files/lesson/:lessonId`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):*
```json
[
  {
    "id": 1, //Это id - файла
    "lesson_id": 123,
    "filename": "a1b2c3d4.pdf",
    "original_name": "лекция.pdf",
    "mime_type": "application/pdf",
    "size": 157286,
    "uploaded_by": 2,
    "created_at": "2023-06-20T14:30:15.000Z",
    "uploaded_by_name": "Иван Петров"
  },
  {
    "id": 2,
    "lesson_id": 123,
    "filename": "e5f6g7h8.pdf",
    "original_name": "домашнее_задание.pdf",
    "mime_type": "application/pdf",
    "size": 89432,
    "uploaded_by": 2,
    "created_at": "2023-06-21T09:15:30.000Z",
    "uploaded_by_name": "Иван Петров"
  }
]
```

### 📥 Скачивание файла
**GET** `/files/download/:fileId`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):* Файл для скачивания  

### 🗑️ Удаление файла (только для учителя, который загрузил файл)
**DELETE** `/files/:fileId`  
*Заголовки:* `Authorization: Bearer jwt_token_здесь`  
*Ответ (200):*
```json
{
  "message": "Файл успешно удален"
}
```

## Примечания по работе с файлами

1. **Ограничения загрузки файлов**:
   - Поддерживаются только PDF-файлы
   - Максимальный размер файла: 10 МБ
   - Загрузка доступна только преподавателям

2. **Доступ к файлам**:
   - Преподаватели: могут загружать, просматривать и удалять файлы своих уроков
   - Студенты: могут только просматривать и скачивать файлы уроков, на которые они записаны

3. **Практические рекомендации**:
   - При загрузке обязательно используйте заголовок `multipart/form-data`
   - Для удобства можно реализовать прогресс загрузки файла
   - При скачивании файлов используйте элемент `<a>` с атрибутом `download`

## Общие примечания

- Во всех запросах, требующих аутентификации, необходимо передавать токен в заголовке `Authorization: Bearer [token]`
- Все данные отправляются и принимаются в формате JSON (кроме загрузки файлов)
- Для всех POST/PUT запросов необходим заголовок `Content-Type: application/json` (кроме загрузки файлов)
- Статусы ответов: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
