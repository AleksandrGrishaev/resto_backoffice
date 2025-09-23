# Kitchen App - Архитектурная сводка

## Обзор системы

Kitchen App - **единое приложение** с множественными интерфейсами и режимами работы:

### **Архитектурный подход: Single Repository + Role-based UI**

- **Технологии:** Vue 3 + Vuetify + Pinia + Vite + Capacitor
- **Принцип:** Один код → множественные варианты развертывания
- **Интерфейсы:** Backoffice (админ) + POS (касса) в одном приложении
- **Развертывание:** Web app (браузер) + Mobile app (Capacitor)

### **Режимы работы:**

#### **📱 Mobile App** (через Capacitor)

- **POS роли:** Кассиры, официанты → **Offline-first режим**
- **Admin роли:** Менеджеры, администраторы → **Online режим**
- **Функции:** Полный доступ ко всем возможностям

#### **🌐 Web App** (через браузер)

- **Все роли:** Работают через веб-интерфейс
- **Режим:** Преимущественно online
- **Функции:** Тот же код, адаптированный для браузера

---

## Преимущества Single Repository подхода

### **Для разработки:**

- 🎯 **Единая кодовая база** - нет дублирования логики
- 🤖 **AI-friendly** - весь контекст в одном месте для ИИ помощника
- 🔄 **Shared components** - переиспользование UI компонентов
- 📊 **Shared stores** - единая система управления состоянием
- ⚡ **Быстрые итерации** - изменения сразу везде

### **Для пользователей:**

- 📱 **Нативный опыт** на мобильных устройствах
- 💻 **Веб-доступ** для административных задач
- 🎨 **Консистентный UX** - одинаковые компоненты и логика
- 🔄 **Синхронные обновления** - нет различий между версиями

### **Для бизнеса:**

- 💰 **Экономия ресурсов** - одна команда, одна кодовая база
- 🚀 **Быстрый time-to-market** - нет необходимости поддерживать монорепо
- 🛠️ **Простая поддержка** - исправления и улучшения в одном месте

---

## Структура проекта

```
kitchen-app/
├── src/
│   ├── views/                    # UI компоненты по функциональности
│   │   ├── backoffice/          # Административные интерфейсы
│   │   │   ├── accounts/        # Управление счетами
│   │   │   ├── counteragents/   # Управление поставщиками
│   │   │   ├── menu/           # Управление меню
│   │   │   ├── products/       # Каталог продуктов
│   │   │   ├── storage/        # Управление складом
│   │   │   └── reports/        # Отчеты и аналитика
│   │   └── pos/                # POS интерфейсы
│   │       ├── tables/         # Управление столами
│   │       ├── orders/         # Прием заказов
│   │       ├── menu/           # Меню для заказов
│   │       └── payments/       # Обработка платежей
│   │
│   ├── stores/                  # Pinia stores (единые для всех ролей)
│   │   ├── account/            # Счета и транзакции
│   │   ├── counteragents/      # Поставщики
│   │   ├── menu/              # Меню с ценами и рецептами
│   │   ├── pos/               # POS-специфичные stores
│   │   │   ├── orders/        # Заказы (offline-first)
│   │   │   ├── tables/        # Столы и их состояния
│   │   │   └── payments/      # Платежи и касса
│   │   └── shared/            # Общие stores и утилиты
│   │
│   ├── components/             # Переиспользуемые UI компоненты
│   │   ├── atoms/             # Базовые компоненты
│   │   ├── molecules/         # Составные компоненты
│   │   └── organisms/         # Сложные блоки
│   │
│   ├── router/                # Роутинг с role-based доступом
│   ├── composables/           # Переиспользуемая логика
│   ├── services/              # Бизнес-логика и API интеграции
│   ├── repositories/          # Слой доступа к данным (для POS)
│   └── utils/                 # Утилиты и хелперы
│
├── capacitor.config.ts         # Конфигурация мобильного приложения
├── vite.config.ts             # Конфигурация веб-сборки
└── package.json               # Единые зависимости
```

---

## Role-based Architecture

### **Система ролей:**

```typescript
type UserRole = 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'

interface User {
  id: string
  name: string
  role: UserRole
  permissions: string[]
}
```

### **Роутинг по ролям:**

