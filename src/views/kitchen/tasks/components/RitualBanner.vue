<!-- src/views/kitchen/tasks/components/RitualBanner.vue -->
<!-- Ritual progress banner - tap to open fullscreen ritual checklist -->
<template>
  <!-- Completed state: green banner, no interaction -->
  <div v-if="ritualCompleted" class="ritual-banner ritual-banner-completed">
    <div class="ritual-info">
      <v-icon color="success" size="20">mdi-check-circle</v-icon>
      <span class="ritual-label">{{ ritualLabel }}</span>
      <span class="ritual-count text-success">Complete</span>
    </div>
    <v-progress-linear
      :model-value="100"
      color="success"
      height="6"
      rounded
      class="ritual-progress"
    />
    <v-icon size="18" color="success">mdi-check</v-icon>
  </div>

  <!-- Active state: tappable banner -->
  <div v-else class="ritual-banner" @click="$emit('open')">
    <div class="ritual-info">
      <v-icon :color="ritualColor" size="20">{{ ritualIcon }}</v-icon>
      <span class="ritual-label">{{ ritualLabel }}</span>
      <span class="ritual-count" :class="{ 'text-success': allDone }">
        {{ completed }}/{{ total }}
      </span>
    </div>
    <v-progress-linear
      :model-value="percent"
      :color="allDone ? 'success' : ritualColor"
      height="6"
      rounded
      class="ritual-progress"
    />
    <v-icon size="18" color="grey">mdi-chevron-right</v-icon>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  total: number
  completed: number
  ritualType: 'morning' | 'afternoon' | 'evening'
  ritualCompleted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ritualCompleted: false
})

defineEmits<{
  open: []
}>()

const percent = computed(() => (props.total > 0 ? (props.completed / props.total) * 100 : 0))

const allDone = computed(() => props.total > 0 && props.completed === props.total)

const ritualColor = computed(() => {
  switch (props.ritualType) {
    case 'morning':
      return 'info'
    case 'afternoon':
      return 'warning'
    default:
      return 'purple'
  }
})

const ritualIcon = computed(() => {
  switch (props.ritualType) {
    case 'morning':
      return 'mdi-weather-sunny'
    case 'afternoon':
      return 'mdi-weather-partly-cloudy'
    default:
      return 'mdi-weather-night'
  }
})

const ritualLabel = computed(() => {
  switch (props.ritualType) {
    case 'morning':
      return 'Morning Ritual'
    case 'afternoon':
      return 'Afternoon Ritual'
    default:
      return 'Evening Ritual'
  }
})
</script>

<style scoped lang="scss">
.ritual-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-radius: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background-color: rgba(var(--v-theme-primary), 0.14);
  }

  &.ritual-banner-completed {
    background-color: rgba(var(--v-theme-success), 0.1);
    cursor: default;
  }
}

.ritual-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ritual-label {
  font-weight: 600;
  font-size: 14px;
}

.ritual-count {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.ritual-progress {
  flex: 1;
}
</style>
