// src/layouts/ShiftLayout.vue
<!-- src/layouts/ShiftLayout.vue -->
<template>
  <base-layout>
    <template #header>
      <v-toolbar color="surface">
        <v-toolbar-title>Shift History</v-toolbar-title>
        <v-spacer />
        <v-btn
          v-tooltip="'Go to Cashier'"
          icon="mdi-cash-register"
          variant="text"
          class="mr-2"
          to="/pos"
        />
        <v-btn
          v-tooltip="'Refresh History'"
          icon="mdi-refresh"
          variant="text"
          @click="handleRefresh"
        />
      </v-toolbar>
    </template>
    <div class="shift-layout">
      <slot />
    </div>
  </base-layout>
</template>

<script setup lang="ts">
import BaseLayout from './BaseLayout.vue'

const handleRefresh = () => {
  // TODO: Implement refresh logic
}
</script>

<style scoped>
.shift-layout {
  height: 100%;
  overflow: hidden;
}
</style>