```typescript
// router/index.ts
const routes = [
  {
    path: '/admin',
    component: BackofficeLayout,
    meta: {
      roles: ['admin', 'manager'],
      requiresOnline: true
    },
    children: [
      { path: 'menu', component: () => import('@/views/backoffice/menu/MenuView.vue') },
      { path: 'products', component: () => import('@/views/backoffice/products/ProductsView.vue') },
      { path: 'reports', component: () => import('@/views/backoffice/reports/ReportsView.vue') }
    ]
  },
  {
    path: '/pos',
    component: PosLayout,
    meta: {
      roles: ['cashier', 'waiter'],
      supportsOffline: true
    },
    children: [
      { path: 'orders', component: () => import('@/views/pos/orders/OrdersView.vue') },
      { path: 'tables', component: () => import('@/views/pos/tables/TablesView.vue') },
      { path: 'menu', component: () => import('@/views/pos/menu/MenuView.vue') }
    ]
  }
]
```

### **Адаптивное поведение stores:**

```typescript
// stores/ordersStore.ts
export const useOrdersStore = defineStore('orders', () => {
  const { userRole, isOfflineCapable } = useAuth()
  const { isMobile } = usePlatform()

  // Определяем стратегию хранения в зависимости от роли и платформы
  const persistenceStrategy = computed(() => {
    // POS роли в мобильном приложении = offline-first
    if (isMobile.value && ['cashier', 'waiter'].includes(userRole.value)) {
      return new OfflineFirstPersistence()
    }
    // Админ роли = online-first
    return new OnlineFirstPersistence()
  })

  // Единые методы для всех ролей
  async function loadOrders() {
    const result = await persistenceStrategy.value.findAll()
    if (result.success) {
      orders.value = result.data || []
    }
  }

  return { orders, loadOrders }
})
```

---

## Архитектурные паттерны

### **Для Backoffice функций (Store + Service):**

```typescript
// Простой паттерн для административных функций
UI Components → Pinia Store → Service Layer → API/localStorage
```

**Принципы:**

- ✅ Online-first подход
- ✅ Простота разработки и отладки
- ✅ Легкий переход localStorage → API
- ✅ Синхронные операции с async интерфейсами

### **Для POS функций (Store + Repository + Sync):**

```typescript
// Сложный паттерн для критических операций
UI Components → Pinia Store → Repository Interface → Local/API Repository + Sync Service
```

**Принципы:**

- ✅ Offline-first подход
- ✅ Мгновенный отклик UI
- ✅ Автоматическая синхронизация в фоне
- ✅ Конфликт-резолюшн стратегии

---

## Система развертывания

### **Build конфигурации:**

```json
// package.json
{
  "scripts": {
    "dev": "vite --mode development",
    "build:web": "vite build --mode web",
    "build:mobile": "vite build --mode mobile && cap sync",
    "preview:web": "vite preview",
    "ios": "cap run ios",
    "android": "cap run android",
    "sync": "cap sync"
  }
}
```

### **Environment-based features:**

```typescript
// .env.web
VITE_PLATFORM = web
VITE_USE_API = true
VITE_ENABLE_OFFLINE = false

// .env.mobile
VITE_PLATFORM = mobile
VITE_USE_API = false
VITE_ENABLE_OFFLINE = true
```

### **Платформо-зависимая логика:**

```typescript
// composables/usePlatform.ts
export function usePlatform() {
  const platform = import.meta.env.VITE_PLATFORM as 'web' | 'mobile'
  const isMobile = computed(() => platform === 'mobile')
  const isWeb = computed(() => platform === 'web')
  const offlineEnabled = import.meta.env.VITE_ENABLE_OFFLINE === 'true'

  return { platform, isMobile, isWeb, offlineEnabled }
}

// Использование в компонентах
const { isMobile, offlineEnabled } = usePlatform()

// Условная инициализация функций
if (isMobile.value && offlineEnabled) {
  await initializeOfflineSync()
}
```

---

## Stores Architecture

### **Существующие хранилища:**

```
src/stores/
├── account/              # Счета и транзакции (Backoffice)
├── counteragents/        # Поставщики (Backoffice)
├── menu/                # Меню и рецепты (Shared)
├── preparation/          # Полуфабрикаты (Backoffice)
├── productsStore/        # Каталог продуктов (Shared)
├── recipes/             # Рецепты (Backoffice)
├── storage/             # Складские остатки (Backoffice)
├── supplier_2/          # Заказы поставщикам (Backoffice)
├── pos/                 # POS-специфичные stores
│   ├── orders/          # Заказы и счета (Offline-first)
│   ├── tables/          # Столы и их состояния
│   ├── payments/        # Платежи и касса
│   └── menu/           # Кэшированное меню для POS
└── shared/              # Общие stores и координация
```

