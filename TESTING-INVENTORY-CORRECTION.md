# Testing Guide: Unified Inventory Correction System

## Overview

Тестирование новой системы inventory adjustments для полуфабрикатов (preparations).

**Ключевые изменения:**

- Негативные остатки теперь покрываются через production receipt (с списанием сырья)
- Обычные расхождения используют единую `correction` операцию
- Все discrepancies влияют на KPI

---

## Pre-Test Setup

### Current Negative Stock Items (DEV Database):

1. **Avocado cleaned**: -270 gr (✅ Идеально для теста)
2. **Chicken breast thawed 200g**: -1 gr
3. **Humus red**: -40 gr
4. **Bacon slices 30g**: -60 gr
5. **Mozarella 30gr**: -75 gr

---

## Test Scenarios

### Test Case 1: Negative Stock → Zero (Deficit Coverage)

**Цель:** Проверить, что негативный остаток покрывается production receipt с write-off сырья

**Шаги:**

1. Открыть Kitchen Inventory (или Bar Inventory)
2. Создать новую инвентаризацию: `Create Inventory`
3. Найти **Avocado cleaned** (должен показывать system: -270 gr)
4. Ввести actual quantity: **0 gr**
5. Подтвердить (confirm/check)
6. Нажать **Finalize Inventory**

**Ожидаемый результат:**

- ✅ Создается 1 **production receipt** (не correction!)
- ✅ Operation type: `receipt`
- ✅ Source type: `negative_correction`
- ✅ Quantity: 270 gr
- ✅ Создается **storage write-off** для сырья (по рецепту Avocado)
- ✅ Negative batch помечается как `reconciled_at`
- ✅ Final balance: 0 gr
- ✅ Cost рассчитан из FIFO cost сырья (НЕ lastKnownCost!)

---

### Test Case 2: Negative Stock → Positive (Deficit + New Stock)

**Цель:** Проверить, что создается ОДИН production receipt на сумму дефицита + фактического остатка

**Шаги:**

1. Найти любой item с негативным остатком (например, Chicken breast: -1 gr)
2. Ввести actual quantity: **100 gr** (или любое положительное значение)
3. Finalize

**Ожидаемый результат:**

- ✅ Создается 1 **production receipt**
- ✅ Quantity: 101 gr (deficit 1 + actual 100)
- ✅ Создается storage write-off на 101 gr сырья
- ✅ Negative batch reconciled
- ✅ Final balance: 100 gr

---

### Test Case 3: Normal Shortage (No Negative)

**Цель:** Проверить correction operation для обычного shortage

**Шаги:**

1. Найти item с положительным system quantity (например, 500 gr)
2. Ввести actual: **300 gr**
3. Finalize

**Ожидаемый результат:**

- ✅ Создается 1 **correction operation** (НЕ receipt!)
- ✅ Operation type: `correction`
- ✅ Quantity: -200 gr (отрицательное значение)
- ✅ FIFO allocation из существующих batches
- ✅ Может создать negative batch если не хватает stock
- ✅ Final balance: 300 gr
- ✅ **НЕТ storage write-off** (это не production)

---

### Test Case 4: Normal Surplus (No Negative)

**Цель:** Проверить correction operation для surplus

**Шаги:**

1. Найти item с system: 500 gr
2. Ввести actual: **700 gr**
3. Finalize

**Ожидаемый результат:**

- ✅ Создается 1 **correction operation**
- ✅ Quantity: +200 gr
- ✅ Создается новый batch с `source_type='correction'`
- ✅ Cost: lastKnownCost
- ✅ Final balance: 700 gr

---

## SQL Queries for Verification

### Query 1: Check Operations Created

```sql
-- Показать последние операции после финализации
SELECT
  po.id,
  po.operation_type,
  po.document_number,
  po.total_value,
  po.correction_details,
  po.related_inventory_id,
  po.related_storage_operation_ids,
  po.notes,
  po.created_at
FROM preparation_operations po
WHERE po.created_at > now() - interval '10 minutes'
ORDER BY po.created_at DESC;
```

### Query 2: Check Storage Write-Offs (for deficit coverage)

```sql
-- Показать storage write-offs связанные с preparation operations
SELECT
  so.id,
  so.operation_type,
  so.document_number,
  so.total_value,
  so.write_off_details,
  so.items,
  so.created_at
FROM storage_operations so
WHERE so.created_at > now() - interval '10 minutes'
  AND so.write_off_details->>'reason' = 'production_consumption'
ORDER BY so.created_at DESC;
```

### Query 3: Check New Batches Created

```sql
-- Показать новые batches после финализации
SELECT
  pb.batch_number,
  p.name as preparation_name,
  pb.source_type,
  pb.initial_quantity,
  pb.current_quantity,
  pb.cost_per_unit,
  pb.total_value,
  pb.is_negative,
  pb.status,
  pb.created_at
FROM preparation_batches pb
JOIN preparations p ON p.id = pb.preparation_id
WHERE pb.created_at > now() - interval '10 minutes'
ORDER BY pb.created_at DESC;
```

