<!-- src/views/recipes/components/widgets/ModifiersEditorWidget.vue -->
<template>
  <div class="modifiers-editor">
    <!-- Empty State -->
    <div v-if="!hasModifiers" class="empty-state">
      <v-icon icon="mdi-puzzle-outline" size="48" color="deep-purple-lighten-2" class="mb-3" />
      <div class="text-body-1 mb-2">No modifiers configured</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        Add modifier groups to let customers customize this dish.
      </div>
      <v-btn color="deep-purple" variant="flat" size="large" height="48" @click="addModifierGroup">
        <v-icon icon="mdi-plus" size="20" class="mr-2" />
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
          class="modifier-panel"
          :class="group.isRequired ? 'modifier-panel--required' : 'modifier-panel--optional'"
        >
          <!-- Panel Header -->
          <v-expansion-panel-title class="modifier-panel__title">
            <div class="d-flex align-center w-100 pr-2">
              <v-chip
                :color="group.isRequired ? 'error' : 'info'"
                size="small"
                variant="flat"
                class="mr-3"
              >
                {{ group.isRequired ? 'Required' : 'Optional' }}
              </v-chip>
              <span class="font-weight-bold text-body-1">{{ group.name }}</span>
              <v-chip size="small" variant="tonal" class="ml-3">
                {{ group.options.length }} option{{ group.options.length !== 1 ? 's' : '' }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <!-- Panel Content -->
          <v-expansion-panel-text>
            <!-- ===== SECTION: Group Settings ===== -->
            <div class="section-block section-block--settings mb-5">
              <div class="section-block__header">
                <v-icon icon="mdi-cog" size="18" class="mr-2" />
                Group Settings
              </div>
              <div class="section-block__body">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="group.name"
                      label="Group Name *"
                      variant="outlined"
                      placeholder="e.g., Choose your bread"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="group.type"
                      :items="modifierTypes"
                      label="Modifier Type *"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="group.kitchenDisplayName"
                      label="Kitchen Display Name"
                      variant="outlined"
                      placeholder="e.g., Bread: Toast -> Baguette"
                      hint="Short name for kitchen screen (optional)"
                      persistent-hint
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="group.description"
                      label="Description"
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
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <NumericInputField
                      v-model="group.minSelection"
                      label="Min Selection"
                      variant="outlined"
                      :min="0"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <NumericInputField
                      v-model="group.maxSelection"
                      label="Max Selection (0=unlimited)"
                      variant="outlined"
                      :min="0"
                    />
                  </v-col>

                  <!-- Target Components Selector (only for replacement type) -->
                  <v-col v-if="group.type === 'replacement'" cols="12">
                    <div
                      v-if="availableTargetComponents.length === 0"
                      class="accent-bar accent-bar--warning mb-2"
                    >
                      <v-icon icon="mdi-alert" size="18" class="mr-2" />
                      No recipe components available. Add a recipe to the variant composition first.
                    </div>
                    <v-select
                      v-else
                      :model-value="getSelectedTargetValues(group)"
                      :items="availableTargetComponents"
                      item-title="label"
                      item-value="value"
                      label="Target Components to Replace"
                      variant="outlined"
                      multiple
                      chips
                      closable-chips
                      prepend-inner-icon="mdi-target"
                      hint="First selected (green) gets composition, others (orange) excluded."
                      persistent-hint
                      :return-object="true"
                      @update:model-value="vals => updateTargetComponents(groupIndex, vals)"
                    >
                      <template #prepend-inner>
                        <v-icon icon="mdi-swap-horizontal" color="warning" />
                      </template>
                      <template #chip="{ item, index }">
                        <v-chip
                          size="small"
                          :color="index === 0 ? 'success' : 'warning'"
                          variant="tonal"
                          closable
                          @click:close="removeTargetComponent(groupIndex, index)"
                        >
                          <v-icon
                            :icon="index === 0 ? 'mdi-plus-circle' : 'mdi-minus-circle'"
                            size="14"
                            class="mr-1"
                          />
                          {{ item.title }}
                        </v-chip>
                      </template>
                    </v-select>
                  </v-col>
                </v-row>
              </div>
            </div>

            <!-- ===== SECTION: Options ===== -->
            <div class="section-block section-block--options">
              <div class="section-block__header section-block__header--options">
                <div class="d-flex align-center">
                  <v-icon icon="mdi-format-list-checks" size="18" class="mr-2" />
                  Options
                  <v-chip size="small" variant="tonal" color="deep-purple" class="ml-2">
                    {{ group.options.length }}
                  </v-chip>
                </div>
                <v-btn
                  color="deep-purple"
                  variant="tonal"
                  size="default"
                  height="36"
                  @click="addOption(groupIndex)"
                >
                  <v-icon icon="mdi-plus" size="18" class="mr-1" />
                  Add Option
                </v-btn>
              </div>

              <div v-if="group.options.length === 0" class="empty-options">
                No options yet. Add at least one option.
              </div>

              <div v-else class="options-list">
                <div
                  v-for="(option, optionIndex) in group.options"
                  :key="option.id"
                  class="option-card"
                >
                  <!-- Option header row -->
                  <div class="option-card__header">
                    <v-chip
                      size="x-small"
                      :color="option.isActive ? 'success' : 'grey'"
                      variant="flat"
                      class="mr-2"
                    >
                      {{ option.isActive ? 'Active' : 'Inactive' }}
                    </v-chip>
                    <span class="option-card__number">#{{ optionIndex + 1 }}</span>
                    <span class="option-card__name">{{ option.name || 'Unnamed' }}</span>
                    <v-spacer />
                    <!-- Food Cost display -->
                    <template v-if="group.type === 'addon'">
                      <span class="option-card__cost">
                        {{ formatIDR(getOptionFcDisplay(option, group).cost) }}
                      </span>
                      <span
                        v-if="option.priceAdjustment"
                        class="option-card__fc"
                        :class="{
                          'text-success':
                            getOptionFcDisplay(option, group).fc !== null &&
                            getOptionFcDisplay(option, group).fc! <= 35,
                          'text-warning':
                            getOptionFcDisplay(option, group).fc !== null &&
                            getOptionFcDisplay(option, group).fc! > 35 &&
                            getOptionFcDisplay(option, group).fc! <= 50,
                          'text-error':
                            getOptionFcDisplay(option, group).fc !== null &&
                            getOptionFcDisplay(option, group).fc! > 50
                        }"
                      >
                        FC {{ getOptionFcDisplay(option, group).fc?.toFixed(0) }}%
                      </span>
                    </template>
                    <template v-else-if="group.type === 'replacement'">
                      <span class="option-card__cost-detail">
                        <span class="text-medium-emphasis">
                          cost {{ formatIDR(getOptionFcDisplay(option, group).cost) }}
                        </span>
                        <span class="mx-1">·</span>
                        <span class="text-medium-emphasis">
                          replaced {{ formatIDR(getOptionFcDisplay(option, group).replacedCost) }}
                        </span>
                        <span class="mx-1">·</span>
                        <span
                          :class="{
                            'text-success': getOptionFcDisplay(option, group).netCost < 0,
                            'text-error': getOptionFcDisplay(option, group).netCost > 0,
                            'text-medium-emphasis': getOptionFcDisplay(option, group).netCost === 0
                          }"
                        >
                          {{ getOptionFcDisplay(option, group).netCost >= 0 ? '+' : ''
                          }}{{ formatIDR(getOptionFcDisplay(option, group).netCost) }}
                        </span>
                      </span>
                    </template>
                    <span v-if="option.priceAdjustment" class="option-card__price">
                      {{ option.priceAdjustment > 0 ? '+' : ''
                      }}{{ option.priceAdjustment.toLocaleString() }} IDR
                    </span>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      class="ml-2"
                      @click="removeOption(groupIndex, optionIndex)"
                    />
                  </div>

                  <!-- Option fields -->
                  <div class="option-card__body">
                    <v-row dense>
                      <v-col cols="12" md="5">
                        <v-text-field
                          v-model="option.name"
                          label="Option Name *"
                          variant="outlined"
                          hide-details
                        />
                      </v-col>
                      <v-col cols="12" md="3">
                        <NumericInputField
                          v-model="option.priceAdjustment"
                          label="Price +/-"
                          variant="outlined"
                          prefix="IDR"
                          hide-details
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <div class="d-flex align-center ga-3 h-100">
                          <v-switch
                            v-if="group.isRequired"
                            v-model="option.isDefault"
                            label="Default"
                            color="success"
                            hide-details
                            density="compact"
                          />
                          <v-switch
                            v-model="option.isActive"
                            label="Active"
                            color="primary"
                            hide-details
                            density="compact"
                          />
                        </div>
                      </v-col>
                      <v-col cols="12">
                        <v-textarea
                          v-model="option.description"
                          label="Description"
                          variant="outlined"
                          rows="1"
                          hide-details
                        />
                      </v-col>

                      <!-- Composition -->
                      <v-col cols="12">
                        <div class="composition-editor">
                          <div class="composition-editor__header">
                            <span class="text-caption font-weight-bold">
                              <v-icon icon="mdi-package-variant-closed" size="14" class="mr-1" />
                              Composition
                            </span>
                            <div class="d-flex ga-1">
                              <v-btn
                                size="small"
                                variant="tonal"
                                color="primary"
                                height="30"
                                @click="showDishSelector(groupIndex, optionIndex)"
                              >
                                <v-icon icon="mdi-chef-hat" size="14" class="mr-1" />
                                Dish
                              </v-btn>
                              <v-btn
                                size="small"
                                variant="tonal"
                                color="info"
                                height="30"
                                @click="showProductSelector(groupIndex, optionIndex)"
                              >
                                <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
                                Product
                              </v-btn>
                            </div>
                          </div>

                          <div
                            v-if="!option.composition || option.composition.length === 0"
                            class="composition-empty"
                            :class="{
                              'composition-empty--warning':
                                group.type === 'replacement' && !option.isDefault
                            }"
                          >
                            <template v-if="group.type === 'replacement' && !option.isDefault">
                              <v-icon icon="mdi-alert" size="14" color="warning" class="mr-1" />
                              No composition — will remove original ingredient without replacement.
                              Add a dish or product.
                            </template>
                            <template v-else>No composition (won't affect inventory)</template>
                          </div>

                          <div v-else class="composition-list">
                            <div
                              v-for="(comp, compIndex) in option.composition"
                              :key="compIndex"
                              class="composition-item"
                            >
                              <v-icon
                                :icon="getCompositionIcon(comp.type)"
                                size="16"
                                :color="getCompositionColor(comp.type)"
                              />
                              <span class="composition-item__name">
                                {{ getCompositionName(comp) }}
                              </span>
                              <NumericInputField
                                v-model="comp.quantity"
                                variant="outlined"
                                hide-details
                                density="compact"
                                style="width: 70px"
                              />
                              <v-chip size="small" variant="tonal" class="composition-item__unit">
                                {{ resolveCompositionUnit(comp) }}
                              </v-chip>
                              <v-btn
                                icon="mdi-close"
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
                  </div>
                </div>
              </div>
            </div>

            <!-- Group delete -->
            <div class="d-flex justify-end mt-4">
              <v-btn
                variant="text"
                color="error"
                height="40"
                @click="removeModifierGroup(groupIndex)"
              >
                <v-icon icon="mdi-delete" size="18" class="mr-1" />
                Remove Group
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Add Group Button -->
      <v-btn
        class="mt-5"
        block
        variant="outlined"
        color="deep-purple"
        size="large"
        height="48"
        @click="addModifierGroup"
      >
        <v-icon icon="mdi-plus" size="20" class="mr-2" />
        Add Modifier Group
      </v-btn>
    </div>

    <!-- Dish selector dialog -->
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

    <!-- Product selector dialog -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  ModifierGroup,
  ModifierOption,
  DishType,
  MenuComposition,
  DishOption,
  ProductOption,
  TargetComponent
} from '@/stores/menu/types'
import type { Recipe, RecipeComponent } from '@/stores/recipes/types'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import {
  calculateOptionCompositionCost,
  calculateReplacedComponentsCost
} from '@/core/cost/modifierCostCalculator'
import type { CostCalculationContext } from '@/core/cost/modifierCostCalculator'
import { formatIDR } from '@/utils'
import { NumericInputField } from '@/components/input'
import DishSearchWidget from '@/views/menu/components/widgets/DishSearchWidget.vue'
import ProductSearchWidget from '@/views/menu/components/widgets/ProductSearchWidget.vue'

