<!-- src/views/recipes/components/widgets/ModifiersEditorWidget.vue -->
<template>
  <v-card class="modifiers-editor-widget" variant="outlined">
    <v-card-title class="d-flex align-center justify-space-between bg-grey-lighten-4">
      <div class="d-flex align-center">
        <v-icon icon="mdi-puzzle" class="mr-2" />
        <span>Modifiers & Customization</span>
      </div>
      <v-chip size="small" :color="hasModifiers ? 'success' : 'default'">
        {{ modifierGroups.length }} groups
      </v-chip>
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Empty State -->
      <div v-if="!hasModifiers" class="text-center py-8">
        <v-icon icon="mdi-puzzle-outline" size="48" color="grey" class="mb-4" />
        <div class="text-body-1 text-grey mb-4">No modifiers configured</div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="addModifierGroup">
          Add First Modifier Group
        </v-btn>
      </div>

      <!-- Modifier Groups List -->
      <div v-else>
        <v-expansion-panels v-model="openPanels" multiple>
          <v-expansion-panel
            v-for="(group, groupIndex) in modifierGroups"
            :key="group.id"
            :value="groupIndex"
          >
            <!-- Panel Header -->
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-chip :color="group.isRequired ? 'error' : 'default'" size="small" class="mr-2">
                    {{ group.isRequired ? 'Required' : 'Optional' }}
                  </v-chip>
                  <span class="font-weight-bold">{{ group.name }}</span>
                  <span class="text-grey ml-2 text-body-2">
                    ({{ group.options.length }} options)
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>

            <!-- Panel Content -->
            <v-expansion-panel-text>
              <!-- Group Settings -->
              <v-row class="mb-4">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="group.name"
                    label="Group Name *"
                    density="compact"
                    variant="outlined"
                    placeholder="e.g., Choose your bread"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="group.type"
                    :items="modifierTypes"
                    label="Modifier Type *"
                    density="compact"
                    variant="outlined"
                  />
                </v-col>
                <!-- ✅ Group Style удалено - логика определяется через isRequired -->
                <v-col cols="12">
                  <v-textarea
                    v-model="group.description"
                    label="Description"
                    density="compact"
                    variant="outlined"
                    rows="2"
                    placeholder="Optional description for customers"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-switch
                    v-model="group.isRequired"
                    label="Required Selection"
                    color="error"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="group.minSelection"
                    type="number"
                    label="Min Selection"
                    density="compact"
                    variant="outlined"
                    min="0"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="group.maxSelection"
                    type="number"
                    label="Max Selection (0=unlimited)"
                    density="compact"
                    variant="outlined"
                    min="0"
                  />
                </v-col>

                <!-- Target Component Selector (only for replacement type) -->
                <v-col v-if="group.type === 'replacement'" cols="12">
                  <v-alert
                    v-if="availableTargetComponents.length === 0"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-2"
                  >
                    <div class="text-caption">
                      No recipe components available. Add a recipe to the variant composition first.
                    </div>
                  </v-alert>
                  <v-select
                    v-else
                    :model-value="getSelectedTargetValue(group)"
                    :items="availableTargetComponents"
                    item-title="label"
                    item-value="value"
                    label="Target Component to Replace"
                    density="compact"
                    variant="outlined"
                    clearable
                    prepend-inner-icon="mdi-target"
                    hint="Select which ingredient from the recipe will be replaced"
                    persistent-hint
                    :return-object="true"
                    @update:model-value="val => updateTargetComponent(groupIndex, val)"
                  >
                    <template #prepend-inner>
                      <v-icon icon="mdi-swap-horizontal" color="warning" />
                    </template>
                  </v-select>
                  <v-chip
                    v-if="group.targetComponent"
                    size="small"
                    color="warning"
                    variant="tonal"
                    class="mt-2"
                    closable
                    @click:close="updateTargetComponent(groupIndex, null)"
                  >
                    <v-icon icon="mdi-target" size="14" class="mr-1" />
                    Replaces: {{ group.targetComponent.componentName }}
                  </v-chip>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- Options List -->
              <div class="mb-2">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-subtitle-2">Options:</span>
                  <v-btn
                    size="small"
                    color="primary"
                    variant="text"
                    prepend-icon="mdi-plus"
                    @click="addOption(groupIndex)"
                  >
                    Add Option
                  </v-btn>
                </div>

                <v-list class="pa-0">
                  <v-list-item
                    v-for="(option, optionIndex) in group.options"
                    :key="option.id"
                    class="px-0 mb-2 border rounded option-item"
                  >
                    <v-row dense class="pa-3">
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="option.name"
                          label="Option Name *"
                          density="compact"
                          variant="outlined"
                          hide-details
                        />
                      </v-col>
                      <v-col cols="12" md="3">
                        <v-text-field
                          v-model.number="option.priceAdjustment"
                          type="number"
                          label="Price Adjustment"
                          density="compact"
                          variant="outlined"
                          prefix="IDR"
                          hide-details
                        />
                      </v-col>
                      <v-col cols="12" md="3">
                        <div class="d-flex align-center ga-2 pa-2">
                          <!-- ✅ isDefault для required groups (заменяемые компоненты) -->
                          <v-switch
                            v-if="group.isRequired"
                            v-model="option.isDefault"
                            label="Default"
                            density="compact"
                            color="success"
                            hide-details
                          />
                          <v-switch
                            v-model="option.isActive"
                            label="Active"
                            density="compact"
                            color="primary"
                            hide-details
                          />
                        </div>
                      </v-col>
                      <v-col cols="12" md="2" class="d-flex align-center justify-end">
                        <v-btn
                          icon="mdi-delete"
                          variant="text"
                          size="small"
                          color="error"
                          @click="removeOption(groupIndex, optionIndex)"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-textarea
                          v-model="option.description"
                          label="Description"
                          density="compact"
                          variant="outlined"
                          rows="1"
                          hide-details
                        />
                      </v-col>
                      <!-- ✅ Composition Editor -->
                      <v-col cols="12">
                        <div class="composition-editor pa-3 rounded">
                          <div class="d-flex align-center justify-space-between mb-2">
                            <span class="text-caption font-weight-bold">Composition</span>
                            <div class="d-flex ga-1">
                              <v-btn
                                size="x-small"
                                variant="text"
                                color="primary"
                                @click="showDishSelector(groupIndex, optionIndex)"
                              >
                                <v-icon icon="mdi-chef-hat" size="14" class="mr-1" />
                                Dish
                              </v-btn>
                              <v-btn
                                size="x-small"
                                variant="text"
                                color="secondary"
                                @click="showProductSelector(groupIndex, optionIndex)"
                              >
                                <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
                                Product
                              </v-btn>
                            </div>
                          </div>

                          <!-- Empty state -->
                          <div
                            v-if="!option.composition || option.composition.length === 0"
                            class="text-caption text-grey text-center pa-2"
                            style="border: 1px dashed #ccc; border-radius: 4px"
                          >
                            No composition defined (modifier won't affect inventory)
                          </div>

                          <!-- Composition items -->
                          <div v-else class="composition-list">
                            <div
                              v-for="(comp, compIndex) in option.composition"
                              :key="compIndex"
                              class="composition-item d-flex align-center ga-2 pa-2 mb-1 rounded"
                            >
                              <v-icon
                                :icon="getCompositionIcon(comp.type)"
                                size="14"
                                :color="getCompositionColor(comp.type)"
                              />
                              <span class="text-caption flex-grow-1">
                                {{ getCompositionName(comp) }}
                              </span>
                              <v-text-field
                                v-model.number="comp.quantity"
                                type="number"
                                density="compact"
                                variant="outlined"
                                hide-details
                                style="width: 60px"
                              />
                              <!-- ⭐ PHASE 2: Lock unit selector for portion-type preparations -->
                              <v-select
                                v-model="comp.unit"
                                :items="unitOptions"
                                density="compact"
                                variant="outlined"
                                hide-details
                                style="width: 80px"
                                :disabled="isCompositionPortionType(comp)"
                              />
                              <v-btn
                                icon="mdi-delete"
                                variant="text"
                                size="x-small"
                                color="error"
                                @click="removeComposition(groupIndex, optionIndex, compIndex)"
                              />
                            </div>
                          </div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-list-item>
                </v-list>
              </div>

              <!-- Group Actions -->
              <v-divider class="my-4" />
              <div class="d-flex justify-end">
                <v-btn
                  variant="text"
                  color="error"
                  prepend-icon="mdi-delete"
                  @click="removeModifierGroup(groupIndex)"
                >
                  Remove Group
                </v-btn>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Add Group Button -->
        <v-btn
          class="mt-4"
          block
          variant="outlined"
          color="primary"
          prepend-icon="mdi-plus"
          @click="addModifierGroup"
        >
          Add Another Modifier Group
        </v-btn>
      </div>

      <!-- Templates Section -->
      <v-divider class="my-6" />
      <div>
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-subtitle-1 font-weight-bold">Quick Select Templates</div>
          <v-chip size="small">{{ templates.length }} templates</v-chip>
        </div>

        <div v-if="templates.length === 0" class="text-center py-4 bg-grey-lighten-5 rounded">
          <div class="text-body-2 text-grey mb-2">No templates configured</div>
          <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-plus">
            Add Template
          </v-btn>
        </div>

        <v-list v-else class="pa-0">
          <v-list-item v-for="template in templates" :key="template.id" class="border rounded mb-2">
            <v-list-item-title>{{ template.name }}</v-list-item-title>
            <v-list-item-subtitle v-if="template.description">
              {{ template.description }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn icon="mdi-delete" variant="text" size="small" color="error" />
            </template>
          </v-list-item>
        </v-list>

        <v-alert type="info" density="compact" variant="tonal" class="mt-3">
          <div class="text-caption">
            <strong>Templates</strong>
            allow customers to quickly select pre-configured modifier combinations (e.g., "Simple
            Breakfast", "Premium Breakfast")
          </div>
        </v-alert>
      </div>
    </v-card-text>

    <!-- Диалог выбора блюда -->
    <v-dialog v-model="dishSelectorDialog.show" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Add Dish to Composition</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="dishSelectorDialog.show = false"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <dish-search-widget :dishes="dishOptions" @dish-selected="addDishToComposition" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Диалог выбора продукта -->
    <v-dialog v-model="productSelectorDialog.show" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Add Product to Composition</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="productSelectorDialog.show = false"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <product-search-widget
            :products="productOptions"
            @product-selected="addProductToComposition"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  ModifierGroup,
  ModifierOption,
  VariantTemplate,
  DishType,
  MenuComposition,
  DishOption,
  ProductOption,
  TargetComponent
} from '@/stores/menu/types'
import type { Recipe, RecipeComponent } from '@/stores/recipes/types'
import { useRecipesStore } from '@/stores/recipes'
import DishSearchWidget from '@/views/menu/components/widgets/DishSearchWidget.vue'
import ProductSearchWidget from '@/views/menu/components/widgets/ProductSearchWidget.vue'

interface Props {
  modifierGroups: ModifierGroup[]
  templates: VariantTemplate[]
  dishType: DishType // ✨ NEW: тип блюда
  dishOptions?: DishOption[] // ✅ NEW: Опции для блюд (рецепты + полуфабрикаты)
  productOptions?: ProductOption[] // ✅ NEW: Опции для продуктов
  variantComposition?: MenuComposition[] // ✅ NEW: Composition варианта для target component selection
}

const props = withDefaults(defineProps<Props>(), {
  modifierGroups: () => [],
  templates: () => [],
  dishType: 'simple',
  dishOptions: () => [],
  productOptions: () => [],
  variantComposition: () => []
})

// Store access for recipe components
const recipesStore = useRecipesStore()

const emit = defineEmits<{
  'update:modifierGroups': [groups: ModifierGroup[]]
  'update:templates': [templates: VariantTemplate[]]
}>()

// State
const openPanels = ref<number[]>([])

// ✅ NEW: Dialog state for composition selectors
const dishSelectorDialog = ref<{
  show: boolean
  groupIndex: number | null
  optionIndex: number | null
}>({
  show: false,
  groupIndex: null,
  optionIndex: null
})

const productSelectorDialog = ref<{
  show: boolean
  groupIndex: number | null
  optionIndex: number | null
}>({
  show: false,
  groupIndex: null,
  optionIndex: null
})

// Unit options for composition
// ⭐ PHASE 2: Added 'portion' for portion-type preparations
const unitOptions = [
  { title: 'Grams', value: 'gram' },
  { title: 'Milliliters', value: 'ml' },
  { title: 'Pieces', value: 'piece' },
  { title: 'Liters', value: 'liter' },
  { title: 'Kilograms', value: 'kg' },
  { title: 'Portions', value: 'portion' }
]

// Constants
const modifierTypes = [
  { title: 'Add-on (adds to base)', value: 'addon' },
  { title: 'Replacement (replaces base)', value: 'replacement' },
  { title: 'Removal (removes from base)', value: 'removal' }
]

// ✅ groupStyleOptions удалено - groupStyle больше не используется

// Computed
const hasModifiers = computed(() => props.modifierGroups.length > 0)

/**
 * Построение списка доступных target компонентов для replacement модификаторов.
 * Включает компоненты из рецептов в composition варианта.
 */
interface TargetComponentOption {
  label: string
  value: TargetComponent
}

const availableTargetComponents = computed((): TargetComponentOption[] => {
  const options: TargetComponentOption[] = []

  if (!props.variantComposition || props.variantComposition.length === 0) {
    return options
  }

  // Iterate through variant composition
  for (const comp of props.variantComposition) {
    if (comp.type === 'recipe') {
      // Get recipe and its components
      const recipe = recipesStore.recipes.find((r: Recipe) => r.id === comp.id)
      if (recipe && recipe.components) {
        for (const recipeComp of recipe.components) {
          const componentName = getRecipeComponentName(recipeComp)
          options.push({
            label: `${recipe.name} → ${componentName}`,
            value: {
              sourceType: 'recipe',
              recipeId: recipe.id,
              componentId: recipeComp.id,
              componentType: recipeComp.componentType,
              componentName: componentName
            }
          })
        }
      }
    } else if (comp.type === 'product') {
      // Direct product in variant composition
      const product = props.productOptions?.find(p => p.id === comp.id)
      options.push({
        label: `Variant → ${product?.name || 'Unknown product'}`,
        value: {
          sourceType: 'variant',
          componentId: comp.id,
          componentType: 'product',
          componentName: product?.name || 'Unknown'
        }
      })
    } else if (comp.type === 'preparation') {
      // Direct preparation in variant composition
      const dish = props.dishOptions?.find(d => d.id === comp.id && d.type === 'preparation')
      options.push({
        label: `Variant → ${dish?.name || 'Unknown preparation'}`,
        value: {
          sourceType: 'variant',
          componentId: comp.id,
          componentType: 'preparation',
          componentName: dish?.name || 'Unknown'
        }
      })
    }
  }

  return options
})

function getRecipeComponentName(comp: RecipeComponent): string {
  if (comp.componentType === 'product') {
    const product = props.productOptions?.find(p => p.id === comp.componentId)
    return product?.name || 'Unknown product'
  } else {
    const dish = props.dishOptions?.find(d => d.id === comp.componentId)
    return dish?.name || 'Unknown'
  }
}

function updateTargetComponent(groupIndex: number, selected: TargetComponentOption | null): void {
  const updated = [...props.modifierGroups]
  // ✅ FIX: Extract .value from the select option object
  updated[groupIndex].targetComponent = selected?.value || undefined
  emit('update:modifierGroups', updated)
}

function getSelectedTargetValue(group: ModifierGroup): TargetComponentOption | null {
  if (!group.targetComponent) return null
  // ✅ FIX: Find matching option for v-select with return-object="true"
  return (
    availableTargetComponents.value.find(opt =>
      targetComponentsEqual(opt.value, group.targetComponent!)
    ) || null
  )
}

function targetComponentsEqual(a: TargetComponent | null, b: TargetComponent | null): boolean {
  if (!a || !b) return a === b
  return (
    a.sourceType === b.sourceType && a.recipeId === b.recipeId && a.componentId === b.componentId
  )
}

// Methods
function addModifierGroup(): void {
  const newGroup: ModifierGroup = {
    id: `mg-${Date.now()}`,
    name: 'New Modifier Group',
    description: '',
    type: 'addon',
    // ✅ groupStyle удалено
    isRequired: false,
    minSelection: 0,
    maxSelection: 1,
    sortOrder: props.modifierGroups.length,
    options: []
  }

  emit('update:modifierGroups', [...props.modifierGroups, newGroup])
  openPanels.value.push(props.modifierGroups.length)
}

function removeModifierGroup(index: number): void {
  const updated = [...props.modifierGroups]
  updated.splice(index, 1)
  emit('update:modifierGroups', updated)
}

function addOption(groupIndex: number): void {
  const newOption: ModifierOption = {
    id: `mo-${Date.now()}`,
    name: 'New Option',
    description: '',
    priceAdjustment: 0,
    isDefault: false,
    isActive: true,
    sortOrder: props.modifierGroups[groupIndex].options.length,
    composition: []
  }

  const updated = [...props.modifierGroups]
  updated[groupIndex].options.push(newOption)
  emit('update:modifierGroups', updated)
}

function removeOption(groupIndex: number, optionIndex: number): void {
  const updated = [...props.modifierGroups]
  updated[groupIndex].options.splice(optionIndex, 1)
  emit('update:modifierGroups', updated)
}

// ✅ NEW: Composition editor methods
function showDishSelector(groupIndex: number, optionIndex: number): void {
  dishSelectorDialog.value = {
    show: true,
    groupIndex,
    optionIndex
  }
}

function showProductSelector(groupIndex: number, optionIndex: number): void {
  productSelectorDialog.value = {
    show: true,
    groupIndex,
    optionIndex
  }
}

function addDishToComposition(dish: DishOption): void {
  const { groupIndex, optionIndex } = dishSelectorDialog.value
  if (groupIndex === null || optionIndex === null) return

  const updated = [...props.modifierGroups]
  const option = updated[groupIndex].options[optionIndex]

  if (!option.composition) {
    option.composition = []
  }

  // ⭐ PHASE 2: For portion-type preparations, auto-set unit to 'portion' and quantity to 1
  const isPortionType = dish.portionType === 'portion' && dish.portionSize

  const newComp: MenuComposition = {
    type: dish.type,
    id: dish.id,
    quantity: isPortionType ? 1 : dish.outputQuantity,
    unit: isPortionType ? 'portion' : dish.unit,
    role: 'addon',
    // ⭐ PHASE 2: Store portion info for UI
    portionType: dish.portionType,
    portionSize: dish.portionSize
  }

  option.composition.push(newComp)
  emit('update:modifierGroups', updated)
  dishSelectorDialog.value.show = false
}

function addProductToComposition(product: ProductOption): void {
  const { groupIndex, optionIndex } = productSelectorDialog.value
  if (groupIndex === null || optionIndex === null) return

  const updated = [...props.modifierGroups]
  const option = updated[groupIndex].options[optionIndex]

  if (!option.composition) {
    option.composition = []
  }

  const newComp: MenuComposition = {
    type: 'product',
    id: product.id,
    quantity: 1,
    unit: product.unit,
    role: 'addon'
  }

  option.composition.push(newComp)
  emit('update:modifierGroups', updated)
  productSelectorDialog.value.show = false
}

function removeComposition(groupIndex: number, optionIndex: number, compIndex: number): void {
  const updated = [...props.modifierGroups]
  const option = updated[groupIndex].options[optionIndex]
  if (option.composition) {
    option.composition.splice(compIndex, 1)
    emit('update:modifierGroups', updated)
  }
}

// ✅ NEW: Helper functions for composition display
function getCompositionIcon(type: 'product' | 'recipe' | 'preparation'): string {
  switch (type) {
    case 'recipe':
      return 'mdi-chef-hat'
    case 'preparation':
      return 'mdi-food-variant'
    case 'product':
      return 'mdi-package-variant'
    default:
      return 'mdi-help-circle'
  }
}

function getCompositionColor(type: 'product' | 'recipe' | 'preparation'): string {
  switch (type) {
    case 'recipe':
      return 'primary'
    case 'preparation':
      return 'secondary'
    case 'product':
      return 'info'
    default:
      return 'grey'
  }
}

function getCompositionName(comp: MenuComposition): string {
  if (comp.type === 'product') {
    const product = props.productOptions?.find(p => p.id === comp.id)
    return product?.name || 'Unknown product'
  } else {
    const dish = props.dishOptions?.find(d => d.id === comp.id && d.type === comp.type)
    return dish?.name || 'Unknown dish'
  }
}

// ⭐ PHASE 2: Check if composition is portion-type (unit selector should be locked)
function isCompositionPortionType(comp: MenuComposition): boolean {
  return comp.portionType === 'portion' && !!comp.portionSize
}
</script>

<style scoped lang="scss">
.modifiers-editor-widget {
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
}

.option-item {
  :deep(.v-list-item__content) {
    overflow: visible;
  }
}

.composition-editor {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border: 1px solid rgba(var(--v-border-color), 0.2);
}

.composition-item {
  background: rgba(var(--v-theme-surface), 0.8);
  border: 1px solid rgba(var(--v-border-color), 0.1);
}
</style>
