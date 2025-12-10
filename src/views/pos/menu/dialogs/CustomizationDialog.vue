<!-- src/views/pos/menu/dialogs/CustomizationDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="700" persistent scrollable>
    <v-card v-if="menuItem && variant">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div>
          <div class="text-h6">{{ menuItem.name }}</div>
          <div class="text-body-2 text-grey-lighten-2">{{ variant.name }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <!-- Templates (if available) -->
      <v-card-text v-if="menuItem?.templates && menuItem.templates.length > 0" class="pt-4 pb-2">
        <div class="text-subtitle-2 mb-2">Quick Select:</div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="template in menuItem.templates"
            :key="template.id"
            :color="selectedTemplateId === template.id ? 'primary' : 'default'"
            :variant="selectedTemplateId === template.id ? 'flat' : 'outlined'"
            @click="applyTemplate(template)"
          >
            {{ template.name }}
          </v-chip>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Variant Info & Base Composition -->
      <v-card-text class="py-3 px-4 bg-grey-darken-4">
        <div class="text-overline text-grey-lighten-1 mb-1">Base Composition</div>
        <div class="text-subtitle-2 mb-2">
          {{ variant.name }} - {{ formatPrice(variant.price) }}
        </div>

        <div v-if="variant.composition && variant.composition.length > 0">
          <div
            v-for="(comp, index) in variant.composition"
            :key="index"
            class="d-flex align-center text-body-2 text-grey-lighten-2 mb-1"
          >
            <v-icon
              :icon="
                comp.type === 'recipe'
                  ? 'mdi-food'
                  : comp.type === 'preparation'
                    ? 'mdi-chef-hat'
                    : 'mdi-cube-outline'
              "
              size="16"
              class="mr-2"
              color="grey-lighten-2"
            />
            <span>{{ getCompositionItemName(comp) }}</span>
            <span class="ml-1 text-grey-lighten-1">({{ comp.quantity }} {{ comp.unit }})</span>
            <v-chip
              v-if="comp.role"
              size="x-small"
              variant="outlined"
              color="grey-lighten-1"
              class="ml-2"
            >
              {{ comp.role }}
            </v-chip>
          </div>
        </div>
        <div v-else class="text-body-2 text-grey-lighten-1">No base composition defined</div>
      </v-card-text>

      <v-divider />

      <!-- Modifier Groups -->
      <v-card-text class="pa-0" style="max-height: 60vh">
        <div v-if="!menuItem?.modifierGroups || menuItem.modifierGroups.length === 0" class="pa-4">
          <p class="text-grey">No customization options available</p>
        </div>

        <div v-else>
          <!-- Component Groups Section (Replacements) -->
          <div v-if="componentGroups.length > 0" class="component-groups-section">
            <div class="section-header pa-3 bg-blue-lighten-5">
              <v-icon icon="mdi-swap-horizontal" size="small" class="mr-2" />
              <span class="text-subtitle-2 font-weight-bold">Select Components</span>
            </div>

            <div
              v-for="group in componentGroups"
              :key="group.id"
              class="modifier-group pa-4 border-b"
            >
              <!-- Group Header -->
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ group.name }}
                    <v-chip v-if="group.isRequired" size="x-small" color="error" class="ml-2" label>
                      Required
                    </v-chip>
                  </div>
                  <div v-if="group.description" class="text-body-2 text-grey">
                    {{ group.description }}
                  </div>
                </div>
              </div>

              <!-- Options (Radio only for component groups) -->
              <v-radio-group
                :model-value="getSelectedOptionId(group.id)"
                hide-details
                @update:model-value="value => handleRadioChange(group, value)"
              >
                <v-list class="pa-0">
                  <v-list-item
                    v-for="option in group.options"
                    :key="option.id"
                    :disabled="!option.isActive"
                    class="px-0"
                    @click="!option.isActive ? null : selectRadioOption(group, option.id)"
                  >
                    <template #prepend>
                      <v-radio :value="option.id" color="primary" hide-details />
                    </template>

                    <v-list-item-title>
                      <div class="d-flex align-center justify-space-between">
                        <div>
                          <span>{{ option.name }}</span>
                          <v-chip
                            v-if="option.isDefault"
                            size="x-small"
                            color="success"
                            variant="outlined"
                            class="ml-2"
                          >
                            Included
                          </v-chip>
                        </div>
                        <div class="text-body-2">
                          <span v-if="option.priceAdjustment === 0" class="text-success">Free</span>
                          <span v-else-if="option.priceAdjustment > 0" class="text-primary">
                            +{{ formatPrice(option.priceAdjustment) }}
                          </span>
                          <span v-else class="text-error">
                            {{ formatPrice(option.priceAdjustment) }}
                          </span>
                        </div>
                      </div>
                    </v-list-item-title>

                    <v-list-item-subtitle v-if="option.description">
                      {{ option.description }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-radio-group>
            </div>
          </div>

          <!-- Addon Groups Section -->
          <div v-if="addonGroups.length > 0" class="addon-groups-section">
            <div class="section-header pa-3 bg-green-lighten-5">
              <v-icon icon="mdi-plus-circle-outline" size="small" class="mr-2" />
              <span class="text-subtitle-2 font-weight-bold">Extras</span>
            </div>

            <div v-for="group in addonGroups" :key="group.id" class="modifier-group pa-4 border-b">
              <!-- Group Header -->
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ group.name }}
                    <v-chip v-if="group.isRequired" size="x-small" color="error" class="ml-2" label>
                      Required
                    </v-chip>
                  </div>
                  <div v-if="group.description" class="text-body-2 text-grey">
                    {{ group.description }}
                  </div>
                </div>
                <div
                  v-if="group.maxSelection && group.maxSelection > 0"
                  class="text-caption text-grey"
                >
                  {{ getSelectedCount(group) }} / {{ group.maxSelection }} selected
                </div>
              </div>

              <!-- Options (with +/- controls for addon groups) -->
              <v-list class="pa-0">
                <v-list-item
                  v-for="option in group.options"
                  :key="option.id"
                  :disabled="!option.isActive"
                  class="px-0"
                >
                  <template #prepend>
                    <!-- Show checkbox when count=0, show +/- controls when count>0 -->
                    <v-checkbox
                      v-if="getOptionCount(group.id, option.id) === 0"
                      :model-value="false"
                      :disabled="!option.isActive || !canIncrement(group, option)"
                      color="primary"
                      hide-details
                      @click.stop="incrementOption(group, option)"
                    />
                    <div v-else class="d-flex align-center ga-1" style="min-width: 90px">
                      <v-btn
                        icon="mdi-minus"
                        size="x-small"
                        variant="outlined"
                        density="compact"
                        @click.stop="decrementOption(group, option)"
                      />
                      <span
                        class="text-body-1 font-weight-bold mx-1"
                        style="min-width: 20px; text-align: center"
                      >
                        {{ getOptionCount(group.id, option.id) }}
                      </span>
                      <v-btn
                        icon="mdi-plus"
                        size="x-small"
                        variant="outlined"
                        density="compact"
                        color="primary"
                        :disabled="!canIncrement(group, option)"
                        @click.stop="incrementOption(group, option)"
                      />
                    </div>
                  </template>

                  <v-list-item-title>
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center">
                        <span>{{ option.name }}</span>
                        <v-chip
                          v-if="getOptionCount(group.id, option.id) > 1"
                          size="x-small"
                          color="primary"
                          class="ml-2"
                        >
                          x{{ getOptionCount(group.id, option.id) }}
                        </v-chip>
                      </div>
                      <div class="text-body-2">
                        <span v-if="option.priceAdjustment === 0" class="text-success">Free</span>
                        <span v-else-if="option.priceAdjustment > 0" class="text-primary">
                          +{{
                            formatPrice(
                              option.priceAdjustment * getOptionCount(group.id, option.id) ||
                                option.priceAdjustment
                            )
                          }}
                        </span>
                        <span v-else class="text-error">
                          {{
                            formatPrice(
                              option.priceAdjustment * getOptionCount(group.id, option.id) ||
                                option.priceAdjustment
                            )
                          }}
                        </span>
                      </div>
                    </div>
                  </v-list-item-title>

                  <v-list-item-subtitle v-if="option.description">
                    {{ option.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Footer with Price & Actions -->
      <v-card-actions class="pa-4">
        <div class="flex-grow-1">
          <div class="text-caption text-grey">Base price</div>
          <div class="text-body-2">{{ formatPrice(variant.price) }}</div>
        </div>

        <div class="flex-grow-1">
          <div class="text-caption text-grey">Modifiers</div>
          <div class="text-body-2" :class="modifiersTotalPrice > 0 ? 'text-primary' : 'text-grey'">
            {{ modifiersTotalPrice > 0 ? '+' : '' }}{{ formatPrice(modifiersTotalPrice) }}
          </div>
        </div>

        <v-divider vertical class="mx-3" />

        <div class="flex-grow-1">
          <div class="text-caption text-grey">Total</div>
          <div class="text-h6 text-primary">{{ formatPrice(totalPrice) }}</div>
        </div>

        <v-spacer />

        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn color="primary" :disabled="!isValid" @click="handleAddToBill">Add to Bill</v-btn>
      </v-card-actions>

      <!-- Validation Errors -->
      <v-alert v-if="validationErrors.length > 0" type="error" class="ma-4" variant="tonal">
        <div v-for="(error, index) in validationErrors" :key="index" class="text-body-2">
          • {{ error }}
        </div>
      </v-alert>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  MenuItem,
  MenuItemVariant,
  ModifierGroup,
  ModifierOption,
  VariantTemplate,
  SelectedModifier,
  MenuComposition
} from '@/stores/menu/types'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'

interface Props {
  modelValue: boolean
  menuItem: MenuItem | null
  variant: MenuItemVariant | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-to-bill': [selectedModifiers: SelectedModifier[]]
  cancel: []
}>()

// Stores
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

// State
// Map<groupId, Map<optionId, count>> - allows selecting same option multiple times
const selectedModifiers = ref<Map<string, Map<string, number>>>(new Map())
const selectedTemplateId = ref<string | null>(null)

// ✨ UPDATED: Read modifierGroups from menuItem (not variant)
// ✅ Architecture v2: Use isRequired instead of groupStyle
const componentGroups = computed(() => {
  if (!props.menuItem?.modifierGroups) return []
  return props.menuItem.modifierGroups.filter(group => group.isRequired)
})

const addonGroups = computed(() => {
  if (!props.menuItem?.modifierGroups) return []
  return props.menuItem.modifierGroups.filter(group => !group.isRequired)
})

// Computed
const modifiersTotalPrice = computed(() => {
  if (!props.menuItem?.modifierGroups) return 0

  let total = 0
  props.menuItem.modifierGroups.forEach(group => {
    const selectedOptions = selectedModifiers.value.get(group.id)
    if (selectedOptions) {
      selectedOptions.forEach((count, optionId) => {
        const option = group.options.find(o => o.id === optionId)
        if (option) {
          // Multiply priceAdjustment by count for multiple same options
          total += option.priceAdjustment * count
        }
      })
    }
  })
  return total
})

const totalPrice = computed(() => {
  if (!props.variant) return 0
  return props.variant.price + modifiersTotalPrice.value
})

const validationErrors = computed(() => {
  const errors: string[] = []
  if (!props.menuItem?.modifierGroups) return errors

  props.menuItem.modifierGroups.forEach(group => {
    if (group.isRequired) {
      const selectedCount = getSelectedCount(group)
      const minSelection = group.minSelection || 1

      if (selectedCount < minSelection) {
        errors.push(`Please select at least ${minSelection} option(s) for "${group.name}"`)
      }
    }
  })

  return errors
})

const isValid = computed(() => validationErrors.value.length === 0)

// Methods
function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

function getCompositionItemName(comp: MenuComposition): string {
  if (comp.type === 'product') {
    const product = productsStore.products.find(p => p.id === comp.id)
    return product?.name || 'Unknown product'
  } else if (comp.type === 'recipe') {
    const recipe = recipesStore.recipes.find(r => r.id === comp.id)
    return recipe?.name || 'Unknown recipe'
  } else if (comp.type === 'preparation') {
    const preparation = recipesStore.preparations.find(p => p.id === comp.id)
    return preparation?.name || 'Unknown preparation'
  }
  return 'Unknown'
}

function isOptionSelected(groupId: string, optionId: string): boolean {
  const selectedOptions = selectedModifiers.value.get(groupId)
  return selectedOptions ? (selectedOptions.get(optionId) || 0) > 0 : false
}

function getSelectedOptionId(groupId: string): string | null {
  const selectedOptions = selectedModifiers.value.get(groupId)
  if (!selectedOptions || selectedOptions.size === 0) return null
  // Return first option with count > 0
  for (const [optionId, count] of selectedOptions) {
    if (count > 0) return optionId
  }
  return null
}

function getSelectedCount(group: ModifierGroup): number {
  const selectedOptions = selectedModifiers.value.get(group.id)
  if (!selectedOptions) return 0
  let total = 0
  for (const count of selectedOptions.values()) {
    total += count
  }
  return total
}

function getOptionCount(groupId: string, optionId: string): number {
  const selectedOptions = selectedModifiers.value.get(groupId)
  return selectedOptions?.get(optionId) || 0
}

function isOptionDisabled(group: ModifierGroup, option: ModifierOption): boolean {
  if (!option.isActive) return true

  // For single selection (radio-style), never disable - allow switching
  if (group.maxSelection === 1) {
    return false
  }

  // For multiple selection, check if max is reached
  // But allow incrementing existing selections
  if (group.maxSelection && group.maxSelection > 1) {
    const totalSelected = getSelectedCount(group)
    // Disable only if max reached (but still allow decrementing)
    return totalSelected >= group.maxSelection
  }

  return false
}

// Check if can increment (for +/- UI)
function canIncrement(group: ModifierGroup, option: ModifierOption): boolean {
  if (!option.isActive) return false
  if (!group.maxSelection || group.maxSelection === 0) return true // No limit
  const totalSelected = getSelectedCount(group)
  return totalSelected < group.maxSelection
}

function selectRadioOption(group: ModifierGroup, optionId: string): void {
  const groupSelections = new Map<string, number>([[optionId, 1]])
  selectedModifiers.value.set(group.id, groupSelections)
  selectedTemplateId.value = null

  console.log('📻 Radio option selected:', {
    groupName: group.name,
    optionId,
    selectedModifiers: Array.from(selectedModifiers.value.entries()).map(([gId, opts]) => ({
      groupId: gId,
      options: Array.from(opts.entries())
    }))
  })
}

function handleRadioChange(group: ModifierGroup, optionId: string | null): void {
  if (!optionId) return
  selectRadioOption(group, optionId)
}

function toggleOption(group: ModifierGroup, option: ModifierOption): void {
  if (!option.isActive) return

  const groupSelections = selectedModifiers.value.get(group.id) || new Map<string, number>()
  const currentCount = groupSelections.get(option.id) || 0

  if (group.maxSelection === 1) {
    // Single selection (radio-style) - toggle or switch
    if (currentCount > 0 && !group.isRequired) {
      groupSelections.clear()
    } else {
      groupSelections.clear()
      groupSelections.set(option.id, 1)
    }
  } else {
    // Multiple selection - toggle (add/remove single count)
    if (currentCount > 0) {
      groupSelections.delete(option.id)
    } else {
      const totalSelected = getSelectedCount(group)
      if (!group.maxSelection || totalSelected < group.maxSelection) {
        groupSelections.set(option.id, 1)
      }
    }
  }

  selectedModifiers.value.set(group.id, groupSelections)
  selectedTemplateId.value = null // Clear template when manually changing
}

// Increment option count (for +/- buttons)
function incrementOption(group: ModifierGroup, option: ModifierOption): void {
  if (!option.isActive) return
  if (!canIncrement(group, option)) return

  const groupSelections = selectedModifiers.value.get(group.id) || new Map<string, number>()
  const currentCount = groupSelections.get(option.id) || 0

  groupSelections.set(option.id, currentCount + 1)
  selectedModifiers.value.set(group.id, groupSelections)
  selectedTemplateId.value = null
}

// Decrement option count (for +/- buttons)
function decrementOption(group: ModifierGroup, option: ModifierOption): void {
  const groupSelections = selectedModifiers.value.get(group.id)
  if (!groupSelections) return

  const currentCount = groupSelections.get(option.id) || 0
  if (currentCount <= 0) return

  // For required groups with single selection, don't allow going to 0
  if (group.isRequired && group.maxSelection === 1 && currentCount === 1) return

  if (currentCount === 1) {
    groupSelections.delete(option.id)
  } else {
    groupSelections.set(option.id, currentCount - 1)
  }

  selectedModifiers.value.set(group.id, groupSelections)
  selectedTemplateId.value = null
}

function applyTemplate(template: VariantTemplate): void {
  selectedModifiers.value.clear()

  template.selectedModifiers.forEach(selection => {
    const groupSelections = new Map<string, number>()
    // Count occurrences of each optionId (supports multiple same options in template)
    selection.optionIds.forEach(optionId => {
      const current = groupSelections.get(optionId) || 0
      groupSelections.set(optionId, current + 1)
    })
    selectedModifiers.value.set(selection.groupId, groupSelections)
  })

  selectedTemplateId.value = template.id
}

function handleAddToBill(): void {
  if (!isValid.value || !props.variant) return

  // Convert selectedModifiers Map to SelectedModifier[]
  // Generate `count` number of SelectedModifier objects for each option
  const modifiers: SelectedModifier[] = []

  props.menuItem?.modifierGroups?.forEach(group => {
    const selectedOptions = selectedModifiers.value.get(group.id)
    if (selectedOptions) {
      selectedOptions.forEach((count, optionId) => {
        const option = group.options.find(o => o.id === optionId)
        if (option) {
          // Generate `count` number of modifier objects (for decomposition)
          for (let i = 0; i < count; i++) {
            modifiers.push({
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionName: option.name,
              priceAdjustment: option.priceAdjustment,
              composition: option.composition,
              // Additional fields for replacement logic in decomposition
              groupType: group.type,
              targetComponents: group.targetComponents,
              isDefault: option.isDefault
            })
          }
        }
      })
    }
  })

  console.log('🔧 CustomizationDialog: Adding to bill', {
    itemName: props.menuItem?.name,
    variantName: props.variant.name,
    basePrice: props.variant.price,
    modifiers: modifiers.map(m => ({
      name: m.optionName,
      priceAdjustment: m.priceAdjustment
    })),
    modifiersCount: modifiers.length,
    modifiersTotal: modifiersTotalPrice.value,
    totalPrice: totalPrice.value
  })

  emit('add-to-bill', modifiers)
}

function handleCancel(): void {
  emit('cancel')
  emit('update:modelValue', false)
}

function initializeDefaults(): void {
  if (!props.menuItem?.modifierGroups) return

  selectedModifiers.value.clear()
  selectedTemplateId.value = null

  // Apply defaults for required groups (they always need a selection)
  props.menuItem.modifierGroups.forEach(group => {
    if (group.isRequired) {
      // For required groups, always select default or first active
      const defaultOption = group.options.find((o: ModifierOption) => o.isDefault && o.isActive)
      if (defaultOption) {
        const groupSelections = new Map<string, number>([[defaultOption.id, 1]])
        selectedModifiers.value.set(group.id, groupSelections)
      } else {
        // If no default, select first active option
        const firstActive = group.options.find((o: ModifierOption) => o.isActive)
        if (firstActive) {
          const groupSelections = new Map<string, number>([[firstActive.id, 1]])
          selectedModifiers.value.set(group.id, groupSelections)
        }
      }
    }
    // For optional groups, no defaults are applied (user must opt-in)
  })
}

// Watch for dialog open/close
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      initializeDefaults()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.modifier-group:last-child {
  border-bottom: none;
}

/* Make list items clickable with proper cursor */
.v-list-item:not(.v-list-item--disabled) {
  cursor: pointer;
}

.v-list-item:not(.v-list-item--disabled):hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
