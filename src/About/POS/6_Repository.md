План действий (в порядке приоритета) 0. Базовая инфраструктура (СЕЙЧАС)

✅ Создать core Repository интерфейсы
✅ Настроить environment конфигурацию
✅ Исправить роутинг и инициализацию

1. Исправить Orders Store (КРИТИЧНО)

🔧 Почистить нерабочие методы в ordersStore
🔧 Исправить проблему с персистентностью (главная проблема!)
🔧 Оставить только минимум нужных функций

2. Перевести Orders на Repository

🔄 Создать OrdersRepository интерфейс
🔄 Реализовать LocalOrdersRepository
🔄 Обновить ordersStore для работы с repository

3. Перевести Tables на Repository

🔄 Аналогично orders - создать repository слой
🔄 Упростить tablesStore

4. Создать POS Menu Repository

🆕 Новый menuPosStore (читает данные из основного menuStore)
🆕 Кэширование для offline работы

Что я вижу НЕ ТАК сейчас:
Проблемы инициализации:

PosMainView.vue пытается инициализировать posStore.initializePOS() - но этот метод сломан
App.vue загружает backoffice stores, но не POS stores
Нет четкого разделения - когда загружать какие stores

Проблемы с ordersStore:

Много неиспользуемых методов (sendToKitchen, closeOrder etc.)
Сложная логика которая не работает (notifications, department service)
Персистентность не работает правильно

Рекомендуемый план на СЕГОДНЯ:
Шаг 0: Базовая инфраструктура

Создать src/repositories/base/ с базовыми интерфейсами
Настроить env переменные для режимов работы
Исправить инициализацию в PosMainView

Шаг 1: Упростить Orders Store

Удалить все неработающие методы
Оставить только: create, load, save, addItem, removeItem
Исправить persistence проблему
