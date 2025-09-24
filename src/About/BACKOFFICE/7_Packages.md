# Финальное ТЗ: Рефакторинг системы упаковок

## Проблема

Текущая система закупок не поддерживает разнообразие упаковок и брендов:

- Один продукт = один способ закупки
- Нет учета различных брендов и размеров упаковки
- Нет связи между AI рекомендациями и реальными упаковками поставщиков

## Решение

Добавить поддержку множественных упаковок для каждого продукта с сохранением единой системы расчетов в базовых единицах.

ВАЖНО!
Мы не делаем обратную совместимость, так как только создаем приложение

## Архитектура изменений

### Product interface - чистка и расширение

#### Удаляемые поля (legacy):

```typescript
// ❌ УДАЛЯЕМ полностью:
unit: MeasurementUnit              // → заменяется Product.baseUnit
costPerUnit: number                // → заменяется Product.baseCostPerUnit
purchaseUnit?: MeasurementUnit     // → логика переходит в PackageOption
purchaseToBaseRatio?: number       // → PackageOption.packageSize
currentPurchasePrice?: number      // → PackageOption.packagePrice
```

#### Новая структура упаковок:

```typescript
export interface PackageOption {
  id: string
  productId: string

  // ОПИСАНИЕ УПАКОВКИ
  packageName: string // "Пачка 100г", "Бутылка 1л", "Коробка 24шт"
  packageSize: number // Количество базовых единиц в упаковке
  packageUnit: MeasurementUnit // Единица упаковки ('pack', 'bottle', 'box')
  brandName?: string // "Anchor", "Local Brand"

  // ЦЕНЫ (могут быть пустыми при создании)
  packagePrice?: number // Цена за упаковку (IDR)
  baseCostPerUnit: number // Эталонная цена за базовую единицу (IDR)

  // МЕТАДАННЫЕ
  isActive: boolean
  notes?: string // "Самая выгодная", "Только оптом"
  createdAt: string
  updatedAt: string
}

export interface Product extends BaseEntity {
  // ... базовые поля остаются

  // БАЗОВАЯ ЛОГИКА (без изменений)
  baseUnit: BaseUnit // 'gram' | 'ml' | 'piece'
  baseCostPerUnit: number // Цена за базовую единицу для расчетов

  // НОВЫЕ ПОЛЯ
  packageOptions: PackageOption[] // Варианты упаковки
  recommendedPackageId?: string // ID последней заказанной упаковки
}
```

## Логика работы системы

### 1. Автоматические базовые упаковки

При создании продукта система автоматически создает базовую упаковку:

```typescript
// Для baseUnit: 'gram'
{
  packageName: "Килограмм",
  packageSize: 1000,
  packageUnit: 'kg',
  baseCostPerUnit: product.baseCostPerUnit,
  isActive: true
}

// Для baseUnit: 'ml'
{
  packageName: "Литр",
  packageSize: 1000,
  packageUnit: 'liter',
  baseCostPerUnit: product.baseCostPerUnit,
  isActive: true
}

// Для baseUnit: 'piece'
{
  packageName: "Штука",
  packageSize: 1,
  packageUnit: 'piece',
  baseCostPerUnit: product.baseCostPerUnit,
  isActive: true
}
```

### 2. Флоу от AI до приемки

```
AI Assistant
├ Рассчитывает: "2.5 кг масла" (базовые единицы)
├ Автоматически выбирает: recommendedPackageId (Last order pack)
├ Показывает: "5 × Пачка 500г Local [Рекомендовано]"
└ Позволяет изменить упаковку (опционально)

Create Order from Request
├ Получает: baseQuantity + packageId (может быть пустой)
├ ОБЯЗАТЕЛЬНО выбрать упаковку для заказа поставщику
├ Показывает расчет: "5 упаковок = 2500г = 125,000 IDR"
└ Создает заказ с конкретной упаковкой

Приемка товара
├ Может изменить упаковку если пришло не то
├ Создает StorageBatch с фактической ценой (FIFO неприкосновенен)
├ АВТОМАТИЧЕСКИ обновляет baseCostPerUnit в PackageOption
└ Устанавливает полученную упаковку как recommendedPackageId
```

### 3. Ценообразование

```typescript
// При планировании: baseCostPerUnit → packagePrice
packagePrice = baseCostPerUnit × packageSize

// При приемке: actualPackagePrice → baseCostPerUnit
newBaseCostPerUnit = actualPackagePrice / packageSize

// Автоматическое обновление эталона
packageOption.baseCostPerUnit = newBaseCostPerUnit
product.recommendedPackageId = receivedPackageId
```

## Структура файлов

### Этап 1: Типы и модели

```
src/stores/productsStore/
├── types.ts                           # ОБНОВИТЬ - добавить PackageOption, очистить Product
└── productsStore.ts                   # ОБНОВИТЬ - методы работы с упаковками

src/stores/shared/
├── productDefinitions.ts              # ОБНОВИТЬ - миграция на packageOptions
└── mockDataCoordinator.ts             # ОБНОВИТЬ - создание базовых упаковок

src/stores/supplier_2/
└── types.ts                          # ОБНОВИТЬ - поля упаковки в ProcurementRequest

src/stores/storage/
└── types.ts                          # ОБНОВИТЬ - поля упаковки в ReceiptItem

src/composables/
└── useCostCalculation.ts              # ОБНОВИТЬ - использовать packageOptions
```

### Этап 2: UI компоненты

