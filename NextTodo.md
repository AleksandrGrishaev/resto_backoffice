---

## Investigation: Inventory Shortage INV-670080 (Mar 9, 2026)

**Full report**: `src/About/docs/reports/inventory-shortage-report-2026-03-09.md`

### Key Findings

- **Total shortage**: Rp 5,433,286 across 93 items (10-day period Feb 27 – Mar 9)
- **Top 10 = 66%** of total (Rp 3,580,983)

### Root Cause Categories

**A. Missing recipes (system, 4 products, ~Rp 1.6M)**:
- Udang → "Shrimp thawed 30pc" prep has NO recipe (zero write-offs ever!)
- Cumi → "Tom yam seafood pack" prep, no recipe_components
- Salmon → "Salmon portion 30g" prep, no recipe_components
- SourDough → "Slice SourDough bread" prep, no recipe_components

**B. Operational loss (real, 5 products, ~Rp 1.5M)**:
- Ayam Filet dada: verified ✅ — all write-offs match, shortage is real
- Yogurt, Telur, Fresh milk, Croissant: have recipes but physical < expected

**C. Reconciliation bug (data integrity)**:
- Fresh milk: 11 negative batches
- Salmon: 1 negative batch

### Action Items

- [ ] **CRITICAL**: Chef must create 4 missing recipes (Udang, Cumi, Salmon, SourDough)
- [ ] Review chicken breast prep — actual usage vs recipe quantity
- [ ] Fix reconciliation bug causing negative batches
- [ ] Set up weekly inventory for top-shortage items
- [ ] Audit ALL preparations for missing recipe linkages

---

# Sprint: Loyalty Program (Two-Block System)

> Спецификация: `src/About/Frontend/LOYALTY_SPEC.md`
> Техническая реализация: `src/About/Frontend/BACKOFFICE_ROADMAP.md` (Модуль 2)
> Все на DEV (`mcp__supabase_dev__*`), PROD — позже отдельным шагом

---

## Фаза 1: Миграции БД (DEV)

Следующий номер миграции: **174**. Все миграции применяем через `mcp__supabase_dev__apply_migration`.

> Миграции 167-173 заняты (Watchdog, Consumption Analytics, Entity Change Log, Cost fixes, RLS fixes).

### 1.1 Migration 174: customers

**Файл:** `src/supabase/migrations/174_create_customers.sql`

```sql
-- Migration: 170_create_customers
-- Description: Customer profiles for digital loyalty (Block 2)

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  telegram_id     TEXT UNIQUE,
  telegram_username TEXT,
  phone           TEXT,
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  tier            TEXT NOT NULL DEFAULT 'member' CHECK (tier IN ('member', 'regular', 'vip')),
  tier_updated_at TIMESTAMPTZ,
  loyalty_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_90d       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  average_check   NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_visit_at  TIMESTAMPTZ,
  last_visit_at   TIMESTAMPTZ,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_telegram ON customers(telegram_id);
CREATE INDEX idx_customers_token ON customers(token);
CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_phone ON customers(phone);

CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON customers TO service_role;
```

**Проверка:** `SELECT count(*) FROM customers;` -- должно быть 0

### 1.2 Migration 175: stamp_cards

**Файл:** `src/supabase/migrations/175_create_stamp_cards.sql`

```sql
-- Migration: 175_create_stamp_cards
-- Description: Physical stamp cards (Block 1)

CREATE TABLE stamp_cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number  TEXT UNIQUE NOT NULL,
  customer_id  UUID REFERENCES customers(id),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired')),
  cycle        INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_stamp_cards_number ON stamp_cards(card_number);
CREATE INDEX idx_stamp_cards_status ON stamp_cards(status);

GRANT ALL ON stamp_cards TO service_role;
```

### 1.3 Migration 176: stamp_entries

**Файл:** `src/supabase/migrations/176_create_stamp_entries.sql`

