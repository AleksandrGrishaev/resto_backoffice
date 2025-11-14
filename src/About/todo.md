# 🚀 Sprint 7: Supabase Integration & Web Deploy (MVP)

## Обзор

Sprint 7 фокусируется на **суперсрочном MVP релизе** (2-3 недели) для личного тестирования. Цель - перевести приложение с localStorage на Supabase и развернуть web-версию онлайн.

**Выбранная стратегия:**

- ⚡ Timeline: Суперсрочно (2-3 недели)
- 🚀 Backend: Supabase (быстрый старт)
- 🧪 Audience: Личное тестирование
- 📱 Mobile: Планируем на будущее (не в этом спринте)

## Текущий статус проекта

**Готовность к релизу: 🟡 60%**

**Что работает ✅:**

- Все core features реализованы (POS, Backoffice, Orders, Shifts, Products, etc.)
- UI/UX завершен
- SyncService (Sprint 6) готов к интеграции с API
- Repository pattern частично реализован
- TypeScript strict mode + type safety

**Что нужно для MVP ⚠️:**

- ❌ Нет реальной аутентификации (только mock users)
- ❌ Нет backend API (все данные в localStorage)
- ❌ localStorage теряет данные при очистке браузера
- ❌ Нет защиты от XSS и security vulnerabilities
- ❌ Нет production deployment

## Архитектурные решения

### 1. Supabase как Backend

**Почему Supabase:**

- ✅ Быстрый старт (1-2 недели vs 8-12 недель custom API)
- ✅ Managed PostgreSQL + Auth + Storage
- ✅ Real-time subscriptions (bonus)
- ✅ Row Level Security (RLS) из коробки
- ✅ Auto-generated TypeScript types
- ✅ Free tier для MVP ($0/месяц)

**Стоимость:**

- Development: $0/месяц (Free tier)
- Production (100 orders/day): ~$25/месяц

### 2. Authentication Strategy

**Выбор: Supabase Auth вместо Firebase**

**Причины:**

- Единая платформа (Auth + DB + Storage)
- Проще интеграция с PostgreSQL
- Меньше vendor lock-in чем Firebase
- Firebase уже частично настроен, но не используется

**План:**

- Заменить mock users в `authStore` на Supabase Auth
- Email/password authentication
- Session management через Supabase SDK

### 3. Data Migration Strategy

**Фазовый подход:**

**Phase 1 (Week 1-2): Критические entities**

- `shifts` - финансовые данные (priority: critical)
- `orders` - заказы (priority: critical)
- `payments` - платежи (priority: critical)
- `products` - каталог товаров (priority: high)

**Phase 2 (Week 3): Базовые entities**

- `recipes` - рецепты
- `menu` - меню
- `tables` - столы (POS)

**Phase 3 (После MVP): Остальные**

- Storage/Inventory
- Suppliers
- Counteragents
- Preparations

### 4. Offline-First для POS

**Стратегия:**

- POS продолжает работать offline (localStorage)
- SyncService (Sprint 6) синхронизирует с Supabase
- ApiSyncStorage будет использовать Supabase API
- Conflict resolution: server-wins (для финансовых данных)

### 5. Архитектура Store + Service Layer (ВАЖНО!)

**Существующий паттерн (следуем ему!):**

```
src/stores/pos/
  orders/
    ordersStore.ts     ← Pinia store (state management)
    services.ts        ← API calls & business logic (ОБНОВЛЯЕМ ТУТ!)
    composables.ts     ← Reusable logic
    types.ts           ← TypeScript types
```

**Правильный подход для Supabase интеграции:**

```
┌─────────────────────────────────────────────┐
│     UI Component (PosMainView.vue)          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Pinia Store (ordersStore.ts)             │
│    - Reactive state (orders, loading)       │
│    - Вызывает services.ts                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Service Layer (orders/services.ts)       │ ← КЛЮЧЕВОЙ СЛОЙ
│    - Business logic                          │
│    - Supabase API calls                     │
│    - localStorage fallback (offline)        │
│    - Returns ServiceResponse<T>             │
└──────────────────┬──────────────────────────┘
                   │
                   ├─── Online ────────────────┐
                   │                            ▼
                   │              ┌──────────────────────┐
                   │              │  Supabase Client     │
                   │              │  (supabase/client)   │
                   │              └──────────┬───────────┘
                   │                         │
                   │                         ▼
                   │              ┌──────────────────────┐
                   │              │  PostgreSQL          │
                   │              │  (Supabase Cloud)    │
                   │              └──────────────────────┘
                   │
                   └─── Offline ──────────────┐
                                               ▼
                                 ┌──────────────────────┐
                                 │  localStorage        │
                                 │  + SyncService queue │
                                 └──────────────────────┘
```

