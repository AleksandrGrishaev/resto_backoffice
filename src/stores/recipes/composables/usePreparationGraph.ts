// src/stores/recipes/composables/usePreparationGraph.ts
// Cycle Detection for Nested Preparations (Phase 1)

import type { Preparation, PreparationIngredient } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'usePreparationGraph'

// =============================================
// TYPES
// =============================================

export interface CycleDetectionResult {
  hasCycle: boolean
  cyclePath?: string[] // Array of preparation IDs forming the cycle
  errorMessage?: string
}

interface AdjacencyGraph {
  [preparationId: string]: string[] // preparation ID -> array of ingredient preparation IDs
}

// =============================================
// CYCLE DETECTION LOGIC
// =============================================

/**
 * Проверяет, создаст ли добавление/обновление рецепта циклическую зависимость
 *
 * @param preparationId - ID полуфабриката, который редактируется
 * @param newRecipe - Новый рецепт (массив ингредиентов)
 * @param allPreparations - Все полуфабрикаты в системе
 * @returns Результат проверки с информацией о цикле
 */
export function detectCycle(
  preparationId: string,
  newRecipe: PreparationIngredient[],
  allPreparations: Preparation[]
): CycleDetectionResult {
  try {
    DebugUtils.info(MODULE_NAME, 'Detecting cycle for preparation', { preparationId })

    // Шаг 1: Построить граф зависимостей
    const graph = buildGraph(allPreparations, preparationId, newRecipe)

    // Шаг 2: Проверить наличие цикла с использованием DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const cycleResult = hasCycleDFS(preparationId, graph, visited, recursionStack, path)

    if (cycleResult.hasCycle) {
      DebugUtils.error(MODULE_NAME, 'Cycle detected', { cyclePath: cycleResult.cyclePath })
      return {
        hasCycle: true,
        cyclePath: cycleResult.cyclePath,
        errorMessage: `Circular dependency detected: ${cycleResult.cyclePath?.join(' → ')}`
      }
    }

    DebugUtils.info(MODULE_NAME, 'No cycle detected', { preparationId })
    return { hasCycle: false }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error in cycle detection', { error })
    return {
      hasCycle: true,
      errorMessage: `Error during cycle detection: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Проверяет на самоссылку (A → A)
 */
export function hasSelfReference(preparationId: string, recipe: PreparationIngredient[]): boolean {
  return recipe.some(
    ingredient => ingredient.type === 'preparation' && ingredient.id === preparationId
  )
}

// =============================================
// GRAPH BUILDING
// =============================================

/**
 * Строит граф смежности из всех полуфабрикатов
 *
 * @param allPreparations - Все существующие полуфабрикаты
 * @param updatedPreparationId - ID полуфабриката, который обновляется
 * @param newRecipe - Новый рецепт для обновляемого полуфабриката
 * @returns Граф смежности (preparation → его зависимости)
 */
function buildGraph(
  allPreparations: Preparation[],
  updatedPreparationId: string,
  newRecipe: PreparationIngredient[]
): AdjacencyGraph {
  const graph: AdjacencyGraph = {}

  // Добавляем существующие связи
  allPreparations.forEach(prep => {
    if (prep.id === updatedPreparationId) {
      // Для обновляемого полуфабриката используем новый рецепт
      graph[prep.id] = newRecipe.filter(ing => ing.type === 'preparation').map(ing => ing.id)
    } else {
      // Для остальных используем существующий рецепт
      graph[prep.id] = prep.recipe.filter(ing => ing.type === 'preparation').map(ing => ing.id)
    }
  })

  // Если это новый полуфабрикат, добавляем его в граф
  if (!graph[updatedPreparationId]) {
    graph[updatedPreparationId] = newRecipe
      .filter(ing => ing.type === 'preparation')
      .map(ing => ing.id)
  }

  return graph
}

// =============================================
// DFS ALGORITHM
// =============================================

/**
 * Depth-First Search для обнаружения циклов
 *
 * Алгоритм:
 * 1. Помечаем узел как visited
 * 2. Добавляем в recursion stack (текущий путь обхода)
 * 3. Рекурсивно проверяем все зависимости
 * 4. Если встретили узел из recursion stack → цикл найден
 * 5. Убираем из recursion stack после обработки всех зависимостей
 *
 * Complexity: O(V + E) где V = количество preparations, E = количество связей
 */
function hasCycleDFS(
  nodeId: string,
  graph: AdjacencyGraph,
  visited: Set<string>,
  recursionStack: Set<string>,
  path: string[]
): CycleDetectionResult {
  // Добавляем узел в текущий путь
  visited.add(nodeId)
  recursionStack.add(nodeId)
  path.push(nodeId)

  // Проверяем все зависимости (ingredient preparations)
  const dependencies = graph[nodeId] || []

  for (const dependencyId of dependencies) {
    // Если зависимость не посещена, рекурсивно проверяем
    if (!visited.has(dependencyId)) {
      const result = hasCycleDFS(dependencyId, graph, visited, recursionStack, path)
      if (result.hasCycle) {
        return result
      }
    }
    // Если зависимость уже в recursion stack → цикл!
    else if (recursionStack.has(dependencyId)) {
      // Формируем путь цикла
      const cycleStart = path.indexOf(dependencyId)
      const cyclePath = path.slice(cycleStart).concat([dependencyId])

      return {
        hasCycle: true,
        cyclePath
      }
    }
  }

  // Убираем узел из recursion stack (backtrack)
  recursionStack.delete(nodeId)
  path.pop()

  return { hasCycle: false }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Получает человекочитаемые названия для пути цикла
 */
export function formatCyclePath(cyclePath: string[], allPreparations: Preparation[]): string {
  const prepMap = new Map(allPreparations.map(p => [p.id, p.name]))

  const names = cyclePath.map(id => prepMap.get(id) || id)
  return names.join(' → ')
}

/**
 * Проверяет, использует ли preparation другие preparations (глубина 1)
 */
export function hasNestedPreparations(preparation: Preparation): boolean {
  return preparation.recipe.some(ing => ing.type === 'preparation')
}

/**
 * Получает список всех preparation ingredients в рецепте
 */
export function getPreparationIngredients(preparation: Preparation): PreparationIngredient[] {
  return preparation.recipe.filter(ing => ing.type === 'preparation')
}

/**
 * Получает глубину вложенности (max depth) для preparation
 * Рекурсивный обход для определения уровня вложенности
 */
export function getPreparationDepth(
  preparationId: string,
  allPreparations: Preparation[],
  visited = new Set<string>()
): number {
  // Защита от бесконечной рекурсии
  if (visited.has(preparationId)) {
    return 0
  }

  visited.add(preparationId)

  const preparation = allPreparations.find(p => p.id === preparationId)
  if (!preparation) {
    return 0
  }

  const prepIngredients = getPreparationIngredients(preparation)

  // Если нет вложенных полуфабрикатов → depth = 0
  if (prepIngredients.length === 0) {
    return 0
  }

  // Находим максимальную глубину среди зависимостей
  const depths = prepIngredients.map(ing =>
    getPreparationDepth(ing.id, allPreparations, new Set(visited))
  )

  return 1 + Math.max(...depths, 0)
}

// =============================================
// EXPORT COMPOSABLE
// =============================================

export function usePreparationGraph() {
  return {
    detectCycle,
    hasSelfReference,
    formatCyclePath,
    hasNestedPreparations,
    getPreparationIngredients,
    getPreparationDepth
  }
}
