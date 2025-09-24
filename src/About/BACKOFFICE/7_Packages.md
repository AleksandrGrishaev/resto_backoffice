# Финальный план рефакторинга упаковок

## 🎯 Финальная концепция

### **AI Assistant** → **Create Order from Request** → **Приемка**

```
AI Assistant (запросы)
├ Считает: "2.5 кг масла" (базовые единицы)
├ Повар может выбрать упаковку (опционально)
└ Передает в Create Order: quantity + packageId (опционально)

Create Order from Request (создание заказов)
├ Получает: 2.5 кг + packageId (или без него)
├ ОБЯЗАТЕЛЬНО выбрать упаковку: "5 × Пачка 500г Local [Last order]"
└ Создает заказ поставщику с конкретной упаковкой

Приемка
├ Может изменить упаковку если пришло не то
├ Создает StorageBatch с фактической ценой
├ АВТОМАТИЧЕСКИ обновляет эталонную цену в PackageOption
└ АВТОМАТИЧЕСКИ обновляет recommendedPackageId (последний заказ)
```

## 📂 Конкретные файлы для изменения

### **ЭТАП 0: Подготовка mock данных и рефакторинг методов (2 дня)**

#### 0.1 Миграция mock данных:

```
src/stores/shared/
├── productDefinitions.ts               # ОБНОВИТЬ - удалить старые поля, добавить packageOptions
└── mockDataCoordinator.ts              # ОБНОВИТЬ - логика создания PackageOption из старых данных
```

#### 0.2 Рефакторинг методов работы с единицами:

```
src/composables/
└── useCostCalculation.ts               # КРИТИЧЕСКИ ОБНОВИТЬ - убрать purchaseUnit логику

src/views/supplier_2/components/procurement/
└── AddItemDialog.vue                   # ОБНОВИТЬ - заменить purchaseUnit на packageOptions

src/stores/productsStore/
└── productsStore.ts                    # ОБНОВИТЬ - методы получения единиц измерения

src/utils/
└── quantityFormatter.ts                # ОБНОВИТЬ - работа с упаковками вместо purchaseUnit
```

#### 0.3 Примеры изменений методов:

**БЫЛО:**

```typescript
// Старая логика через purchaseUnit
function getProductPrice(product: Product): number {
  if (product.currentPurchasePrice) return product.currentPurchasePrice
  if (product.baseCostPerUnit && product.purchaseToBaseRatio) {
    return product.baseCostPerUnit * product.purchaseToBaseRatio
  }
  return product.costPerUnit
}
```

**СТАЛО:**

```typescript
// Новая логика через recommendedPackageId
function getProductPrice(product: Product): number {
  const recommendedPackage = getRecommendedPackage(product)
  if (recommendedPackage?.packagePrice) {
    return recommendedPackage.packagePrice
  }
  return product.baseCostPerUnit // Fallback
}

function getRecommendedPackage(product: Product): PackageOption | null {
  if (product.recommendedPackageId) {
    return product.packageOptions.find(p => p.id === product.recommendedPackageId) || null
  }
  return product.packageOptions.find(p => p.isActive) || null
}
```

### **ЭТАП 1: Типы и модели (1-2 дня)**

#### 1.1 Обновляемые файлы:

```
src/stores/productsStore/
└── types.ts                            # ОБНОВИТЬ - добавить интерфейсы упаковок
```

#### 1.2 Обновляемые файлы:

```
src/stores/productsStore/
├── types.ts                            # ОБНОВИТЬ - Product interface
└── productsStore.ts                    # ОБНОВИТЬ - методы работы с упаковками

src/stores/shared/
├── productDefinitions.ts               # ОБНОВИТЬ - добавить packageOptions
└── mockDataCoordinator.ts              # ОБНОВИТЬ - миграция данных

src/stores/supplier_2/
└── types.ts                           # ОБНОВИТЬ - ProcurementRequest DTO

src/stores/storage/
└── types.ts                           # ОБНОВИТЬ - ReceiptItem interface

src/composables/
└── useCostCalculation.ts               # ОБНОВИТЬ - использовать packageOptions
```

### **ЭТАП 2: Интерфейсы (2-3 дня)**

#### 2.1 Новые компоненты:

```
src/views/products/components/package/
├── PackageOptionsList.vue              # НОВЫЙ - список упаковок в карточке продукта
└── PackageOptionDialog.vue             # НОВЫЙ - форма создания/редактирования упаковки

src/components/orders/
└── PackageSelector.vue                 # НОВЫЙ - универсальный выбор упаковки
                                        #         (AI request, Create order, Receipt)
```

#### 2.2 Обновляемые компоненты:

```
src/views/products/components/
├── ProductDialog.vue                   # ОБНОВИТЬ - интеграция управления упаковками
└── ProductDetailsDialog.vue            # ОБНОВИТЬ - показ упаковок в просмотре

src/views/supplier_2/components/procurement/
└── AddItemDialog.vue                   # ОБНОВИТЬ - PackageSelector для AI запросов

src/components/orders/
└── CreateOrderDialog.vue               # ОБНОВИТЬ - PackageSelector для создания заказов

src/components/storage/
└── ReceiptDialog.vue                   # ОБНОВИТЬ - PackageSelector для изменения при приемке
```

## 🔧 Детальные изменения по этапам

### **ЭТАП 1: Обновление типов и методов**

#### 1.1 Обновление: `src/stores/productsStore/types.ts`

```typescript
// ===== ДОБАВИТЬ новые интерфейсы упаковок =====

export interface PackageOption {
  id: string
  productId: string

  // ОПИСАНИЕ УПАКОВКИ
  packageName: string // "Пачка", "Бутылка", "Коробка"
  packageSize: number // Количество базовых единиц
  packageUnit: MeasurementUnit // Единица этой упаковки ('piece', 'box', etc)
  brandName?: string // "Anchor", "Local Brand"

  // ЦЕНЫ (могут быть пустыми при создании)
  packagePrice?: number // Цена за упаковку
  baseCostPerUnit: number // Эталонная цена за базовую единицу

  // МЕТАДАННЫЕ
  isActive: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePackageOptionDto {
  productId: string
  packageName: string
  packageSize: number
  packageUnit: MeasurementUnit
  brandName?: string
  packagePrice?: number
  baseCostPerUnit?: number // Если не указан - вычисляется автоматически
  notes?: string
}

export interface UpdatePackageOptionDto extends Partial<CreatePackageOptionDto> {
  id: string
}

// ===== ФИНАЛЬНЫЙ ИНТЕРФЕЙС Product =====

export interface Product extends BaseEntity {
  name: string
  nameEn?: string
  description?: string
  category: ProductCategory
  yieldPercentage: number
  isActive: boolean
  canBeSold: boolean

  // ✅ БАЗОВАЯ ЛОГИКА (остается без изменений)
  baseUnit: BaseUnit // 'gram' | 'ml' | 'piece'
  baseCostPerUnit: number // Цена за базовую единицу

  // ❌ УДАЛЯЕМ полностью (заменяется на packageOptions):
  // unit: MeasurementUnit              → УДАЛИТЬ
  // costPerUnit: number                → УДАЛИТЬ
  // purchaseUnit?: MeasurementUnit     → УДАЛИТЬ (заменяется packageOptions)
  // purchaseToBaseRatio?: number       → PackageOption.packageSize
  // currentPurchasePrice?: number      → PackageOption.packagePrice

  // ✅ НОВЫЕ ПОЛЯ
  packageOptions: PackageOption[] // Варианты упаковки
  recommendedPackageId?: string // ID рекомендованной упаковки (последний заказ)

  // Остальные поля без изменений
  dailyConsumption?: number
  consumptionVolatility?: number
  shelfLifeDays?: number
  leadTimeDays?: number
  primarySupplierId?: string
  priceVolatility?: number
  storageConditions?: string
  minStock?: number
  maxStock?: number
  tags?: string[]
}

// ===== ЧТО НА ЧТО ЗАМЕНЯЕТСЯ =====

/*
ТЕКУЩИЕ MOCK ДАННЫЕ:
{
  baseUnit: 'piece',           ✅ → Product.baseUnit (остается)
  baseCostPerUnit: 8000,       ✅ → Product.baseCostPerUnit (остается)
  purchaseUnit: 'piece',       ❌ → УДАЛИТЬ (логика переходит в PackageOption)
  purchaseToBaseRatio: 1,      ❌ → PackageOption.packageSize
  purchaseCost: 8000,          ❌ → PackageOption.packagePrice
  unit: 'piece',               ❌ → УДАЛИТЬ
  costPerUnit: 8000            ❌ → УДАЛИТЬ
}

СТАНЕТ:
Product: {
  baseUnit: 'piece',           ✅ без изменений
  baseCostPerUnit: 8000,       ✅ без изменений
  packageOptions: [            ✅ новое
    {
      id: 'pkg-xxx',
      packageName: 'Штука',
      packageSize: 1,           ← из purchaseToBaseRatio
      packageUnit: 'piece',
      packagePrice: 8000,       ← из purchaseCost
      baseCostPerUnit: 8000,    ← копируется из Product
      isActive: true
    }
  ],
  recommendedPackageId: 'pkg-xxx'  ✅ новое
}
*/
```

