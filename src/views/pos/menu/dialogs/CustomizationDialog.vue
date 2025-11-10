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
      <v-card-text v-if="variant.templates && variant.templates.length > 0" class="pt-4 pb-2">
        <div class="text-subtitle-2 mb-2">Quick Select Templates:</div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="template in variant.templates"
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

      <!-- Modifier Groups -->
      <v-card-text class="pa-0" style="max-height: 60vh">
        <div v-if="!variant.modifierGroups || variant.modifierGroups.length === 0" class="pa-4">
          <p class="text-grey">No customization options available</p>
        </div>

        <div v-else>
          <div
            v-for="group in variant.modifierGroups"
            :key="group.id"
            class="modifier-group pa-4"
            :class="{ 'border-b': true }"
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
              <div
                v-if="group.maxSelection && group.maxSelection > 0"
                class="text-caption text-grey"
              >
                {{ getSelectedCount(group) }} / {{ group.maxSelection }} selected
              </div>
            </div>

            <!-- Options -->
            <v-list class="pa-0">
              <v-list-item
                v-for="option in group.options"
                :key="option.id"
                :disabled="!option.isActive"
                class="px-0"
                @click="toggleOption(group, option)"
              >
                <template #prepend>
                  <!-- Single selection (radio) -->
                  <v-radio
                    v-if="group.maxSelection === 1"
                    :model-value="isOptionSelected(group.id, option.id)"
                    :value="true"
                    color="primary"
                    hide-details
                    @click.stop="toggleOption(group, option)"
                  />
                  <!-- Multiple selection (checkbox) -->
                  <v-checkbox
                    v-else
                    :model-value="isOptionSelected(group.id, option.id)"
                    :disabled="isOptionDisabled(group, option)"
                    color="primary"
                    hide-details
                    @click.stop="toggleOption(group, option)"
                  />
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
                        Default
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
  SelectedModifier
} from '@/stores/menu/types'

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

// State
const selectedModifiers = ref<Map<string, Set<string>>>(new Map())
const selectedTemplateId = ref<string | null>(null)

// Computed
const modifiersTotalPrice = computed(() => {
  if (!props.variant?.modifierGroups) return 0

  let total = 0
  props.variant.modifierGroups.forEach(group => {
    const selectedOptions = selectedModifiers.value.get(group.id)
    if (selectedOptions) {
      selectedOptions.forEach(optionId => {
        const option = group.options.find(o => o.id === optionId)
        if (option) {
          total += option.priceAdjustment
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
  if (!props.variant?.modifierGroups) return errors

  props.variant.modifierGroups.forEach(group => {
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

function isOptionSelected(groupId: string, optionId: string): boolean {
  const selectedOptions = selectedModifiers.value.get(groupId)
  return selectedOptions ? selectedOptions.has(optionId) : false
}

function getSelectedCount(group: ModifierGroup): number {
  const selectedOptions = selectedModifiers.value.get(group.id)
  return selectedOptions ? selectedOptions.size : 0
}

function isOptionDisabled(group: ModifierGroup, option: ModifierOption): boolean {
  if (!option.isActive) return true

  // Check if max selection is reached
  if (group.maxSelection && group.maxSelection > 0) {
    const selectedCount = getSelectedCount(group)
    const isSelected = isOptionSelected(group.id, option.id)

    // If not selected and limit reached, disable
    return !isSelected && selectedCount >= group.maxSelection
  }

  return false
}

function toggleOption(group: ModifierGroup, option: ModifierOption): void {
  if (!option.isActive || isOptionDisabled(group, option)) return

  const groupSelections = selectedModifiers.value.get(group.id) || new Set<string>()

  if (group.maxSelection === 1) {
    // Single selection - replace
    groupSelections.clear()
    groupSelections.add(option.id)
  } else {
    // Multiple selection - toggle
    if (groupSelections.has(option.id)) {
      groupSelections.delete(option.id)
    } else {
      groupSelections.add(option.id)
    }
  }

  selectedModifiers.value.set(group.id, groupSelections)
  selectedTemplateId.value = null // Clear template when manually changing
}

function applyTemplate(template: VariantTemplate): void {
  selectedModifiers.value.clear()

  template.selectedModifiers.forEach(selection => {
    const groupSelections = new Set<string>(selection.optionIds)
    selectedModifiers.value.set(selection.groupId, groupSelections)
  })

  selectedTemplateId.value = template.id
}

function handleAddToBill(): void {
  if (!isValid.value || !props.variant) return

  // Convert selectedModifiers Map to SelectedModifier[]
  const modifiers: SelectedModifier[] = []

  props.variant.modifierGroups?.forEach(group => {
    const selectedOptions = selectedModifiers.value.get(group.id)
    if (selectedOptions) {
      selectedOptions.forEach(optionId => {
        const option = group.options.find(o => o.id === optionId)
        if (option) {
          modifiers.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceAdjustment: option.priceAdjustment,
            composition: option.composition
          })
        }
      })
    }
  })

  emit('add-to-bill', modifiers)
}

function handleCancel(): void {
  emit('cancel')
  emit('update:modelValue', false)
}

function initializeDefaults(): void {
  if (!props.variant?.modifierGroups) return

  selectedModifiers.value.clear()
  selectedTemplateId.value = null

  // Apply defaults for required groups
  props.variant.modifierGroups.forEach(group => {
    if (group.isRequired) {
      const defaultOption = group.options.find(o => o.isDefault && o.isActive)
      if (defaultOption) {
        const groupSelections = new Set<string>([defaultOption.id])
        selectedModifiers.value.set(group.id, groupSelections)
      }
    }
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
</style>
