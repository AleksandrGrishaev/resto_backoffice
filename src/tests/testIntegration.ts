// src/utils/testIntegration.ts

/**
 * Простой тест интеграции Product ↔ Recipe Store
 */
export async function simpleIntegrationTest() {
  console.clear()
  console.log('🧪 ПРОСТОЙ ТЕСТ ИНТЕГРАЦИИ')
  console.log('='.repeat(30))

  try {
    // 1. Загружаем stores
    const { useProductsStore } = await import('@/stores/productsStore')
    const { useRecipesStore } = await import('@/stores/recipes')

    const productStore = useProductsStore()
    const recipeStore = useRecipesStore()

    // 2. Инициализируем данные
    console.log('📦 Шаг 1: Загружаем продукты...')
    await productStore.loadProducts(true) // mock режим
    console.log(`✅ Загружено ${productStore.products.length} продуктов`)

    // 3. Инициализируем recipe store (с интеграцией)
    console.log('\n👨‍🍳 Шаг 2: Инициализируем Recipe Store...')
    await recipeStore.initialize()
    console.log(`✅ Загружено ${recipeStore.activePreparations.length} полуфабрикатов`)

    // 4. Проверяем интеграцию - можем ли получить продукт
    console.log('\n🔗 Шаг 3: Тестируем интеграцию...')
    const testProduct = await productStore.getProductForRecipe('prod-tomato')
    if (testProduct) {
      console.log('✅ Интеграция работает!')
      console.log(`   Продукт: ${testProduct.name}`)
      console.log(`   Цена: ${testProduct.costPerUnit}`)
      console.log(`   Единица: ${testProduct.unit}`)
    } else {
      console.log('❌ Продукт не найден')
      return false
    }

    // 5. Тестируем расчет стоимости полуфабриката
    console.log('\n🧮 Шаг 4: Тестируем расчет стоимости...')
    const preparations = recipeStore.activePreparations
    if (preparations.length > 0) {
      const testPrep = preparations[0]
      console.log(`   Тестируем: ${testPrep.name}`)
      console.log(`   Ингредиентов: ${testPrep.recipe.length}`)

      try {
        const cost = await recipeStore.calculatePreparationCost(testPrep.id)
        console.log('✅ Расчет стоимости успешен!')
        console.log(`   Общая стоимость: $${cost.totalCost.toFixed(2)}`)
        console.log(`   Стоимость за ${testPrep.outputUnit}: $${cost.costPerOutputUnit.toFixed(2)}`)
        console.log(`   Компонентов в расчете: ${cost.componentCosts.length}`)
      } catch (error) {
        console.log('❌ Ошибка расчета стоимости:', error)
        return false
      }
    }

    // 6. Тестируем изменение цены
    console.log('\n💰 Шаг 5: Тестируем изменение цены...')
    const oldPrice = testProduct.costPerUnit
    const newPrice = oldPrice * 1.2 // +20%

    console.log(`   Старая цена томатов: ${oldPrice}`)
    console.log(`   Новая цена томатов: ${newPrice}`)

    try {
      await productStore.notifyPriceChange('prod-tomato', newPrice)
      console.log('✅ Цена обновлена и полуфабрикаты пересчитаны!')
    } catch (error) {
      console.log('❌ Ошибка изменения цены:', error)
      return false
    }

    // 7. Проверяем результат
    console.log('\n📊 Шаг 6: Результаты интеграции...')
    const costsMap = recipeStore.preparationService.getAllCostCalculations()
    console.log(`   Рассчитано стоимостей: ${costsMap.size}`)

    if (costsMap.size > 0) {
      console.log('\n   Примеры расчетов:')
      let count = 0
      costsMap.forEach((cost, prepId) => {
        if (count < 3) {
          const prep = recipeStore.getPreparationById(prepId)
          if (prep) {
            console.log(`   • ${prep.name}: $${cost.totalCost.toFixed(2)}`)
          }
          count++
        }
      })
    }

    console.log('\n🎉 ТЕСТ УСПЕШНО ЗАВЕРШЕН!')
    console.log('✅ Интеграция Product ↔ Recipe Store работает')

    return true
  } catch (error) {
    console.log('\n❌ ТЕСТ ПРОВАЛЕН!')
    console.error('Ошибка:', error)
    return false
  }
}

// Добавляем в window для удобного запуска
if (import.meta.env.DEV) {
  window.__SIMPLE_INTEGRATION_TEST__ = simpleIntegrationTest

  // Показываем инструкцию через 2 секунды
  setTimeout(() => {
    console.log('\n💡 Запустите тест интеграции:')
    console.log('   window.__SIMPLE_INTEGRATION_TEST__()')
  }, 2000)
}
