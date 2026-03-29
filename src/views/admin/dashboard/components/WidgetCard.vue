<!-- src/views/admin/dashboard/components/WidgetCard.vue -->
<template>
  <div :class="['widget-card', `widget-${size}`]">
    <div class="widget-header">
      <div class="widget-title-row">
        <v-icon size="18" class="widget-icon">{{ icon }}</v-icon>
        <span class="widget-title">{{ title }}</span>
      </div>
    </div>
    <div class="widget-body">
      <div v-if="loading" class="widget-loading">
        <v-progress-circular indeterminate size="32" color="primary" />
      </div>
      <div v-else-if="error" class="widget-error">
        <v-icon size="24" color="error">mdi-alert-circle-outline</v-icon>
        <span>{{ error }}</span>
      </div>
      <slot v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WidgetSize } from '../types'

defineProps<{
  title: string
  icon: string
  size: WidgetSize
  loading?: boolean
  error?: string
}>()
</script>

<style scoped lang="scss">
.widget-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.widget-full {
  grid-column: 1 / -1;
}

.widget-large {
  grid-column: span 2;
}

.widget-medium {
  grid-column: span 1;
}

.widget-small {
  grid-column: span 1;
}

.widget-header {
  padding: 14px 16px 10px;
}

.widget-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.widget-icon {
  opacity: 0.5;
}

.widget-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.widget-body {
  flex: 1;
  padding: 0 16px 16px;
  min-height: 0;
}

.widget-loading,
.widget-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 80px;
  opacity: 0.6;
  font-size: 13px;
}

@media (max-width: 900px) {
  .widget-large,
  .widget-medium,
  .widget-small {
    grid-column: 1 / -1;
  }
}
</style>