### Query 4: Check Negative Batch Reconciliation

```sql
-- Проверить, что negative batches были reconciled
SELECT
  pb.batch_number,
  p.name as preparation_name,
  pb.current_quantity,
  pb.is_negative,
  pb.reconciled_at,
  pb.status
FROM preparation_batches pb
JOIN preparations p ON p.id = pb.preparation_id
WHERE pb.is_negative = true
  AND pb.reconciled_at > now() - interval '10 minutes'
ORDER BY pb.reconciled_at DESC;
```

### Query 5: Check Final Balance

```sql
-- Проверить финальный баланс для Avocado cleaned
SELECT
  p.name,
  SUM(pb.current_quantity) as total_balance,
  COUNT(*) FILTER (WHERE pb.is_negative = false AND pb.reconciled_at IS NULL) as active_batches,
  COUNT(*) FILTER (WHERE pb.is_negative = true AND pb.reconciled_at IS NULL) as negative_batches,
  COUNT(*) FILTER (WHERE pb.reconciled_at IS NOT NULL) as reconciled_batches
FROM preparation_batches pb
JOIN preparations p ON p.id = pb.preparation_id
WHERE p.name = 'Avocado cleaned'
  AND pb.reconciled_at IS NULL  -- Exclude reconciled batches from balance
GROUP BY p.name;
```

### Query 6: Compare Raw Material Costs

```sql
-- Сравнить стоимость production receipt с lastKnownCost
-- Должны быть разные! (FIFO cost vs estimated)
SELECT
  p.name,
  p.last_known_cost as estimated_cost,
  pb.cost_per_unit as actual_fifo_cost,
  pb.batch_number,
  pb.total_value,
  pb.source_type
FROM preparation_batches pb
JOIN preparations p ON p.id = pb.preparation_id
WHERE pb.source_type = 'negative_correction'
  AND pb.created_at > now() - interval '10 minutes'
ORDER BY pb.created_at DESC;
```

---

## Expected Console Logs

При финализации inventory ты должен увидеть в консоли:

**For Test Case 1 (Negative → Zero):**

```
PreparationService: Inventory finalization - item categorization
  negativeCorrectionItems: 1
  normalDiscrepancyItems: 0
  matchedItems: 0

PreparationService: Covering deficits via production { count: 1 }

PreparationService: Covering deficit via production
  preparation: 'Avocado cleaned'
  deficitQuantity: 270
  actualQuantity: 0
  totalQuantityNeeded: 270

PreparationService: Creating preparation receipt operation
  skipAutoWriteOff: false  ← ВАЖНО! Должно быть false

StorageService: Creating write-off operation (для сырья)
  reason: 'production_consumption'

PreparationService: ✅ Deficit covered via production
  preparation: 'Avocado cleaned'
  quantityProduced: 270

PreparationService: ✅ Inventory finalized successfully
  negativeCorrectionItems: 1
  normalDiscrepancyItems: 0
  matchedItems: 0
```

**For Test Case 3 (Normal Shortage):**

```
PreparationService: Inventory finalization - item categorization
  negativeCorrectionItems: 0
  normalDiscrepancyItems: 1
  matchedItems: 0

PreparationService: Creating inventory corrections { count: 1 }

PreparationService: Creating preparation correction operation

PreparationService: ✅ Processed shortage
  preparationId: '...'
  quantity: -200
  cost: ...

PreparationService: ✅ Inventory correction created
```

---

## Common Issues & Debugging

### Issue 1: "No recipe found" error

**Причина:** У preparation нет рецепта
**Решение:** Проверить, что в `recipes` таблице есть recipe для этого preparation

### Issue 2: "Insufficient stock for raw materials"

**Причина:** Не хватает сырья для write-off
**Решение:** Добавить stock для продуктов в рецепте

### Issue 3: Negative batch не reconciled

**Причина:** Ошибка в reconciliationService
**Проверка:** Запустить Query 4 и проверить `reconciled_at`

### Issue 4: Cost = lastKnownCost (неправильно!)

**Причина:** skipAutoWriteOff = true (должно быть false)
**Проверка:** Запустить Query 6 и сравнить costs

---

## Success Criteria

✅ **Test Case 1 пройден, если:**

1. Создан 1 receipt operation (не correction!)
2. Создан 1 storage write-off (production_consumption)
3. Negative batch имеет reconciled_at
4. Final balance = 0
5. Cost ≠ lastKnownCost (использован FIFO)

✅ **Test Case 3 пройден, если:**

1. Создан 1 correction operation
2. НЕТ storage write-off
3. Final balance = 300
4. Quantity = -200 (отрицательное)

---

## Next Steps After Testing

После успешного тестирования:

1. Проверить UI отображение в batch details
2. Проверить reports (KPI, variance, etc.)
3. Протестировать на production database (осторожно!)
4. Создать migration для добавления `correction` operation type (если нужно)

---

**Ready to test!** 🚀

Запускай dev server: `pnpm dev` и начинай тестирование.
Я буду мониторить базу данных через SQL-запросы выше.
