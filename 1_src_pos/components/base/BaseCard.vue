// src/components/base/BaseCard.vue
<template>
  <v-card
    :class="['base-card', elevated && 'base-card--elevated', bordered && 'base-card--bordered']"
    v-bind="$attrs"
  >
    <slot />
  </v-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    elevated?: boolean
    bordered?: boolean
  }>(),
  {
    elevated: false,
    bordered: true
  }
)
</script>

<style scoped>
.base-card {
  background-color: rgb(var(--v-theme-surface));
}

.base-card--elevated {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.base-card--bordered {
  border: 1px solid rgb(var(--v-theme-primary));
}
</style>
