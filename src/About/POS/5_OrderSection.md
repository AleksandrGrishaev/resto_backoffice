# 🎯 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: Восстановление Order Section POS

## 📋 ОБЩИЙ АНАЛИЗ СТАРОЙ СИСТЕМЫ

### 🏗️ Архитектура старой Order Section

**Основные компоненты:**

```
OrderSection.vue (координатор)
├── OrderInfo.vue          # Информация о заказе (тип, стол)
├── BillsManager.vue       # Управление счетами
│   ├── BillsTabs.vue      # Табы счетов с действиями
│   └── OrderBillItem.vue  # Позиции в счете
├── OrderTotals.vue        # Итоги по заказу
└── OrderActions.vue       # Действия (сохранить, чекаут)
```

**Вспомогательные компоненты:**

```
OrderTableSelector.vue     # Выбор стола
OrderTypeEditor.vue        # Изменение типа заказа
OrderDeliveryType.vue      # Настройки доставки
MoveButton.vue            # Кнопка перемещения
```

**Диалоги:**

```
MoveBillsDialog.vue       # Перемещение счетов
MoveItemsDialog.vue       # Перемещение позиций
MoveOrderDialog.vue       # Перемещение заказа
CancelItemDialog.vue      # Отмена позиции
```

---

## 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ФУНКЦИОНАЛЬНОСТИ

### 1. **ORDER INFO SECTION**

**Что показывает:**

- Тип заказа (Dine-in/Takeaway/Delivery) с иконками
- Номер стола для Dine-in заказов
- Номер заказа для Takeaway/Delivery
- Кнопка редактирования типа заказа

**Возможности:**

- Изменение типа заказа (dine-in ↔ takeaway ↔ delivery)
- Перемещение между столами
- Объединение заказов

### 2. **BILLS MANAGEMENT SYSTEM**

**Ключевая особенность старой системы:**

- **МНОЖЕСТВЕННЫЕ СЧЕТА** в одном заказе
- **Split bill функциональность** - можно разделить заказ на несколько счетов
- **Независимая оплата** каждого счета

**BillsTabs функции:**

- ✅ Создание новых счетов
- ✅ Переименование счетов
- ✅ Удаление пустых счетов
- ✅ Переключение между счетами
- ✅ Индикация количества позиций в каждом счете

**OrderBillItem функции:**

- ✅ Отображение позиции меню в счете
- ✅ Управление количеством (+/-)
- ✅ Редактирование позиции (модификации, комментарии)
- ✅ Применение скидок к позиции
- ✅ Отмена/возврат позиций
- ✅ Перемещение позиций между счетами

### 3. **ORDER TOTALS CALCULATION**

**Многоуровневая система расчетов:**

```
Subtotal (сумма всех позиций)
- Item Discounts (скидки по позициям)
= Discounted Subtotal
- Customer/Bill Discounts (общие скидки)
= Taxable Amount
+ Service Tax (5%)
+ Government Tax (10%)
= FINAL TOTAL
```

**Особенности:**

- Расчет по всем счетам заказа
- Отдельные скидки по позициям и общие
- Налоги рассчитываются после всех скидок

### 4. **ORDER ACTIONS**

**Основные действия:**

- **Save Bill** - сохранение изменений (показывает \* при несохраненных)
- **Checkout** - переход к оплате выбранных позиций
- **Move** - перемещение позиций/счетов/заказов
- **Print** - печать чека

**Валидация действий:**

- Проверка наличия активного заказа
- Проверка несохраненных изменений
- Блокировка действий при неверном состоянии

---

## 🎯 ПЛАН ВОССТАНОВЛЕНИЯ

### **ЭТАП 1: UI КОМПОНЕНТЫ (Приоритет HIGH)**

#### 1.1 Создать базовые компоненты (1 сессия)

```
src/views/pos/order/components/
├── OrderInfo.vue          # Информация о заказе
├── OrderTotals.vue        # Итоги заказа
├── OrderActions.vue       # Действия с заказом
└── BillItem.vue          # Позиция в счете
```