**Что НЕ делаем (избыточно):**

❌ Не создаем `src/supabase/services/ordersService.ts` (дубликат!)
❌ Не создаем еще один слой абстракции
❌ Не усложняем архитектуру

**Что делаем (правильно):**

✅ Обновляем `src/stores/pos/orders/services.ts` - добавляем Supabase calls
✅ Добавляем fallback на localStorage (offline support)
✅ Используем SyncService для offline → online sync
✅ Stores остаются почти без изменений (используют обновленные services)

**Пример кода (orders/services.ts):**

```typescript
// src/stores/pos/orders/services.ts (ОБНОВЛЕННЫЙ)
import { supabase } from '@/supabase/client'
import { useSyncService } from '@/core/sync/SyncService'

class OrdersService {
  async createOrder(order: Order): Promise<ServiceResponse<Order>> {
    try {
      // 1. Try Supabase (online)
      if (navigator.onLine) {
        const { data, error } = await supabase.from('orders').insert(order).select().single()

        if (!error) {
          this.saveToCache(data) // Cache locally
          return { success: true, data }
        }
      }

      // 2. Fallback: localStorage (offline)
      const saved = this.createOrderLocal(order)

      // 3. Add to sync queue
      useSyncService().addToQueue({
        entityType: 'order',
        entityId: order.id,
        operation: 'create',
        priority: 'high',
        data: order
      })

      return { success: true, data: saved }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

## Детальный план (3 недели)

### Week 1: Authentication & Supabase Setup

#### Day 1-2: Supabase Project Setup ✅ COMPLETED

**Tasks:**

- [x] Создать Supabase проект ✅
- [x] Создать database schema для критических entities: ✅
  - `shifts` table
  - `orders` table
  - `payments` table
  - `products` table
  - `tables` table
  - `users` table (auth.users уже есть)
- [x] Setup Row Level Security (RLS) policies (базовые) ✅
- [x] Generate TypeScript types (созданы вручную) ✅
- [x] Установить @supabase/supabase-js ✅
- [x] Обновить environment config ✅

**Manual Actions (COMPLETED):**

- [x] ✅ Запустить SQL миграцию в Supabase Dashboard (src/supabase/migrations/001_initial_schema.sql)
- [x] ✅ Добавить Supabase Service Key в .env.development (обходит RLS для PIN авторизации)
- [x] ✅ Проверить подключение и таблицы через SupabaseTestView

**Files created:**

- [x] `src/supabase/config.ts` - Supabase client config ✅
- [x] `src/supabase/client.ts` - Supabase client instance ✅
- [x] `src/supabase/types.ts` - Database types ✅
- [x] `src/supabase/index.ts` - Export barrel ✅
- [x] `src/supabase/README.md` - Setup documentation ✅
- [x] `src/supabase/migrations/001_initial_schema.sql` - Database schema ✅
- [x] `.env.development` - Added Supabase credentials ✅
- [x] `.env.production` - Added Supabase credentials ✅

**Deliverable:** ✅ Supabase код готов, осталось выполнить manual actions в Dashboard

#### Day 3-4: Authentication Integration ⏭️ SKIPPED (MVP Decision)

**Decision:** Оставить PIN авторизацию для MVP, добавить Supabase Auth позже

**Rationale:**

- PIN авторизация проще и быстрее для POS (кассиры входят без интернета)
- Service Key обходит RLS policies - достаточно для личного тестирования
- Supabase Auth можно добавить в Sprint 8-9 для backoffice

**Alternative approach (implemented):**

- [x] ✅ Использовать Service Key для обхода RLS
- [x] ✅ Mock users с PIN кодами (существующая система)
- [x] ✅ cashier_id = NULL в Supabase для mock users

**Files modified:**

- [x] `src/supabase/config.ts` - Added service key support ✅
- [x] `src/config/environment.ts` - Added VITE_SUPABASE_SERVICE_KEY ✅
- [x] `.env.development` - Added service key ✅

**Deliverable:** ✅ PIN авторизация работает + Supabase интеграция готова

#### Day 5: Testing & Integration

**Tasks:**

- [ ] Тестирование login/logout
- [ ] Тестирование session persistence
- [ ] Проверка router guards с реальной auth
- [ ] Bug fixes

**Deliverable:** Auth полностью работает

---

### Week 2: Store Migration & Security

#### Day 1-2: Shifts Store → Supabase 🚧 IN PROGRESS

**Tasks:**

- [x] ✅ Создать Supabase mappers (toSupabaseInsert, toSupabaseUpdate, fromSupabase)
- [x] ✅ Обновить `shifts/services.ts` - добавить Supabase calls (с fallback на localStorage)
- [x] ✅ Исправить генерацию ID (использовать UUID вместо `shift_${timestamp}`)
- [x] ✅ Исправить cashier_id для mock users (NULL вместо невалидного UUID)
- [ ] 🔄 Тестирование shift creation + sync (в процессе)
- [ ] Тестирование shift closing + sync
- [ ] Проверка offline → online sync
- [ ] Backoffice Shift History читает из Supabase

**Files created:**

- [x] `src/stores/pos/shifts/supabaseMappers.ts` - Data conversion between app and Supabase ✅
- [x] `src/views/debug/SupabaseTestView.vue` - Test Supabase connection ✅

**Files modified:**

- [x] `src/stores/pos/shifts/services.ts` - Added Supabase integration with localStorage fallback ✅
  - `loadShifts()` - Reads from Supabase, caches in localStorage
  - `createShift()` - Writes to Supabase + localStorage
  - `updateShift()` - Updates in Supabase + localStorage

**Architecture Decision:**

- ✅ SyncService остается в localStorage (быстро, работает offline)
- ✅ Entities (shifts, orders) пишутся напрямую в Supabase через services
- ✅ Fallback на localStorage если Supabase недоступен

**Deliverable:** 🚧 Shifts интеграция почти готова (осталось тестирование)

#### Day 2-3: Orders & Payments Store → Supabase

**Tasks:**

- [ ] Обновить `orders/services.ts` - добавить Supabase calls (с fallback на localStorage)
- [ ] Обновить `payments/services.ts` - добавить Supabase calls (с fallback на localStorage)
- [ ] Add to SyncService queue для offline operations
- [ ] Тестирование create/update/delete operations
- [ ] Тестирование offline → online sync для orders/payments

**Files to modify:**

- `src/stores/pos/orders/services.ts` - Add Supabase calls with localStorage fallback
- `src/stores/pos/payments/services.ts` - Add Supabase calls with localStorage fallback
- `src/stores/pos/orders/ordersStore.ts` - Update to use modified services (if needed)
- `src/stores/pos/payments/paymentsStore.ts` - Update to use modified services (if needed)

**Deliverable:** Orders и Payments работают с Supabase

#### Day 4: Products Store → Supabase

**Tasks:**

- [ ] Обновить `productsStore/services.ts` - добавить Supabase calls (read from Supabase, write через Backoffice)
- [ ] Migration скрипт: перенести текущие mock products в Supabase (one-time)
- [ ] Тестирование CRUD operations (create/read/update/delete)
- [ ] Fallback на localStorage для offline POS

**Files to modify:**

- `src/stores/productsStore/services.ts` - Add Supabase calls (create if doesn't exist)
- `src/stores/productsStore/index.ts` - Update to use modified services

**Files to create (if needed):**

- `src/utils/migrations/migrateProductsToSupabase.ts` - One-time migration script

**Deliverable:** Products читаются из Supabase

#### Day 5: Security Fixes

**Tasks:**

- [ ] Input sanitization (DOMPurify или встроенные методы)
- [ ] XSS protection для user inputs (forms, order notes, etc.)
- [ ] Environment variables безопасность (не коммитить credentials)
- [ ] Basic CORS configuration в Supabase
- [ ] Проверка RLS policies (users видят только свои данные)

**Files to modify:**

- Все формы с user input (LoginView, Orders, Products, etc.)
- Add DOMPurify library если нужно

**Deliverable:** Базовая security на месте

---

### Week 3: Deploy & Final Testing

#### Day 1-2: Deployment Setup

**Tasks:**

- [ ] Создать production environment config
- [ ] Setup Vercel project (рекомендуется) или Netlify
- [ ] Configure environment variables в Vercel
- [ ] Setup custom domain (опционально)
- [ ] Configure build optimization (chunk splitting, minification)
- [ ] Test production build locally (`pnpm build && pnpm preview`)

**Files to create:**

- `.env.production` - Production config
- `vercel.json` - Vercel configuration (если нужно)

**Deliverable:** Deployment pipeline готов

#### Day 2: Deploy to Production

**Tasks:**

- [ ] Deploy на Vercel/Netlify
- [ ] Проверить auth работает в production
- [ ] Проверить Supabase connection работает
- [ ] Setup Vercel Analytics (опционально)
- [ ] Test на разных устройствах (desktop, tablet, mobile web)

**Deliverable:** Web app доступно онлайн

#### Day 3: E2E Testing

**Tasks:**

- [ ] Тестирование POS flow (open shift → create orders → payments → close shift)
- [ ] Тестирование Backoffice (view shift history, products, menu)
- [ ] Тестирование offline → online sync
- [ ] Тестирование на разных браузерах (Chrome, Firefox, Safari)
- [ ] Performance testing (load times, bundle size)

**Deliverable:** Все основные сценарии работают

#### Day 4-5: Bug Fixes & Documentation

**Tasks:**

- [ ] Fix critical bugs
- [ ] Написать README с инструкциями по развертыванию
- [ ] Backup/restore скрипты (на всякий случай)
- [ ] Rollback план (если что-то сломается)
- [ ] Update CLAUDE.md с информацией о Supabase integration

**Files to create/modify:**

- `README.md` - Update deployment instructions
- `CLAUDE.md` - Add Supabase section
- `backup-restore.md` - Backup instructions (опционально)

**Deliverable:** Готовый MVP для личного тестирования

---

## Что НЕ делаем в Sprint 7

❌ **Не мигрируем ВСЕ stores** - только критические (shifts, orders, payments, products)
❌ **Не настраиваем Capacitor/mobile** - фокус на web
❌ **Не делаем production-hardening** - это для личного тестирования
❌ **Не пишем unit-тесты** - можно добавить позже
❌ **Не оптимизируем performance** - достаточно работающей версии
❌ **Не настраиваем CI/CD** - manual deploy для начала
❌ **Не делаем advanced RLS policies** - только базовые
❌ **Не настраиваем monitoring/alerting** - опционально для MVP

## Deliverables (что получим в конце)

✅ **Web-приложение доступно онлайн** (Vercel URL)
✅ **Реальная Supabase аутентификация** (email/password)
✅ **Критические данные в PostgreSQL** (shifts, orders, payments, products)
✅ **Offline → online sync работает** (POS может работать без интернета)
✅ **Backoffice читает данные из Supabase**
✅ **Базовая security** (input sanitization, RLS)
✅ **Можно тестировать реальные сценарии**

## Ограничения MVP

⚠️ **Только для личного использования** - не готово для публичного релиза
⚠️ **Один ресторан** - multi-tenancy не настроено
⚠️ **Базовая security** - не прошел security audit
⚠️ **localStorage fallback** - некоторые stores еще не мигрированы
⚠️ **Manual backup** - нет автоматического backup для localStorage
⚠️ **Limited error handling** - могут быть некрытые edge cases

## Следующие шаги (после MVP)

### Sprint 8-9: Полная миграция stores (1-2 месяца)

**Цель:** Перевести все оставшиеся stores на Supabase

**Entities to migrate:**

- Recipes, Menu (2 недели)
- Storage/Inventory (2 недели)
- Suppliers, Counteragents (1-2 недели)
- Preparations, Sales (1 неделя)

**Deliverable:** Все данные в Supabase, localStorage только для cache

### Sprint 10: Production Hardening (3-4 недели)

**Цель:** Подготовить к beta-тестированию с реальными пользователями

**Tasks:**

- Security audit (penetration testing)
- Advanced RLS policies (multi-user, multi-location)
- Performance optimization (caching, lazy loading, code splitting)
- Error monitoring (Sentry integration)
- Analytics (user behavior tracking)
- Advanced conflict resolution
- Comprehensive error handling

**Deliverable:** Beta-ready приложение

### Sprint 11: Multi-tenancy (2-3 недели)

**Цель:** Поддержка нескольких ресторанов

**Tasks:**

- Database schema update (add `restaurant_id` to all tables)
- RLS policies для multi-tenancy
- Restaurant selection UI
- Data isolation testing

**Deliverable:** Можно работать с несколькими ресторанами

### Sprint 12+: Mobile App (2-3 месяца)

**Цель:** iOS и Android приложения

**Tasks:**

- Capacitor setup
- Platform-specific features (camera, push notifications)
- Mobile UI/UX optimization
- App store submission (Apple App Store, Google Play)
- Testing на реальных устройствах

**Deliverable:** Native mobile apps

## Risks & Mitigation

### Risk 1: Supabase RLS policies сложны

**Impact:** Medium
**Mitigation:** Начать с simple policies (authenticated users can access all), усложнять постепенно

### Risk 2: Offline sync может дать конфликты

**Impact:** Low (для личного тестирования)
**Mitigation:** Для MVP это acceptable, fix в Sprint 10

### Risk 3: Migration data loss

**Impact:** High
**Mitigation:** Backup localStorage перед началом миграции, rollback mechanism

### Risk 4: Deployment issues

**Impact:** Medium
**Mitigation:** Test production build locally перед deploy, use Vercel rollback

### Risk 5: Performance degradation

**Impact:** Low
**Mitigation:** Supabase fast enough для MVP, optimization в Sprint 10

## Success Metrics

**Week 1:**

- ✅ Supabase проект создан
- ✅ Аутентификация работает
- ✅ Можно создать shifts в Supabase

**Week 2:**

- ✅ Shifts, Orders, Payments, Products в Supabase
- ✅ Offline sync работает
- ✅ Basic security на месте

**Week 3:**

- ✅ Приложение развернуто онлайн
- ✅ Все основные сценарии работают
- ✅ Можно тестировать реально

## Technical Decisions

### 1. Supabase Client Architecture

**Option A: Direct Supabase calls в stores (выбрано для MVP)**

```typescript
// В каждом store прямые вызовы Supabase
const { data, error } = await supabase.from('shifts').select('*')
```

**Pros:** Простота, быстрая разработка
**Cons:** Меньше абстракции, сложнее переключиться на другой backend

**Option B: Service layer abstraction (для будущего)**

```typescript
// Service layer скрывает Supabase
const shifts = await shiftsService.getAll()
```

**Pros:** Легко переключиться на другой backend
**Cons:** Больше кода, дольше разработка

**Решение:** Начать с Option A (MVP), рефакторить в Option B (Sprint 10)

### 2. Real-time Subscriptions

**Решение:** НЕ использовать в MVP
**Причины:**

- Добавляет сложность
- Не критично для MVP
- Можно добавить в Sprint 10

**Fallback:** Polling для критических данных (shift status check)

### 3. File Storage

**Решение:** НЕ настраивать в MVP
**Причины:**

- Нет features требующих file upload в MVP
- Можно добавить позже (product images, receipts)

**Fallback:** Base64 в database (если очень нужно)

## Database Schema (Supabase)

### Table: shifts

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_number INTEGER NOT NULL,
  cashier_id UUID REFERENCES auth.users(id),
  cashier_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,

  -- Totals
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_card DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_qr DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Payment methods (JSONB)
  payment_methods JSONB NOT NULL DEFAULT '[]',

  -- Corrections & Expenses
  corrections JSONB NOT NULL DEFAULT '[]',
  expense_operations JSONB NOT NULL DEFAULT '[]',

  -- Sync info
  synced_to_account BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ,
  account_transaction_ids TEXT[],
  sync_error TEXT,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- MVP Policy: authenticated users can access all (multi-user в Sprint 11)
CREATE POLICY "Authenticated users can access shifts"
  ON shifts FOR ALL
  USING (auth.role() = 'authenticated');
```

