# Stage 2: Базовая авторизация и тестирование Firebase

## Текущий прогресс

- ✅ Базовая структура проекта
- ✅ Firebase конфигурация
- ✅ Базовые сервисы и утилиты
- ✅ Типы данных

## План работ на Stage 2

### 2.1 Роутинг и Guards

- [ ] Базовая настройка Vue Router
  - Layouts: AuthLayout, MainLayout, EmptyLayout
  - Routes: login, test-connection, dashboard, 404
- [ ] Auth Guard
  - Проверка авторизации
  - Редирект на логин
  - Проверка прав доступа

### 2.2 Layouts

- [ ] AuthLayout
  - Простой layout для страницы входа
- [ ] MainLayout
  - Базовый layout для авторизованных страниц
- [ ] EmptyLayout
  - Для технических страниц

### 2.3 Тестовая страница Firebase

- [ ] TestConnectionView
  - Проверка подключения к Firebase
  - Тест работы с коллекцией users
  - Отображение статуса подключения

### 2.4 Auth Store и сервисы

- [ ] AuthService
  - Вход по PIN
  - Проверка прав
  - Управление сессией
- [ ] AuthStore
  - Состояние авторизации
  - Действия входа/выхода
  - Persistence состояния

### 2.5 Компоненты авторизации

- [ ] PinCodeInput
  - Ввод PIN-кода
  - Валидация
  - Обработка ошибок
- [ ] LoginForm
  - Форма входа
  - Интеграция с AuthService
  - Обработка состояний

## Порядок реализации:

1. Роутер и Guards

```typescript
// Основные маршруты
const routes = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        component: LoginView
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'test-connection',
        component: TestConnectionView
      }
    ]
  }
]
```

2. AuthStore

```typescript
export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null,
    isAuthenticated: false
  }),
  actions: {
    async login(pin: string) {
      // Логика входа
    }
  }
})
```

3. Тестовая страница

```typescript
async function testFirebase() {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    // Проверка подключения
  } catch (error) {
    // Обработка ошибок
  }
}
```

## Критерии завершения Stage 2:

- [ ] Работает вход по PIN
- [ ] Guards корректно защищают маршруты
- [ ] Успешное подключение к Firebase
- [ ] Работает тестовая страница
- [ ] Базовая навигация работает корректно

## Следующие шаги:

- Разработка основного интерфейса
- Управление меню
- Настройка системы
