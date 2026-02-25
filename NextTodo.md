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

---

## Задачи

### 1. Marketing subcategories (DB migration)

**Статус:** DONE (DEV + PROD)

Подкатегории маркетинга по каналам продаж:

```
marketing (parent)
├── marketing_cafe   → cafe   (Google Ads, Instagram, блогеры, флаеры)
├── marketing_gojek  → gobiz  (GoFood промо, буст)
├── marketing_grab   → grab   (Grab промо, буст)
└── marketing_other  → NULL   (общий маркетинг)
```

**Миграция 157:** `parent_id`, `channel_code` в `transaction_categories` + 4 подкатегории
**Данные:** Существующие marketing расходы 2026 переназначены на `marketing_cafe`

---

### 2. View: v_channel_profitability (DB)

**Статус:** DONE (DEV + PROD)

**Миграция 158:** P&L view по каналам (cafe/gobiz/grab) per month

- Revenue (gross/net), discounts, food cost, commissions, marketing, net profit
- Fallback для старых profit_calculation (revenue/cost → netRevenue/ingredientsCost)

---

### 3. AI Sherpa access (DB)

**Статус:** DONE (DEV + PROD)

- [x] Миграция 159: GRANT SELECT on v_channel_profitability + transaction_categories for ai_readonly

---

### 4. Frontend: Marketing subcategory in expense dropdowns

**Статус:** DONE

- [x] `TransactionCategory` type — добавлены `parentId`, `channelCode`
- [x] `categoryService.ts` — маппинг `parent_id` → `parentId`, `channel_code` → `channelCode`
- [x] Account store getters — parent категории (marketing) скрыты из dropdowns, показываются children
- [x] POS ExpenseOperationDialog и Backoffice OperationDialog автоматически показывают подкатегории

---

### 5. Frontend: P&L Report — marketing subcategory grouping

**Статус:** DONE

- [x] `plReportStore.ts` — OPEX агрегация группирует subcategories под parent
- [x] `PLReport` type — добавлен `opex.bySubcategory`
- [x] `PLReportView.vue` — marketing показывается с вложенными sub-items (indented)

---

### 6. UI/View: Channel Profitability Report

**Статус:** DONE (DEV + PROD)

- [x] Страница `/analytics/channel-profitability` — `ChannelProfitabilityView.vue`
- [x] Summary cards per channel, P&L comparison table, monthly trend
- [x] Route + Navigation menu item ("Channel P&L" under Reports)
- [x] View fix: use `finalRevenue` as unified revenue base (tax-normalized)
- [x] `revenue_net = revenue_gross - discounts` (NOT netRevenue which deducts commission)
- [x] `tax_collected` from orders table (order-level, not per-item)
- [x] Applied to both DEV and PROD

---

## Порядок выполнения

```
1. ✅ Migration: marketing subcategories (parent_id, channel_code)
2. ✅ Migration: v_channel_profitability view
3. ✅ Grant SELECT на новые объекты для ai_readonly
4. ✅ Frontend: expense subcategory selector
5. ✅ Frontend: P&L report marketing grouping
6. ✅ Frontend: channel profitability report page
```
