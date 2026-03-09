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

> Полная бизнес-спецификация: `src/About/Frontend/LOYALTY_SPEC.md`

### Архитектура: два блока

```
Блок 1: ФИЗИЧЕСКАЯ КАРТОЧКА          Блок 2: ЦИФРОВОЙ ПРОФИЛЬ
Штампы -> бесплатное блюдо           Баллы = деньги (1 балл = 1 IDR)
Анонимный гость / турист             Зарегистрированный через Telegram
Номер карточки 001, 002...           Уровень Member/Regular/VIP + cashback %
Точка входа                          Удержание, частота, LTV

Переход: карточка -> профиль (штампы конвертируются в баллы +10% бонус)
```

### Конечный результат

- **Блок 1**: Кассир выдает/находит карточку по номеру, начисляет штампы, применяет награды
- **Блок 2**: Кассир находит клиента по имени/Telegram, списывает баллы, видит уровень
- **Admin**: Настройка обоих блоков без разработчиков, управление карточками и профилями
- **Telegram-бот**: Личный кабинет клиента (баланс, уровень, история)
- **Конвертация**: Штампы карточки -> баллы профиля при регистрации в боте

### 2.1 Миграции БД

**Порядок применения: сначала DEV, потом PROD**

#### Migration A: customers (цифровой профиль)

```sql
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  telegram_id     TEXT UNIQUE,        -- Telegram user ID (основной идентификатор)
  telegram_username TEXT,             -- @username для отображения
  phone           TEXT,               -- опционально
  token           TEXT UNIQUE NOT NULL
                  DEFAULT encode(gen_random_bytes(12), 'hex'),

  -- Loyalty: уровень и баллы
  tier            TEXT NOT NULL DEFAULT 'member'
                  CHECK (tier IN ('member', 'regular', 'vip')),
  tier_updated_at TIMESTAMPTZ,
  loyalty_balance NUMERIC(12,2) NOT NULL DEFAULT 0,  -- текущий баланс баллов

  -- Статистика (обновляется при каждом заказе)
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_90d       NUMERIC(12,2) NOT NULL DEFAULT 0,  -- за скользящие 90 дней
  total_visits    INTEGER NOT NULL DEFAULT 0,
  average_check   NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_visit_at  TIMESTAMPTZ,
  last_visit_at   TIMESTAMPTZ,

  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_telegram ON customers(telegram_id);
CREATE INDEX idx_customers_token ON customers(token);
CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_phone ON customers(phone);
```

#### Migration B: stamp_cards (физическая карточка)

```sql
CREATE TABLE stamp_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number TEXT UNIQUE NOT NULL,   -- '001', '002'...
  customer_id UUID REFERENCES customers(id),  -- null до конвертации
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'converted', 'expired')),
  cycle       INTEGER NOT NULL DEFAULT 1,      -- текущий цикл (сбрасывается после 15 штампов)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ           -- дата конвертации в цифровой профиль
);

CREATE INDEX idx_stamp_cards_number ON stamp_cards(card_number);
CREATE INDEX idx_stamp_cards_status ON stamp_cards(status);
```

#### Migration C: stamp_entries (начисления штампов)

```sql
CREATE TABLE stamp_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID NOT NULL REFERENCES stamp_cards(id),
  order_id    UUID REFERENCES orders(id),
  order_amount NUMERIC(12,2) NOT NULL,   -- сумма чека с налогами
  stamps      INTEGER NOT NULL,           -- количество штампов за этот чек
  cycle       INTEGER NOT NULL DEFAULT 1, -- в каком цикле начислены
  expires_at  TIMESTAMPTZ NOT NULL,       -- дата сгорания (created_at + 90 дней)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamp_entries_card ON stamp_entries(card_id);
CREATE INDEX idx_stamp_entries_expires ON stamp_entries(expires_at);
```

#### Migration D: loyalty_points (баллы с датой сгорания)