```
src/views/products/components/package/
├── PackageOptionsList.vue             # НОВЫЙ - управление упаковками в карточке
└── PackageOptionDialog.vue            # НОВЫЙ - форма создания/редактирования

src/components/orders/
└── PackageSelector.vue                # НОВЫЙ - универсальный выбор упаковки

src/views/products/components/
├── ProductDialog.vue                  # ОБНОВИТЬ - интеграция управления упаковками
└── ProductDetailsDialog.vue           # ОБНОВИТЬ - просмотр упаковок

src/components/supplier/
└── OrderRequestDialog.vue             # ОБНОВИТЬ - опциональный выбор упаковки

src/components/orders/
└── CreateOrderDialog.vue              # ОБНОВИТЬ - обязательный выбор упаковки

src/components/storage/
└── ReceiptDialog.vue                  # ОБНОВИТЬ - изменение упаковки при приемке
```

## Детальные интерфейсы

### PackageOption с пояснениями

```typescript
export interface PackageOption {
  id: string // Уникальный ID упаковки
  productId: string // Связь с продуктом

  // ОПИСАНИЕ УПАКОВКИ
  packageName: string // "Пачка 100г", "Бутылка 1л", "Коробка 24шт"
  packageSize: number // 100, 1000, 24 (в базовых единицах)
  packageUnit: MeasurementUnit // 'pack', 'bottle', 'box' (тип упаковки)
  brandName?: string // "Anchor", "Local Brand" (опционально)

  // ЦЕНЫ
  packagePrice?: number // 8000 IDR (цена всей упаковки, может быть пустой)
  baseCostPerUnit: number // 80 IDR/г (эталонная цена за базовую единицу)

  // СИСТЕМА
  isActive: boolean // Доступна для использования
  notes?: string // "Самая выгодная", "Только оптом"
  createdAt: string
  updatedAt: string
}
```

### Миграционная логика

```typescript
// БЫЛО (старый Product):
{
  baseUnit: 'piece',
  baseCostPerUnit: 8000,
  unit: 'piece',              // ❌ удаляется
  costPerUnit: 8000,          // ❌ удаляется
  purchaseUnit: 'piece',      // ❌ → packageOption.packageUnit
  purchaseToBaseRatio: 1,     // ❌ → packageOption.packageSize
  currentPurchasePrice: 8000  // ❌ → packageOption.packagePrice
}

// СТАНЕТ (новый Product):
{
  baseUnit: 'piece',          // ✅ остается
  baseCostPerUnit: 8000,      // ✅ остается
  packageOptions: [{          // ✅ новое
    packageName: "Штука",
    packageSize: 1,           // ← из purchaseToBaseRatio
    packageUnit: 'piece',     // ← из purchaseUnit
    packagePrice: 8000,       // ← из currentPurchasePrice
    baseCostPerUnit: 8000,    // ← копируется из Product
    isActive: true
  }],
  recommendedPackageId: 'pkg-xxx'  // ✅ новое
}
```

## API методы

### ProductsStore новые методы

```typescript
// CRUD упаковок
async addPackageOption(data: CreatePackageOptionDto): Promise<PackageOption>
async updatePackageOption(data: UpdatePackageOptionDto): Promise<void>
async deletePackageOption(productId: string, packageId: string): Promise<void>

// Управление рекомендациями
async setRecommendedPackage(productId: string, packageId: string): Promise<void>
getRecommendedPackage(productId: string): PackageOption | null

// Расчеты
calculatePackageQuantity(productId: string, baseQuantity: number, packageId?: string): {
  packageOption: PackageOption
  exactPackages: number      // 2.5 упаковок
  suggestedPackages: number  // 3 упаковки (округленно)
  actualBaseQuantity: number // 3000г (фактически получится)
  difference: number         // +500г (разница с требуемым)
}

// Автоматическое обновление цен
async updatePackageCostFromReceipt(packageId: string, actualPrice: number): Promise<void>
```

### PackageSelector props и события

```typescript
interface PackageSelectorProps {
  productId: string
  requiredBaseQuantity: number // Сколько нужно в базовых единицах
  selectedPackageId?: string // Предварительно выбранная
  mode: 'optional' | 'required' | 'change' // optional=AI, required=Order, change=Receipt
  allowQuantityEdit?: boolean // Разрешить менять количество
}

interface PackageSelectorEmits {
  'package-selected': {
    packageId: string
    packageQuantity: number
    resultingBaseQuantity: number
    totalCost: number
  }
}
```

## План выполнения

### Шаг 1: Типы (1 день)

1. Обновить `src/stores/productsStore/types.ts`
2. Добавить PackageOption интерфейсы
3. Очистить Product от legacy полей
4. Создать миграционную функцию

### Шаг 2: Методы (1 день)

1. Добавить методы работы с упаковками в ProductsStore
2. Обновить useCostCalculation
3. Обновить mock данные
4. Протестировать API

### Шаг 3: UI управления (1 день)

1. PackageOptionsList.vue
2. PackageOptionDialog.vue
3. Интеграция в ProductDialog.vue
4. Тестирование CRUD упаковок

### Шаг 4: PackageSelector (1 день)

1. Универсальный компонент выбора
2. Три режима работы
3. Расчеты и валидация
4. Тестирование выбора

### Шаг 5: Интеграция заказов (1 день)

1. OrderRequestDialog - опциональный выбор
2. CreateOrderDialog - обязательный выбор
3. ReceiptDialog - изменение при приемке
4. Тестирование полного флоу

### Шаг 6: Финальное тестирование (1 день)

1. AI Assistant → Create Order → Receipt
2. Проверка расчетов себестоимости
3. Проверка FIFO и автообновления цен
4. Исправление багов

Общий срок: 6 дней
