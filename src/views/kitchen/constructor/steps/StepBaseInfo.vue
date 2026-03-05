<!-- src/views/kitchen/constructor/steps/StepBaseInfo.vue -->
<template>
  <div class="step-base-info">
    <div class="form-group">
      <label class="form-label">Name</label>
      <v-text-field
        :model-value="name"
        placeholder="Dish name..."
        variant="outlined"
        density="comfortable"
        hide-details
        @update:model-value="emit('update:name', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">Department</label>
      <div class="department-chips">
        <v-chip
          :color="department === 'kitchen' ? 'primary' : undefined"
          :variant="department === 'kitchen' ? 'flat' : 'outlined'"
          size="large"
          @click="emit('update:department', 'kitchen')"
        >
          Kitchen
        </v-chip>
        <v-chip
          :color="department === 'bar' ? 'primary' : undefined"
          :variant="department === 'bar' ? 'flat' : 'outlined'"
          size="large"
          @click="emit('update:department', 'bar')"
        >
          Bar
        </v-chip>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Category</label>
      <div class="category-chips">
        <v-chip
          v-for="cat in menuCategories"
          :key="cat.id"
          :color="categoryId === cat.id ? 'secondary' : undefined"
          :variant="categoryId === cat.id ? 'flat' : 'outlined'"
          size="default"
          @click="emit('update:categoryId', cat.id)"
        >
          {{ cat.name }}
        </v-chip>
      </div>
    </div>

    <div class="form-group">
      <v-expansion-panels variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>Description (optional)</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-textarea
              :model-value="description"
              placeholder="Optional description..."
              variant="outlined"
              rows="3"
              hide-details
              @update:model-value="emit('update:description', $event)"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <div class="step-actions">
      <v-spacer />
      <v-btn color="primary" size="large" :disabled="!canProceed" @click="emit('next')">
        Next
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMenuStore } from '@/stores/menu'
import type { Department, Category } from '@/stores/menu/types'

const props = defineProps<{
  name: string
  department: Department
  categoryId: string | null
  description: string
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:department': [value: Department]
  'update:categoryId': [value: string]
  'update:description': [value: string]
  next: []
}>()

const menuStore = useMenuStore()

const menuCategories = computed(() => (menuStore.categories as Category[]).filter(c => c.isActive))

const canProceed = computed(() => props.name.trim().length > 0 && props.categoryId !== null)
</script>

<style scoped lang="scss">
.step-base-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.department-chips,
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.step-actions {
  display: flex;
  align-items: center;
  padding-top: 16px;
}
</style>