#### 1.3 Обновление: `src/stores/productsStore/productsStore.ts`

```typescript
// НОВЫЕ МЕТОДЫ для работы с упаковками:

actions: {
  // ... существующие методы

  // ===== МЕТОДЫ РАБОТЫ С УПАКОВКАМИ =====

  async addPackageOption(data: CreatePackageOptionDto): Promise<PackageOption> {
    // Создать новую упаковку для продукта
  },

  async updatePackageOption(data: UpdatePackageOptionDto): Promise<void> {
    // Обновить упаковку
  },

  async deletePackageOption(productId: string, packageId: string): Promise<void> {
    // Удалить упаковку
  },

  async setRecommendedPackage(productId: string, packageId: string): Promise<void> {
    // Установить рекомендованную упаковку (обновляется после каждого заказа)
  },

  // ===== УТИЛИТНЫЕ МЕТОДЫ =====

  getRecommendedPackage(productId: string): PackageOption | null {
    // Получить рекомендованную упаковку
    const product = this.getProductById(productId)
    if (!product?.recommendedPackageId) return null

    return product.packageOptions.find(p => p.id === product.recommendedPackageId)
      || product.packageOptions.find(p => p.isActive)
      || null
  },

  calculatePackageQuantity(productId: string, baseQuantity: number, packageId?: string): {
    packageOption: PackageOption
    exactPackages: number
    suggestedPackages: number
    actualBaseQuantity: number
    difference: number
  } {
    // Рассчитать сколько упаковок нужно для заданного количества в базовых единицах
  },

  getPackagesByProduct(productId: string): PackageOption[] {
    const product = this.getProductById(productId)
    return product?.packageOptions.filter(p => p.isActive) || []
  }
}
```

#### 1.4 Обновление: `src/stores/supplier_2/types.ts`

```typescript
// ОБНОВИТЬ ProcurementRequest - добавить поля упаковки
export interface ProcurementRequestItem {
  // ... существующие поля

  // ✅ НОВЫЕ ПОЛЯ
  preferredPackageId?: string // ID предпочтительной упаковки
  packageQuantity?: number // Количество упаковок (если указана упаковка)
  packageNotes?: string // Комментарии по упаковке/бренду
}

// НОВЫЙ интерфейс для создания заказа из запроса
export interface CreateOrderFromRequestDto {
  requestId: string
  supplierId: string
  items: OrderItemWithPackage[]
}

export interface OrderItemWithPackage {
  productId: string
  baseQuantityNeeded: number // Исходная потребность в базовых единицах
  selectedPackageId: string // ОБЯЗАТЕЛЬНО выбранная упаковка
  packageQuantity: number // Количество упаковок
  estimatedPrice?: number // Расчетная стоимость
  orderNotes?: string // Комментарии к заказу
}
```

#### 1.5 Обновление: `src/stores/storage/types.ts`

```typescript
// ОБНОВИТЬ ReceiptItem - добавить поля упаковки
export interface ReceiptItem {
  // ... существующие поля

  // ✅ НОВЫЕ ПОЛЯ
  expectedPackageId?: string // Какую упаковку заказывали
  receivedPackageId?: string // Какую упаковку получили (может отличаться)
  packageQuantity: number // Количество полученных упаковок
  packageUnitPrice?: number // Цена за упаковку
  receiptNotes?: string // Заметки при приемке
}
```