```sql
-- Migration: 176_create_stamp_entries
-- Description: Individual stamp records with expiration

CREATE TABLE stamp_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID NOT NULL REFERENCES stamp_cards(id),
  order_id     UUID REFERENCES orders(id),
  order_amount NUMERIC(12,2) NOT NULL,
  stamps       INTEGER NOT NULL,
  cycle        INTEGER NOT NULL DEFAULT 1,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamp_entries_card ON stamp_entries(card_id);
CREATE INDEX idx_stamp_entries_expires ON stamp_entries(expires_at);

GRANT ALL ON stamp_entries TO service_role;
```

### 1.4 Migration 177: loyalty_points

**Файл:** `src/supabase/migrations/177_create_loyalty_points.sql`

```sql
-- Migration: 177_create_loyalty_points
-- Description: Points with individual expiration dates for FIFO redemption

CREATE TABLE loyalty_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount      NUMERIC(12,2) NOT NULL,
  remaining   NUMERIC(12,2) NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('cashback', 'conversion', 'adjustment', 'bonus')),
  order_id    UUID REFERENCES orders(id),
  description TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX idx_loyalty_points_expires ON loyalty_points(expires_at);
CREATE INDEX idx_loyalty_points_active ON loyalty_points(customer_id, remaining) WHERE remaining > 0;

GRANT ALL ON loyalty_points TO service_role;
```

### 1.5 Migration 178: loyalty_transactions

**Файл:** `src/supabase/migrations/178_create_loyalty_transactions.sql`

```sql
-- Migration: 178_create_loyalty_transactions
-- Description: Full log of all loyalty operations (cashback, redemption, expiration, etc.)

CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  type          TEXT NOT NULL CHECK (type IN ('cashback', 'redemption', 'conversion', 'adjustment', 'expiration')),
  amount        NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  order_id      UUID REFERENCES orders(id),
  description   TEXT,
  performed_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_tx_customer ON loyalty_transactions(customer_id);

GRANT ALL ON loyalty_transactions TO service_role;
```

### 1.6 Migration 179: loyalty_settings

**Файл:** `src/supabase/migrations/179_create_loyalty_settings.sql`

```sql
-- Migration: 179_create_loyalty_settings
-- Description: Settings for both Block 1 (stamps) and Block 2 (points/tiers)

CREATE TABLE loyalty_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Block 1: Stamps
  stamps_per_cycle      INTEGER NOT NULL DEFAULT 15,
  stamp_threshold       NUMERIC(12,2) NOT NULL DEFAULT 80000,
  stamp_lifetime_days   INTEGER NOT NULL DEFAULT 90,
  stamp_rewards         JSONB NOT NULL DEFAULT '[
    {"stamps": 5,  "category": "drinks",     "max_discount": 40000},
    {"stamps": 10, "category": "breakfast",   "max_discount": 75000},
    {"stamps": 15, "category": "any",         "max_discount": 100000}
  ]'::jsonb,
  -- Block 2: Points
  points_lifetime_days  INTEGER NOT NULL DEFAULT 90,
  conversion_bonus_pct  NUMERIC(5,2) NOT NULL DEFAULT 10,
  tier_window_days      INTEGER NOT NULL DEFAULT 90,
  max_tier_degradation  INTEGER NOT NULL DEFAULT 1,
  tiers                 JSONB NOT NULL DEFAULT '[
    {"name": "member",  "cashback_pct": 5,  "spending_threshold": 0},
    {"name": "regular", "cashback_pct": 7,  "spending_threshold": 1500000},
    {"name": "vip",     "cashback_pct": 10, "spending_threshold": 3000000}
  ]'::jsonb,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO loyalty_settings DEFAULT VALUES;

GRANT ALL ON loyalty_settings TO service_role;
```

### 1.7 Migration 180: orders extensions

**Файл:** `src/supabase/migrations/180_orders_loyalty_columns.sql`

