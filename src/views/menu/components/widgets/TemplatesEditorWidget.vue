<template>
  <div class="templates-editor">
    <!-- Empty State -->
    <div v-if="templates.length === 0 && modifierGroups.length === 0" class="empty-state">
      <v-icon icon="mdi-puzzle-outline" size="48" color="grey" class="mb-3" />
      <div class="text-body-1 mb-2">Add modifier groups first</div>
      <div class="text-body-2 text-medium-emphasis">
        Templates are built from modifier groups. Go to the Modifiers tab to create groups.
      </div>
    </div>

    <div v-else-if="templates.length === 0" class="empty-state">
      <v-icon icon="mdi-content-copy" size="48" color="teal" class="mb-3" />
      <div class="text-body-1 mb-2">No templates yet</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        Create preset modifier combos for quick POS selection.
      </div>
      <v-btn color="teal" variant="flat" size="large" height="48" @click="openAddDialog">
        <v-icon icon="mdi-plus" size="20" class="mr-2" />
        Create First Template
      </v-btn>
    </div>

    <!-- Templates List -->
    <div v-else>
      <div class="d-flex align-center mb-4">
        <div class="text-subtitle-1 font-weight-bold">
          {{ templates.length }} template{{ templates.length !== 1 ? 's' : '' }}
        </div>
        <v-spacer />
        <v-btn color="teal" variant="tonal" size="default" height="44" @click="openAddDialog">
          <v-icon icon="mdi-plus" size="20" class="mr-1" />
          Add Template
        </v-btn>
      </div>

      <div class="templates-list">
        <div v-for="(template, index) in templates" :key="template.id" class="template-card">
          <div class="template-card__header">
            <v-icon icon="mdi-lightning-bolt" size="20" color="teal" class="mr-2" />
            <span class="template-card__name">{{ template.name }}</span>
            <v-spacer />
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              color="primary"
              @click="openEditDialog(index)"
            />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="deleteTemplate(index)"
            />
          </div>
          <div class="template-card__preview">
            {{ getModifiersPreview(template) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Template Dialog -->
    <v-dialog v-model="dialog.show" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon icon="mdi-lightning-bolt" color="teal" class="mr-2" />
          {{ dialog.editIndex !== null ? 'Edit Template' : 'New Template' }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="dialog.show = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-text-field
            v-model="dialog.name"
            label="Template Name"
            placeholder="e.g., Simple Breakfast, Premium Breakfast"
            class="mb-4"
            :rules="[v => !!v?.trim() || 'Name is required']"
          />

          <v-textarea
            v-model="dialog.description"
            label="Description (optional)"
            placeholder="Brief description shown to customers"
            rows="2"
            class="mb-4"
          />

          <div v-if="modifierGroups.length === 0" class="text-center py-4 text-medium-emphasis">
            No modifier groups available
          </div>

          <div v-else>
            <div class="section-label mb-3">Select modifiers for this template:</div>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel v-for="group in modifierGroups" :key="group.id">
                <v-expansion-panel-title>
                  <div class="d-flex align-center">
                    <v-chip
                      :color="group.isRequired ? 'error' : 'default'"
                      size="small"
                      class="mr-2"
                    >
                      {{ group.isRequired ? 'Required' : 'Optional' }}
                    </v-chip>
                    <span class="font-weight-bold">{{ group.name }}</span>
                    <v-chip
                      v-if="getSelectedCount(group.id) > 0"
                      size="small"
                      color="teal"
                      class="ml-2"
                    >
                      {{ getSelectedCount(group.id) }} selected
                    </v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="options-grid">
                    <v-chip
                      v-for="option in group.options.filter(o => o.isActive)"
                      :key="option.id"
                      :color="isOptionSelected(group.id, option.id) ? 'teal' : 'default'"
                      :variant="isOptionSelected(group.id, option.id) ? 'flat' : 'outlined'"
                      size="large"
                      class="ma-1"
                      @click="toggleOption(group.id, option.id, group.maxSelection)"
                    >
                      <v-icon
                        v-if="isOptionSelected(group.id, option.id)"
                        icon="mdi-check"
                        size="16"
                        class="mr-1"
                      />
                      {{ option.name }}
                      <template
                        v-if="
                          isOptionSelected(group.id, option.id) &&
                          getOptionQuantity(group.id, option.id) > 1
                        "
                      >
                        <span class="ml-1 font-weight-bold">
                          x{{ getOptionQuantity(group.id, option.id) }}
                        </span>
                      </template>
                      <span v-if="option.priceAdjustment" class="ml-1 text-caption">
                        (+{{ option.priceAdjustment.toLocaleString() }})
                      </span>
                    </v-chip>
                  </div>
                  <!-- Quantity controls for selected options -->
                  <div
                    v-if="getSelectedOptions(group.id).length > 0 && group.maxSelection !== 1"
                    class="quantity-controls mt-3"
                  >
                    <div
                      v-for="optId in getSelectedOptions(group.id)"
                      :key="optId"
                      class="quantity-row"
                    >
                      <span class="quantity-label">{{ getOptionName(group, optId) }}</span>
                      <div class="quantity-buttons">
                        <v-btn
                          icon="mdi-minus"
                          size="x-small"
                          variant="outlined"
                          density="compact"
                          :disabled="getOptionQuantity(group.id, optId) <= 1"
                          @click.stop="changeQuantity(group.id, optId, -1)"
                        />
                        <span class="quantity-value">{{ getOptionQuantity(group.id, optId) }}</span>
                        <v-btn
                          icon="mdi-plus"
                          size="x-small"
                          variant="outlined"
                          density="compact"
                          :disabled="
                            group.maxSelection
                              ? getTotalQuantity(group.id) >= group.maxSelection
                              : false
                          "
                          @click.stop="changeQuantity(group.id, optId, 1)"
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="group.maxSelection === 1"
                    class="text-caption text-medium-emphasis mt-2"
                  >
                    Single selection only
                  </div>
                  <div
                    v-else-if="group.maxSelection && group.maxSelection > 1"
                    class="text-caption text-medium-emphasis mt-2"
                  >
                    Max {{ group.maxSelection }} selections ({{ getTotalQuantity(group.id) }}/{{
                      group.maxSelection
                    }})
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" height="44" @click="dialog.show = false">Cancel</v-btn>
          <v-btn
            color="teal"
            variant="flat"
            height="44"
            :disabled="!dialog.name.trim() || modifierGroups.length === 0"
            @click="saveTemplate"
          >
            {{ dialog.editIndex !== null ? 'Save Changes' : 'Add Template' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ModifierGroup, VariantTemplate, TemplateModifierSelection } from '@/stores/menu/types'

interface Props {
  templates: VariantTemplate[]
  modifierGroups: ModifierGroup[]
}

const props = withDefaults(defineProps<Props>(), {
  templates: () => [],
  modifierGroups: () => []
})

const emit = defineEmits<{
  'update:templates': [templates: VariantTemplate[]]
}>()

// Dialog state
interface DialogState {
  show: boolean
  editIndex: number | null
  name: string
  description: string
  selectedModifiers: Map<string, Set<string>>
  quantities: Map<string, Map<string, number>> // groupId → optionId → quantity
}

const dialog = ref<DialogState>({
  show: false,
  editIndex: null,
  name: '',
  description: '',
  selectedModifiers: new Map(),
  quantities: new Map()
})

function openAddDialog(): void {
  const defaultSelection = new Map<string, Set<string>>()
  const defaultQuantities = new Map<string, Map<string, number>>()
  for (const group of props.modifierGroups) {
    const defaultOptions = group.options.filter(opt => opt.isDefault).map(opt => opt.id)
    defaultSelection.set(group.id, new Set(defaultOptions.length > 0 ? defaultOptions : []))
    defaultQuantities.set(group.id, new Map())
  }

  dialog.value = {
    show: true,
    editIndex: null,
    name: '',
    description: '',
    selectedModifiers: defaultSelection,
    quantities: defaultQuantities
  }
}

function openEditDialog(index: number): void {
  const template = props.templates[index]
  if (!template) return

  const selection = new Map<string, Set<string>>()
  const quantities = new Map<string, Map<string, number>>()
  for (const group of props.modifierGroups) {
    selection.set(group.id, new Set())
    quantities.set(group.id, new Map())
  }
  for (const sel of template.selectedModifiers) {
    selection.set(sel.groupId, new Set(sel.optionIds))
    // Restore quantities if present
    if (sel.quantities) {
      const groupQty = new Map<string, number>()
      for (const [optId, qty] of Object.entries(sel.quantities)) {
        if (qty > 1) groupQty.set(optId, qty)
      }
      quantities.set(sel.groupId, groupQty)
    }
  }

  dialog.value = {
    show: true,
    editIndex: index,
    name: template.name,
    description: template.description || '',
    selectedModifiers: selection,
    quantities
  }
}

function toggleOption(groupId: string, optionId: string, maxSelection?: number): void {
  const current = dialog.value.selectedModifiers.get(groupId) || new Set()
  const groupQty = dialog.value.quantities.get(groupId) || new Map<string, number>()

  if (current.has(optionId)) {
    current.delete(optionId)
    groupQty.delete(optionId)
  } else {
    // Check if adding would exceed maxSelection (counting total quantities)
    if (maxSelection && maxSelection > 0) {
      const totalQty = getTotalQuantity(groupId)
      if (totalQty >= maxSelection) return
    }
    if (maxSelection === 1) {
      current.clear()
      groupQty.clear()
    }
    current.add(optionId)
  }

  dialog.value.selectedModifiers.set(groupId, current)
  dialog.value.quantities.set(groupId, groupQty)
}

function isOptionSelected(groupId: string, optionId: string): boolean {
  return dialog.value.selectedModifiers.get(groupId)?.has(optionId) || false
}

function getSelectedCount(groupId: string): number {
  return getTotalQuantity(groupId)
}

function getOptionQuantity(groupId: string, optionId: string): number {
  return dialog.value.quantities.get(groupId)?.get(optionId) || 1
}

function getTotalQuantity(groupId: string): number {
  const selected = dialog.value.selectedModifiers.get(groupId)
  if (!selected || selected.size === 0) return 0
  let total = 0
  for (const optId of selected) {
    total += getOptionQuantity(groupId, optId)
  }
  return total
}

function getSelectedOptions(groupId: string): string[] {
  const selected = dialog.value.selectedModifiers.get(groupId)
  return selected ? Array.from(selected) : []
}

function getOptionName(group: ModifierGroup, optionId: string): string {
  return group.options.find(o => o.id === optionId)?.name || optionId
}

function changeQuantity(groupId: string, optionId: string, delta: number): void {
  const groupQty = dialog.value.quantities.get(groupId) || new Map<string, number>()
  const current = getOptionQuantity(groupId, optionId)
  const newQty = current + delta
  if (newQty < 1) return
  if (newQty === 1) {
    groupQty.delete(optionId)
  } else {
    groupQty.set(optionId, newQty)
  }
  dialog.value.quantities.set(groupId, groupQty)
}

function saveTemplate(): void {
  if (!dialog.value.name.trim()) return

  const selectedModifiers: TemplateModifierSelection[] = []
  dialog.value.selectedModifiers.forEach((optionIds, groupId) => {
    if (optionIds.size > 0) {
      const groupQty = dialog.value.quantities.get(groupId)
      const quantities: Record<string, number> = {}
      let hasQuantities = false
      for (const optId of optionIds) {
        const qty = groupQty?.get(optId)
        if (qty && qty > 1) {
          quantities[optId] = qty
          hasQuantities = true
        }
      }
      selectedModifiers.push({
        groupId,
        optionIds: Array.from(optionIds),
        ...(hasQuantities ? { quantities } : {})
      })
    }
  })

  const updatedTemplates = [...props.templates]

  if (dialog.value.editIndex !== null) {
    updatedTemplates[dialog.value.editIndex] = {
      ...updatedTemplates[dialog.value.editIndex],
      name: dialog.value.name.trim(),
      description: dialog.value.description.trim() || undefined,
      selectedModifiers
    }
  } else {
    updatedTemplates.push({
      id: `tpl-${Date.now()}`,
      name: dialog.value.name.trim(),
      description: dialog.value.description.trim() || undefined,
      selectedModifiers,
      sortOrder: updatedTemplates.length
    })
  }

  emit('update:templates', updatedTemplates)
  dialog.value.show = false
}

function deleteTemplate(index: number): void {
  const updated = [...props.templates]
  updated.splice(index, 1)
  emit('update:templates', updated)
}

function getModifiersPreview(template: VariantTemplate): string {
  const parts: string[] = []
  for (const sel of template.selectedModifiers) {
    const group = props.modifierGroups.find(g => g.id === sel.groupId)
    if (group) {
      const optionNames = sel.optionIds
        .map(oid => {
          const name = group.options.find(o => o.id === oid)?.name
          if (!name) return null
          const qty = sel.quantities?.[oid]
          return qty && qty > 1 ? `${name} (x${qty})` : name
        })
        .filter(Boolean)
      if (optionNames.length > 0) {
        parts.push(optionNames.join(', '))
      }
    }
  }
  return parts.length > 0 ? parts.join(' | ') : 'No modifiers selected'
}
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.templates-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-card {
  background: rgba(146, 201, 175, 0.06);
  border: 1px solid rgba(146, 201, 175, 0.2);
  border-left: 4px solid rgba(146, 201, 175, 0.6);
  border-radius: 8px;
  padding: 14px 16px;

  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
  }

  &__name {
    font-weight: 600;
    font-size: 15px;
  }

  &__preview {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    padding-left: 28px;
  }
}

.options-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quantity-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quantity-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.quantity-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-value {
  min-width: 20px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
}
</style>