#### 1.6 Обновление: `src/composables/useCostCalculation.ts`

```typescript
export function useCostCalculation() {
  // ОБНОВИТЬ метод расчета прямой стоимости
  function calculateDirectCost(quantity: number, product: Product): number {
    const recommendedPackage = getRecommendedPackage(product)
    if (!recommendedPackage) {
      console.warn(`No package options for product ${product.id}`)
      return 0
    }

    return quantity * recommendedPackage.baseCostPerUnit
  }

  function getRecommendedPackage(product: Product): PackageOption | null {
    return (
      product.packageOptions.find(p => p.isRecommended) ||
      product.packageOptions.find(p => p.isActive) ||
      product.packageOptions[0] ||
      null
    )
  }

  // НОВЫЕ методы для работы с упаковками
  function calculatePackageCost(packageOption: PackageOption, packageQuantity: number): number {
    const baseQuantity = packageQuantity * packageOption.packageSize
    return baseQuantity * packageOption.baseCostPerUnit
  }

  function findOptimalPackage(
    product: Product,
    requiredBaseQuantity: number,
    criteria: 'price' | 'exactMatch' | 'recommended' = 'recommended'
  ): PackageOption | null {
    // Найти оптимальную упаковку по критерию
  }
}
```

### **ЭТАП 2: UI Компоненты**

## 🎯 Управление упаковками через карточку продукта

### **Логика интеграции:**

```
ProductDialog.vue (создание/редактирование)
├── Основные поля продукта (name, category, baseUnit, etc.)
├── 📦 Секция "Варианты упаковки"
│   ├── PackageOptionsList.vue (показ существующих упаковок)
│   └── PackageOptionDialog.vue (создание/редактирование упаковки)
└── Кнопки [Сохранить] [Отмена]

ProductDetailsDialog.vue (просмотр)
├── Основная информация о продукте
├── 📦 Секция "Доступные упаковки" (read-only)
│   └── PackageOptionsList.vue (режим просмотра)
└── Кнопки [Редактировать] [Закрыть]
```

### **PackageSelector.vue - универсальный компонент:**

```
Используется в трех местах:
├── AddItemDialog.vue (AI Assistant)
│   └── Опционально: можно выбрать упаковку для запроса
├── CreateOrderDialog.vue (Create Order)
│   └── Обязательно: выбор упаковки для заказа поставщику
└── ReceiptDialog.vue (Приемка)
    └── Изменение упаковки если пришло не то что заказывали
```

#### 2.1 Новый компонент: `src/views/products/components/package/PackageOptionsList.vue`

```typescript
// Основные методы:
interface PackageOptionsListMethods {
  handleAddPackage(): void // Открыть диалог добавления
  handleEditPackage(option: PackageOption): void // Открыть диалог редактирования
  handleDeletePackage(packageId: string): void // Удалить упаковку
  handleSetRecommended(packageId: string): void // Установить как рекомендованную
  calculateDisplayPrice(option: PackageOption): string // Форматировать цену для отображения
}

// Props:
interface PackageOptionsListProps {
  productId: string
  options: PackageOption[]
  readonly?: boolean // Режим только для просмотра
  showActions?: boolean // Показывать кнопки действий
}
```

#### 2.2 Новый компонент: `src/views/products/components/package/PackageOptionDialog.vue`

```typescript
// Основные методы:
interface PackageOptionDialogMethods {
  handleSave(): Promise<void> // Сохранить упаковку
  validateForm(): boolean // Валидация формы
  calculateBaseCost(): number // Автоматический расчет цены за единицу
  calculatePackagePrice(): number // Автоматический расчет цены упаковки
  resetForm(): void // Сброс формы
  handleClose(): void // Закрытие диалога
}

// Props:
interface PackageOptionDialogProps {
  productId: string
  packageOption?: PackageOption // Для редактирования (undefined для создания)
  baseUnit: 'gram' | 'ml' | 'piece' // Базовая единица продукта
}
```

#### 2.3 Новый компонент: `src/components/orders/PackageSelector.vue`