```sql
-- Migration: 180_orders_loyalty_columns
-- Description: Add customer_id and stamp_card_id to orders for loyalty tracking

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stamp_card_id UUID REFERENCES stamp_cards(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stamp_card ON orders(stamp_card_id);
```

### Проверка Фазы 1

```sql
-- Все таблицы созданы:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'stamp_cards', 'stamp_entries',
                     'loyalty_points', 'loyalty_transactions', 'loyalty_settings');
-- Ожидаем: 6 строк

-- Настройки по умолчанию:
SELECT stamps_per_cycle, stamp_threshold, points_lifetime_days,
       jsonb_array_length(tiers) as tier_count
FROM loyalty_settings;
-- Ожидаем: 15, 80000, 90, 3

-- orders расширен:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('customer_id', 'stamp_card_id', 'guest_count');
-- Ожидаем: 3 колонки
```

---

## Фаза 2: RPC функции (DEV)

Каждая функция: сначала файл в `src/supabase/functions/`, потом `apply_migration` на DEV.

### 2.1 RPC: `add_stamps`

**Файл миграции:** `src/supabase/migrations/181_rpc_add_stamps.sql`
**Файл функции:** `src/supabase/functions/add_stamps.sql`

Логика:

1. Найти карточку по номеру (status = active)
2. Посчитать штампы: `floor(order_amount / stamp_threshold)`
3. Если 0 — вернуть success без изменений
4. Вставить `stamp_entries` с `expires_at = now() + lifetime`
5. Подсчитать все активные штампы текущего цикла (не просроченные)
6. Проверить доступные награды
7. Если total >= stamps_per_cycle — увеличить cycle

**Проверка:**

```sql
-- Создать тестовую карточку
INSERT INTO stamp_cards (card_number) VALUES ('TEST001');

-- Добавить штамп (чек 160000 = 2 штампа)
SELECT add_stamps('TEST001', NULL, 160000);
-- Ожидаем: success=true, stamps_added=2, total_stamps=2

-- Проверить запись
SELECT * FROM stamp_entries WHERE card_id = (SELECT id FROM stamp_cards WHERE card_number = 'TEST001');

-- Очистить тест
DELETE FROM stamp_entries WHERE card_id = (SELECT id FROM stamp_cards WHERE card_number = 'TEST001');
DELETE FROM stamp_cards WHERE card_number = 'TEST001';
```

### 2.2 RPC: `apply_cashback`

**Файл миграции:** `src/supabase/migrations/182_rpc_apply_cashback.sql`
**Файл функции:** `src/supabase/functions/apply_cashback.sql`

Логика:

1. Найти клиента по ID
2. Найти cashback_pct для его уровня из loyalty_settings.tiers
3. Посчитать баллы: `round(order_amount * cashback_pct / 100)`
4. Вставить в loyalty_points с expires_at
5. Обновить customers: balance, total_spent, total_visits, last_visit_at, average_check
6. Записать в loyalty_transactions

**Проверка:**

```sql
-- Тестовый клиент
INSERT INTO customers (name, telegram_id) VALUES ('Test User', 'test_tg_123');

-- Cashback 5% от 138000
SELECT apply_cashback(
  (SELECT id FROM customers WHERE telegram_id = 'test_tg_123'),
  NULL, 138000
);
-- Ожидаем: success=true, cashback=6900, cashback_pct=5, tier=member

-- Очистить тест
DELETE FROM loyalty_transactions WHERE customer_id = (SELECT id FROM customers WHERE telegram_id = 'test_tg_123');
DELETE FROM loyalty_points WHERE customer_id = (SELECT id FROM customers WHERE telegram_id = 'test_tg_123');
DELETE FROM customers WHERE telegram_id = 'test_tg_123';
```

### 2.3 RPC: `redeem_points`