#### 1.2 Создать Bills Manager (1 сессия)

```
src/views/pos/order/components/
├── BillsManager.vue       # Основной менеджер счетов
├── BillsTabs.vue         # Табы со счетами
└── BillsContent.vue      # Содержимое активного счета
```

#### 1.3 Обновить OrderSection (1 сессия)

- Интеграция всех компонентов
- Правильная структура layout
- Обработка состояний (loading, error, empty)

### **ЭТАП 2: ИНТЕГРАЦИЯ С STORES (Приоритет HIGH)**

#### 2.1 Подключить к POS Orders Store (1 сессия)

- Получение текущего заказа из `usePosOrdersStore`
- Отображение счетов (`PosBill[]`)
- Работа с активным счетом

#### 2.2 Интеграция добавления товаров (1 сессия)

- Обработка событий из MenuSection
- Добавление в активный счет через `addItemToBill()`
- Обновление отображения при добавлении

#### 2.3 Расчет итогов (1 сессия)

- Использовать `recalculateOrderTotals()` из store
- Отображение правильных сумм и налогов
- Синхронизация с изменениями позиций

### **ЭТАП 3: BILLS MANAGEMENT (Приоритет MEDIUM)**

#### 3.1 Множественные счета (1 сессия)

- Создание нового счета (`addBillToOrder()`)
- Переключение между счетами (`selectBill()`)
- Удаление пустых счетов

#### 3.2 Управление позициями (1 сессия)

- Изменение количества (`updateItemQuantity()`)
- Удаление позиций (`removeItemFromBill()`)
- Перемещение между счетами (TODO: создать метод)

### **ЭТАП 4: ДИАЛОГИ И ДЕЙСТВИЯ (Приоритет LOW)**

#### 4.1 Базовые диалоги (1 сессия)

```
src/views/pos/order/dialogs/
├── EditBillDialog.vue     # Редактирование счета
├── DeleteItemDialog.vue   # Подтверждение удаления
└── MoveItemDialog.vue     # Перемещение позиций
```

#### 4.2 Дополнительные функции (по необходимости)

- Скидки на позиции
- Комментарии к позициям
- Отмена позиций
- Перемещение заказов

---

## 🏗️ АДАПТАЦИЯ ДЛЯ НОВОЙ СИСТЕМЫ

### **ИЗМЕНЕНИЯ В ТИПАХ:**

**Используем существующие типы из `pos/types.ts`:**

```typescript
// Вместо старого Bill используем PosBill
interface PosBill {
  id: string
  billNumber: string
  orderId: string
  name: string // "Счет 1", "Счет 2"
  items: PosBillItem[]
  subtotal: number
  total: number
  paymentStatus: 'unpaid' | 'partial' | 'paid'
}

// Вместо старого BillItem используем PosBillItem
interface PosBillItem {
  id: string
  menuItemId: string
  menuItemName: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: 'active' | 'cancelled'
}
```

### **ИНТЕГРАЦИЯ С STORES:**

**POS Orders Store → Order Section:**

```typescript
// Получение данных
const currentOrder = ordersStore.currentOrder
const activeBill = ordersStore.activeBill
const bills = currentOrder?.bills || []

// Основные действия
await ordersStore.addBillToOrder(orderId, billName)
await ordersStore.addItemToBill(billId, itemData)
await ordersStore.updateItemQuantity(billId, itemId, newQuantity)
```

**Menu Store → Order Section:**

```typescript
// При добавлении товара из MenuSection
const handleAddItem = (item: MenuItem, variant: MenuItemVariant) => {
  if (!ordersStore.activeBill) {
    // Создать новый счет если нет активного
    await ordersStore.addBillToOrder(currentOrder.id)
  }

  await ordersStore.addItemToBill(activeBill.id, {
    menuItemId: item.id,
    menuItemName: item.name,
    variantId: variant.id,
    variantName: variant.name,
    quantity: 1,
    unitPrice: variant.price
  })
}
```

