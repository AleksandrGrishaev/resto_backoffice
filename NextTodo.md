## ✅ COMPLETED: Manual Table Release System

### Problem

No manual way to free tables after payment. Tables stayed occupied even after guests paid and left.

### Solution Implemented

**Manual Release (Option 2)** - Staff manually releases table when guests leave.

### Implementation Details

#### 1. **OrderActions.vue** - Conditional Button Display

- Shows **"Checkout"** button when `paymentStatus !== 'paid'`
- Shows **"Release Table"** button when `paymentStatus === 'paid'`
- Only for dine-in orders with assigned tables

**Key Code:**

```vue
<!-- Checkout button (when unpaid) -->
<BaseButton v-if="!isOrderFullyPaid" @click="handleCheckout">
  Checkout
</BaseButton>

<!-- Release Table button (when paid) -->
<BaseButton v-else @click="handleReleaseTable">
  Release Table
</BaseButton>
```

#### 2. **ordersStore.ts** - releaseTable() Method

Location: `src/stores/pos/orders/ordersStore.ts:524`

**Workflow:**

1. Verify order is paid and dine-in with table
2. Set order status to 'served' (final status)
3. Free the table via `tablesStore.freeTable()`
4. Keep order in history with `paymentStatus: 'paid'`

**Validations:**

- Order must exist
- Must be `type: 'dine_in'`
- Must have `tableId`
- Must be `paymentStatus: 'paid'`

#### 3. **OrderSection.vue** - Event Handler

Location: `src/views/pos/order/OrderSection.vue:779`

**handleReleaseTable():**

- Calls `ordersStore.releaseTable(orderId)`
- Shows success/error messages
- Clears current order selection after release

#### 4. **TablesStore** - Existing freeTable() Support

Location: `src/stores/pos/tables/services.ts:132`

Already properly implemented:

- Sets `status: 'free'`
- Clears `currentOrderId: undefined`
- Clears `reservedUntil: undefined`
- Dual-write to Supabase + localStorage

### User Flow

1. **Create Order** → Table status: `occupied` (yellow)
2. **Add Items** → Table remains `occupied_unpaid` (yellow)
3. **Payment** → Table becomes `occupied_paid` (blue/primary)
   - Button changes: "Checkout" → "Release Table"
4. **Guests Still Seated** → Table stays `occupied_paid` (visible to staff)
5. **Staff Clicks "Release Table"** → Table status: `free` (green)
   - Order status: `served`
   - Order stays in history with `paymentStatus: 'paid'`

### Table Visual States (TableItem.vue)

- 🟢 **Green** (`success` - `#92c9af`) - `free` - Available for seating
- 🟡 **Orange** (`warning` - `#ffb076`) - `occupied_unpaid` - Guests dining, bill unpaid
- 🔵 **Blue** (`info` - `#76b0ff`) - `occupied_paid` - Bill paid, guests may still be seated
- 🟣 **Purple** (`secondary` - `#bfb5f2`) - `reserved` - Reserved for future time

### Benefits

✅ Realistic workflow - matches real restaurant operations
✅ Staff controls when table is freed
✅ Visible distinction between "paid but occupied" vs "unpaid"
✅ Prevents accidental early table assignment
✅ Order history preserved for reports

### Files Modified

1. `src/views/pos/order/components/OrderActions.vue`

   - Added conditional button rendering
   - Added `handleReleaseTable()` handler
   - Added `canReleaseTable` computed

2. `src/views/pos/order/OrderSection.vue`

   - Added `@release-table` event handler
   - Added `handleReleaseTable()` method

3. `src/stores/pos/orders/ordersStore.ts`

   - Added `releaseTable(orderId)` method
   - Exported in store return

4. `src/styles/variables.scss`

   - Added `info` color (`#76b0ff` - blue) to color palette

5. `src/views/pos/tables/TableItem.vue`
   - Changed `occupied_paid` color from `primary` to `info` (purple → blue)
   - Updated CSS styles to use `--color-info`
   - Updated hover effects with blue shadow

### Testing Checklist

