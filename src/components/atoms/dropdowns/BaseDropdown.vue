<!-- src/components/atoms/dropdowns/BaseDropdown.vue -->
<!--
  Universal dropdown menu wrapper
  - Wraps Vuetify v-menu with standard styling
  - Provides activator slot for trigger element
  - Uses v-model pattern for open/close state
-->
<template>
  <v-menu
    :model-value="modelValue"
    location="bottom start"
    :close-on-content-click="false"
    :offset="8"
    :z-index="2000"
    origin="top left"
    transition="slide-y-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #activator="{ props: menuProps }">
      <slot name="activator" v-bind="menuProps" />
    </template>

    <v-card class="base-dropdown" elevation="8">
      <slot />
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.base-dropdown {
  min-width: 200px;
  background-color: var(--v-theme-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  position: relative;
  z-index: 2001; /* Выше чем z-index menu */
}
</style>
