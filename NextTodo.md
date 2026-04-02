# Sprint: Website Order ↔ POS Sync — Item-level Origin Tracking

## Problem Statement

Когда онлайн-заказ с сайта перемещается в POS (merge на занятый стол, перенос bill на другой стол), клиент на сайте **теряет видимость своих позиций**, потому что `order_id` меняется, а RPC `get_my_orders` ищет items только по `order_id`.

### Текущая архитектура

- **Сайт (web-winter)** polling каждые 15 сек через `get_my_orders` RPC
- Заказ идентифицируется по `orders.id` (UUID), items привязаны через `order_items.order_id`
- Bills — чисто POS-концепция, клиент их не видит
- `external_order_id` — для GoFood/Grab, НЕ для website orders

### Что ломается при операциях POS

| Действие в POS                                | Что видит клиент на сайте                       |
| --------------------------------------------- | ----------------------------------------------- |
| Merge на занятый стол                         | Items получают новый `order_id` → **пропадают** |
| Перемещение bill на другой стол (новый заказ) | Items получают новый `order_id` → **пропадают** |
| Перемещение items между bills того же заказа  | ✅ Ничего не меняется (тот же `order_id`)       |
| Изменение статуса (waiting→cooking→ready)     | ✅ Клиент видит обновление                      |

### Уже исправлено (текущий sprint)

- ✅ **Kitchen duplication fix** — при merge items удаляются из старого заказа в kitchen store (guard по `oldItem.order_id !== item.order_id`)
- ✅ **Website metadata preserved** — `preserveWebsiteMetadata()` копирует `source`, `customerPhone`, `comment`, `fulfillmentMethod` и т.д. при merge
- ✅ **Double updateOrder removed** — убран дублирующий вызов после merge
- ✅ **KITCHEN_ACTIVE_STATUSES** — вынесена константа, заменены 7 inline-дупликатов
- ✅ **accrual_date types** — убраны `as any` касты

---

## Solution: Origin Tracking на уровне items

### Концепция

Добавить `origin_order_id` на `order_items` — "из какого заказа этот item изначально пришёл". При merge/split это поле сохраняется, и RPC `get_my_orders` собирает items по обоим полям.

### Phase 1: DB Migration — добавить `origin_order_id`

```sql
-- Migration: NNN_add_origin_order_id.sql
ALTER TABLE order_items ADD COLUMN origin_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Backfill: для существующих items origin = текущий order
UPDATE order_items SET origin_order_id = order_id WHERE origin_order_id IS NULL;

-- Index for get_my_orders performance
CREATE INDEX idx_order_items_origin_order_id ON order_items(origin_order_id);
```

### Phase 2: POS — сохранять origin при merge/move

**Файлы:**

- `src/stores/pos/orders/ordersStore.ts` — `mergeBillsIntoOrder()`, `moveBillToTable()`
- `src/stores/pos/orders/services.ts` — `updateOrder()` upsert logic
- `src/stores/pos/orders/supabaseMappers.ts` — `toOrderItemInsert()`, `fromOrderItemRow()`
- `src/stores/pos/types.ts` — добавить `originOrderId` в `PosBillItem`

**Логика:**

- При создании item: `origin_order_id = order_id`
- При merge/move: `order_id` меняется, но `origin_order_id` остаётся прежним
- `toOrderItemInsert()` должен передавать `origin_order_id` в upsert

### Phase 3: RPC — обновить `get_my_orders`

**Файл:** `src/supabase/functions/get_my_orders_v2.sql`

```sql
-- Текущий запрос:
SELECT * FROM order_items WHERE order_id = v_order.id

-- Новый запрос: включить items, которые были перемещены в другой заказ
SELECT * FROM order_items
WHERE order_id = v_order.id
   OR (origin_order_id = v_order.id AND order_id != v_order.id)
```

Клиент увидит все свои items, даже если POS переместил их.

### Phase 4: Клиентское отображение (web-winter)

**Файлы web-winter:**

- `apps/website/composables/useOrders.ts` — `refreshOrders()` вызывает `get_my_orders`
- `apps/website/pages/orders.vue` — polling каждые 15 сек
- `apps/website/composables/useOrderActions.ts` — `updateOrder()`, `cancelOrder()`, `addToOrder()`

