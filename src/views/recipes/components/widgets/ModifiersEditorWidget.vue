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
                    class="px-0 mb-2 border rounded"
                  >
                    <v-row dense>
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
                          <v-switch
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
                      <v-col cols="12">
                        <v-alert type="info" density="compact" variant="tonal" class="text-caption">
                          <strong>Composition:</strong>
                          Configure product/recipe/preparation composition for this option (TODO:
                          Add composition editor)
                        </v-alert>
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
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ModifierGroup, ModifierOption, VariantTemplate } from '@/stores/menu/types'

interface Props {
  modifierGroups: ModifierGroup[]
  templates: VariantTemplate[]
}

const props = withDefaults(defineProps<Props>(), {
  modifierGroups: () => [],
  templates: () => []
})

const emit = defineEmits<{
  'update:modifierGroups': [groups: ModifierGroup[]]
  'update:templates': [templates: VariantTemplate[]]
}>()

// State
const openPanels = ref<number[]>([])

// Constants
const modifierTypes = [
  { title: 'Add-on (adds to base)', value: 'addon' },
  { title: 'Replacement (replaces base)', value: 'replacement' },
  { title: 'Removal (removes from base)', value: 'removal' }
]

// Computed
const hasModifiers = computed(() => props.modifierGroups.length > 0)

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
</script>

<style scoped>
.modifiers-editor-widget {
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
}
</style>