interface Props {
  modifierGroups: ModifierGroup[]
  dishType: DishType
  dishOptions?: DishOption[]
  productOptions?: ProductOption[]
  variantComposition?: MenuComposition[]
}

const props = withDefaults(defineProps<Props>(), {
  modifierGroups: () => [],
  dishType: 'simple',
  dishOptions: () => [],
  productOptions: () => [],
  variantComposition: () => []
})

const recipesStore = useRecipesStore()
const productsStore = useProductsStore()

const costContext = computed<CostCalculationContext>(() => ({
  productsStore,
  recipesStore
}))

function getOptionCost(option: ModifierOption): number {
  return calculateOptionCompositionCost(option, 1, costContext.value)
}

function getReplacedCost(group: ModifierGroup): number {
  if (group.type !== 'replacement' || !group.targetComponents?.length) return 0
  return calculateReplacedComponentsCost(group.targetComponents, costContext.value)
}

function getOptionFcDisplay(
  option: ModifierOption,
  group: ModifierGroup
): { cost: number; replacedCost: number; netCost: number; fc: number | null; label: string } {
  const cost = getOptionCost(option)

  if (group.type === 'addon') {
    const price = option.priceAdjustment || 0
    const fc = price > 0 ? (cost / price) * 100 : null
    return {
      cost,
      replacedCost: 0,
      netCost: cost,
      fc,
      label: fc !== null ? `FC ${fc.toFixed(0)}%` : ''
    }
  }

  if (group.type === 'replacement') {
    const replacedCost = getReplacedCost(group)
    const netCost = cost - replacedCost
    return {
      cost,
      replacedCost,
      netCost,
      fc: null,
      label: ''
    }
  }

  return { cost: 0, replacedCost: 0, netCost: 0, fc: null, label: '' }
}