### Table: orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL,
  table_id UUID REFERENCES tables(id),
  shift_id UUID REFERENCES shifts(id),

  type TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'paid', 'cancelled')),

  -- Items (JSONB array)
  items JSONB NOT NULL DEFAULT '[]',

  -- Totals
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Payment info
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  customer_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access orders"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated');
```

### Table: products

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ru TEXT,
  category TEXT NOT NULL,

  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),

  unit TEXT NOT NULL DEFAULT 'pcs',
  sku TEXT,
  barcode TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,

  -- Stock info
  track_stock BOOLEAN NOT NULL DEFAULT false,
  current_stock DECIMAL(10, 3) DEFAULT 0,
  min_stock DECIMAL(10, 3) DEFAULT 0,

  -- Metadata
  description TEXT,
  image_url TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products"
  ON products FOR ALL
  USING (auth.role() = 'authenticated');
```

### Table: payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  shift_id UUID REFERENCES shifts(id),

  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'qr', 'mixed')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Payment details (JSONB for flexibility)
  details JSONB NOT NULL DEFAULT '{}',

  -- References
  transaction_id TEXT,
  receipt_number TEXT,

  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access payments"
  ON payments FOR ALL
  USING (auth.role() = 'authenticated');
```

## Environment Variables

### Development (.env.development)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Platform
VITE_PLATFORM=web
VITE_USE_API=true
VITE_STORAGE_TYPE=supabase

# Debug
VITE_DEBUG_ENABLED=true
VITE_USE_MOCK_DATA=false

# Legacy (keep for backward compatibility)
VITE_USE_FIREBASE=false
```

