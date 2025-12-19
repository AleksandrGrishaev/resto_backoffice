// src/stores/recipes/composables/useRecipeGraph.ts
// Cycle Detection for Nested Recipes (Phase 1 - Recipe Nesting)

import type { Recipe, RecipeComponent } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useRecipeGraph'

// =============================================
// CONSTANTS
// =============================================

/**
 * Максимальная глубина вложенности рецептов
 * Пример: Menu → Recipe → Recipe → Preparation → Preparation → Product = 5 уровней
 */
export const MAX_RECIPE_DEPTH = 5

// =============================================
// TYPES
// =============================================

export interface CycleDetectionResult {
  hasCycle: boolean
  cyclePath?: string[] // Array of recipe IDs forming the cycle
  errorMessage?: string
}

export interface DepthValidationResult {
  isValid: boolean
  currentDepth?: number
  maxDepth: number
  errorMessage?: string
  warningMessage?: string // Предупреждение при приближении к лимиту (4/5)
}

interface AdjacencyGraph {
  [recipeId: string]: string[] // recipe ID -> array of nested recipe IDs
}

// =============================================
// CYCLE DETECTION LOGIC
// =============================================

/**
 * Проверяет, создаст ли добавление/обновление компонентов циклическую зависимость
 *
 * @param recipeId - ID рецепта, который редактируется
 * @param newComponents - Новые компоненты рецепта
 * @param allRecipes - Все рецепты в системе
 * @returns Результат проверки с информацией о цикле
 */