**Файл миграции:** `src/supabase/migrations/183_rpc_redeem_points.sql`
**Файл функции:** `src/supabase/functions/redeem_points.sql`

Логика:

1. Проверить баланс >= amount
2. FIFO: выбрать loyalty_points WHERE remaining > 0 ORDER BY expires_at ASC
3. Уменьшать remaining пока не спишется вся сумма
4. Обновить customers.loyalty_balance
5. Записать в loyalty_transactions с type='redemption'

### 2.4 RPC: `convert_stamp_card`

**Файл миграции:** `src/supabase/migrations/184_rpc_convert_stamp_card.sql`
**Файл функции:** `src/supabase/functions/convert_stamp_card.sql`

Логика:

1. Найти активную карточку по номеру
2. Подсчитать активные (не просроченные) штампы
3. Формула: `stamps * stamp_threshold * cashback_pct + conversion_bonus_pct`
4. Создать loyalty_points запись
5. Обновить customers.loyalty_balance
6. Закрыть карточку: status='converted', customer_id, converted_at

### 2.5 RPC: `expire_points`

**Файл миграции:** `src/supabase/migrations/185_rpc_expire_points.sql`
**Файл функции:** `src/supabase/functions/expire_points.sql`

Логика:

1. Найти все loyalty_points WHERE remaining > 0 AND expires_at <= now()
2. Обнулить remaining
3. Обновить customers.loyalty_balance
4. Записать в loyalty_transactions с type='expiration'
5. Будет вызываться по cron (Edge Function) ежедневно

### 2.6 RPC: `recalculate_tiers`

**Файл миграции:** `src/supabase/migrations/186_rpc_recalculate_tiers.sql`
**Файл функции:** `src/supabase/functions/recalculate_tiers.sql`

Логика:

1. Для каждого клиента с telegram_id: посчитать SUM(final_amount) за 90 дней
2. Определить целевой уровень по порогам из loyalty_settings.tiers
3. Ограничить деградацию: max -1 уровень за пересчет
4. Обновить tier, tier_updated_at, spent_90d
5. Будет вызываться по cron ежедневно

### 2.7 RPC: `get_customer_cabinet`

**Файл миграции:** `src/supabase/migrations/187_rpc_get_customer_cabinet.sql`
**Файл функции:** `src/supabase/functions/get_customer_cabinet.sql`

Логика:

1. Найти клиента по token
2. Собрать: уровень, баланс, cashback_pct, статистику
3. Ближайшее сгорание баллов (за 7 дней)
4. Последние 20 заказов
5. Последние 50 записей loyalty_transactions

### 2.8 RPC: `get_stamp_card_info`

**Файл миграции:** `src/supabase/migrations/188_rpc_get_stamp_card_info.sql`
**Файл функции:** `src/supabase/functions/get_stamp_card_info.sql`

Логика (нужна для POS — кассир ввел номер карточки):

1. Найти карточку по номеру
2. Подсчитать активные штампы текущего цикла
3. Найти активную награду (достигнутый порог)
4. Дата последнего визита
5. Вернуть: card_number, stamps, cycle, active_reward, last_visit

### Проверка Фазы 2

Полный e2e сценарий:

```sql
-- 1. Создать карточку
INSERT INTO stamp_cards (card_number) VALUES ('E2E001');

-- 2. 5 визитов по 160000 (2 штампа каждый = 10 штампов)
SELECT add_stamps('E2E001', NULL, 160000);  -- repeat 5 times

-- 3. Проверить награду (10 штампов = завтрак до 75k)
SELECT get_stamp_card_info('E2E001');

-- 4. Создать клиента и конвертировать
INSERT INTO customers (name, telegram_id) VALUES ('E2E User', 'e2e_test_tg');
SELECT convert_stamp_card('E2E001',
  (SELECT id FROM customers WHERE telegram_id = 'e2e_test_tg'));
-- Ожидаем: stamps=10, points = 10*80000*0.05 * 1.1 = 44000

-- 5. Cashback от нового заказа
SELECT apply_cashback(
  (SELECT id FROM customers WHERE telegram_id = 'e2e_test_tg'),
  NULL, 138000);

-- 6. Списание баллов
SELECT redeem_points(
  (SELECT id FROM customers WHERE telegram_id = 'e2e_test_tg'),
  NULL, 20000);

-- 7. Проверить кабинет
SELECT get_customer_cabinet(
  (SELECT token FROM customers WHERE telegram_id = 'e2e_test_tg'));

-- Очистить тест
-- (каскад: loyalty_transactions, loyalty_points, stamp_entries зависят от customers/stamp_cards)
```

