# BACKOFFICE_ROADMAP.md

# Backoffice — план разработки клиентской инфраструктуры

> Этот файл только для `backoffice/`.
> Общая картина системы — в `SYSTEM_OVERVIEW.md`.

---

## Что строим и зачем

Backoffice — это движок всей системы. Он владеет данными и бизнес-логикой.
Web-winter — это витрина. Он только показывает то, что backoffice создал.

**Наша задача:** построить фундамент — клиенты, лояльность, аналитика — так,
чтобы web-winter мог читать данные через RPC не зная ничего о внутренней логике.

---

## Модуль 1: Меню (частично готово)

### Статус

✅ Таблицы существуют: `menu_items`, `menu_categories`, `channel_prices`
⬜ Нужно заполнить `image_url` для отображения на сайте

### Что обеспечивает backoffice для web-winter

```typescript
// Web-winter читает эти поля — они должны быть заполнены корректно:
menu_items: {
  is_active: boolean // false = не показывать на сайте
  sort_order: number // порядок в меню
  image_url: string | null // URL из Supabase Storage
  price: number // net IDR без налога (web-winter добавит 15%)
  variants: JSONB // [{ id, name, price, isActive }]
  name_en: string // английское название для сайта
}
menu_categories: {
  is_active: boolean // false = скрыть категорию на сайте
  sort_order: number
}
```

### Задачи

- [ ] Заполнить `image_url` для активных блюд (загрузить фото в Supabase Storage)
- [ ] Проверить что все `name_en` заполнены
- [ ] Убедиться что `sort_order` расставлен корректно

---

## Модуль 2: Клиенты и лояльность (не начато)

### Конечный результат этого модуля

- Кассир в POS видит клиента по телефону, его баланс баллов и уровень
- После каждой оплаты автоматически начисляется 5% cashback
- Клиент может списать баллы в счёт оплаты
- Менеджер в Admin видит список клиентов, их историю и LTV
- Кнопка "Отправить ссылку" отправляет клиенту URL его личного кабинета

### 2.1 Миграции БД

**Порядок применения: сначала DEV, потом PROD**

```sql
-- Migration 1: customers
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  token           TEXT UNIQUE NOT NULL
                  DEFAULT encode(gen_random_bytes(12), 'hex'),
  loyalty_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  average_check   NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_visit_at  TIMESTAMPTZ,
  last_visit_at   TIMESTAMPTZ,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_token ON customers(token);

-- Migration 2: loyalty_transactions
CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  type          TEXT NOT NULL
                CHECK (type IN ('cashback','redemption','adjustment')),
  amount        NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  order_id      UUID REFERENCES orders(id),
  description   TEXT,
  performed_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);

-- Migration 3: loyalty_settings
CREATE TABLE loyalty_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashback_rate    NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO loyalty_settings DEFAULT VALUES;

-- Migration 4: расширить orders
ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN guest_count INTEGER DEFAULT 1;
CREATE INDEX idx_orders_customer ON orders(customer_id);
```

### 2.2 RPC функции

#### `apply_cashback` — начисление баллов после оплаты