- [ ] Create dine-in order with table
- [ ] Add items to order
- [ ] Verify "Checkout" button shows
- [ ] Complete payment
- [ ] Verify button changes to "Release Table"
- [ ] Verify table shows as `occupied_paid` (blue)
- [ ] Click "Release Table"
- [ ] Verify table becomes `free` (green)
- [ ] Verify order status is `served`
- [ ] Verify order appears in history

---

---

## ✅ COMPLETED: Table Color Fix & Complete Order Button

### Problem 1: Table Colors Not Visible When Selected

When a table was selected (active), the purple selection border completely hid the payment status color.

### Solution 1: Double Border System

Используем **двойную рамку**:

- **Внутренняя** (3px `border`) - показывает статус оплаты (зеленый/оранжевый/синий/фиолетовый)
- **Внешняя** (4px `box-shadow`) - показывает что стол выбран (фиолетовая)

**Изменения в `TableItem.vue`:**

```css
.table-item--active {
  border-width: 3px;
  /* border-color сохраняется из статуса! */
  box-shadow:
    0 0 0 4px var(--color-primary),
    /* внешняя рамка */ 0 8px 24px rgba(163, 149, 233, 0.4);
}
```

Теперь видно **оба состояния одновременно**:

- Цвет рамки = статус оплаты
- Фиолетовая обводка = стол выбран

---

### Problem 2: No "Complete Order" Button for Delivery/Takeaway

После оплаты заказа на доставку/самовывоз не было кнопки для завершения заказа (выдать/доставить).

### Solution 2: Smart Button Switching

Кнопка в `OrderActions.vue` теперь меняется в зависимости от типа заказа:

| Order Type   | Payment Status | Button Shown          |
| ------------ | -------------- | --------------------- |
| **Dine-in**  | Unpaid         | 🟢 **Checkout**       |
| **Dine-in**  | Paid           | 🔵 **Release Table**  |
| **Delivery** | Unpaid         | 🟢 **Checkout**       |
| **Delivery** | Paid           | 🚴 **Mark Delivered** |
| **Takeaway** | Unpaid         | 🟢 **Checkout**       |
| **Takeaway** | Paid           | 📦 **Mark Collected** |

**Новый метод в `ordersStore.ts`:**

```typescript
async function completeOrder(orderId: string)
```

**Workflow:**

1. Проверяет что заказ оплачен (`paymentStatus === 'paid'`)
2. Проверяет что это delivery/takeaway (не dine-in)
3. Устанавливает финальный статус:
   - `delivery` → `status: 'delivered'`
   - `takeaway` → `status: 'collected'`
4. Сохраняет заказ в историю

### Files Modified

1. **`src/views/pos/tables/TableItem.vue`**

   - Изменен CSS для `.table-item--active`: двойная рамка вместо одной
   - Убран `!important` из `border-color` чтобы сохранить цвет статуса

2. **`src/views/pos/order/components/OrderActions.vue`**

   - Добавлена кнопка "Mark Delivered" / "Mark Collected"
   - Добавлен `canCompleteOrder` computed
   - Добавлен `handleCompleteOrder()` handler
   - Добавлен emit `completeOrder`

3. **`src/views/pos/order/OrderSection.vue`**

   - Добавлен `@complete-order` event handler
   - Добавлен `handleCompleteOrder()` method

4. **`src/stores/pos/orders/ordersStore.ts`**
   - Добавлен `completeOrder(orderId)` method (строка 523)
   - Экспортирован в return

### Visual Result

**Столы теперь показывают:**

- 🟢 Зеленая рамка = свободен
- 🟡 Оранжевая рамка = занят, не оплачен
- 🔵 Синяя рамка = занят, оплачен
- 🟣 Фиолетовая рамка = зарезервирован
- **+ Фиолетовая обводка** = стол выбран (поверх цвета статуса)

**Кнопки в заказе:**

- Dine-in paid → "Release Table" 🍽️
- Delivery paid → "Mark Delivered" 🚴
- Takeaway paid → "Mark Collected" 📦

---

## Next Tasks
