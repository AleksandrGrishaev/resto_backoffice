Мне надо создать главную дорожную карту, как мы будем синхронизировать Stores

Сейчас мы завершили делать первый ProductStore, мы сделали единый Initialization файл, для того, чтобы все хранилища загружались последовательно, еще мы сделали управление Mock данными.

Наша задача, шаг за шагом интегрировать все Stores друг с другом, чтобы не было дублирующей информации. Дальше нам надо будет перейти на FireBase, когда уже тестовое приложение будет готово и отлажено.

Какие хранилища у нас существуют:

/Users/peaker/dev/kitchen-app/backoffice/src/stores/account - счета и платежные транзакции, а также счета на оплату для поставщиков.
/Users/peaker/dev/kitchen-app/backoffice/src/stores/counteragents - каталог наших поставщиков продуктов и услуг
/Users/peaker/dev/kitchen-app/backoffice/src/stores/menu - реальное меню с ценами и привязкой к рецептам и полуфабрикатам
/Users/peaker/dev/kitchen-app/backoffice/src/stores/preparation - хранилище полуфабрикатов с привязкой к продуктам
/Users/peaker/dev/kitchen-app/backoffice/src/stores/productsStore - каталог продуктов, которые мы используем для блюд и товаров на продажу (например пиво, вода, кофе) и он отвечает за динамику цен и средний расход продукта (нужно для рекомендаций для supplier store)
/Users/peaker/dev/kitchen-app/backoffice/src/stores/recipes - каталог полуфабрикатов и рецептов на блюда, который синхронизирован с продуктами.
/Users/peaker/dev/kitchen-app/backoffice/src/stores/shared - здесь у нас Mock координатор, мы создаем тестовые данные.
/Users/peaker/dev/kitchen-app/backoffice/src/stores/storage - хранилище продуктов
/Users/peaker/dev/kitchen-app/backoffice/src/stores/supplier_2 - управление заказами для поставщиков, с рекомендациями для заказа, которые основаны на расходе продуктов.

Какие хранилища еще не созданы:

1. Cashier store - это наши продажи из меню, мы создадим простую версию, так как реальная будет в отдельном приложении на планшете. Это версия будет отвечать за продажу блюд и поступление от продажи денег на счета.
2. Finance store - это итоговая финансовая сводка по кафе, где мы будем учитывать все издержки и приходы, считать прибыль, видеть расходы по категориям и т.д.

Roadmap: Последовательность рефакторинга Store
Phase 1: Foundation Layer (Week 1-2)
1.1 PreparationStore Integration
Цель: Связать полуфабрикаты с продуктами

Полуфабрикаты используют продукты как ингредиенты
Автоматический расчет себестоимости полуфабрикатов
Обновление usage tracking в ProductStore
MockDataCoordinator генерирует 8-10 полуфабрикатов

1.2 RecipesStore Integration
Цель: Связать рецепты с продуктами + полуфабрикатами

Рецепты могут использовать и продукты, и полуфабрикаты
Автоматический расчет полной себестоимости блюда
Обновление usage tracking в ProductStore
Пересчет при изменении цен ингредиентов

1.3 CounterAgentsStore Enhancement
Цель: Подготовить каталог поставщиков

Расширить данные поставщиков (категории, lead time, условия)
Связать с продуктами через primarySupplierId
Добавить рейтинги и предпочтения
MockDataCoordinator создает 5-7 поставщиков

- Phase 2: Supply Chain Integration (Week 3-4)
  2.1 StorageStore Integration
  Цель: Реальный учет остатков

Получение остатков для ProductStore recommendations
Поступления от поставщиков обновляют цены в ProductStore
Расход записывается для consumption analytics
FIFO списание по батчам

2.2 SupplierStore v2 Integration
Цель: Умные закупки

Автогенерация заказов на основе критических рекомендаций
Группировка по поставщикам
Обновление цен при получении товаров
Связь с CounterAgentsStore для данных поставщиков

- Phase 3: Menu & Sales Integration (Week 5-6)
  3.1 MenuStore Enhancement
  Цель: Динамическое меню

Два типа позиций: блюда (recipes) и прямые продажи (products)
Автоматический пересчет себестоимости при изменении цен
Проверка доступности на основе остатков склада
Расчет рентабельности позиций

3.2 CashierStore Creation
Цель: Система продаж

Продажа только через меню (никаких прямых продаж продуктов)
Автоматическое списание со склада при завершении заказа
Расчет прибыли по каждому заказу
Передача доходов в AccountStore

- Phase 4: Financial Integration (Week 7-8)

  4.1 AccountStore Enhancement
  Цель: Централизованный учет финансов

Доходы от CashierStore (продажи)
Расходы от SupplierStore (закупки)
Операционные расходы (зарплата, аренда)
Базовая аналитика движения денег

4.2 FinanceStore Creation
Цель: Финансовая аналитика

P&L отчеты
Анализ рентабельности по категориям
Cash flow прогнозы
KPI дашборд

Ключевые интеграционные точки
ProductStore → все остальные

Цены продуктов используются везде для расчетов
Stock recommendations влияют на закупки
Usage tracking обновляется из всех источников потребления

Цепочка себестоимости

Продукты имеют текущие цены
Полуфабрикаты рассчитывают себестоимость из продуктов
Рецепты рассчитывают себестоимость из продуктов + полуфабрикатов
Меню использует себестоимость рецептов + прямых продуктов
Продажи считают прибыль на основе себестоимости

Складской поток

SupplierStore создает заказы → StorageStore получает товары
StorageStore списывает при продажах → ProductStore обновляет consumption
ProductStore генерирует recommendations → SupplierStore создает новые заказы

Финансовый поток

CashierStore продает → AccountStore получает доходы
SupplierStore покупает → AccountStore фиксирует расходы
AccountStore аккумулирует → FinanceStore анализирует

MockDataCoordinator развитие
Phase 1: Добавляем генераторы

Preparations на основе продуктов
Recipes на основе продуктов + preparations
CounterAgents с реалистичными данными

Phase 2: Supply chain data

Storage operations с реалистичным потреблением
Supplier orders связанные с recommendations
Price history с волатильностью

Phase 3: Sales data

Menu items двух типов
Sales history с сезонностью
Customer patterns

Phase 4: Financial data

Revenue streams
Expense categories
Cash flow patterns
Profit margins

Последовательность работ
Week 1: PreparationStore + RecipesStore + базовый MockDataCoordinator
Week 2: CounterAgentsStore + отладка расчетов себестоимости
Week 3: StorageStore + реальные остатки + consumption tracking
Week 4: SupplierStore v2 + автогенерация заказов
Week 5: MenuStore + динамическая себестоимость + доступность
Week 6: CashierStore + продажи + списание
Week 7: AccountStore + финансовые потоки
Week 8: FinanceStore + аналитика + KPI
Критерии готовности каждого Phase
Phase 1: Себестоимость пересчитывается автоматически по цепочке
Phase 2: Рекомендации по закупкам работают с реальными данными
Phase 3: Меню показывает актуальную доступность и рентабельность
Phase 4: Полная финансовая картина с P&L и прогно