```sql
CREATE OR REPLACE FUNCTION apply_cashback(
  p_customer_id UUID,
  p_order_id UUID,
  p_order_amount NUMERIC,
  p_cashback_rate NUMERIC DEFAULT 0.05,
  p_performed_by TEXT DEFAULT 'system'
) RETURNS JSONB AS $$
DECLARE
  v_cashback NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  v_cashback := ROUND(p_order_amount * p_cashback_rate, 2);

  UPDATE customers SET
    loyalty_balance = loyalty_balance + v_cashback,
    total_spent     = total_spent + p_order_amount,
    total_visits    = total_visits + 1,
    last_visit_at   = now(),
    average_check   = (total_spent + p_order_amount) / (total_visits + 1),
    updated_at      = now()
  WHERE id = p_customer_id
  RETURNING loyalty_balance INTO v_new_balance;

  INSERT INTO loyalty_transactions
    (customer_id, type, amount, balance_after, order_id, description, performed_by)
  VALUES
    (p_customer_id, 'cashback', v_cashback, v_new_balance, p_order_id,
     'Cashback ' || (p_cashback_rate * 100)::int || '%', p_performed_by);

  RETURN jsonb_build_object(
    'success', true,
    'cashback', v_cashback,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `redeem_loyalty` — списание баллов при оплате

```sql
CREATE OR REPLACE FUNCTION redeem_loyalty(
  p_customer_id UUID,
  p_order_id UUID,
  p_amount NUMERIC,
  p_performed_by TEXT DEFAULT 'system'
) RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  SELECT loyalty_balance INTO v_current_balance
  FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE customers SET
    loyalty_balance = v_new_balance,
    updated_at = now()
  WHERE id = p_customer_id;

  INSERT INTO loyalty_transactions
    (customer_id, type, amount, balance_after, order_id, description, performed_by)
  VALUES
    (p_customer_id, 'redemption', -p_amount, v_new_balance, p_order_id,
     'Loyalty redemption', p_performed_by);

  RETURN jsonb_build_object(
    'success', true,
    'redeemed', p_amount,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_customer_cabinet` — данные для личного кабинета (вызывает web-winter)

```sql
CREATE OR REPLACE FUNCTION get_customer_cabinet(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_orders JSONB;
  v_loyalty JSONB;
BEGIN
  SELECT * INTO v_customer
  FROM customers WHERE token = p_token AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  SELECT jsonb_agg(row_to_json(o)) INTO v_orders
  FROM (
    SELECT id, order_number, created_at, final_amount, guest_count
    FROM orders WHERE customer_id = v_customer.id
    ORDER BY created_at DESC LIMIT 20
  ) o;

  SELECT jsonb_agg(row_to_json(lt)) INTO v_loyalty
  FROM (
    SELECT type, amount, balance_after, description, created_at
    FROM loyalty_transactions WHERE customer_id = v_customer.id
    ORDER BY created_at DESC LIMIT 50
  ) lt;

  RETURN jsonb_build_object(
    'success', true,
    'customer', jsonb_build_object(
      'name',            v_customer.name,
      'loyalty_balance', v_customer.loyalty_balance,
      'total_visits',    v_customer.total_visits,
      'total_spent',     v_customer.total_spent,
      'average_check',   v_customer.average_check,
      'member_since',    v_customer.created_at
    ),
    'orders',          COALESCE(v_orders, '[]'::jsonb),
    'loyalty_history', COALESCE(v_loyalty, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Stores

**Создать по существующему паттерну** `src/stores/{domain}/`:

```
src/stores/customers/
├── types.ts          — Customer, CustomerStatus
├── service.ts        — CRUD + search по телефону/имени
├── supabaseMappers.ts
├── customersStore.ts — initialize(), searchCustomers(),
│                       createCustomer(), updateCustomer()
└── index.ts

src/stores/loyalty/
├── types.ts          — LoyaltyTransaction, LoyaltySettings
├── service.ts        — CRUD loyalty_transactions + settings
├── supabaseMappers.ts
├── loyaltyStore.ts   — cashbackRate, applyCashback(),
│                       redeemLoyalty(), getTransactions(),
│                       getTotalCashbackToday()
└── index.ts
```

**Регистрация в initialization:**

```typescript
// src/core/initialization/types.ts
type StoreName = ... | 'customers' | 'loyalty'

// src/core/initialization/dependencies.ts
customers: { deps: [], category: 'backoffice', contexts: ['backoffice', 'pos'] }
loyalty:   { deps: ['customers'], category: 'backoffice', contexts: ['backoffice', 'pos'] }
```

### 2.4 POS интеграция

**Новый компонент:** `src/views/pos/payment/components/CustomerSearchPanel.vue`

```
• Поле поиска: последние 4 цифры телефона или имя
• Результаты: имя, телефон, баланс баллов
• Быстрое создание нового клиента (имя + телефон)
• Показывает уровень: Member / Regular / VIP
```

**Изменить:** `src/views/pos/payment/PaymentDialog.vue`

```
• Секция "Customer" вверху диалога
• Показать: имя, баланс в IDR (Rp 65.000)
• Если баланс > 0: toggle "Use loyalty points" + input суммы
• Guest count stepper (default 1)
```

**Изменить:** `src/stores/pos/payments/paymentsStore.ts`

```typescript
// В processSimplePayment(), после успешной оплаты:
if (order.customerId) {
  const rate = loyaltyStore.cashbackRate // из loyalty_settings
  await loyaltyStore.applyCashback(order.customerId, order.id, totalAmount, rate)
  // показать toast: "Cashback Rp 15.000 начислен! Баланс: Rp 65.000"
}
```

### 2.5 Admin (планшет) — Customer screens

**Добавить в** `src/views/admin/types.ts`:

```typescript
export type AdminScreenName = 'menu' | 'channels' | 'dashboard' | 'customers'
```

**Создать** `src/views/admin/customers/`:

`CustomersScreen.vue` — список:

```
• Поиск по имени/телефону (debounced)
• Карточки: имя, телефон, уровень, баланс, последний визит
• Кнопка "Add Customer"
• Тап → CustomerDetailScreen
```

`CustomerDetailScreen.vue` — профиль:

```
• Имя, телефон, статус (active/blocked)
• Уровень лояльности + баланс баллов
• Статистика: визиты, total spent, avg check, LTV
• История заказов (пагинация)
• История баллов
• Кнопка "Скопировать ссылку кабинета"
  → копирует https://cabinet.solarkitchen.com/me/[token]
• Ручная корректировка баланса (только admin)
```

---

## Модуль 3: Аналитика клиентов (после модуля 2)

### Метрики для отслеживания

```
По клиентам:
• LTV (lifetime value) = total_spent за всё время
• Частота визитов = total_visits / (last_visit - first_visit в неделях)
• Средний чек = average_check
• Retention = % вернувшихся за 30/60/90 дней

По программе лояльности:
• Total cashback выдано за период
• Total баллов списано за период
• % заказов с привязанным клиентом
• Распределение по уровням (Member/Regular/VIP)

Сегментация:
• По уровню лояльности
• По частоте визитов
• По сумме трат
```

### SQL view для аналитики

```sql
CREATE VIEW v_customer_analytics AS
SELECT
  c.id,
  c.name,
  c.total_spent,
  c.total_visits,
  c.average_check,
  c.loyalty_balance,
  c.first_visit_at,
  c.last_visit_at,
  -- уровень лояльности
  CASE
    WHEN c.total_spent >= 3000000 THEN 'VIP'
    WHEN c.total_spent >= 1000000 THEN 'Regular'
    ELSE 'Member'
  END AS loyalty_tier,
  -- дней с последнего визита
  EXTRACT(DAY FROM now() - c.last_visit_at) AS days_since_last_visit,
  -- визитов в месяц
  ROUND(c.total_visits::numeric /
    GREATEST(1, EXTRACT(MONTH FROM age(now(), c.first_visit_at)) + 1), 1
  ) AS visits_per_month
FROM customers c
WHERE c.status = 'active';
```

---

## Модуль 4: Takeaway через сайт (будущее)

### RPC `create_online_order` — создаётся здесь, вызывается из web-winter

```sql
-- Принимает заказ от клиента на сайте
-- Валидирует items против menu_items
-- Создаёт order + order_items в БД
-- Уведомляет POS через Realtime
-- Возвращает order_id и estimated_time
CREATE OR REPLACE FUNCTION create_online_order(
  p_customer_token TEXT,     -- null если не авторизован
  p_items JSONB,             -- [{menu_item_id, variant_id, quantity}]
  p_type TEXT,               -- 'takeaway' | 'dine_in'
  p_table_id UUID,           -- для dine_in через QR стола
  p_notes TEXT
) RETURNS JSONB ...
```

---

## Статус реализации

### Модуль 1: Меню

| Задача                      | Статус |
| --------------------------- | ------ |
| Таблицы в БД                | ✅     |
| Публичное меню в web-winter | 🔄     |
| Заполнить image_url         | ⬜     |
| Проверить name_en           | ⬜     |

### Модуль 2: Клиенты и лояльность

| Задача                                       | Статус |
| -------------------------------------------- | ------ |
| Migration: customers                         | ⬜     |
| Migration: loyalty_transactions              | ⬜     |
| Migration: loyalty_settings                  | ⬜     |
| Migration: orders + customer_id, guest_count | ⬜     |
| RPC: apply_cashback                          | ⬜     |
| RPC: redeem_loyalty                          | ⬜     |
| RPC: get_customer_cabinet                    | ⬜     |
| Store: customers                             | ⬜     |
| Store: loyalty                               | ⬜     |
| POS: CustomerSearchPanel                     | ⬜     |
| POS: PaymentDialog интеграция                | ⬜     |
| POS: автоначисление cashback                 | ⬜     |
| Admin: CustomersScreen                       | ⬜     |
| Admin: CustomerDetailScreen                  | ⬜     |
| Admin: кнопка "Скопировать ссылку"           | ⬜     |

### Модуль 3: Аналитика

| Задача                         | Статус |
| ------------------------------ | ------ |
| SQL view: v_customer_analytics | ⬜     |
| Dashboard: метрики лояльности  | ⬜     |
| LTV отчёт                      | ⬜     |

### Модуль 4: Takeaway

| Задача                   | Статус     |
| ------------------------ | ---------- |
| RPC: create_online_order | ⬜ Будущее |
| Realtime: статус заказа  | ⬜ Будущее |

_⬜ не начато · 🔄 в процессе · ✅ готово_
