# TODO - Kitchen App Backoffice

## 🚀 Gobiz Integration Project

### Цели интеграции

1. **Multi-channel Sales** - создать отдельные каналы продаж (Dine-in, GoBiz/GoFood, Grab, и т.д.)
2. **Dynamic Pricing** - разные цены для разных каналов + динамическое ценообразование
3. **Menu Sync** - синхронизация меню с внешними платформами
4. **Order Integration** - получение заказов из GoFood прямо в POS
5. **Availability Management** - управление доступностью позиций по каналам
6. **Marketing/Promos** - интеграция промо-акций с платформой
7. **Analytics** - отчеты по продажам по каналам

---

## 📚 API Gobiz - Возможности

### Authentication

| Метод              | Описание                       | Применение                |
| ------------------ | ------------------------------ | ------------------------- |
| Client Credentials | OAuth 2.0 прямая интеграция    | Для нашего приложения     |
| Authorization Code | OAuth с согласием пользователя | Для POS-провайдеров       |
| Refresh Token      | Обновление токенов             | Автоматическое обновление |

**Token lifetime:** 3600 сек (1 час)

### Menu Management API

| Endpoint                                         | Метод    | Возможность                    |
| ------------------------------------------------ | -------- | ------------------------------ |
| `GET /gofood/outlets/{id}/v2/catalog`            | Получить | Скачать текущее меню           |
| `PUT /gofood/outlets/{id}/v1/catalog`            | Обновить | Полная синхронизация меню      |
| `PATCH /gofood/outlets/{id}/v2/menu_item_stocks` | Обновить | Вкл/выкл доступность товаров   |
| `PATCH /gofood/outlets/{id}/v2/variant_stocks`   | Обновить | Вкл/выкл доступность вариантов |

**Поддерживает:**

- ✅ Категории с множественными товарами
- ✅ Варианты (модификаторы) с min/max выбором
- ✅ Цены на уровне товара и варианта
- ✅ Расписание работы по товарам
- ✅ Изображения (max 1MB, 1:1)
- ✅ Статусы наличия (in/out of stock)

### Order Management API

| Endpoint                                                        | Метод     | Возможность             |
| --------------------------------------------------------------- | --------- | ----------------------- |
| `PUT /gofood/outlets/{id}/v1/accept-order`                      | Принять   | Принять ожидающий заказ |
| `PUT /gofood/outlets/{id}/v1/reject-order`                      | Отклонить | Отклонить заказ         |
| `PUT /gofood/outlets/{id}/v1/orders/{type}/{num}/food-prepared` | Статус    | Уведомить о готовности  |

**Режимы приема заказов:**

- Auto Accept - автоматический прием
- Manual Accept - 3 минуты на решение
- Auto Accept on Timeout - 60 сек на ручное, потом автопринятие

### Promotions API

| Endpoint                                            | Метод   | Возможность                         |
| --------------------------------------------------- | ------- | ----------------------------------- |
| `POST /promo/outlets/{id}/v1/food-promos`           | Создать | Создать SKU-промо (мин. 10% скидка) |
| `GET /promo/outlets/{id}/v1/food-promos`            | Список  | Получить все промо точки            |
| `GET /promo/outlets/{id}/v1/food-promos/{promo_id}` | Деталь  | Детали конкретного промо            |

**✅ Что ЕСТЬ в Promo API:**

- ✅ SKU Promo (скидка на конкретный товар)
- ✅ Фиксированная selling_price (новая цена)
- ✅ Период действия (start_date / end_date)
- ✅ Привязка к menu item по external_menu_id
- ✅ Минимум 10% скидка от оригинальной цены
- ✅ Автоматическое отключение по дате

**❌ Чего НЕТ в API (только через веб-интерфейс GoBiz):**

- ❌ Ads / Sponsored listings / Продвижение
- ❌ Bundle deals (комбо-наборы)
- ❌ BOGO (Buy One Get One)
- ❌ Percentage discount (только fixed price)
- ❌ Vouchers / Coupons
- ❌ Campaigns (маркетинговые кампании)
- ❌ Таргетинг по клиентам
- ❌ Flash sales

