<!-- src/views/admin/staff/components/BonusDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>Bonuses — {{ staffMember?.name || '' }}</v-card-title>
      <v-card-text>
        <!-- Existing bonuses -->
        <v-list v-if="bonuses.length" density="compact">
          <v-list-item v-for="bonus in bonuses" :key="bonus.id">
            <template #default>
              <div class="d-flex align-center w-100">
                <div class="flex-grow-1">
                  <div class="d-flex align-center gap-sm">
                    <v-chip
                      :color="bonus.type === 'monthly' ? 'blue' : 'orange'"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ bonus.type === 'monthly' ? 'Monthly' : 'One-time' }}
                    </v-chip>
                    <strong>{{ formatIDR(bonus.amount) }}</strong>
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ bonus.reason || 'No reason' }}
                    <span v-if="bonus.effectiveDate">— from {{ bonus.effectiveDate }}</span>
                    <span v-if="bonus.endDate">to {{ bonus.endDate }}</span>
                  </div>
                </div>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="emit('delete', bonus.id)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="text-center text-medium-emphasis py-4">No bonuses yet</div>

        <v-divider class="my-3" />

        <!-- Add new bonus -->
        <h4 class="mb-2">Add Bonus</h4>
        <div class="d-flex flex-wrap gap-sm align-end">
          <v-select
            v-model="newBonus.type"
            :items="[
              { title: 'One-time', value: 'one_time' },
              { title: 'Monthly', value: 'monthly' }
            ]"
            label="Type"
            density="compact"
            hide-details
            style="max-width: 140px"
          />
          <v-text-field
            v-model.number="newBonus.amount"
            label="Amount (IDR)"
            type="number"
            density="compact"
            hide-details
            style="max-width: 160px"
          />
          <v-text-field
            v-model="newBonus.reason"
            label="Reason"
            density="compact"
            hide-details
            style="max-width: 200px"
          />
          <v-text-field
            v-model="newBonus.effectiveDate"
            label="From"
            type="date"
            density="compact"
            hide-details
            style="max-width: 150px"
          />
          <v-text-field
            v-if="newBonus.type === 'monthly'"
            v-model="newBonus.endDate"
            label="Until"
            type="date"
            density="compact"
            hide-details
            style="max-width: 150px"
          />
          <v-btn color="primary" size="small" :disabled="!newBonus.amount" @click="handleCreate">
            Add
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { StaffMember, StaffBonus } from '@/stores/staff'
import { formatIDR } from '@/utils'

const props = defineProps<{
  modelValue: boolean
  staffMember: StaffMember | null
  bonuses: StaffBonus[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  create: [data: Partial<StaffBonus>]
  update: [id: string, data: Partial<StaffBonus>]
  delete: [id: string]
}>()

const newBonus = reactive({
  type: 'one_time' as 'one_time' | 'monthly',
  amount: 0,
  reason: '',
  effectiveDate: '',
  endDate: ''
})

function handleCreate() {
  if (!props.staffMember) return
  emit('create', {
    staffId: props.staffMember.id,
    type: newBonus.type,
    amount: newBonus.amount,
    reason: newBonus.reason || undefined,
    effectiveDate: newBonus.effectiveDate || undefined,
    endDate: newBonus.endDate || undefined
  })
  newBonus.amount = 0
  newBonus.reason = ''
  newBonus.effectiveDate = ''
  newBonus.endDate = ''
}
</script>