export function detectCycle(
  recipeId: string,
  newComponents: RecipeComponent[],
  allRecipes: Recipe[]
): CycleDetectionResult {
  try {
    DebugUtils.info(MODULE_NAME, 'Detecting cycle for recipe', { recipeId })

    // Шаг 1: Построить граф зависимостей
    const graph = buildGraph(allRecipes, recipeId, newComponents)

    // Шаг 2: Проверить наличие цикла с использованием DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const cycleResult = hasCycleDFS(recipeId, graph, visited, recursionStack, path)

    if (cycleResult.hasCycle) {
      DebugUtils.error(MODULE_NAME, 'Cycle detected', { cyclePath: cycleResult.cyclePath })
      return {
        hasCycle: true,
        cyclePath: cycleResult.cyclePath,
        errorMessage: `Circular dependency detected: ${cycleResult.cyclePath?.join(' → ')}`
      }
    }

    DebugUtils.info(MODULE_NAME, 'No cycle detected', { recipeId })
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
export function hasSelfReference(recipeId: string, components: RecipeComponent[]): boolean {
  return components.some(comp => comp.componentType === 'recipe' && comp.componentId === recipeId)
}

// =============================================
// DEPTH VALIDATION
// =============================================

/**
 * Проверяет глубину вложенности рецепта
 *
 * @param recipeId - ID рецепта
 * @param allRecipes - Все рецепты в системе
 * @param maxDepth - Максимальная разрешенная глубина (по умолчанию 5)
 * @returns Результат валидации глубины
 */
export function validateDepth(
  recipeId: string,
  allRecipes: Recipe[],
  maxDepth: number = MAX_RECIPE_DEPTH
): DepthValidationResult {
  try {
    const currentDepth = getRecipeDepth(recipeId, allRecipes)

    DebugUtils.info(MODULE_NAME, 'Validating depth', { recipeId, currentDepth, maxDepth })

    if (currentDepth > maxDepth) {
      return {
        isValid: false,
        currentDepth,
        maxDepth,
        errorMessage: `Recipe nesting depth (${currentDepth}) exceeds maximum allowed (${maxDepth})`
      }
    }

    // Предупреждение при приближении к лимиту (80% от максимума)
    const warningThreshold = Math.floor(maxDepth * 0.8)
    if (currentDepth >= warningThreshold) {
      return {
        isValid: true,
        currentDepth,
        maxDepth,
        warningMessage: `Recipe nesting depth is ${currentDepth}/${maxDepth}. Consider reducing complexity.`
      }
    }

    return {
      isValid: true,
      currentDepth,
      maxDepth
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error in depth validation', { error })
    return {
      isValid: false,
      maxDepth,
      errorMessage: `Error during depth validation: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// =============================================
// GRAPH BUILDING
// =============================================

/**
 * Строит граф смежности из всех рецептов
 *
 * @param allRecipes - Все существующие рецепты
 * @param updatedRecipeId - ID рецепта, который обновляется
 * @param newComponents - Новые компоненты для обновляемого рецепта
 * @returns Граф смежности (recipe → его зависимости)
 */
function buildGraph(
  allRecipes: Recipe[],
  updatedRecipeId: string,
  newComponents: RecipeComponent[]
): AdjacencyGraph {
  const graph: AdjacencyGraph = {}

  // Добавляем существующие связи
  allRecipes.forEach(recipe => {
    if (recipe.id === updatedRecipeId) {
      // Для обновляемого рецепта используем новые компоненты
      graph[recipe.id] = newComponents
        .filter(comp => comp.componentType === 'recipe')
        .map(comp => comp.componentId)
    } else {
      // Для остальных используем существующие компоненты
      graph[recipe.id] = recipe.components
        .filter(comp => comp.componentType === 'recipe')
        .map(comp => comp.componentId)
    }
  })

  // Если это новый рецепт, добавляем его в граф
  if (!graph[updatedRecipeId]) {
    graph[updatedRecipeId] = newComponents
      .filter(comp => comp.componentType === 'recipe')
      .map(comp => comp.componentId)
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
 * Complexity: O(V + E) где V = количество recipes, E = количество связей
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

  // Проверяем все зависимости (nested recipes)
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
export function formatCyclePath(cyclePath: string[], allRecipes: Recipe[]): string {
  const recipeMap = new Map(allRecipes.map(r => [r.id, r.name]))

  const names = cyclePath.map(id => recipeMap.get(id) || id)
  return names.join(' → ')
}

/**
 * Проверяет, использует ли recipe другие recipes (глубина 1)
 */
export function hasNestedRecipes(recipe: Recipe): boolean {
  return recipe.components.some(comp => comp.componentType === 'recipe')
}

/**
 * Получает список всех recipe components в рецепте
 */
export function getRecipeComponents(recipe: Recipe): RecipeComponent[] {
  return recipe.components.filter(comp => comp.componentType === 'recipe')
}

/**
 * Получает глубину вложенности (max depth) для recipe
 * Рекурсивный обход для определения уровня вложенности
 */
export function getRecipeDepth(
  recipeId: string,
  allRecipes: Recipe[],
  visited = new Set<string>()
): number {
  // Защита от бесконечной рекурсии
  if (visited.has(recipeId)) {
    return 0
  }

  visited.add(recipeId)

  const recipe = allRecipes.find(r => r.id === recipeId)
  if (!recipe) {
    return 0
  }

  const nestedRecipes = getRecipeComponents(recipe)

  // Если нет вложенных рецептов → depth = 0
  if (nestedRecipes.length === 0) {
    return 0
  }

  // Находим максимальную глубину среди зависимостей
  const depths = nestedRecipes.map(comp =>
    getRecipeDepth(comp.componentId, allRecipes, new Set(visited))
  )

  return 1 + Math.max(...depths, 0)
}

/**
 * Получает список всех рецептов, которые используют данный рецепт
 * (обратная зависимость - "used in")
 */
export function getRecipesUsingRecipe(recipeId: string, allRecipes: Recipe[]): Recipe[] {
  return allRecipes.filter(recipe =>
    recipe.components.some(comp => comp.componentType === 'recipe' && comp.componentId === recipeId)
  )
}

// =============================================
// EXPORT COMPOSABLE
// =============================================

export function useRecipeGraph() {
  return {
    detectCycle,
    hasSelfReference,
    validateDepth,
    formatCyclePath,
    hasNestedRecipes,
    getRecipeComponents,
    getRecipeDepth,
    getRecipesUsingRecipe,
    MAX_RECIPE_DEPTH
  }
}
