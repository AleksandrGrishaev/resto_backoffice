# SYSTEM_OVERVIEW.md

# Solar Kitchen — Общая архитектура системы

> Этот файл кладётся в ОБА проекта.
> Он даёт полную картину системы и объясняет где проходит граница ответственности.

---

## Конечная цель системы

```
Клиент сидит за столом → сканирует QR → видит меню
Клиент хочет взять с собой → открывает сайт → оформляет takeaway заказ
Клиент копит баллы → открывает личный кабинет → видит карточку, баланс, историю

Кассир в POS → видит клиента, его уровень лояльности, баланс баллов
Менеджер → видит продажи в разрезе сегментов клиентов, LTV, retention
```

---

## Два проекта

|                 | Backoffice                         | Web Winter               |
| --------------- | ---------------------------------- | ------------------------ |
| **Репозиторий** | `kitchen-app/backoffice`           | `kitchen-app/web-winter` |
| **Стек**        | Vue 3 + Vuetify + Pinia            | Nuxt 3 + Tailwind        |
| **Аудитория**   | Персонал кафе (кассиры, менеджеры) | Клиенты кафе             |
| **Доступ к БД** | Полный (read + write)              | Только чтение + RPC      |
| **Claude CLI**  | Свой инстанс                       | Свой инстанс             |

---

## Единая база данных Supabase

Оба проекта работают с одной БД. Все изменения схемы — **только через backoffice**.

```
┌──────────────────────────────────────────────────────────┐
│                   Supabase PostgreSQL                    │
│                                                          │
│  МЕНЮ:        menu_items, menu_categories,               │
│               channel_prices, sales_channels             │
│                                                          │
│  КЛИЕНТЫ:     customers, loyalty_transactions,           │
│               loyalty_settings                           │
│                                                          │
│  ЗАКАЗЫ:      orders, order_items, payments, tables      │
│               (+ customer_id, guest_count в orders)      │
│                                                          │
│  RPC:         apply_cashback, redeem_loyalty,            │
│               get_customer_cabinet,                      │
│               create_online_order (будущее)              │
└───────────────┬──────────────────────┬───────────────────┘
                │ Full access          │ Anon key + RPC
                ▼                      ▼
          BACKOFFICE              WEB WINTER
```

---

## Зоны ответственности

### BACKOFFICE владеет:

- Всей схемой БД (миграции, таблицы, индексы)
- Всеми RPC функциями
- Бизнес-логикой (начисление баллов, списание, расчёты)
- POS: заказы, оплата, привязка клиента
- Admin: управление клиентами, аналитика, настройки

### WEB WINTER владеет:

- Публичным меню (`apps/menu`)
- Личным кабинетом клиента (`apps/cabinet`)
- Takeaway заказом (`apps/menu` или отдельный app, будущее)
- Всем клиентским UX

### Правило: WEB WINTER никогда не пишет в БД напрямую

Только через RPC функции, созданные в backoffice.

---

## Четыре продукта (roadmap)

```
СЕЙЧАС                          СКОРО                    БУДУЩЕЕ
─────────────────────────────────────────────────────────────────
[1] Меню-сайт        ──▶  [2] Личный кабинет  ──▶  [3] Takeaway
    web-winter/menu            web-winter/cabinet        web-winter
    Читает menu_items          /me/[token]               create_online_order
    Публичное, без авторизации QR карточка + баллы       Корзина + оплата

[4] POS с клиентами  ──▶  Везде сквозной клиент и программа лояльности
    backoffice             customers + loyalty везде
    Кассир видит LTV       Аналитика по сегментам
```

---

## Интеграционные точки (где проекты пересекаются)

### 1. Меню — данные из backoffice, отображение в web-winter

```
backoffice Admin → редактирует menu_items, channel_prices
web-winter /menu → читает те же таблицы через SELECT
```

Детали: см. `BACKOFFICE_ROADMAP.md` → раздел "Меню"

### 2. Кабинет клиента — создаётся в backoffice, открывается в web-winter

```
backoffice POS → создаёт клиента, начисляет баллы
backoffice Admin → генерирует ссылку /me/[token]
web-winter /me/[token] → вызывает RPC get_customer_cabinet → отображает
```

Детали: см. `BACKOFFICE_ROADMAP.md` → раздел "Клиенты и лояльность"

### 3. Takeaway заказ — оформляется в web-winter, попадает в POS

```
web-winter → вызывает RPC create_online_order
backoffice POS → получает заказ через Realtime
```

Детали: будущее, описано в `WEBWINTER_ROADMAP.md`

---

## Порядок разработки (глобальный)

```
Фаза 1 — BACKOFFICE: фундамент клиентской базы
  • DB миграции: customers, loyalty, расширение orders
  • RPC: apply_cashback, redeem_loyalty, get_customer_cabinet
  • Stores: customers + loyalty
  • POS: привязка клиента + автоначисление cashback
  ↓
  [web-winter может начать cabinet]

Фаза 2 — ПАРАЛЛЕЛЬНО
  BACKOFFICE:                       WEB WINTER:
  • Admin: customers screens        • apps/cabinet: /me/[token]
  • Admin: loyalty settings         • QR карточка + баланс
  • Аналитика: LTV, retention       • История заказов и баллов

Фаза 3 — TAKEAWAY (будущее)
  BACKOFFICE:                       WEB WINTER:
  • RPC: create_online_order        • Корзина + оформление
  • Realtime: статус заказа         • Статус заказа Realtime
  • Оплата: интеграция Xendit/Midtrans
```

---

## Связанные документы

| Файл                    | Где лежит   | Для кого          |
| ----------------------- | ----------- | ----------------- |
| `SYSTEM_OVERVIEW.md`    | оба проекта | оба Claude        |
| `BACKOFFICE_ROADMAP.md` | backoffice/ | Claude backoffice |
| `WEBWINTER_ROADMAP.md`  | web-winter/ | Claude web-winter |

---

## Базы данных

|                | DEV                                | PROD                               |
| -------------- | ---------------------------------- | ---------------------------------- |
| URL            | `fjkfckjpnbcyuknsnchy.supabase.co` | `bkntdcvzatawencxghob.supabase.co` |
| Backoffice MCP | `mcp__supabase_dev__*`             | `mcp__supabase_prod__*`            |
| Web-winter     | `NUXT_PUBLIC_SUPABASE_URL` в .env  | idem                               |