```sql
CREATE TABLE loyalty_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount      NUMERIC(12,2) NOT NULL,    -- кол-во баллов
  remaining   NUMERIC(12,2) NOT NULL,    -- остаток (уменьшается при списании)
  source      TEXT NOT NULL
              CHECK (source IN ('cashback', 'conversion', 'adjustment', 'bonus')),
  order_id    UUID REFERENCES orders(id),
  description TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,      -- created_at + 90 дней
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX idx_loyalty_points_expires ON loyalty_points(expires_at);
CREATE INDEX idx_loyalty_points_remaining ON loyalty_points(customer_id, remaining)
  WHERE remaining > 0;
```

#### Migration E: loyalty_transactions (лог операций)

```sql
CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  type          TEXT NOT NULL
                CHECK (type IN ('cashback', 'redemption', 'conversion', 'adjustment', 'expiration')),
  amount        NUMERIC(12,2) NOT NULL,   -- положительное = начисление, отрицательное = списание
  balance_after NUMERIC(12,2) NOT NULL,
  order_id      UUID REFERENCES orders(id),
  description   TEXT,
  performed_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_tx_customer ON loyalty_transactions(customer_id);
```

#### Migration F: loyalty_settings (настройки обоих блоков)

```sql
CREATE TABLE loyalty_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Блок 1: Карточки
  stamps_per_cycle      INTEGER NOT NULL DEFAULT 15,
  stamp_threshold       NUMERIC(12,2) NOT NULL DEFAULT 80000,  -- IDR с налогами
  stamp_lifetime_days   INTEGER NOT NULL DEFAULT 90,
  stamp_rewards         JSONB NOT NULL DEFAULT '[
    {"stamps": 5,  "category": "drinks",     "max_discount": 40000},
    {"stamps": 10, "category": "breakfast",   "max_discount": 75000},
    {"stamps": 15, "category": "any",         "max_discount": 100000}
  ]'::jsonb,

  -- Блок 2: Баллы
  points_lifetime_days  INTEGER NOT NULL DEFAULT 90,
  conversion_bonus_pct  NUMERIC(5,2) NOT NULL DEFAULT 10,      -- бонус при конвертации карточки
  tier_window_days      INTEGER NOT NULL DEFAULT 90,            -- окно пересчета уровней
  max_tier_degradation  INTEGER NOT NULL DEFAULT 1,             -- макс. падение уровней за пересчет

  -- Уровни
  tiers                 JSONB NOT NULL DEFAULT '[
    {"name": "member",  "cashback_pct": 5,  "spending_threshold": 0},
    {"name": "regular", "cashback_pct": 7,  "spending_threshold": 1500000},
    {"name": "vip",     "cashback_pct": 10, "spending_threshold": 3000000}
  ]'::jsonb,

  is_active             BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO loyalty_settings DEFAULT VALUES;
```