---

## Фаза 3: Stores (frontend)

### 3.1 Customers Store

**Создать директорию:** `src/stores/customers/`

#### `src/stores/customers/types.ts`

```typescript
export type CustomerTier = 'member' | 'regular' | 'vip'
export type CustomerStatus = 'active' | 'blocked'

export interface Customer {
  id: string
  name: string
  telegramId: string | null
  telegramUsername: string | null
  phone: string | null
  token: string
  tier: CustomerTier
  tierUpdatedAt: string | null
  loyaltyBalance: number
  totalSpent: number
  spent90d: number
  totalVisits: number
  averageCheck: number
  firstVisitAt: string | null
  lastVisitAt: string | null
  notes: string | null
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}
```

#### `src/stores/customers/supabaseMappers.ts`

snake_case (DB) <-> camelCase (JS) маппинг, по аналогии с channelsStore.

#### `src/stores/customers/service.ts`

```typescript
// Методы:
async fetchAll(): Promise<Customer[]>           // SELECT * FROM customers WHERE status='active'
async fetchById(id: string): Promise<Customer>
async search(query: string): Promise<Customer[]> // ILIKE по name, telegram_username, phone
async create(data: Partial<Customer>): Promise<Customer>
async update(id: string, data: Partial<Customer>): Promise<Customer>
```

#### `src/stores/customers/customersStore.ts`

```typescript
// Pinia defineStore('customers', () => { ... })
// refs: customers, initialized, loading
// computed: sortedByLastVisit, customersByTier
// methods: initialize(), searchCustomers(query), createCustomer(), updateCustomer()
// lookup: getById(id), getByTelegramId(tgId)
```

#### `src/stores/customers/index.ts`

Re-export store, types, service.

### 3.2 Loyalty Store

**Создать директорию:** `src/stores/loyalty/`

#### `src/stores/loyalty/types.ts`

```typescript
export interface LoyaltySettings {
  id: string
  stampsPerCycle: number
  stampThreshold: number
  stampLifetimeDays: number
  stampRewards: StampReward[]
  pointsLifetimeDays: number
  conversionBonusPct: number
  tierWindowDays: number
  maxTierDegradation: number
  tiers: TierConfig[]
  isActive: boolean
}

export interface StampReward {
  stamps: number
  category: string
  maxDiscount: number
}

export interface TierConfig {
  name: string
  cashbackPct: number
  spendingThreshold: number
}

export interface StampCardInfo {
  cardNumber: string
  stamps: number
  cycle: number
  activeReward: StampReward | null
  lastVisit: string | null
  status: 'active' | 'converted' | 'expired'
}

export interface LoyaltyTransaction {
  id: string
  customerId: string
  type: 'cashback' | 'redemption' | 'conversion' | 'adjustment' | 'expiration'
  amount: number
  balanceAfter: number
  orderId: string | null
  description: string | null
  createdAt: string
}
```

#### `src/stores/loyalty/service.ts`