### **Планируемые хранилища:**

- **auth/** - Аутентификация и управление ролями
- **cashier/** - Продажи и кассовые операции
- **finance/** - Финансовая аналитика и P&L
- **kitchen/** - Интеграция с кухней (заказы, статусы)
- **shifts/** - Управление сменами персонала

### **Универсальный паттерн Store:**

```typescript
// Базовый шаблон для любого store
export const useEntityStore = defineStore('entity', () => {
  // State
  const entities = ref<Entity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Платформо-зависимая инициализация
  const { persistenceLayer } = usePersistence('entity')

  // Computed
  const activeEntities = computed(() => entities.value.filter(e => e.isActive))

  // Actions - универсальные для всех платформ
  async function loadEntities(): Promise<boolean> {
    try {
      loading.value = true
      error.value = null

      const result = await persistenceLayer.findAll()
      if (result.success) {
        entities.value = result.data || []
        return true
      } else {
        error.value = result.error || 'Failed to load entities'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    entities,
    loading,
    error,
    activeEntities,
    loadEntities
  }
})
```

---

## Persistence Strategies

### **Адаптивный слой персистентности:**

```typescript
// composables/usePersistence.ts
export function usePersistence<T>(entityType: string) {
  const { userRole } = useAuth()
  const { isMobile, offlineEnabled } = usePlatform()

  const persistenceLayer = computed(() => {
    // POS роли с поддержкой offline
    if (['cashier', 'waiter'].includes(userRole.value) && offlineEnabled) {
      return new OfflineFirstRepository<T>(entityType)
    }

    // Admin роли - online first
    if (['admin', 'manager'].includes(userRole.value)) {
      return new OnlineFirstRepository<T>(entityType)
    }

    // Fallback - local storage
    return new LocalStorageRepository<T>(entityType)
  })

  return { persistenceLayer }
}
```

### **Стратегии хранения:**

#### **Online-first (для Backoffice):**

```
API Request → Success: Update Local Cache
           → Failure: Show Error + Use Cache if available
```

#### **Offline-first (для POS):**

```
Local Storage → Always works (instant UI)
             → Queue for Sync → Background API calls
```

#### **Hybrid (для Shared данных):**

```
Check Online → Online: API + Update Cache
            → Offline: Use Cache + Queue updates
```

---

## Service Response Pattern

### **Стандартный формат:**

```typescript
interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    source: 'local' | 'api' | 'cache'
    version?: string
    platform?: 'web' | 'mobile'
  }
}
```

---

## Bundle Optimization

### **Lazy loading по ролям:**

```typescript
// router/guards.ts
router.beforeEach(async to => {
  const { userRole } = useAuth()

  // Загружаем только нужные модули для роли
  if (to.path.startsWith('/admin') && userRole.value === 'admin') {
    await import('@/stores/backoffice') // Lazy load admin stores
  }

  if (to.path.startsWith('/pos') && ['cashier', 'waiter'].includes(userRole.value)) {
    await import('@/stores/pos') // Lazy load POS stores
  }
})
```

### **Code splitting:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          backoffice: ['./src/views/backoffice'],
          pos: ['./src/views/pos'],
          shared: ['./src/components', './src/utils']
        }
      }
    }
  }
})
```

---

## Заключение

### **Почему Single Repository подход оптимален:**

- 🎯 **Простота разработки** - один проект, одна архитектура
- 🤖 **AI-friendly** - весь контекст доступен в одной сессии
- 🔄 **Переиспользование кода** - компоненты, stores, логика
- 📱 **Гибкость развертывания** - веб + мобайл из одного кода
- 💰 **Экономичность** - нет затрат на поддержку монорепо
- ⚡ **Быстрые итерации** - изменения сразу везде

### **Адаптивность системы:**

- 👨‍💼 **Admin роли** → Online-first, rich UI, полный функционал
- 👨‍🍳 **POS роли** → Offline-first, streamlined UI, критические функции
- 📱 **Mobile** → Нативный опыт, offline capabilities
- 🌐 **Web** → Полный доступ, administrative features

**Эта архитектура обеспечивает максимальную гибкость при минимальной сложности!** 🚀