**⚠️ Вывод по Ads & Promo:**
API ограничен базовыми SKU-промо. Для полноценного маркетинга (ads, bundles, vouchers, campaigns) необходимо использовать веб-интерфейс GoBiz или мобильное приложение напрямую. Нет программного доступа к этим функциям.

### Outlet Management

| Endpoint                                   | Метод    | Возможность           |
| ------------------------------------------ | -------- | --------------------- |
| `PATCH /gofood/outlets/{id}/v1/properties` | Обновить | Открыть/закрыть точку |

### Webhooks (Real-time Events)

```
POST /integrations/partner/v1/notification-subscriptions
```

**Доступные события:**
| Event | Описание |
|-------|----------|
| `gofood.order.awaiting_merchant_acceptance` | Новый заказ ждет подтверждения |
| `gofood.order.merchant_accepted` | Заказ подтвержден |
| `gofood.order.cancelled` | Заказ отменен |
| `gofood.order.completed` | Заказ доставлен |
| `gofood.order.driver_otw_pickup` | Курьер в пути |
| `gofood.order.driver_arrived` | Курьер на месте |
| `gofood.catalog.menu_mapping_updated` | Меню синхронизировано |
| `gofood.order.webhook_error` | Ошибка (например, товара нет в меню) |

### Payments API (QRIS)

| Endpoint                                            | Метод    | Возможность         |
| --------------------------------------------------- | -------- | ------------------- |
| `POST /payment/outlets/{id}/v2/transactions`        | Создать  | Создать QRIS платеж |
| `GET /payment/outlets/{id}/v1/transactions/{tx_id}` | Получить | Статус транзакции   |

### Environments

| Среда      | OAuth URL                                  | API URL                                    |
| ---------- | ------------------------------------------ | ------------------------------------------ |
| Sandbox    | `https://integration-goauth.gojekapi.com/` | `https://api.partner-sandbox.gobiz.co.id/` |
| Production | `https://accounts.go-jek.com/`             | `https://api.gobiz.co.id/`                 |

---

## 🎯 Хотелки (Requirements)

### 1. Multi-Channel Architecture

- [ ] Создать сущность `SalesChannel` (dine-in, gobiz, grab, takeaway)
- [ ] Расширить `Product` для поддержки цен по каналам
- [ ] Расширить `MenuItem` для доступности по каналам
- [ ] UI для управления каналами продаж

### 2. Channel-specific Pricing

- [ ] Таблица `channel_prices` (product_id, channel_id, price, is_active)
- [ ] UI для настройки цен по каналам
- [ ] Автоматическая маржа для delivery-каналов (например +15%)
- [ ] Правила ценообразования (базовая цена + множитель канала)

### 3. Dynamic Pricing Engine

- [ ] Интеграция с загрузкой кухни (kitchen load factor)
- [ ] Время дня (happy hour, пиковые часы)
- [ ] Промо-правила (если < X заказов - скидка Y%)
- [ ] Синхронизация динамических цен с GoBiz Promo API

### 4. Menu Synchronization

- [ ] Сервис `GobizMenuSyncService`
- [ ] Маппинг локальных категорий → GoBiz категории
- [ ] Маппинг модификаторов → GoBiz варианты
- [ ] Изображения: загрузка/кеширование
- [ ] Расписание доступности (operational hours)
- [ ] Двусторонняя синхронизация статуса наличия

### 5. Order Integration

- [ ] Webhook endpoint для получения заказов
- [ ] `GobizOrderAdapter` - конвертация в наш формат `Order`
- [ ] Интеграция в POS: отдельная секция "Online Orders"
- [ ] Push-уведомления о новых заказах
- [ ] Статусы заказа: pending → accepted → preparing → ready → picked_up

### 6. Availability Management

- [ ] Real-time sync: если товар заканчивается → автоматически mark as out-of-stock
- [ ] Bulk actions: отключить категорию целиком
- [ ] Schedule: доступность по расписанию

### 7. Analytics & Reporting

- [ ] Продажи по каналам (revenue, orders, avg ticket)
- [ ] Популярные товары по каналам
- [ ] Комиссии платформ
- [ ] Сравнение каналов