const emit = defineEmits<{
  'update:modifierGroups': [groups: ModifierGroup[]]
}>()

// State
const openPanels = ref<number[]>([])

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

const modifierTypes = [
  { title: 'Add-on (adds to base)', value: 'addon' },
  { title: 'Replacement (replaces base)', value: 'replacement' },
  { title: 'Removal (removes from base)', value: 'removal' }
]

// Computed
const hasModifiers = computed(() => props.modifierGroups.length > 0)

interface TargetComponentOption {
  label: string
  value: TargetComponent
}

const availableTargetComponents = computed((): TargetComponentOption[] => {
  const options: TargetComponentOption[] = []

  if (!props.variantComposition || props.variantComposition.length === 0) {
    return options
  }

  for (const comp of props.variantComposition) {
    if (comp.type === 'recipe') {
      const recipe = recipesStore.recipes.find((r: Recipe) => r.id === comp.id)
      if (recipe && recipe.components) {
        for (const recipeComp of recipe.components) {
          const componentName = getRecipeComponentName(recipeComp)
          options.push({
            label: `${recipe.name} -> ${componentName}`,
            value: {
              sourceType: 'recipe',
              recipeId: recipe.id,
              componentId: recipeComp.componentId, // stable entity ID, not row UUID
              componentType: recipeComp.componentType,
              componentName: componentName
            }
          })
        }
      }
    } else if (comp.type === 'product') {
      const product = props.productOptions?.find(p => p.id === comp.id)
      options.push({
        label: `Variant -> ${product?.name || 'Unknown product'}`,
        value: {
          sourceType: 'variant',
          componentId: comp.id,
          componentType: 'product',
          componentName: product?.name || 'Unknown'
        }
      })
    } else if (comp.type === 'preparation') {
      const dish = props.dishOptions?.find(d => d.id === comp.id && d.type === 'preparation')
      options.push({
        label: `Variant -> ${dish?.name || 'Unknown preparation'}`,
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

function updateTargetComponents(groupIndex: number, selected: TargetComponentOption[]): void {
  const updated = [...props.modifierGroups]
  updated[groupIndex].targetComponents = selected.map(opt => opt.value)
  emit('update:modifierGroups', updated)
}

function removeTargetComponent(groupIndex: number, targetIndex: number): void {
  const updated = [...props.modifierGroups]
  if (updated[groupIndex].targetComponents) {
    updated[groupIndex].targetComponents = updated[groupIndex].targetComponents!.filter(
      (_: TargetComponent, i: number) => i !== targetIndex
    )
    emit('update:modifierGroups', updated)
  }
}

function getSelectedTargetValues(group: ModifierGroup): TargetComponentOption[] {
  if (!group.targetComponents?.length) return []
  return group.targetComponents
    .map((target: TargetComponent) =>
      availableTargetComponents.value.find((opt: TargetComponentOption) =>
        targetComponentsEqual(opt.value, target)
      )
    )
    .filter(
      (opt: TargetComponentOption | undefined): opt is TargetComponentOption => opt !== undefined
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

function showDishSelector(groupIndex: number, optionIndex: number): void {
  dishSelectorDialog.value = { show: true, groupIndex, optionIndex }
}

function showProductSelector(groupIndex: number, optionIndex: number): void {
  productSelectorDialog.value = { show: true, groupIndex, optionIndex }
}

function addDishToComposition(dish: DishOption): void {
  const { groupIndex, optionIndex } = dishSelectorDialog.value
  if (groupIndex === null || optionIndex === null) return

  const updated = [...props.modifierGroups]
  const option = updated[groupIndex].options[optionIndex]

  if (!option.composition) {
    option.composition = []
  }

  const isPortionType = dish.portionType === 'portion' && dish.portionSize

  const newComp: MenuComposition = {
    type: dish.type,
    id: dish.id,
    quantity: isPortionType ? 1 : dish.outputQuantity,
    unit: isPortionType ? 'portion' : dish.unit,
    role: 'addon',
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

// Auto-resolve unit from recipe/preparation — user shouldn't choose it manually
// Uses the recipe's portion_unit (e.g., "piece") not "portion"
function resolveCompositionUnit(comp: MenuComposition): string {
  // If unit is already stored, use it
  if (comp.unit) return comp.unit

  // Auto-resolve from linked dish (recipe/preparation)
  if (comp.type === 'recipe' || comp.type === 'preparation') {
    const dish = props.dishOptions?.find(d => d.id === comp.id && d.type === comp.type)
    if (dish) {
      // Use the dish's output unit (portion_unit from recipe, e.g., "piece")
      return dish.unit || 'piece'
    }
  }

  // For products, try to find unit
  if (comp.type === 'product') {
    const product = props.productOptions?.find(p => p.id === comp.id)
    if (product) return product.unit
  }

  return 'piece'
}
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

// ==========================================
// Modifier Panel (expansion panel)
// ==========================================
.modifier-panel {
  margin-bottom: 12px !important;
  border-radius: 10px !important;
  overflow: hidden;

  &--required {
    border-left: 4px solid var(--color-error) !important;
  }

  &--optional {
    border-left: 4px solid var(--color-info) !important;
  }

  &__title {
    min-height: 56px !important;
    font-size: 15px;
  }
}

// ==========================================
// Section blocks (Settings / Options)
// ==========================================
.section-block {
  border-radius: 10px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__body {
    padding: 16px;
  }

  // Settings section
  &--settings {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);

    .section-block__header {
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
  }

  // Options section
  &--options {
    border: 1px solid rgba(163, 149, 233, 0.2);
    background: rgba(163, 149, 233, 0.03);

    .section-block__header {
      background: rgba(163, 149, 233, 0.08);
      color: var(--color-primary);
      border-bottom: 1px solid rgba(163, 149, 233, 0.12);

      &--options {
        display: flex;
        justify-content: space-between;
      }
    }
  }
}

// ==========================================
// Options list
// ==========================================
.empty-options {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.option-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 8px;
  }

  &__number {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.3);
    margin-right: 4px;
  }

  &__name {
    font-weight: 600;
    font-size: 14px;
  }

  &__cost {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
  }

  &__fc {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  &__cost-detail {
    font-size: 11px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__price {
    font-weight: 600;
    font-size: 13px;
    color: var(--color-warning);
    white-space: nowrap;
  }

  &__body {
    padding: 14px;
  }
}

// ==========================================
// Composition editor
// ==========================================
.composition-editor {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.composition-empty {
  text-align: center;
  padding: 14px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 13px;

  &--warning {
    color: rgba(255, 183, 77, 0.8);
    background: rgba(255, 183, 77, 0.08);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.composition-list {
  padding: 8px;
}

.composition-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;

  &__name {
    flex: 1;
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__unit {
    flex-shrink: 0;
    min-width: 60px;
    justify-content: center;
  }
}

// ==========================================
// Accent bars
// ==========================================
.accent-bar {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;

  &--warning {
    background: rgba(255, 176, 118, 0.12);
    border-left: 4px solid var(--color-warning);
    color: var(--color-warning);
  }
}
</style>
