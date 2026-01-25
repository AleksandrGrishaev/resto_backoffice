# Оптимизация Supabase Egress - ТЗ для продолжения

## Контекст проблемы

- **Превышен лимит Egress:** 5.31 GB / 5 GB (106%) за 13 дней
- **Период биллинга:** 13 Jan - 13 Feb 2026
- **Основной источник (94%):** PostgREST API запросы
- **Главная причина:** Загрузка ВСЕЙ истории при каждой операции POS

## Диагностика (выполнено)

### Тяжёлые таблицы:

| Таблица            | Размер | Записей |
| ------------------ | ------ | ------- |
| sales_transactions | 9.4 MB | 2,783   |
| storage_operations | 7.9 MB | 3,587   |
| recipe_write_offs  | 7 MB   | 2,721   |
| orders             | 2.4 MB | 1,771   |

### Найденные проблемы:

1. **POS payments** - при КАЖДОЙ оплате загружалась вся история (убрано ✅)
2. **getAllTransactions()** - загружала все 2783 записи без лимита (исправлено ✅)
3. **recipe_write_offs** - та же проблема (НЕ исправлено ❌)
4. **storage_operations** - та же проблема (НЕ исправлено ❌)

---

## Что уже сделано ✅

### 1. paymentsStore.ts - убрана загрузка истории

**Файл:** `src/stores/pos/payments/paymentsStore.ts` (строки 238-245)

```typescript
// БЫЛО:
if (!salesStore.initialized) {
  await salesStore.initialize() // ← 9MB при каждой оплате!
}

// СТАЛО:
// ✅ OPTIMIZATION: Don't require full history initialization for recording
// recordSalesTransaction only WRITES data, doesn't need to READ all history
```

### 2. SalesService - добавлен лимит 30 дней

**Файл:** `src/stores/sales/services.ts`

Изменения:

- Добавлен параметр `options: { loadAll?, daysBack?, lightweight? }`
- По умолчанию: последние 30 дней
- Lightweight columns без тяжёлых JSONB полей
- Обратная совместимость: `loadAll: true` загружает всё

```typescript
// Новая сигнатура:
static async getAllTransactions(options?: {
  loadAll?: boolean      // default: false
  daysBack?: number      // default: 30
  lightweight?: boolean  // default: true
}): Promise<ServiceResponse<SalesTransaction[]>>
```

---

## Что осталось сделать ❌

### 3. RecipeWriteOffService - добавить лимит

**Файл:** `src/stores/sales/recipeWriteOff/services.ts`

Функция `getAllWriteOffs()` (строка 16) - нужно:

1. Добавить параметр `options` как в SalesService
2. По умолчанию загружать 30 дней
3. Lightweight колонки без JSONB

### 4. StorageService - проверить и оптимизировать

**Файл:** `src/stores/storage/storageService.ts`

Проверить функции:

- `fetchOperations()`
- Другие методы загрузки storage_operations

### 5. Проверить все точки вызова

| Место          | Файл                         | Что проверить                                    |
| -------------- | ---------------------------- | ------------------------------------------------ |
| App Init       | `*InitializationStrategy.ts` | Может потребовать `loadAll: true` для backoffice |
| useViewRefresh | `useViewRefresh.ts:170`      | Вызывает `fetchTransactions()`                   |
| P&L Report     | `plReportStore.ts`           | Использует `getTransactionsByDateRange()` - OK   |
| Food Cost      | `foodCostStore.ts`           | Использует `getTransactionsByDateRange()` - OK   |

### 6. Добавить кэширование с TTL

```typescript
// Идея реализации:
private static cache: { data: any[], timestamp: number } | null = null
private static CACHE_TTL = 5 * 60 * 1000 // 5 minutes

static async getAllTransactions(options) {
  if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
    return { success: true, data: this.cache.data }
  }
  // ... fetch from Supabase
}
```

---

## Как тестировать

### 1. Проверка POS (главное!)

```
1. Открыть Supabase Dashboard → Logs → API
2. Фильтр: `/rest/v1/sales_transactions`
3. Сделать оплату в POS
4. Результат: НЕ должно быть GET запросов к sales_transactions
```

### 2. Проверка Backoffice

```
1. Открыть Sales → Transactions
2. В логах должен быть 1 запрос (не 3-6 как раньше)
3. Проверить что данные загружаются (последние 30 дней)
```

### 3. Мониторинг Egress

```
Supabase Dashboard → Reports → Egress per day
- До оптимизации: ~400 MB/день
- После: ожидаем ~40-80 MB/день
```

---

## Команды

```bash
# Сборка проекта
pnpm build

# Проверка типов
pnpm exec vue-tsc --noEmit

# Запуск dev сервера
pnpm dev
```

---

## Ожидаемый результат

| Метрика                     | До      | После     |
| --------------------------- | ------- | --------- |
| Egress/день                 | ~400 MB | ~40-80 MB |
| Запросов при оплате POS     | 3-6     | 0         |
| Запросов при открытии Sales | 3-6     | 1         |
| Данных за запрос            | ~9 MB   | ~1 MB     |

**Снижение трафика в 5-10 раз**
