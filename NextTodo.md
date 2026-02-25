# Sprint: Channel Profitability & Marketing Attribution

## Цель

Построить отчёт доходности по каналам продаж с учётом food cost, комиссий, скидок и маркетинга.

## Модель каналов

```
Каналы (для P&L анализа):
├── cafe (dine_in + takeaway) — внутренний, люди приходят в кафе
├── gobiz (GoFood)           — delivery platform, 20% комиссия
└── grab (Grab Food)         — delivery platform, 25% комиссия
```

**Важно:** `dine_in` и `takeaway` объединяются в `cafe` — это один бизнес-канал.
Маркетинг для кафе привлекает людей, которые могут есть на месте или взять с собой.

---

## Задачи

### 1. Marketing subcategories (DB migration)

**Статус:** TODO

Добавить подкатегории маркетинга для привязки к каналу:

```sql
-- Новые категории (дети marketing)
google_ads       → cafe        -- Google Ads (приводит людей в кафе)
social_media     → cafe        -- Instagram, TikTok и т.д.
influencer       → cafe        -- Блогеры, обзоры
gofood_promo     → gobiz       -- Промо внутри GoFood (скидки, boost)
grab_promo       → grab        -- Промо внутри Grab
offline_promo    → cafe        -- Флаеры, вывески, локальная реклама
other_marketing  → NULL        -- Общий маркетинг (не привязан к каналу)
```

**Что нужно:**

- Добавить поле `parent_id` в `transaction_categories` (ссылка на parent = marketing)
- Добавить поле `channel_code` в `transaction_categories` (привязка к каналу: cafe/gobiz/grab/NULL)
- Создать подкатегории маркетинга
- Обновить UI выбора категории расхода (показывать подкатегории при выборе Marketing)

**Миграция:**

```sql
ALTER TABLE transaction_categories ADD COLUMN parent_id uuid REFERENCES transaction_categories(id);
ALTER TABLE transaction_categories ADD COLUMN channel_code text;

INSERT INTO transaction_categories (id, code, name, type, is_opex, is_system, parent_id, channel_code, sort_order)
VALUES
  (gen_random_uuid(), 'google_ads',      'Google Ads',       'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), 'cafe',  1),
  (gen_random_uuid(), 'social_media',    'Social Media',     'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), 'cafe',  2),
  (gen_random_uuid(), 'influencer',      'Influencer',       'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), 'cafe',  3),
  (gen_random_uuid(), 'gofood_promo',    'GoFood Promo',     'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), 'gobiz', 4),
  (gen_random_uuid(), 'grab_promo',      'Grab Food Promo',  'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), 'grab',  5),
  (gen_random_uuid(), 'offline_promo',   'Offline Promo',    'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), 'cafe',  6),
  (gen_random_uuid(), 'other_marketing', 'Other Marketing',  'expense', true, false, (SELECT id FROM transaction_categories WHERE code='marketing'), NULL,    7);
```

---

### 2. View: v_channel_profitability (DB)

**Статус:** TODO

Аналитический view для P&L по каналам.

**Логика группировки:**

- `orders.channel_code IN ('dine_in', 'takeaway')` или NULL → `cafe`
- `orders.channel_code = 'gobiz'` → `gobiz`
- `orders.channel_code = 'grab'` → `grab`

**Колонки:**

```
channel          — cafe / gobiz / grab
period           — month (date_trunc)
orders_count     — кол-во заказов
items_sold       — кол-во позиций
revenue_gross    — выручка до скидок
revenue_net      — выручка после скидок (реально собрано)
total_discounts  — скидки (loyalty, promo)
food_cost        — FIFO себестоимость ингредиентов
gross_profit     — revenue_net - food_cost
commission       — комиссия платформы (gojek_commission, grab_commission)
marketing_cost   — маркетинг привязанный к каналу
net_profit       — gross_profit - commission - marketing_cost
food_cost_pct    — food_cost / revenue_net * 100
net_margin_pct   — net_profit / revenue_net * 100
```

**Источники данных:**

- Revenue + Discounts + Food cost → `sales_transactions.profit_calculation` (JOIN orders для channel)
- Commissions → `transactions` WHERE category = gojek_commission / grab_commission
- Marketing → `transactions` WHERE category IN (marketing subcategories) + channel_code

---

### 3. AI Sherpa access (DB)

**Статус:** DONE

- [x] Роль `ai_readonly` с SELECT на 25 таблиц
- [x] Edge Function `sql-proxy` с API key auth
- [x] Views: `v_menu_with_cost`, `v_daily_sales`, `v_food_cost_report`, `v_recipe_details`
- [x] `v_food_cost_report` обновлён: gross/net revenue, food_cost_pct_net/gross
- [x] Документация: `src/About/docs/ai-agent/sb-agent/README.md`

---

### 4. Data fix: Tom yam paste & Sereh costs

**Статус:** DONE

- [x] Migration 155: Fix batch costs (Tom yam paste 13000→200, Sereh >3000→1286)
- [x] Recalculated ~20 sales_transactions JSONB
- [x] Tom Yum margin: -177% → +36.5%

---

### 5. UI: Marketing expense subcategory selector

**Статус:** TODO

Обновить UI формы расхода:

- При выборе категории "Marketing" → показать подкатегории (Google Ads, Social Media, etc.)
- Каждая подкатегория автоматически привязана к каналу
- Обратная совместимость: старые записи с `marketing` без subcategory → `other_marketing`

---

### 6. UI/View: Channel Profitability Report

**Статус:** TODO

Страница в backoffice `/reports/channels` (или вкладка в существующем отчёте):

- Период: month picker
- Таблица: cafe vs gobiz vs grab
- Колонки: revenue, food cost, discounts, commissions, marketing, net profit, margins
- Графики: trend по месяцам

---

## Порядок выполнения

```
1. Migration: marketing subcategories (parent_id, channel_code)  ← DB only
2. Migration: v_channel_profitability view                       ← DB only
3. Grant SELECT на новые объекты для ai_readonly                 ← DB only
4. UI: expense subcategory selector                              ← Frontend
5. UI: channel profitability report page                         ← Frontend
```

Шаги 1-3 можно сделать сейчас (только DB), AI-шерпа сразу получит доступ.
Шаги 4-5 — фронтенд, можно делать позже.