```typescript
// Универсальный компонент для выбора упаковки
interface PackageSelectorMethods {
  calculateRequiredPackages(baseQuantity: number): PackageCalculation[]
  selectPackage(packageId: string): void
  showPackageDetails(packageId: string): void
  handleQuantityChange(quantity: number): void
}

interface PackageSelectorProps {
  productId: string
  requiredBaseQuantity: number // Сколько нужно в базовых единицах
  selectedPackageId?: string // Предварительно выбранная упаковка
  mode: 'optional' | 'required' | 'change' // Режим работы
  allowQuantityEdit?: boolean // Разрешить изменение количества
}

interface PackageCalculation {
  packageOption: PackageOption
  exactQuantity: number // Точное количество упаковок (2.5)
  roundedQuantity: number // Округленное количество (3)
  resultingBaseQuantity: number // Результирующее количество в базовых единицах
  difference: number // Разница с требуемым количеством (+/-)
  isExactMatch: boolean // Точное соответствие
  totalCost: number // Общая стоимость
}

// Emits:
interface PackageSelectorEmits {
  'package-selected': {
    packageId: string
    packageQuantity: number
    resultingBaseQuantity: number
    totalCost: number
  }
  'quantity-changed': {
    baseQuantity: number
  }
}
```

## 🚀 Поэтапный план выполнения

### **Шаг 0: Подготовка mock данных и рефакторинг методов (2 дня)**

1. Обновить `productDefinitions.ts` - удалить старые поля (unit, costPerUnit, purchaseUnit, purchaseToBaseRatio, currentPurchasePrice)
2. Создать логику миграции в `mockDataCoordinator.ts` - автоматическое создание PackageOption из старых данных
3. Обновить все методы работающие с `purchaseUnit` на логику работы с `recommendedPackageId`
4. Обновить `useCostCalculation.ts`, `AddItemDialog.vue`, `quantityFormatter.ts`
5. Тестирование что все продукты имеют PackageOption и методы работают корректно

### **Шаг 1: Типы и базовая логика (1 день)**

1. Создать `src/types/packageOptions.ts`
2. Обновить `src/stores/productsStore/types.ts` - добавить packageOptions, recommendedPackageId
3. Обновить интерфейсы в supplier_2 и storage
4. Убедиться что миграция mock данных работает корректно

### **Шаг 2: Методы и сервисы (1 день)**

1. Обновить `src/stores/productsStore/productsStore.ts` - добавить методы работы с упаковками
2. Обновить `src/composables/useCostCalculation.ts` - использовать новую систему
3. Создать сервисные функции для работы с упаковками
4. Обновить mock данные

### **Шаг 3: Базовые UI компоненты (1 день)**

1. Создать `PackageOptionsList.vue`
2. Создать `PackageOptionDialog.vue`
3. Обновить `ProductCard.vue` - добавить секцию упаковок
4. Тестирование создания/редактирования упаковок

### **Шаг 4: Интеграция с заказами (1 день)**

1. Создать `PackageSelector.vue`
2. Обновить создание заказов из запросов
3. Добавить выбор упаковки в AI Assistant
4. Тестирование создания заказов

### **Шаг 5: Интеграция с приемкой (1 день)**

1. Обновить `ReceiptDialog.vue`
2. Добавить возможность изменения упаковки при приемке
3. Автоматическое обновление эталонных цен
4. Тестирование приемки товаров

### **Шаг 6: Финальное тестирование (1 день)**

1. Проверить все флоу: AI Assistant → Заказ → Приемка
2. Проверить расчеты себестоимости
3. Проверить корректность FIFO
4. Исправление найденных багов

## 📋 Чеклист готовности к каждому шагу

### **Перед Шагом 0:**

- [ ] Бэкап текущих данных
- [ ] Понимание всех методов использующих старые поля Product
- [ ] Готовность к откату изменений

### **Перед Шагом 1:**

- [ ] Бэкап текущих данных
- [ ] Понимание всех зависимостей в новой системе упаковок
- [ ] Готовность к откату изменений

### **После каждого шага:**

- [ ] Компиляция без ошибок
- [ ] Базовое тестирование измененного функционала
- [ ] Проверка, что существующий функционал не сломался

**Готовы начинать с Шага 0?**