---

## 🔧 Что нужно изменить в системе

### Database Schema Changes

```sql
-- 1. Sales Channels
CREATE TABLE sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'dine_in', 'gobiz', 'grab'
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'internal', 'delivery_platform', 'takeaway'
  is_active BOOLEAN DEFAULT true,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Channel Prices
CREATE TABLE channel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  channel_id UUID REFERENCES sales_channels(id),
  price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(product_id, channel_id)
);

-- 3. Channel Menu Items (availability)
CREATE TABLE channel_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id),
  channel_id UUID REFERENCES sales_channels(id),
  is_available BOOLEAN DEFAULT true,
  external_id TEXT, -- ID в внешней системе (GoBiz item ID)
  last_synced_at TIMESTAMPTZ,
  UNIQUE(menu_item_id, channel_id)
);

-- 4. Channel Orders (для отслеживания источника)
ALTER TABLE orders ADD COLUMN channel_id UUID REFERENCES sales_channels(id);
ALTER TABLE orders ADD COLUMN external_order_id TEXT; -- GoBiz order number
ALTER TABLE orders ADD COLUMN external_status TEXT; -- статус во внешней системе

-- 5. GoBiz Integration Config
CREATE TABLE gobiz_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id TEXT NOT NULL, -- GoBiz outlet ID
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL, -- encrypted
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_secret TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Pricing Rules (для динамического ценообразования)
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES sales_channels(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'time_based', 'load_based', 'promo'
  conditions JSONB NOT NULL, -- { "hours": [11,14], "days": [1,2,3,4,5] }
  action JSONB NOT NULL, -- { "type": "percent", "value": -10 }
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ
);
```

### New Services/Modules

```
src/
├── integrations/
│   ├── gobiz/
│   │   ├── GobizApiClient.ts      # HTTP client with OAuth
│   │   ├── GobizAuthService.ts    # Token management
│   │   ├── GobizMenuSync.ts       # Menu synchronization
│   │   ├── GobizOrderAdapter.ts   # Order conversion
│   │   ├── GobizWebhookHandler.ts # Webhook processing
│   │   ├── GobizPromoSync.ts      # Promo synchronization
│   │   └── types.ts               # GoBiz API types
│   └── index.ts
├── stores/
│   ├── channels/
│   │   ├── channelsStore.ts       # Sales channels management
│   │   ├── pricingStore.ts        # Channel pricing
│   │   └── types.ts
│   └── ...
├── views/
│   ├── channels/
│   │   ├── ChannelsListView.vue   # Manage sales channels
│   │   ├── ChannelPricingView.vue # Set prices per channel
│   │   └── components/
│   └── integrations/
│       ├── GobizSettingsView.vue  # GoBiz configuration
│       ├── GobizMenuSyncView.vue  # Menu sync UI
│       └── GobizOrdersView.vue    # Online orders dashboard
└── ...
```

### POS Changes

```
src/views/pos/
├── online-orders/
│   ├── OnlineOrdersPanel.vue    # Панель онлайн-заказов
│   ├── OnlineOrderCard.vue      # Карточка заказа GoBiz
│   ├── OnlineOrderActions.vue   # Accept/Reject/Ready
│   └── OnlineOrderDetails.vue   # Детали заказа
└── ...
```

---

## 📋 Phases (Этапы внедрения)

### Phase 1: Foundation (Multi-channel Architecture) ✅ COMPLETED

**Цель:** Базовая архитектура каналов продаж

1. [x] Database migration `137_sales_channels.sql` (sales_channels, channel_prices, channel_menu_items + orders columns)
2. [x] channelsStore (store + service + mappers + types) - полный модуль
3. [x] Channel pricing: ChannelPricingView с inline-редактированием, copy prices, net/gross toggle
4. [x] UI: ChannelsListView - CRUD каналов с диалогами создания/редактирования
5. [x] UI: отдельная страница Channel Pricing (матрица товары x каналы)
6. [x] Router & Navigation: /channels, /menu/channel-pricing + lazy store guards
7. [x] POS интеграция: channel_id/channelCode в PosOrder, OrderTypeDialog с выбором канала
8. [x] Store initialization: channels в StoreName, dependencies, обе стратегии инициализации