**Изменения:**

- Items с `order_id != origin_order_id` отображать с пометкой "moved to table" (или просто показывать как обычно)
- `update_online_order` и `add_to_online_order` — работают по `order_id`, поэтому добавление в перемещённый заказ требует решения: либо добавлять в новый order, либо блокировать если заказ был перемещён

---

## Ключевые файлы

### Backoffice (POS + Kitchen)

| Файл                                         | Роль                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/stores/pos/orders/ordersStore.ts`       | Merge (`mergeBillsIntoOrder`), move (`moveBillToTable`, `moveOrderToTable`), convert (`convertOrderToDineIn`) |
| `src/stores/pos/orders/services.ts`          | `updateOrder()` — upsert items, `deleteOrder()`, `createOrder()`                                              |
| `src/stores/pos/orders/supabaseMappers.ts`   | `toOrderItemInsert()`, `fromOrderItemRow()`, `toSupabaseUpdate()`                                             |
| `src/stores/pos/orders/useOrdersRealtime.ts` | POS realtime: `handleOrderInsert` (website orders), `handleItemUpdate`                                        |
| `src/stores/pos/types.ts`                    | `PosOrder`, `PosBillItem`, `KITCHEN_ACTIVE_STATUSES`                                                          |
| `src/stores/kitchen/index.ts`                | Kitchen store: `handleItemUpdate` с migration guard                                                           |
| `src/stores/kitchen/useKitchenRealtime.ts`   | Kitchen realtime subscriptions                                                                                |
| `src/stores/kitchen/kitchenService.ts`       | `getActiveKitchenOrders()`                                                                                    |
| `src/views/pos/order/OrderSection.vue`       | UI: `handleTableSelectionConfirm`, `handleOrderTypeConfirm`                                                   |

### Supabase RPCs

| Файл                                             | Роль                                             |
| ------------------------------------------------ | ------------------------------------------------ |
| `src/supabase/functions/create_online_order.sql` | Создание заказа с сайта (items status='waiting') |
| `src/supabase/functions/get_my_orders_v2.sql`    | Клиентский polling — **нужно обновить**          |
| `src/supabase/functions/update_online_order.sql` | Обновление заказа клиентом (full item replace)   |
| `src/supabase/functions/add_to_online_order.sql` | Добавление items к существующему заказу          |
| `src/supabase/functions/cancel_online_order.sql` | Отмена / запрос отмены                           |

### Web-winter (клиент)

| Файл                                          | Роль                                              |
| --------------------------------------------- | ------------------------------------------------- |
| `apps/website/composables/useOrders.ts`       | `refreshOrders()` — polling через `get_my_orders` |
| `apps/website/pages/orders.vue`               | UI заказов, 15-сек polling                        |
| `apps/website/composables/useOrderActions.ts` | `updateOrder()`, `cancelOrder()`, `addToOrder()`  |

---

## Implementation Order

- [ ] **1. Migration:** Add `origin_order_id` to `order_items` + backfill + index (DEV)
- [ ] **2. Types:** Add `originOrderId` to `PosBillItem` in `types.ts`
- [ ] **3. Mappers:** Update `toOrderItemInsert()` and `fromOrderItemRow()` in `supabaseMappers.ts`
- [ ] **4. POS logic:** Set `origin_order_id = order_id` on item creation; preserve on merge/move
- [ ] **5. RPC:** Update `get_my_orders_v2` to include items by `origin_order_id`
- [ ] **6. Test on DEV:** Create website order → merge to table → verify client still sees items
- [ ] **7. Web-winter:** Handle moved items in UI (if needed)
- [ ] **8. Apply to PROD**

---

## Edge Cases to Consider

1. **Клиент добавляет items к перемещённому заказу** — `add_to_online_order` работает по `order_id`. Если заказ удалён (merged), RPC вернёт ошибку. Нужно решить: блокировать или перенаправлять на новый заказ.
2. **Клиент отменяет перемещённый заказ** — `cancel_online_order` по старому `order_id` не найдёт заказ. Нужна обработка.
3. **Двойной merge** — item перемещается A→B→C. `origin_order_id` должен оставаться = A (первый заказ).
4. **Refund** — если клиент запросил refund, нужно найти payment по origin order.
