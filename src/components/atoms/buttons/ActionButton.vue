<!-- src/components/atoms/buttons/ActionButton.vue -->
<!--
  Universal action button with icon and text
  - Full-width button with left-aligned icon and text
  - Used in dropdown menus, action lists, etc.
  - Supports color variants for different action types
-->
<template>
  <v-btn
    variant="text"
    class="action-button"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <template v-if="icon" #prepend>
      <v-icon :color="iconColor">{{ icon }}</v-icon>
    </template>
    {{ label }}
  </v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue'
// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  icon?: string
  label: string
  loading?: boolean
  disabled?: boolean
  color?: 'success' | 'error' | 'warning' | 'primary'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false
})

defineEmits<{
  click: []
}>()

// =============================================
// COMPUTED
// =============================================

const iconColor = computed(() => {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    primary: 'primary'
  }
  return props.color ? colors[props.color] : undefined
})
</script>

<style scoped>
.action-button {
  justify-content: flex-start;
  min-height: var(--touch-min);
  width: 100%;
  text-transform: none;
  font-weight: 400;
}

.action-button :deep(.v-btn__prepend) {
  margin-inline-end: var(--spacing-sm);
}
</style>
