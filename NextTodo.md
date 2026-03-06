# Sprint: Per-Dish Channel Availability

## Цель

Управление доступностью блюд по каналам продаж. Вместо отдельных меню — чекбоксы внутри каждого блюда. POS фильтрует меню по каналу текущего заказа. При смене типа заказа — проверка доступности позиций.

---

## Часть 1: Backend (Store + Service + Migration)

### 1.1 Bulk-операция в channelsService.ts

**Файл:** `src/stores/channels/channelsService.ts`

Добавить метод для массового обновления каналов блюда:

```typescript
async bulkSetMenuItemChannels(
  menuItemId: string,
  channelAvailability: Array<{ channelId: string; isAvailable: boolean }>
): Promise<ChannelMenuItem[]> {
  const rows = channelAvailability.map(ca => ({
    channel_id: ca.channelId,
    menu_item_id: menuItemId,
    is_available: ca.isAvailable
  }))
  const { data, error } = await supabase
    .from('channel_menu_items')
    .upsert(rows, { onConflict: 'channel_id,menu_item_id' })
    .select()
  if (error) throw error
  return (data || []).map(mapChannelMenuItemFromDb)
}
```

### 1.2 Store-методы в channelsStore.ts

**Файл:** `src/stores/channels/channelsStore.ts`

1. **Геттер** `getMenuItemChannelIds(menuItemId): string[]` — возвращает ID каналов где `isAvailable = true`
2. **Bulk action** `setMenuItemChannels(menuItemId, channelAvailability[])` — вызывает сервис, обновляет локальный `channelMenuItems`
3. **Изменить дефолт**: `isMenuItemAvailable()` строка ~105: `?? true` → `?? false` (явный opt-in)

### 1.3 Миграция: бэкфилл channel_menu_items

**Файл:** `src/supabase/migrations/164_backfill_channel_menu_items.sql`

Все существующие активные блюда → доступны на ВСЕХ каналах (по просьбе пользователя):

```sql
-- Migration: 164_backfill_channel_menu_items
-- Description: Backfill channel_menu_items for all existing active menu items
-- All active items get records for ALL channels with is_available = true

INSERT INTO channel_menu_items (channel_id, menu_item_id, is_available)
SELECT sc.id, mi.id, true
FROM menu_items mi
CROSS JOIN sales_channels sc
WHERE mi.is_active = true
ON CONFLICT (channel_id, menu_item_id) DO NOTHING;
```

---

## Часть 2: UI — Чекбоксы каналов в MenuItemDialog

### 2.1 Добавить чекбоксы в Basic tab

**Файл:** `src/views/menu/components/MenuItemDialog.vue`

**Расположение:** После секции Status (строка ~146), перед закрытием `</div>` таба Basic.

**Изменения:**

1. Импорт `useChannelsStore` + инициализация на mount
2. Добавить `channelIds: string[]` в `formData` (строка ~329)
3. Шаблон — чекбоксы после Status toggle:

```html
<!-- Sales Channels -->
<div class="section-label mb-2 mt-5">Available on Channels</div>
<div class="d-flex flex-wrap gap-2">
  <v-checkbox
    v-for="channel in channelsStore.activeChannels"
    :key="channel.id"
    v-model="formData.channelIds"
    :value="channel.id"
    :label="channel.name"
    density="compact"
    hide-details
  />
</div>
```

4. **При редактировании** (watch props.item): заполнить из `channelsStore.getMenuItemChannelIds(item.id)`
5. **При создании** (resetForm): дефолт — все internal/pickup каналы (dine_in + takeaway)
6. **При сохранении** (handleSubmit + handleSaveDraft): после сохранения блюда вызвать:

```typescript
const channelAvailability = channelsStore.activeChannels.map(ch => ({
  channelId: ch.id,
  isAvailable: formData.value.channelIds.includes(ch.id)
}))
await channelsStore.setMenuItemChannels(savedItemId, channelAvailability)
```

`addMenuItem` возвращает `MenuItem` с ID (подтверждено: `menuStore.ts:331`).

---

## Часть 3: POS — Фильтрация меню по каналу заказа

### 3.1 MenuSection.vue — фильтрация по доступности

**Файл:** `src/views/pos/menu/MenuSection.vue`

Сейчас `channelId` передаётся как prop (строка 210) и используется только для ценообразования. Нужно добавить фильтрацию по доступности.

**Где фильтровать:** В computed `filteredItems` (или аналог) добавить проверку:

```typescript
// Существующая фильтрация по isActive + category
// Добавить: фильтр по channel availability
if (props.channelId) {
  items = items.filter(item => channelsStore.isMenuItemAvailable(props.channelId, item.id))
}
```

**UX:** Если блюдо недоступно на текущем канале — оно просто не показывается в меню POS.

### 3.2 Передача channelId