---

## 📋 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### **1. КОМПОНЕНТНАЯ СТРУКТУРА:**

```
src/views/pos/order/
├── OrderSection.vue              # Основной координатор
├── components/
│   ├── OrderInfo.vue            # Информация о заказе
│   ├── BillsManager.vue         # Управление счетами
│   │   ├── BillsTabs.vue       # Табы счетов
│   │   ├── BillsContent.vue    # Содержимое активного счета
│   │   └── BillItem.vue        # Позиция в счете
│   ├── OrderTotals.vue         # Итоги заказа
│   └── OrderActions.vue        # Действия с заказом
└── dialogs/
    ├── EditBillDialog.vue       # Редактирование счета
    └── MoveItemDialog.vue       # Перемещение позиций
```

### **2. СТИЛИ И АДАПТИВНОСТЬ:**

- Использовать CSS переменные проекта (`--touch-card`, `--spacing-md`)
- Touch-friendly интерфейс (минимум 44px для кликабельных элементов)
- Адаптивный layout для планшетов
- Consistent с MenuSection стилями

### **3. ОБРАБОТКА СОСТОЯНИЙ:**

- Loading states при операциях с заказом
- Error states с user-friendly сообщениями
- Empty states когда нет заказа/позиций
- Optimistic updates для лучшего UX

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

### **MVP (Минимально жизнеспособный продукт):**

- [ ] Отображение информации о текущем заказе
- [ ] Список позиций в активном счете
- [ ] Управление количеством позиций (+/-)
- [ ] Создание новых счетов
- [ ] Переключение между счетами
- [ ] Корректные расчеты итогов
- [ ] Интеграция с MenuSection (добавление товаров)

### **Полная версия:**

- [ ] Перемещение позиций между счетами
- [ ] Редактирование позиций (комментарии, модификации)
- [ ] Применение скидок
- [ ] Отмена позиций
- [ ] Изменение типа заказа
- [ ] Валидация всех операций

---

## 🚀 ПЛАН РЕАЛИЗАЦИИ ПО СЕССИЯМ

### **Сессия 1: Базовые компоненты UI**

1. Создать `OrderInfo.vue` - информация о заказе
2. Создать `BillItem.vue` - позиция в счете
3. Создать `OrderTotals.vue` - итоги заказа
4. Создать `OrderActions.vue` - действия

### **Сессия 2: Bills Manager**

1. Создать `BillsTabs.vue` - управление табами счетов
2. Создать `BillsManager.vue` - основной менеджер
3. Интеграция с POS Orders Store

### **Сессия 3: Интеграция с системой**

1. Подключить к текущему заказу из stores
2. Обработка добавления товаров из MenuSection
3. Расчет итогов и синхронизация

### **Сессия 4: Обновить OrderSection**

1. Собрать все компоненты в OrderSection
2. Обработка состояний и ошибок
3. Финальная интеграция и тестирование

---

## 💡 КЛЮЧЕВЫЕ ОТЛИЧИЯ ОТ СТАРОЙ СИСТЕМЫ

### **Упрощения:**

1. **Нет сложной системы истории** - используем простые операции
2. **Нет комплексных валидаций** - базовые проверки
3. **Нет системы разрешений** - все действия доступны
4. **Упрощенные диалоги** - минимум необходимого

### **Улучшения:**

1. **Лучшая интеграция с TypeScript** - строгая типизация
2. **Reactive система** - автоматическое обновление UI
3. **Современные компоненты** - Vuetify 3
4. **Единая стилевая система** - CSS переменные

### **Сохраненная функциональность:**

1. **✅ Множественные счета** - ключевая особенность
2. **✅ Split bill** - разделение заказа
3. **✅ Управление позициями** - количество, удаление
4. **✅ Расчет итогов** - с налогами и скидками
5. **✅ Интеграция с меню** - добавление товаров

---

**🎯 ГОТОВЫ К РЕАЛИЗАЦИИ!** Начинаем с Сессии 1 - базовые UI компоненты.