```typescript
// Все операции через RPC:
async getSettings(): Promise<LoyaltySettings>
async updateSettings(data: Partial<LoyaltySettings>): Promise<void>
async addStamps(cardNumber: string, orderId: string | null, amount: number): Promise<AddStampsResult>
async getCardInfo(cardNumber: string): Promise<StampCardInfo>
async issueNewCard(): Promise<{ cardNumber: string }>  // SELECT max(card_number) + 1
async applyCashback(customerId: string, orderId: string, amount: number): Promise<CashbackResult>
async redeemPoints(customerId: string, orderId: string, amount: number): Promise<RedeemResult>
async convertCard(cardNumber: string, customerId: string): Promise<ConvertResult>
async getTransactions(customerId: string, limit?: number): Promise<LoyaltyTransaction[]>
```

#### `src/stores/loyalty/loyaltyStore.ts`

```typescript
// Pinia defineStore('loyalty', () => { ... })
// refs: settings, initialized
// computed: cashbackRateForTier(tier), stampThreshold, stampsPerCycle
// methods: initialize() -- загрузить settings
//          addStamps(), applyCashback(), redeemPoints(), convertCard()
//          issueNewCard(), getCardInfo()
//          updateSettings() -- для Admin
```

### 3.3 Регистрация в initialization

**Файл:** `src/core/initialization/types.ts`

Добавить `'customers' | 'loyalty'` в `StoreName`.

**Файл:** `src/core/initialization/dependencies.ts`

```typescript
// STORE_DEPENDENCIES:
customers: [],
loyalty: ['customers'],

// STORE_CATEGORIES:
customers: 'backoffice',
loyalty: 'backoffice',

// getStoresForContext():
// В case 'backoffice' и case 'pos': добавить 'customers', 'loyalty'
```

**Файл:** `src/core/initialization/DevInitializationStrategy.ts` + `ProductionInitializationStrategy.ts`

Добавить методы загрузки:

```typescript
async loadCustomers() { ... }
async loadLoyalty() { ... }
```

### Проверка Фазы 3

1. `pnpm dev` -- приложение стартует без ошибок
2. В консоли: stores customers и loyalty инициализируются
3. `loyaltyStore.settings` содержит дефолтные значения из БД
4. `customersStore.customers` пока пустой (нет данных)

---

## Фаза 4: POS интеграция

### 4.1 Loyalty секция в POS

**Расположение:** В `PosMainView.vue` или в `OrderSection.vue` — панель лояльности привязывается к текущему заказу.

#### Компонент: `src/views/pos/loyalty/StampCardInput.vue`

```
+----------------------------------+
| STAMP CARD                       |
| [___Card Number___] [Find]       |
| Stamps: 7/15  Last: 2 days ago  |
| Reward: Drinks up to 40k (at 5) |
| [New Card]                       |
+----------------------------------+
```

- Input номера карточки + кнопка поиска
- Вызывает `loyaltyStore.getCardInfo(number)`
- Показывает текущие штампы, награду
- Кнопка "New Card" -- `loyaltyStore.issueNewCard()`
- При создании заказа: сохраняет `order.stampCardId`

#### Компонент: `src/views/pos/loyalty/CustomerSearch.vue`

```
+----------------------------------+
| CUSTOMER                         |
| [___Search name/telegram___]     |
| > John (VIP) Rp 156.000         |
| > Maria (Member) Rp 23.400      |
| [New Customer]                   |
+----------------------------------+
```

- Поиск по имени или telegram_username
- Показывает: имя, уровень, баланс
- Выбор привязывает к заказу: `order.customerId`
- Кнопка "New Customer" -- простая форма (имя + telegram)

#### Компонент: `src/views/pos/loyalty/LoyaltyPanel.vue`

Объединяющий компонент, показывает одно из:

- Ни карточки, ни клиента -- показать обе кнопки (Card / Customer)
- Карточка найдена -- показать StampCardInput с данными
- Клиент найден -- показать баланс, toggle списания баллов

### 4.2 Интеграция с PaymentDialog

**Файл:** `src/views/pos/payment/PaymentDialog.vue`

Изменения:

1. Показать информацию о лояльности в шапке: имя клиента / номер карточки
2. Если клиент с балансом > 0: секция "Use Points" с input суммы
3. При оплате: если включено списание -> `loyaltyStore.redeemPoints()` ПЕРЕД оплатой
4. После оплаты: `loyaltyStore.applyCashback()` или `loyaltyStore.addStamps()`

**Последовательность при оплате:**

```
1. Кассир нажимает "Pay"
2. Если списание баллов включено:
   -> redeemPoints(customerId, orderId, redeemAmount)
   -> уменьшить сумму к оплате
3. Провести оплату (существующий flow)
4. После успешной оплаты:
   -> Если customerId: applyCashback(customerId, orderId, finalAmount)
   -> Если stampCardId: addStamps(cardNumber, orderId, finalAmount)
5. Toast: "Cashback +Rp 6.900 | Balance: Rp 62.900"
   или: "Stamps +2 (total: 9/15)"
```

### 4.3 Конвертация карточки

**Файл:** `src/views/pos/loyalty/ConvertCardDialog.vue`

```
+------------------------------------------+
| CONVERT STAMP CARD                       |
|                                          |
| Card: 007  Stamps: 12                    |
|                                          |
| Customer: [Search or create]             |
| > Selected: John (Member, 5%)            |
|                                          |
| Conversion:                              |
|   12 stamps * 80,000 = 960,000 IDR      |
|   960,000 * 5% = 48,000 points          |
|   + 10% bonus = 4,800                   |
|   Total: 52,800 points                  |
|                                          |
| [Cancel]              [Convert]          |
+------------------------------------------+
```

- Показ предварительного расчета перед конвертацией
- Вызывает `loyaltyStore.convertCard(cardNumber, customerId)`
- После конвертации: карточка закрыта, баллы начислены

### 4.4 Изменения в ordersStore

**Файл:** `src/stores/pos/orders/ordersStore.ts`

- В `PosOrder` тип добавить: `customerId?: string`, `stampCardId?: string`, `guestCount?: number`
- В `createOrder()`: сохранять customer_id, stamp_card_id в БД
- В `completeOrder()` / после оплаты: триггерить loyalty операции

### Проверка Фазы 4

1. POS: ввести номер карточки -> увидеть штампы
2. POS: создать новую карточку -> номер +1
3. POS: привязать клиента к заказу -> оплатить -> cashback начислен
4. POS: привязать карточку -> оплатить -> штампы начислены
5. POS: списать баллы при оплате -> баланс уменьшился
6. POS: конвертировать карточку -> баллы начислены, карточка закрыта

---

## Фаза 5: Admin экраны

### 5.1 Расширить AdminScreenName

**Файл:** `src/views/admin/types.ts`

```typescript
export type AdminScreenName = 'menu' | 'channels' | 'dashboard' | 'customers' | 'loyalty'
```

### 5.2 LoyaltySettingsScreen

**Файл:** `src/views/admin/loyalty/LoyaltySettingsScreen.vue`

```
+------------------------------------------+
| LOYALTY SETTINGS                         |
|                                          |
| --- STAMP CARDS (Block 1) ---           |
| Stamps per cycle:  [15]                  |
| Stamp threshold:   [80,000] IDR         |
| Stamp lifetime:    [90] days            |
|                                          |
| Rewards:                                 |
| | 5 stamps  | Drinks    | 40,000 IDR | |
| | 10 stamps | Breakfast | 75,000 IDR | |
| | 15 stamps | Any       | 100,000 IDR| |
| [+ Add Reward]                           |
|                                          |
| --- DIGITAL LOYALTY (Block 2) ---       |
| Points lifetime:   [90] days            |
| Conversion bonus:  [10] %               |
| Tier recalc window:[90] days            |
| Max degradation:   [1] level            |
|                                          |
| Tiers:                                   |
| | Member  | 5%  | 0 IDR         |       |
| | Regular | 7%  | 1,500,000 IDR |       |
| | VIP     | 10% | 3,000,000 IDR |       |
|                                          |
| [Save Settings]                          |
+------------------------------------------+
```

