<!-- src/views/admin/staff/components/RanksDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Manage Ranks</span>
        <v-btn icon size="small" variant="text" @click="emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <!-- Existing ranks -->
        <v-list>
          <v-list-item
            v-for="rank in ranks"
            :key="rank.id"
            :class="{ 'opacity-50': !rank.isActive }"
          >
            <template #default>
              <div v-if="editingId !== rank.id" class="d-flex align-center w-100">
                <div class="flex-grow-1">
                  <div class="font-weight-medium">{{ rank.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Base: {{ formatIDR(rank.baseSalary) }} / month ({{
                      formatIDR(Math.round(rank.baseSalary / 208))
                    }}
                    / hr)
                  </div>
                </div>
                <v-btn icon size="x-small" variant="text" @click="startEdit(rank)">
                  <v-icon size="16">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="emit('delete', rank.id)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </div>
              <!-- Inline edit -->
              <div v-else class="d-flex align-center gap-sm w-100">
                <v-text-field
                  v-model="editForm.name"
                  label="Name"
                  density="compact"
                  hide-details
                  style="max-width: 180px"
                />
                <v-text-field
                  v-model.number="editForm.baseSalary"
                  label="Base Salary"
                  type="number"
                  density="compact"
                  hide-details
                  style="max-width: 180px"
                />
                <v-btn icon size="x-small" color="success" @click="saveEdit">
                  <v-icon size="16">mdi-check</v-icon>
                </v-btn>
                <v-btn icon size="x-small" @click="editingId = null">
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-divider class="my-3" />

        <!-- Add new rank -->
        <div class="d-flex align-center gap-sm">
          <v-text-field
            v-model="newRank.name"
            label="Rank Name"
            density="compact"
            hide-details
            style="max-width: 180px"
          />
          <v-text-field
            v-model.number="newRank.baseSalary"
            label="Base Salary (IDR)"
            type="number"
            density="compact"
            hide-details
            style="max-width: 180px"
          />
          <v-btn color="primary" size="small" :disabled="!newRank.name" @click="handleCreate">
            Add
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { StaffRank } from '@/stores/staff'
import { formatIDR } from '@/utils'

defineProps<{
  modelValue: boolean
  ranks: StaffRank[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  create: [data: Partial<StaffRank>]
  update: [id: string, data: Partial<StaffRank>]
  delete: [id: string]
}>()

const editingId = ref<string | null>(null)
const editForm = reactive({ name: '', baseSalary: 0 })
const newRank = reactive({ name: '', baseSalary: 2000000 })

function startEdit(rank: StaffRank) {
  editingId.value = rank.id
  editForm.name = rank.name
  editForm.baseSalary = rank.baseSalary
}

function saveEdit() {
  if (editingId.value) {
    emit('update', editingId.value, { name: editForm.name, baseSalary: editForm.baseSalary })
    editingId.value = null
  }
}

function handleCreate() {
  emit('create', {
    name: newRank.name,
    baseSalary: newRank.baseSalary,
    sortOrder: 0
  })
  newRank.name = ''
  newRank.baseSalary = 2000000
}
</script>