### Phase 1.5: POS Channel-Aware Orders & Pricing ✅ COMPLETED

**Цель:** Каждый POS-заказ автоматически получает канал продаж, цены берутся из channel_prices

1. [x] Auto-assign channel: dine_in заказы (клик по столу) → channelId + channelCode='dine_in'
2. [x] Auto-assign channel: takeaway заказы → channelId + channelCode='takeaway'
3. [x] Delivery (GoJek/Grab) — уже работало через OrderTypeDialog step 2
4. [x] Channel-aware pricing: при добавлении товара в заказ — lookup `channelsStore.getChannelPrice()`, используется net price канала вместо base price
5. [x] Persist channel_code: `supabaseMappers.ts` — write/read `channel_code` в/из Supabase
6. [x] DB migration `140_add_channel_code_to_orders.sql` — колонка `channel_code TEXT` в orders

**Файлы:**

- `src/views/pos/tables/TablesSidebar.vue` — import channelsStore, auto-assign для dine_in + takeaway
- `src/views/pos/PosMainView.vue` — channel price lookup в handleAddItemToOrder
- `src/stores/pos/orders/supabaseMappers.ts` — persist/read channel_code
- `src/supabase/migrations/140_add_channel_code_to_orders.sql`

### Phase 2: GoBiz Integration Core

**Цель:** Базовая интеграция с GoBiz API

1. [ ] GobizApiClient с OAuth (client credentials)
2. [ ] GobizAuthService - управление токенами
3. [ ] gobiz_config таблица и UI настроек
4. [ ] Тестирование в Sandbox окружении

### Phase 3: Menu Synchronization

**Цель:** Синхронизация меню с GoBiz

1. [ ] GobizMenuSync сервис
2. [ ] Маппинг категорий и товаров
3. [ ] UI для управления синхронизацией
4. [ ] Автоматическая синхронизация при изменениях
5. [ ] Stock sync (наличие/отсутствие)

### Phase 4: Order Integration

**Цель:** Прием заказов из GoBiz в POS

1. [ ] Webhook endpoint (Supabase Edge Function)
2. [ ] GobizOrderAdapter
3. [ ] OnlineOrdersPanel в POS
4. [ ] Accept/Reject flow
5. [ ] Order status updates (food-prepared)
6. [ ] Push-notifications

### Phase 5: Dynamic Pricing & Promos

**Цель:** Динамическое ценообразование

1. [ ] Pricing rules engine
2. [ ] Kitchen load integration
3. [ ] Time-based pricing
4. [ ] GoBiz Promo API integration
5. [ ] UI для правил ценообразования

### Phase 6: Analytics

**Цель:** Отчетность по каналам

1. [ ] Channel-based sales reports
2. [ ] Commission tracking
3. [ ] Performance comparison
4. [ ] Dashboard widgets

---

## ⚠️ Ограничения API

1. **Menu updates = полная перезапись** (не инкрементальные)
2. **Промо минимум 10% скидки**
3. **Токен живет 1 час** - нужен auto-refresh
4. **HTTP 4xx = некорректный запрос** (не повторять)
5. **HTTP 5xx = проблемы сервера** (можно повторить)
6. **Изображения max 1MB, aspect ratio 1:1**
7. **Manual accept timeout = 3 минуты**

---

## 🔗 Полезные ссылки

- [GoBiz API Docs](https://app.gobiz.com/files/static/cpp/docs/index.html)
- Sandbox OAuth: `https://integration-goauth.gojekapi.com/`
- Sandbox API: `https://api.partner-sandbox.gobiz.co.id/`
- Production OAuth: `https://accounts.go-jek.com/`
- Production API: `https://api.gobiz.co.id/`

---

## 📝 Notes

- Нужно получить API credentials от GoBiz (client_id, client_secret)
- Для webhook нужен публичный HTTPS endpoint (Supabase Edge Function)
- Рассмотреть интеграцию с Grab в будущем (похожий подход)
