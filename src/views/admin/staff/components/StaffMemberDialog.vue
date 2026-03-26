<!-- src/views/admin/staff/components/StaffMemberDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>{{ member ? 'Edit Staff' : 'New Staff Member' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="save">
          <v-text-field
            v-model="form.name"
            label="Name"
            :rules="[v => !!v || 'Required']"
            class="mb-2"
          />
          <v-select
            v-model="form.department"
            label="Department"
            :items="departments"
            item-title="label"
            item-value="value"
            :rules="[v => !!v || 'Required']"
            class="mb-2"
          />
          <v-select
            v-model="form.rankId"
            label="Rank"
            :items="ranks"
            item-title="name"
            item-value="id"
            clearable
            class="mb-2"
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps">
                <template #append>
                  <span class="text-caption text-medium-emphasis">
                    {{ formatIDR(item.raw.baseSalary) }}
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>
          <v-text-field v-model="form.phone" label="Phone" class="mb-2" />
          <v-text-field v-model="form.startDate" label="Start Date" type="date" class="mb-2" />
          <v-textarea v-model="form.notes" label="Notes" rows="2" auto-grow class="mb-2" />
          <v-switch
            v-model="form.isActive"
            label="Active"
            color="primary"
            hide-details
            class="mb-2"
          />
          <v-switch
            v-model="form.isTrainee"
            label="Trainee (no service tax)"
            color="warning"
            hide-details
            class="mb-2"
          />
          <v-text-field
            v-if="form.isTrainee"
            v-model.number="form.customSalary"
            label="Monthly Salary (IDR)"
            type="number"
            hint="Individual rate, hourly = salary / 208"
            persistent-hint
            class="mb-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StaffMember, StaffRank } from '@/stores/staff'
import { DEPARTMENT_LABELS } from '@/stores/staff'
import { formatIDR } from '@/utils'

const props = defineProps<{
  modelValue: boolean
  member: StaffMember | null
  ranks: StaffRank[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  save: [data: Partial<StaffMember>]
}>()

const departments = Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }))

const formRef = ref()
const form = ref({
  name: '',
  department: '' as string,
  rankId: '' as string | undefined,
  phone: '',
  startDate: '',
  notes: '',
  isActive: true,
  isTrainee: false,
  customSalary: 0 as number | null
})

watch(
  () => props.modelValue,
  open => {
    if (open) {
      if (props.member) {
        form.value = {
          name: props.member.name,
          department: props.member.department,
          rankId: props.member.rankId,
          phone: props.member.phone || '',
          startDate: props.member.startDate || '',
          notes: props.member.notes || '',
          isActive: props.member.isActive,
          isTrainee: props.member.isTrainee,
          customSalary: props.member.customSalary ?? 0
        }
      } else {
        form.value = {
          name: '',
          department: '',
          rankId: undefined,
          phone: '',
          startDate: '',
          notes: '',
          isActive: true,
          isTrainee: false,
          customSalary: 0
        }
      }
    }
  }
)

async function save() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  emit('save', {
    name: form.value.name,
    department: form.value.department as any,
    rankId: form.value.rankId || undefined,
    phone: form.value.phone || undefined,
    startDate: form.value.startDate || undefined,
    notes: form.value.notes || undefined,
    isActive: form.value.isActive,
    isTrainee: form.value.isTrainee,
    customSalary: form.value.isTrainee ? form.value.customSalary || null : null
  })
}
</script>