Вызывает `loyaltyStore.updateSettings()`.

### 5.3 CustomersScreen

**Файл:** `src/views/admin/customers/CustomersScreen.vue`

- Список всех клиентов с поиском
- Фильтр по уровню (All / Member / Regular / VIP)
- Карточки: имя, telegram, уровень, баланс, последний визит
- Тап -> CustomerDetailScreen (или inline расширение)

### 5.4 CustomerDetailScreen

**Файл:** `src/views/admin/customers/CustomerDetailScreen.vue`

- Профиль клиента (редактируемый)
- Статистика: визиты, траты, avg check, spent 90d
- Ручная установка уровня VIP (для экспатов)
- История заказов (last 20)
- История баллов (last 50)
- Кнопка "Copy Cabinet Link" -> `https://cabinet.solarkitchen.com/me/[token]`
- Ручная корректировка баланса (adjustment)

### 5.5 StampCardsScreen

**Файл:** `src/views/admin/loyalty/StampCardsScreen.vue`

- Список карточек по номерам (001, 002...)
- Статус: active / converted / expired
- Фильтр по статусу
- Штампы, последний визит
- Тап -> история визитов (stamp_entries)

### 5.6 AdminSidebar и AdminMainView

**Файл:** `src/views/admin/components/AdminSidebar.vue`

Добавить пункты: Customers, Loyalty Settings.

**Файл:** `src/views/admin/AdminMainView.vue`

Добавить `defineAsyncComponent` для новых экранов + `v-else-if` в template.
Инициализировать `customers` и `loyalty` stores на mount.

### Проверка Фазы 5

1. Admin sidebar: пункты Customers и Loyalty видны
2. Loyalty Settings: отображает текущие настройки, можно редактировать и сохранять
3. Customers: пустой список (пока нет данных), поиск работает
4. Можно создать клиента вручную
5. Можно открыть профиль клиента, скопировать ссылку кабинета

---

## Порядок реализации (чек-лист)

### Фаза 1: Миграции

- [ ] 174: customers
- [ ] 175: stamp_cards
- [ ] 176: stamp_entries
- [ ] 177: loyalty_points
- [ ] 178: loyalty_transactions
- [ ] 179: loyalty_settings
- [ ] 180: orders extensions
- [ ] Проверка: все таблицы + дефолтные данные

### Фаза 2: RPC

- [ ] 181: add_stamps
- [ ] 182: apply_cashback
- [ ] 183: redeem_points
- [ ] 184: convert_stamp_card
- [ ] 185: expire_points
- [ ] 186: recalculate_tiers
- [ ] 187: get_customer_cabinet
- [ ] 188: get_stamp_card_info
- [ ] E2E тест: весь цикл карточка -> конвертация -> cashback -> redemption

### Фаза 3: Stores

- [ ] customers store (types, mappers, service, store, index)
- [ ] loyalty store (types, mappers, service, store, index)
- [ ] Регистрация: StoreName, dependencies, categories, strategies
- [ ] Проверка: pnpm dev без ошибок, stores инициализируются

### Фаза 4: POS

- [ ] LoyaltyPanel (StampCardInput + CustomerSearch)
- [ ] Интеграция с PosMainView / OrderSection
- [ ] PaymentDialog: секция списания баллов
- [ ] Post-payment: auto cashback / stamps
- [ ] ConvertCardDialog
- [ ] ordersStore: customer_id, stamp_card_id поля

### Фаза 5: Admin

- [ ] AdminScreenName + sidebar + routing
- [ ] LoyaltySettingsScreen
- [ ] CustomersScreen
- [ ] CustomerDetailScreen
- [ ] StampCardsScreen
