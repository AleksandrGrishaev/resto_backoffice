📋 POS System Workflow - Полный процесс

1. СОЗДАНИЕ ЗАКАЗА
   1.1 Выбор стола (Dine-in)
   TablesStore.createOrder('dine-in', tableId)
   ├── Создает Order { id, tableId, type: 'dine-in', status: 'draft' }
   ├── Обновляет статус стола на 'occupied'
   └── Автоматически вызывает OrdersStore.selectOrder(orderId)
   1.2 Создание заказа (Takeaway/Delivery)
   OrdersStore.createOrder('takeaway' | 'delivery')
   ├── Создает Order без tableId
   ├── Генерирует orderNumber (T001, D001)
   └── Автоматически создает первый счет
2. СОЗДАНИЕ ПЕРВОГО СЧЕТА
   2.1 Автоматическое создание
   OrdersStore.addBillToOrder(orderId, billName)
   ├── Создает PosBill { id, name: 'Bill 1', items: [], total: 0 }
   ├── Добавляет в order.bills[]
   ├── Устанавливает activeBillId
   └── Сохраняет в localStorage через OrdersService
   2.2 Состояние после создания
   ordersStore.currentOrder = {
   id: 'order_123',
   bills: [{ id: 'bill_456', name: 'Bill 1', items: [] }],
   totalAmount: 0
   }
   ordersStore.activeBillId = 'bill_456'
3. ДОБАВЛЕНИЕ ПОЗИЦИЙ ИЗ МЕНЮ
   3.1 Процесс добавления
   MenuSection (выбор товара)
   ↓
   PosMainView.handleAddItemFromMenu()
   ↓
   ordersStore.addItemToBill(orderId, billId, menuItem, quantity)
   ↓
   OrdersService.addItemToBill() → localStorage
   ↓
   ordersStore.recalculateOrderTotals(orderId)
   3.2 Создание PosBillItem
   javascriptconst newItem = {
   id: 'item_789',
   billId: 'bill_456',
   menuItemId: 'menu_001',
   menuItemName: 'Nasi Goreng',
   quantity: 1,
   unitPrice: 25000,
   totalPrice: 25000,
   status: 'pending', // новая позиция
   modifications: [],
   discounts: []
   }
4. РАБОТА С ВЫДЕЛЕНИЕМ (SELECTION)
   4.1 Централизованная логика в ordersStore
   javascript// State
   selectedItems: Set<string> // ID выбранных позиций
   selectedBills: Set<string> // ID выбранных счетов

// Methods
toggleItemSelection(itemId) // Выбор отдельной позиции
toggleBillSelection(billId) // Выбор всего счета
clearSelection() // Очистка выделения
4.2 Процесс выделения
BillItem.vue (click checkbox)
↓
emit('select', itemId, selected)
↓
BillsManager.handleItemSelect()
↓
ordersStore.toggleItemSelection(itemId)
↓
Автоматическое обновление UI через computed properties
4.3 Автоматическое выделение счета
javascript// Если выбраны ВСЕ позиции счета → автоматически выбирается счет
if (selectedBillItems.length === billItemIds.length) {
selectedBills.add(billId)
} else {
selectedBills.delete(billId)
} 5. РАСЧЕТ ИТОГОВ
5.1 Архитектура расчетов
OrderSection.vue
├── useOrderCalculations(() => bills.value)
├── Получает reactive расчеты
└── Передает готовые данные в OrderTotals.vue
5.2 Структура расчетов
javascriptcalculations = {
subtotal: 75000, // Сумма всех позиций
itemDiscounts: 5000, // Скидки по позициям
billDiscounts: 0, // Скидки по счетам
discountedSubtotal: 70000, // После скидок
serviceTax: 3500, // 5% сервисный налог
governmentTax: 7000, // 10% государственный налог
finalTotal: 80500 // Итоговая сумма
}
5.3 Пересчет при изменениях
Изменение quantity/добавление позиции
↓
ordersStore.recalculateOrderTotals(orderId)
↓
useOrderCalculations автоматически обновляется
↓
OrderTotals.vue получает новые данные через props 6. ЧАСТИЧНОЕ ЗАКРЫТИЕ СЧЕТА
6.1 Выбор позиций для оплаты

1. Пользователь выбирает позиции (checkboxes)
2. ordersStore.selectedItemIds = ['item_1', 'item_3']
3. OrderActions показывает "Checkout Selected (2 items)"
4. Расчет суммы только выбранных позиций
   6.2 Процесс checkout
   OrderActions.handleCheckout()
   ├── selectedItems = ordersStore.selectedItemIds
   ├── amount = calculateSelectedItemsTotal()
   ├── emit('checkout', selectedItems, amount)
   └── OrderSection.handleCheckout(itemIds, billId)
   6.3 Обновление статусов после оплаты
   javascript// Помечаем оплаченные позиции
   selectedItems.forEach(itemId => {
   item.paymentStatus = 'paid'
   item.paidAt = new Date().toISOString()
   })

// Обновляем статус счета
if (allItemsPaid) {
bill.paymentStatus = 'paid'
} else if (someItemsPaid) {
bill.paymentStatus = 'partial'
} 7. ОТПРАВКА НА КУХНЮ
7.1 Отправка выбранных позиций
BillsManager.handleSendToKitchen()
├── itemIds = ordersStore.selectedItemIds
├── ordersStore.sendOrderToKitchen(orderId, itemIds)
├── OrdersService.sendItemsToKitchen()
└── Обновление status: 'pending' → 'sent_to_kitchen'
7.2 Отправка всех новых позиций
javascript// Если ничего не выбрано, отправляем все pending
if (selectedItems.length === 0) {
const newItems = bill.items.filter(item => item.status === 'pending')
itemIds = newItems.map(item => item.id)
} 8. СОСТОЯНИЯ ПОЗИЦИЙ
8.1 Жизненный цикл позиции
'pending' → Только добавлена, не отправлена на кухню
'sent_to_kitchen' → Отправлена на кухню
'preparing' → Готовится на кухне
'ready' → Готова к подаче
'served' → Подана гостю
'cancelled' → Отменена
8.2 Статусы оплаты
paymentStatus: null → Не оплачена
paymentStatus: 'paid' → Оплачена
paymentStatus: 'partial'→ Частично оплачена (для счетов) 9. МНОЖЕСТВЕННЫЕ СЧЕТА
9.1 Создание дополнительных счетов
BillsTabs.handleAddBill()
├── Только для dine-in заказов
├── ordersStore.addBillToOrder(orderId, 'Bill 2')
└── Автоматическое переключение на новый счет
9.2 Перемещение позиций между счетами

1. Выбираем позиции в исходном счете
2. BillsManager.handleMoveItems(itemIds, sourceBillId)
3. Открывается диалог выбора целевого счета
4. Позиции перемещаются в другой счет
5. СИНХРОНИЗАЦИЯ ДАННЫХ
   10.1 Reactive обновления
   ordersStore (источник истины)
   ↓ reactive computed
   OrderSection.bills
   ↓ props
   BillsManager.bills
   ↓ props
   BillItem.item
   10.2 Сохранение в localStorage
   Каждое изменение
   ↓
   OrdersService методы
   ↓
   localStorage.setItem('pos_orders', orders)
   localStorage.setItem('pos_bills', bills)
   localStorage.setItem('pos_bill_items', items)
   Этот workflow обеспечивает полную трассируемость всех операций и централизованное управление состоянием через ordersStore с автоматической синхронизацией UI.
