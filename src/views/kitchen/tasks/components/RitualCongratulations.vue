<!-- src/views/kitchen/tasks/components/RitualCongratulations.vue -->
<!-- Fullscreen overlay shown when ritual is completed -->
<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="fade-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="congrats-card" :class="`congrats-${ritualType}`">
      <div class="congrats-content">
        <!-- Big check icon -->
        <div class="congrats-icon-wrap">
          <v-icon size="80" color="success">mdi-check-circle</v-icon>
        </div>

        <!-- Title -->
        <h1 class="congrats-title">
          {{ ritualType === 'morning' ? 'Morning' : 'Evening' }} Ritual Complete!
        </h1>

        <!-- Stats -->
        <div class="congrats-stats">
          <div class="stat-item">
            <span class="stat-value">{{ completedTasks }}/{{ totalTasks }}</span>
            <span class="stat-label">Tasks</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ durationDisplay }}</span>
            <span class="stat-label">Duration</span>
          </div>
          <div v-if="scheduleTasksDone > 0" class="stat-item">
            <span class="stat-value">{{ scheduleTasksDone }}</span>
            <span class="stat-label">Production</span>
          </div>
          <div v-if="customTasksDone > 0" class="stat-item">
            <span class="stat-value">{{ customTasksDone }}</span>
            <span class="stat-label">Custom</span>
          </div>
        </div>

        <!-- Staff -->
        <p v-if="staffName" class="congrats-staff">Completed by {{ staffName }}</p>

        <!-- Close button -->
        <v-btn
          color="success"
          variant="flat"
          size="x-large"
          class="congrats-close-btn"
          @click="$emit('update:modelValue', false)"
        >
          <v-icon start>mdi-check</v-icon>
          Close
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  ritualType: 'morning' | 'evening'
  totalTasks: number
  completedTasks: number
  scheduleTasksDone: number
  customTasksDone: number
  durationMinutes: number
  staffName?: string
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const durationDisplay = computed(() => {
  if (props.durationMinutes < 1) return '<1 min'
  if (props.durationMinutes < 60) return `${props.durationMinutes} min`
  const hours = Math.floor(props.durationMinutes / 60)
  const mins = props.durationMinutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
})
</script>

<style scoped lang="scss">
.congrats-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-success), 0.15),
    rgba(var(--v-theme-success), 0.05)
  ) !important;
}

.congrats-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px;
  gap: 20px;
}

.congrats-icon-wrap {
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background-color: rgba(var(--v-theme-success), 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: scaleIn 0.4s ease-out;
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.congrats-title {
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}

.congrats-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.congrats-staff {
  font-size: 15px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.congrats-close-btn {
  min-width: 200px !important;
  height: 56px !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 12px !important;
  margin-top: 8px;
}
</style>
