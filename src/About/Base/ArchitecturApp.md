# 🏢 Архитектура единого приложения управления рестораном

> **Концепция**: Одно Vue.js приложение с ролевыми интерфейсами, работающее на всех платформах

## 📋 Оглавление

- [Общая концепция](#общая-концепция)
- [Технологический стек](#технологический-стек)
- [Архитектура системы](#архитектура-системы)
- [Ролевые интерфейсы](#ролевые-интерфейсы)
- [Структура проекта](#структура-проекта)
- [План разработки](#план-разработки)
- [Деплой и развертывание](#деплой-и-развертывание)

---

## 🎯 Общая концепция

### Принцип "Одно приложение - все роли"

- **Единая кодовая база** на Vue 3 + TypeScript
- **Ролевые интерфейсы** - разные UI для разных пользователей
- **Мультиплатформенность** - работает везде: браузер, мобильные устройства, планшеты
- **Прогрессивное развитие** - начинаем с веб-версии, затем мобильные приложения

### Ключевые преимущества

✅ **DRY принцип** - одна бизнес-логика для всех интерфейсов
✅ **Быстрая разработка** - используем существующий backoffice
✅ **Простота поддержки** - один проект вместо нескольких
✅ **Консистентность** - одинаковые данные и поведение везде

---

## 🛠 Технологический стек

### Frontend

```typescript
Vue 3 (Composition API)      // Основной фреймворк
TypeScript                   // Типизация
Pinia                       // State management
Vuetify 3                   // Material Design UI
Vue Router 4                // Маршрутизация
```

### Mobile/Desktop

```typescript
Capacitor                   // Нативная обертка
@capacitor/android         // Android приложение
@capacitor/ios             // iOS приложение
@capacitor/sqlite          // Локальная БД для офлайн
```

### Backend/Data

```typescript
JSON файлы                  // Текущее хранение данных
Express.js (планируется)    // API сервер (фаза 2)
PostgreSQL (планируется)    // Основная БД (фаза 3)
```

---

## 🏗 Архитектура системы

### Текущая архитектура (Фаза 1)

```
┌─────────────────────────────────────────────────────┐
│                Vue.js Application                   │
├─────────────────┬─────────────────┬─────────────────┤
│   Admin Panel   │  Manager Panel  │    POS Panel    │
│   (Full Access) │   (Limited)     │  (Cashier)      │
├─────────────────┼─────────────────┼─────────────────┤
│                 Shared Pinia Stores                 │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Products│Menu│Storage│Suppliers│Account│POS    │ │
│  └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│                   JSON Files                        │
│  products.json │ menu.json │ orders.json │ ...      │
└─────────────────────────────────────────────────────┘
```

### Целевая архитектура (Фаза 3)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Web App    │  │  Mobile App  │  │Kitchen Display│
│   (Browser)  │  │ (iOS/Android)│  │   (Tablet)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
       ┌─────────────────▼─────────────────┐
       │            API Gateway           │
       │         (Express.js)            │
       └─────────────────┬─────────────────┘
                         │
       ┌─────────────────▼─────────────────┐
       │         PostgreSQL Database       │
       │    + Redis Cache + WebSocket     │
       └───────────────────────────────────┘
```

---

## 👥 Ролевые интерфейсы

### 👨‍💼 Администратор

**Полный доступ к системе**

- ✅ Весь существующий backoffice
- ✅ Управление пользователями и ролями
- ✅ Финансовые отчеты и аналитика
- ✅ Настройки системы
- ✅ POS функционал (при необходимости)

**Интерфейс**: Desktop-oriented, полные таблицы, детальная аналитика

### 👩‍💼 Менеджер

**Операционное управление**

- ✅ Управление меню и ценами
- ✅ Контроль складов и поставщиков
- ✅ Работа с клиентами и скидками
- ✅ Дневные отчеты по продажам
- ❌ Финансовые настройки
- ❌ Управление пользователями

**Интерфейс**: Упрощенный backoffice + POS доступ

### 🧑‍💻 Кассир

**Продажи и обслуживание**

- ✅ POS интерфейс (основной режим)
- ✅ Работа с клиентами
- ✅ Применение скидок и акций
- ✅ Просмотр дневных продаж
- ❌ Настройки меню/цен
- ❌ Управление складом

**Интерфейс**: Touch-friendly POS, крупные кнопки, быстрые действия

### 👨‍🍳 Кухня/Бар

**Обработка заказов**

- ✅ Kitchen Display System
- ✅ Статусы заказов
- ✅ Управление очередью
- ✅ Контроль ингредиентов
- ❌ Цены и финансы
- ❌ Настройки системы

**Интерфейс**: Крупные карточки заказов, таймеры, цветовые индикаторы

---

## 📁 Структура проекта

### Новые модули (добавляем к существующим)

```
src/
├── stores/
│   ├── auth/                    # 🆕 Авторизация и роли
│   │   ├── authStore.ts
│   │   ├── rolesStore.ts
│   │   └── types.ts
│   │
│   ├── pos/                     # 🆕 POS функционал
│   │   ├── posStore.ts          # Основная касса
│   │   ├── customersStore.ts    # Клиенты
│   │   ├── discountsStore.ts    # Скидки и лояльность
│   │   ├── salesStore.ts        # Продажи и отчеты
│   │   └── types.ts
│   │
│   └── [existing stores]        # Существующие модули
│
├── views/
│   ├── auth/
│   │   ├── LoginView.vue        # 🆕 Единый вход
│   │   └── RoleSelector.vue     # 🆕 Выбор роли
│   │
│   ├── dashboards/              # 🆕 Ролевые дашборды
│   │   ├── AdminDashboard.vue
│   │   ├── ManagerDashboard.vue
│   │   ├── CashierDashboard.vue
│   │   └── KitchenDashboard.vue
│   │
│   ├── pos/                     # 🆕 POS интерфейс
│   │   ├── PosMain.vue          # Главная касса
│   │   ├── components/
│   │   │   ├── OrderPanel.vue
│   │   │   ├── MenuGrid.vue
│   │   │   ├── CustomerPanel.vue
│   │   │   ├── PaymentPanel.vue
│   │   │   └── DiscountPanel.vue
│   │   └── reports/
│   │       ├── DailySales.vue
│   │       └── ShiftReport.vue
│   │
│   └── [existing views]         # Существующие модули
│
├── composables/
│   ├── auth/                    # 🆕 Авторизация
│   │   ├── useAuth.ts
│   │   ├── useRoles.ts
│   │   └── usePermissions.ts
│   │
│   ├── pos/                     # 🆕 POS логика
│   │   ├── usePos.ts
│   │   ├── useCustomers.ts
│   │   ├── useDiscounts.ts
│   │   └── useInventorySync.ts
│   │
│   └── [existing composables]
│
├── router/
│   ├── index.ts                 # Основной роутер
│   ├── guards.ts                # 🆕 Проверка ролей
│   └── routes/                  # 🆕 Маршруты по ролям
│       ├── adminRoutes.ts
│       ├── managerRoutes.ts
│       ├── cashierRoutes.ts
│       └── kitchenRoutes.ts
│
└── utils/
    ├── pos/                     # 🆕 POS утилиты
    │   ├── orderCalculations.ts
    │   ├── discountEngine.ts
    │   ├── receiptPrinter.ts
    │   └── inventorySync.ts
    │
    └── [existing utils]
```

### JSON файлы (расширяем существующие)

```
data/
├── users.json                  # 🆕 Пользователи и роли
├── customers.json              # 🆕 Клиенты
├── loyalty_programs.json       # 🆕 Программы лояльности
├── discounts.json              # 🆕 Скидки и акции
├── pos_orders.json             # 🆕 Заказы из POS
├── daily_sales.json            # 🆕 Дневные продажи
│
└── [existing json files]       # Существующие файлы
```

---

## 🚀 План разработки

### Фаза 1: POS в backoffice (2-3 недели)

**Цель**: Добавить кассовый функционал в существующее приложение

**Задачи**:

- [ ] Создать систему ролей и авторизации
- [ ] Разработать POS stores (orders, customers, discounts)
- [ ] Создать POS интерфейс с ролевыми дашбордами
- [ ] Интегрировать со складскими остатками (автосписание)
- [ ] Добавить систему лояльности и скидок
- [ ] Создать отчеты по продажам

**Результат**: Полнофункциональная касса в браузере

### Фаза 2: Мобильные приложения (1-2 недели)

**Цель**: Обернуть приложение в Capacitor и собрать мобильные версии

**Задачи**:

- [ ] Установить и настроить Capacitor
- [ ] Адаптировать UI для touch-устройств
- [ ] Добавить офлайн режим (SQLite)
- [ ] Настроить синхронизацию данных
- [ ] Собрать APK/IPA файлы

**Результат**: Нативные мобильные приложения для касс

### Фаза 3: API и масштабирование (4-6 недель)

**Цель**: Создать полноценную API и перейти на PostgreSQL

**Задачи**:

- [ ] Создать Express.js API сервер
- [ ] Мигрировать с JSON на PostgreSQL
- [ ] Добавить WebSocket для real-time обновлений
- [ ] Создать Kitchen Display System
- [ ] Добавить интеграции с внешними сервисами
- [ ] Настроить облачный деплой

**Результат**: Масштабируемая система для сети ресторанов

---

## 🖥 Деплой и развертывание

### Веб-версия

```bash
# Разработка
npm run dev                 # Локальная разработка
npm run build              # Продакшн сборка

# Деплой
npm run build
# Загружаем dist/ на веб-сервер
```

### Мобильные приложения

```bash
# Настройка Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npx cap init

# Сборка
npm run build
npx cap sync

# Android
npx cap open android
# Собираем в Android Studio

# iOS
npx cap open ios
# Собираем в Xcode
```

### Настройка устройств

```typescript
// capacitor.config.ts
export default {
  appId: 'com.restaurant.management',
  appName: 'Restaurant Management',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    SQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase'
    },
    Printer: {
      enabled: true
    }
  }
}
```

---

## 📱 Устройства и использование

### Рекомендуемые устройства

- **Admin/Manager**: Desktop/Laptop (полный backoffice)
- **Cashier**: Планшет 10" или мобильное устройство (POS)
- **Kitchen**: Планшет 12"+ или монитор (Kitchen Display)
- **Mobile**: Смартфон (быстрые операции)

### Сценарии использования

1. **Менеджер утром**: Проверяет остатки → Корректирует меню → Настраивает акции
2. **Кассир**: Работает только в POS режиме → Обслуживает клиентов
3. **Повар**: Видит только заказы → Обновляет статусы
4. **Админ**: Полный доступ ко всем функциям

---

## 🔒 Безопасность и доступы

### Система ролей

```typescript
// Пример конфигурации ролей
const ROLE_PERMISSIONS = {
  admin: ['*'], // Все разрешения
  manager: [
    'view_dashboard',
    'manage_products',
    'manage_suppliers',
    'manage_storage',
    'view_reports',
    'use_pos'
  ],
  cashier: ['use_pos', 'manage_customers', 'apply_discounts', 'view_daily_sales'],
  kitchen_staff: ['view_orders', 'update_order_status', 'manage_ingredients']
}
```

### Защита маршрутов

```typescript
// Пример guard'а
function requirePermission(permission: Permission) {
  return (to, from, next) => {
    if (authStore.hasPermission(permission)) {
      next()
    } else {
      next('/unauthorized')
    }
  }
}
```

---

## 📈 Будущие возможности

### Интеграции

- **Платежные системы**: Stripe, PayPal, местные банки
- **Доставка**: Grab, GoJek интеграции
- **Аналитика**: Google Analytics, собственная BI
- **Маркетинг**: Email/SMS рассылки, push-уведомления

### Дополнительные модули

- **CRM**: Работа с корпоративными клиентами
- **HR**: Управление персоналом и графиками
- **Бухгалтерия**: Интеграция с 1С, налоговая отчетность
- **Франчайзинг**: Мультиточечное управление

---

## 🤝 Команда и роли

### Разработка

- **Frontend Developer**: Vue.js, TypeScript, UI/UX
- **Backend Developer**: Node.js, PostgreSQL, API design
- **Mobile Developer**: Capacitor, нативная оптимизация
- **DevOps**: CI/CD, деплой, мониторинг

### Бизнес

- **Product Owner**: Требования, приоритеты
- **QA Engineer**: Тестирование, автотесты
- **Restaurant Manager**: Пользовательские тесты
- **System Administrator**: Настройка, поддержка

---

_Документ обновлен: 10 сентября 2025 г._
_Версия архитектуры: 1.0_