Уже реализовано в `PosMainView.vue` (строка 243):

```typescript
const currentChannelId = computed(() => currentOrder.value?.channelId ?? undefined)
```

Передаётся в `<MenuSection :channel-id="currentChannelId" />`.

**Без заказа** (нет активного): показывать все блюда (без фильтрации).

---

## Часть 4: POS — Проверка при смене типа заказа

### 4.1 Проблема

При смене типа заказа (например dine_in → gobiz) некоторые позиции могут быть недоступны на новом канале. Нужна валидация.

### 4.2 Проверка в ordersStore.ts

**Файл:** `src/stores/pos/orders/ordersStore.ts`

Добавить вспомогательную функцию:

```typescript
function getUnavailableItemsForChannel(
  bills: PosBill[],
  targetChannelId: string
): Array<{ billId: string; itemName: string; itemId: string }> {
  const unavailable: Array<{ billId: string; itemName: string; itemId: string }> = []
  for (const bill of bills) {
    for (const item of bill.items) {
      if (!channelsStore.isMenuItemAvailable(targetChannelId, item.menuItemId)) {
        unavailable.push({ billId: bill.id, itemName: item.name, itemId: item.id })
      }
    }
  }
  return unavailable
}
```

### 4.3 Использование при смене типа

**Файл:** `src/views/pos/order/OrderSection.vue` — `handleOrderTypeConfirm()`

Перед выполнением смены типа — проверить:

```typescript
const targetChannel = channelsStore.getChannelByCode(newChannelCode)
if (targetChannel) {
  const unavailable = ordersStore.getUnavailableItemsForChannel(
    currentOrder.bills,
    targetChannel.id
  )
  if (unavailable.length > 0) {
    // Показать предупреждение: "Следующие позиции недоступны на канале X: ..."
    // Варианты: отменить смену / удалить позиции и продолжить
    return
  }
}
```

### 4.4 Аналогично для convertOrderToDineIn и moveOrderToTable

**Файл:** `src/stores/pos/orders/ordersStore.ts`

В `convertOrderToDineIn()` (строка ~1562) и `moveOrderToTable()` (строка ~1380) — если целевой заказ на другом канале, проверить доступность перед merge.

### 4.5 UI предупреждения

Простой `v-dialog` или `v-snackbar` с списком недоступных позиций и кнопками:

- **Cancel** — отменить смену типа
- **Remove & Continue** — удалить недоступные позиции и продолжить

---

## Часть 5: Admin — Матрица доступности каналов

### 5.1 Редизайн ChannelsScreen.vue

**Файл:** `src/views/admin/channels/ChannelsScreen.vue`

Заменить read-only список на матрицу:

```
+-------------------------------------------+
| CHANNEL AVAILABILITY                      |
| [Category ▾] [Department ▾] [Search___]  |
+-------------------------------------------+
| Dish           | Dine-in | Take | GoJek | Grab |
|----------------|---------|------|-------|------|
| Tom Yum        |   ✓     |  ✓   |  ✓    |  —   |
| Pad Thai       |   ✓     |  ✓   |  ✓    |  ✓   |
| Fresh Juice    |   ✓     |  ✓   |  —    |  —   |
+-------------------------------------------+
```

- Строки: все активные menu items (фильтр по категории/отделу)
- Столбцы: все активные каналы
- Ячейки: чекбокс (✓) если доступно, прочерк (—) если нет
- Клик по чекбоксу → `channelsStore.setMenuItemAvailability(channelId, menuItemId, value)`
- **Если блюдо не используется на канале — прочерк, а не пустой чекбокс** (визуально отличать)

---

## Порядок реализации

1. **channelsService.ts** — bulk метод
2. **channelsStore.ts** — геттер, bulk action, изменить дефолт на `false`
3. **Миграция 164** — бэкфилл (DEV → проверить → PROD)
4. **MenuItemDialog.vue** — чекбоксы каналов в Basic tab
5. **MenuSection.vue** — фильтрация меню по каналу в POS
6. **ordersStore.ts** — `getUnavailableItemsForChannel()`
7. **OrderSection.vue** — проверка при смене типа заказа
8. **ChannelsScreen.vue** — матрица доступности

## Проверка

1. Миграция DEV → убедиться что все items получили записи во всех каналах
2. MenuItemDialog: открыть блюдо → каналы отмечены корректно
3. Создать новое блюдо → dine_in + takeaway отмечены по умолчанию
4. Снять GoJek → сохранить → POS: создать delivery/gobiz заказ → блюдо не в меню
5. Сменить тип заказа (dine_in → gobiz) с позицией без GoJek → предупреждение
6. Admin /admin → Channels → матрица корректно отображает и переключает
7. `repriceItemsForChannel` — при смене канала цены пересчитываются (уже работает)