### Production (.env.production)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Platform
VITE_PLATFORM=web
VITE_USE_API=true
VITE_STORAGE_TYPE=supabase

# Debug
VITE_DEBUG_ENABLED=false
VITE_USE_MOCK_DATA=false

# Legacy
VITE_USE_FIREBASE=false
```

## Files to Create/Modify

### New Files (Week 1-2)

**Supabase Core:**

- `src/supabase/config.ts` (~20 lines) - Supabase URL & API keys
- `src/supabase/client.ts` (~30 lines) - Supabase client singleton
- `src/supabase/types.ts` (auto-generated) - Database types from Supabase CLI

**Utilities:**

- `src/utils/security.ts` (~50 lines) - Input sanitization helpers
- `src/utils/migrations/migrateProductsToSupabase.ts` (~100 lines) - One-time migration

**Environment:**

- `.env.production` (~15 lines) - Production config
- `vercel.json` (optional, ~10 lines) - Vercel deployment config

### Modified Files (Week 1-3)

**Authentication:**

- `src/stores/auth/authStore.ts` - Replace mock auth with Supabase
- `src/stores/auth/services/session.service.ts` - Add Supabase session
- `src/views/auth/LoginView.vue` - Update login form

**Service Layer (KEY CHANGES - следуем существующей архитектуре):**

- `src/stores/pos/shifts/services.ts` - Add Supabase calls with localStorage fallback
- `src/stores/pos/orders/services.ts` - Add Supabase calls with localStorage fallback
- `src/stores/pos/payments/services.ts` - Add Supabase calls with localStorage fallback
- `src/stores/productsStore/services.ts` - Add Supabase calls (create if doesn't exist)

**Stores (minimal changes, используют обновленные services):**

- `src/stores/pos/shifts/shiftsStore.ts` - Use updated services (minimal changes)
- `src/stores/pos/orders/ordersStore.ts` - Use updated services (minimal changes)
- `src/stores/pos/payments/paymentsStore.ts` - Use updated services (minimal changes)
- `src/stores/productsStore/index.ts` - Use updated services

**Sync Layer:**

- `src/core/sync/storage/ApiSyncStorage.ts` - Use Supabase client instead of localStorage
- `src/core/sync/adapters/ShiftSyncAdapter.ts` - Sync shifts to Supabase

**Views:**

- `src/views/backoffice/sales/ShiftHistoryView.vue` - Read from Supabase
- All forms with user input - Add sanitization (LoginView, Orders, Products)

**Config:**

- `src/config/environment.ts` - Add Supabase config (VITE_SUPABASE_URL, etc.)
- `.env.development` - Add Supabase credentials

**Documentation:**

- `README.md` - Update deployment instructions
- `CLAUDE.md` - Add Supabase section

## Timeline Summary

| Week | Phase           | Deliverable                  | Status     |
| ---- | --------------- | ---------------------------- | ---------- |
| 1    | Auth & Setup    | Supabase ready, Auth works   | 🔲 Pending |
| 2    | Store Migration | Critical stores in Supabase  | 🔲 Pending |
| 3    | Deploy & Test   | Live MVP, all scenarios work | 🔲 Pending |

**Total:** 15-21 дней (3 недели)

## Критерии приемки

### Must Have ✅

- [x] **Supabase проект создан** с database schema ✅ (код готов, SQL миграция создана)
- [ ] **Аутентификация работает** (email/password login/logout) - Next: Week 1 Day 3-4
- [ ] **Shifts синхронизируются** с Supabase через SyncService - Week 2
- [ ] **Orders создаются** и сохраняются в Supabase - Week 2
- [ ] **Payments обрабатываются** и сохраняются в Supabase - Week 2
- [ ] **Products читаются** из Supabase - Week 2
- [ ] **Offline → online sync** работает для POS - Week 2
- [ ] **Backoffice читает** данные из Supabase - Week 2
- [ ] **Input sanitization** на всех формах - Week 2 Day 5
- [x] **RLS policies** настроены (базовые) ✅ (в SQL миграции)
- [ ] **Production build** работает (`pnpm build`) - Week 3
- [ ] **Deployed to Vercel** (или Netlify) - Week 3
- [ ] **Доступно онлайн** (публичный URL) - Week 3

### Should Have 🎯

- [ ] Custom domain (опционально)
- [ ] Vercel Analytics настроены
- [ ] README обновлен
- [ ] CLAUDE.md обновлен
- [ ] Backup script создан
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

### Nice to Have 💡

- [ ] Real-time subscriptions (для будущего)
- [ ] File storage настроен (product images)
- [ ] Advanced RLS policies (multi-user)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Error monitoring (Sentry)

---

## 🎯 Sprint 7 - IN PROGRESS!

План согласован, архитектурные решения приняты. Sprint 7 активен!

**Start Date:** 2024-11-13 (Updated: 2025-11-14)
**Target End Date:** 2024-12-04 (3 недели)

**Current Status (2025-11-14):**

- ✅ **Week 1 COMPLETED** - Supabase setup, connection working
- ✅ **SQL Migration DONE** - All tables created in Supabase
- ✅ **Service Key added** - RLS bypass working for PIN auth
- 🚧 **Week 2 Day 1-2 IN PROGRESS** - Shifts Store integration ~80% done

**Прогресс выполнения:**

1. ✅ Week 1: Authentication & Supabase Setup (COMPLETED)
   - Day 1-2: Supabase project setup ✅
   - Day 3-4: Authentication (SKIPPED - using PIN auth) ✅
   - Day 5: Connection testing ✅
2. 🚧 Week 2: Store Migration & Security (IN PROGRESS)
   - Day 1-2: Shifts Store → Supabase (80% done) 🚧
   - Day 2-3: Orders & Payments → Supabase ⏸️
   - Day 4: Products → Supabase ⏸️
3. 🔲 Week 3: Deploy & Testing (NOT STARTED)

**Completed Today (2025-11-14):**

- ✅ Supabase client setup and configuration
- ✅ SQL migration executed (all tables created)
- ✅ Service Key integration (bypasses RLS for PIN auth)
- ✅ SupabaseTestView created (connection + write tests)
- ✅ Supabase mappers for shifts (toSupabaseInsert, fromSupabase, etc.)
- ✅ ShiftsService updated with Supabase integration
  - loadShifts() - reads from Supabase, caches locally
  - createShift() - writes to Supabase + localStorage
  - updateShift() - updates in Supabase + localStorage
- ✅ Fixed UUID generation for shift.id (crypto.randomUUID())
- ✅ Fixed cashier_id for mock users (NULL instead of invalid UUID)

**Currently Testing:**

- 🔄 Shift creation and sync to Supabase (fixing UUID issues)
- 🔄 Verifying data appears correctly in Supabase Dashboard

**Next Actions:**

1. ✅ Finish testing shift creation → Supabase
2. Test shift closing and endShift() sync
3. Verify offline → online sync works
4. Migrate Orders Store to Supabase (similar pattern)
5. Migrate Payments Store to Supabase

**Known Issues:**

- ✅ FIXED: shift.id generation (now using crypto.randomUUID())
- ✅ FIXED: cashier_id for mock users (now NULL instead of invalid UUID string)
- 🔄 TESTING: Full shift creation flow

**Next Sprint (Sprint 8-9):** Full stores migration + Production hardening