#### Migration G: расширить orders

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stamp_card_id UUID REFERENCES stamp_cards(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stamp_card ON orders(stamp_card_id);
```

### 2.2 RPC функции

#### `add_stamps` — начисление штампов на физическую карточку

```sql
CREATE OR REPLACE FUNCTION add_stamps(
  p_card_number TEXT,
  p_order_id UUID,
  p_order_amount NUMERIC  -- сумма чека с налогами
) RETURNS JSONB AS $$
DECLARE
  v_card RECORD;
  v_settings RECORD;
  v_stamps INTEGER;
  v_total_stamps INTEGER;
  v_active_reward JSONB;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  SELECT * INTO v_card FROM stamp_cards
    WHERE card_number = p_card_number AND status = 'active'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found or inactive');
  END IF;

  v_stamps := floor(p_order_amount / v_settings.stamp_threshold)::int;
  IF v_stamps = 0 THEN
    RETURN jsonb_build_object('success', true, 'stamps_added', 0, 'message', 'Below threshold');
  END IF;

  INSERT INTO stamp_entries (card_id, order_id, order_amount, stamps, cycle, expires_at)
  VALUES (v_card.id, p_order_id, p_order_amount, v_stamps, v_card.cycle,
          now() + (v_settings.stamp_lifetime_days || ' days')::interval);

  -- Подсчет активных штампов в текущем цикле
  SELECT COALESCE(SUM(stamps), 0) INTO v_total_stamps
  FROM stamp_entries
  WHERE card_id = v_card.id AND cycle = v_card.cycle AND expires_at > now();

  -- Проверка награды
  SELECT r INTO v_active_reward
  FROM jsonb_array_elements(v_settings.stamp_rewards) r
  WHERE (r->>'stamps')::int <= v_total_stamps
  ORDER BY (r->>'stamps')::int DESC LIMIT 1;

  -- Если достигнут цикл — сброс
  IF v_total_stamps >= v_settings.stamps_per_cycle THEN
    UPDATE stamp_cards SET cycle = cycle + 1 WHERE id = v_card.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stamps_added', v_stamps,
    'total_stamps', v_total_stamps,
    'active_reward', v_active_reward,
    'cycle', v_card.cycle
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `apply_cashback` — начисление баллов после оплаты (Блок 2)

```sql
CREATE OR REPLACE FUNCTION apply_cashback(
  p_customer_id UUID,
  p_order_id UUID,
  p_order_amount NUMERIC  -- сумма чека с налогами, после списания баллов
) RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_settings RECORD;
  v_tier_config JSONB;
  v_cashback_pct NUMERIC;
  v_cashback NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Найти cashback % для уровня клиента
  SELECT t INTO v_tier_config
  FROM jsonb_array_elements(v_settings.tiers) t
  WHERE t->>'name' = v_customer.tier;

  v_cashback_pct := (v_tier_config->>'cashback_pct')::numeric / 100;
  v_cashback := ROUND(p_order_amount * v_cashback_pct, 0);  -- 1 балл = 1 IDR, без копеек

  -- Записать баллы с датой сгорания
  INSERT INTO loyalty_points (customer_id, amount, remaining, source, order_id,
    description, expires_at)
  VALUES (p_customer_id, v_cashback, v_cashback, 'cashback', p_order_id,
    'Cashback ' || (v_cashback_pct * 100)::int || '%',
    now() + (v_settings.points_lifetime_days || ' days')::interval);

  -- Обновить баланс и статистику
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
    (customer_id, type, amount, balance_after, order_id, description)
  VALUES (p_customer_id, 'cashback', v_cashback, v_new_balance, p_order_id,
    'Cashback ' || (v_cashback_pct * 100)::int || '% from order');

  RETURN jsonb_build_object(
    'success', true,
    'cashback', v_cashback,
    'cashback_pct', v_cashback_pct * 100,
    'new_balance', v_new_balance,
    'tier', v_customer.tier
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `redeem_points` — списание баллов (FIFO по дате сгорания)

```sql
CREATE OR REPLACE FUNCTION redeem_points(
  p_customer_id UUID,
  p_order_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_remaining NUMERIC;
  v_new_balance NUMERIC;
  v_point RECORD;
BEGIN
  SELECT loyalty_balance INTO v_current_balance
  FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- FIFO списание: сначала баллы с ближайшей датой сгорания
  v_remaining := p_amount;
  FOR v_point IN
    SELECT id, remaining FROM loyalty_points
    WHERE customer_id = p_customer_id AND remaining > 0 AND expires_at > now()
    ORDER BY expires_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    IF v_point.remaining <= v_remaining THEN
      UPDATE loyalty_points SET remaining = 0 WHERE id = v_point.id;
      v_remaining := v_remaining - v_point.remaining;
    ELSE
      UPDATE loyalty_points SET remaining = remaining - v_remaining WHERE id = v_point.id;
      v_remaining := 0;
    END IF;
  END LOOP;

  v_new_balance := v_current_balance - p_amount;
  UPDATE customers SET loyalty_balance = v_new_balance, updated_at = now()
  WHERE id = p_customer_id;

  INSERT INTO loyalty_transactions
    (customer_id, type, amount, balance_after, order_id, description)
  VALUES (p_customer_id, 'redemption', -p_amount, v_new_balance, p_order_id,
    'Points redeemed');

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

#### `convert_stamp_card` — конвертация карточки в профиль

```sql
CREATE OR REPLACE FUNCTION convert_stamp_card(
  p_card_number TEXT,
  p_customer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_card RECORD;
  v_settings RECORD;
  v_customer RECORD;
  v_tier_config JSONB;
  v_active_stamps INTEGER;
  v_implied_spent NUMERIC;
  v_cashback_pct NUMERIC;
  v_points NUMERIC;
  v_bonus NUMERIC;
  v_total_points NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
  SELECT * INTO v_card FROM stamp_cards
    WHERE card_number = p_card_number AND status = 'active' FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found or already converted');
  END IF;

  -- Подсчет активных (не просроченных) штампов
  SELECT COALESCE(SUM(stamps), 0) INTO v_active_stamps
  FROM stamp_entries
  WHERE card_id = v_card.id AND expires_at > now();

  -- Конвертация: штампы * порог * cashback% + бонус
  SELECT t INTO v_tier_config
  FROM jsonb_array_elements(v_settings.tiers) t
  WHERE t->>'name' = v_customer.tier;

  v_cashback_pct := (v_tier_config->>'cashback_pct')::numeric / 100;
  v_implied_spent := v_active_stamps * v_settings.stamp_threshold;
  v_points := ROUND(v_implied_spent * v_cashback_pct, 0);
  v_bonus := ROUND(v_points * v_settings.conversion_bonus_pct / 100, 0);
  v_total_points := v_points + v_bonus;

  -- Записать баллы
  INSERT INTO loyalty_points (customer_id, amount, remaining, source, description, expires_at)
  VALUES (p_customer_id, v_total_points, v_total_points, 'conversion',
    'Converted from card ' || p_card_number || ' (' || v_active_stamps || ' stamps)',
    now() + (v_settings.points_lifetime_days || ' days')::interval);

  -- Обновить баланс
  UPDATE customers SET
    loyalty_balance = loyalty_balance + v_total_points,
    updated_at = now()
  WHERE id = p_customer_id
  RETURNING loyalty_balance INTO v_new_balance;

  INSERT INTO loyalty_transactions
    (customer_id, type, amount, balance_after, description)
  VALUES (p_customer_id, 'conversion', v_total_points, v_new_balance,
    'Card ' || p_card_number || ': ' || v_active_stamps || ' stamps, +' || v_settings.conversion_bonus_pct || '% bonus');

  -- Закрыть карточку
  UPDATE stamp_cards SET
    status = 'converted',
    customer_id = p_customer_id,
    converted_at = now()
  WHERE id = v_card.id;

  RETURN jsonb_build_object(
    'success', true,
    'stamps_converted', v_active_stamps,
    'points_earned', v_points,
    'bonus', v_bonus,
    'total_points', v_total_points,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `recalculate_tiers` — ежедневный пересчет уровней (cron/Edge Function)

```sql
CREATE OR REPLACE FUNCTION recalculate_tiers()
RETURNS JSONB AS $$
DECLARE
  v_settings RECORD;
  v_customer RECORD;
  v_new_tier TEXT;
  v_tier_order TEXT[] := ARRAY['member', 'regular', 'vip'];
  v_current_idx INTEGER;
  v_new_idx INTEGER;
  v_changes INTEGER := 0;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;

  FOR v_customer IN
    SELECT c.id, c.tier,
      COALESCE((
        SELECT SUM(final_amount) FROM orders
        WHERE customer_id = c.id
          AND created_at > now() - (v_settings.tier_window_days || ' days')::interval
      ), 0) AS spent_90d
    FROM customers c WHERE c.status = 'active' AND c.telegram_id IS NOT NULL
  LOOP
    -- Определить целевой уровень по тратам
    v_new_tier := 'member';
    FOR i IN REVERSE (jsonb_array_length(v_settings.tiers) - 1)..0 LOOP
      IF v_customer.spent_90d >= (v_settings.tiers->i->>'spending_threshold')::numeric THEN
        v_new_tier := v_settings.tiers->i->>'name';
        EXIT;
      END IF;
    END LOOP;

    -- Ограничить деградацию
    v_current_idx := array_position(v_tier_order, v_customer.tier);
    v_new_idx := array_position(v_tier_order, v_new_tier);
    IF v_current_idx - v_new_idx > v_settings.max_tier_degradation THEN
      v_new_tier := v_tier_order[v_current_idx - v_settings.max_tier_degradation];
    END IF;

    IF v_new_tier != v_customer.tier THEN
      UPDATE customers SET
        tier = v_new_tier,
        tier_updated_at = now(),
        spent_90d = v_customer.spent_90d,
        updated_at = now()
      WHERE id = v_customer.id;
      v_changes := v_changes + 1;
      -- TODO: отправить уведомление в Telegram (через Edge Function)
    ELSE
      UPDATE customers SET spent_90d = v_customer.spent_90d WHERE id = v_customer.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'customers_updated', v_changes);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `expire_points` — сгорание просроченных баллов (cron/Edge Function)

```sql
CREATE OR REPLACE FUNCTION expire_points()
RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_expired NUMERIC;
  v_total_expired NUMERIC := 0;
BEGIN
  FOR v_customer IN
    SELECT customer_id, SUM(remaining) AS expired_amount
    FROM loyalty_points
    WHERE remaining > 0 AND expires_at <= now()
    GROUP BY customer_id
  LOOP
    UPDATE loyalty_points SET remaining = 0
    WHERE customer_id = v_customer.customer_id AND remaining > 0 AND expires_at <= now();

    UPDATE customers SET
      loyalty_balance = loyalty_balance - v_customer.expired_amount,
      updated_at = now()
    WHERE id = v_customer.customer_id;

    INSERT INTO loyalty_transactions
      (customer_id, type, amount, balance_after, description)
    VALUES (v_customer.customer_id, 'expiration', -v_customer.expired_amount,
      (SELECT loyalty_balance FROM customers WHERE id = v_customer.customer_id),
      'Points expired');

    v_total_expired := v_total_expired + v_customer.expired_amount;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'total_expired', v_total_expired);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_customer_cabinet` — данные для личного кабинета (вызывает Telegram-бот / web-winter)

```sql
CREATE OR REPLACE FUNCTION get_customer_cabinet(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_settings RECORD;
  v_tier_config JSONB;
  v_orders JSONB;
  v_loyalty JSONB;
  v_next_expiry JSONB;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE token = p_token AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  SELECT * INTO v_settings FROM loyalty_settings LIMIT 1;
  SELECT t INTO v_tier_config FROM jsonb_array_elements(v_settings.tiers) t
    WHERE t->>'name' = v_customer.tier;

  -- Ближайшее сгорание баллов
  SELECT jsonb_build_object('amount', SUM(remaining), 'date', MIN(expires_at))
  INTO v_next_expiry
  FROM loyalty_points
  WHERE customer_id = v_customer.id AND remaining > 0
    AND expires_at <= now() + interval '7 days' AND expires_at > now();

  -- Последние заказы
  SELECT jsonb_agg(row_to_json(o)) INTO v_orders FROM (
    SELECT id, order_number, created_at, final_amount
    FROM orders WHERE customer_id = v_customer.id
    ORDER BY created_at DESC LIMIT 20
  ) o;

  -- История баллов
  SELECT jsonb_agg(row_to_json(lt)) INTO v_loyalty FROM (
    SELECT type, amount, balance_after, description, created_at
    FROM loyalty_transactions WHERE customer_id = v_customer.id
    ORDER BY created_at DESC LIMIT 50
  ) lt;

  RETURN jsonb_build_object(
    'success', true,
    'customer', jsonb_build_object(
      'name', v_customer.name,
      'tier', v_customer.tier,
      'cashback_pct', (v_tier_config->>'cashback_pct')::int,
      'loyalty_balance', v_customer.loyalty_balance,
      'total_visits', v_customer.total_visits,
      'total_spent', v_customer.total_spent,
      'spent_90d', v_customer.spent_90d,
      'average_check', v_customer.average_check,
      'member_since', v_customer.created_at
    ),
    'next_expiry', v_next_expiry,
    'orders', COALESCE(v_orders, '[]'::jsonb),
    'loyalty_history', COALESCE(v_loyalty, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Stores

**Создать по существующему паттерну** `src/stores/{domain}/`:

```
src/stores/customers/
  types.ts          -- Customer, StampCard, CustomerTier
  service.ts        -- CRUD + search по имени/telegram/телефону
  supabaseMappers.ts
  customersStore.ts -- initialize(), searchCustomers(),
                       createCustomer(), updateCustomer()
  index.ts

src/stores/loyalty/
  types.ts          -- LoyaltyPoints, LoyaltyTransaction, LoyaltySettings, StampReward
  service.ts        -- RPC calls (apply_cashback, redeem_points, add_stamps, convert_stamp_card)
  supabaseMappers.ts
  loyaltyStore.ts   -- settings, applyCashback(), redeemPoints(),
                       addStamps(), convertCard(), getCardInfo()
  index.ts
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

#### Сценарий: Физическая карточка

**Новый компонент:** `src/views/pos/loyalty/StampCardPanel.vue`

```
- Поле ввода номера карточки (001, 002...)
- Показывает: текущие штампы, дата последнего визита
- Кнопка "Новая карточка" -> присваивает следующий номер
- При оплате: автоначисление штампов
- Если есть активная награда -> список позиций из чека -> скидка
```

#### Сценарий: Цифровой профиль

**Новый компонент:** `src/views/pos/loyalty/CustomerPanel.vue`

```
- Поиск по имени / Telegram username
- Показывает: уровень, баланс, cashback % текущий
- Toggle "Use loyalty points" + input суммы
- Кнопка "Конвертация карточки" (если есть)
```

#### Сценарий: Конвертация

**Новый компонент:** `src/views/pos/loyalty/ConvertCardDialog.vue`

```
- Ввод номера карточки -> показ штампов
- Привязка к существующему профилю или создание нового
- Подтверждение -> RPC convert_stamp_card
- Показ результата: сколько баллов начислено
```

**Изменить:** `src/stores/pos/payments/paymentsStore.ts`

```typescript
// В processSimplePayment(), после успешной оплаты:
if (order.customerId) {
  // Блок 2: cashback баллами
  await loyaltyStore.applyCashback(order.customerId, order.id, totalAmount)
} else if (order.stampCardId) {
  // Блок 1: штампы
  await loyaltyStore.addStamps(order.stampCardId, order.id, totalAmount)
}
```

### 2.5 Admin — Loyalty screens

**Добавить в** `src/views/admin/types.ts`:

```typescript
export type AdminScreenName = 'menu' | 'channels' | 'dashboard' | 'customers' | 'loyalty'
```

**Создать** `src/views/admin/loyalty/`:

`LoyaltySettingsScreen.vue` — настройки обоих блоков:

```
- Блок 1: штампов в цикле, порог, срок жизни, список наград
- Блок 2: уровни (название, cashback %, порог), срок баллов, бонус конвертации
- Все параметры редактируемые, сохраняются в loyalty_settings
```

**Создать** `src/views/admin/customers/`:

`CustomersScreen.vue` — список клиентов:

```
- Поиск по имени/телефону/telegram (debounced)
- Карточки: имя, Telegram, уровень, баланс, последний визит
- Фильтр по уровню (Member/Regular/VIP)
- Кнопка "Add Customer"
- Тап -> CustomerDetailScreen
```

`CustomerDetailScreen.vue` — профиль:

```
- Имя, Telegram, телефон, статус (active/blocked)
- Уровень лояльности + баланс баллов
- Статистика: визиты, total spent, avg check, spent 90d, LTV
- История заказов (пагинация)
- История баллов
- Кнопка "Скопировать ссылку кабинета" -> token URL
- Ручная корректировка баланса (только admin)
- Ручная установка уровня VIP (для экспатов при запуске)
```

`StampCardsScreen.vue` — управление карточками:

```
- Список по номерам: 001, 002...
- Статус: active / converted / expired
- Текущие штампы, дата последнего визита
- История визитов по карточке
```

---

## Модуль 3: Аналитика клиентов (после модуля 2)

### Метрики для отслеживания

```
По клиентам:
- LTV (lifetime value) = total_spent за все время
- Частота визитов = total_visits / (last_visit - first_visit в неделях)
- Средний чек = average_check
- Retention = % вернувшихся за 30/60/90 дней

По программе лояльности:
- Total cashback выдано за период
- Total баллов списано/сгорело за период
- % заказов с привязанным клиентом/карточкой
- Распределение по уровням (Member/Regular/VIP)
- Cost of loyalty: выданные бесплатные блюда + cashback / выручка

По карточкам:
- Активных карточек, средние штампы до конвертации
- Конверсия: карточка -> цифровой профиль %
- Использование наград: какие категории выбирают

Сегментация:
- По уровню лояльности
- По частоте визитов
- По сумме трат
- По типу: карточка vs цифровой профиль
```

### SQL view для аналитики

```sql
CREATE VIEW v_customer_analytics AS
SELECT
  c.id,
  c.name,
  c.tier,
  c.total_spent,
  c.spent_90d,
  c.total_visits,
  c.average_check,
  c.loyalty_balance,
  c.first_visit_at,
  c.last_visit_at,
  c.telegram_id IS NOT NULL AS has_telegram,
  EXTRACT(DAY FROM now() - c.last_visit_at) AS days_since_last_visit,
  ROUND(c.total_visits::numeric /
    GREATEST(1, EXTRACT(MONTH FROM age(now(), c.first_visit_at)) + 1), 1
  ) AS visits_per_month,
  (SELECT COUNT(*) FROM stamp_cards sc
    WHERE sc.customer_id = c.id AND sc.status = 'converted') AS converted_cards
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

**Миграции БД:**

| Задача                                       | Статус |
| -------------------------------------------- | ------ |
| Migration A: customers                       | ⬜     |
| Migration B: stamp_cards                     | ⬜     |
| Migration C: stamp_entries                   | ⬜     |
| Migration D: loyalty_points                  | ⬜     |
| Migration E: loyalty_transactions            | ⬜     |
| Migration F: loyalty_settings                | ⬜     |
| Migration G: orders + customer_id/stamp_card | ⬜     |

**RPC функции:**

| Задача                        | Статус |
| ----------------------------- | ------ |
| RPC: add_stamps               | ⬜     |
| RPC: apply_cashback           | ⬜     |
| RPC: redeem_points (FIFO)     | ⬜     |
| RPC: convert_stamp_card       | ⬜     |
| RPC: recalculate_tiers (cron) | ⬜     |
| RPC: expire_points (cron)     | ⬜     |
| RPC: get_customer_cabinet     | ⬜     |

**Stores:**

| Задача           | Статус |
| ---------------- | ------ |
| Store: customers | ⬜     |
| Store: loyalty   | ⬜     |

**POS интеграция:**

| Задача                               | Статус |
| ------------------------------------ | ------ |
| POS: StampCardPanel                  | ⬜     |
| POS: CustomerPanel                   | ⬜     |
| POS: ConvertCardDialog               | ⬜     |
| POS: автоначисление штампов/cashback | ⬜     |

**Admin:**

| Задача                       | Статус |
| ---------------------------- | ------ |
| Admin: LoyaltySettingsScreen | ⬜     |
| Admin: CustomersScreen       | ⬜     |
| Admin: CustomerDetailScreen  | ⬜     |
| Admin: StampCardsScreen      | ⬜     |

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
