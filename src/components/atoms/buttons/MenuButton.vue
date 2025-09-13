<!-- src/components/atoms/buttons/MenuButton.vue -->
<!--
  Universal menu button with hamburger icon
  - Touch-friendly button for opening menus/dropdowns
  - Can be used in navigation bars, sidebars, etc.
  - Supports loading and disabled states
-->
<template>
  <v-btn
    variant="text"
    class="menu-button"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <v-icon>mdi-menu</v-icon>
  </v-btn>
</template>

<script setup lang="ts">
// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  loading?: boolean
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false
})

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.menu-button {
  min-height: var(--touch-button);
  min-width: var(--touch-min);
  width: 100%;
  border-radius: var(--radius-md);
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.menu-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}
</style>
