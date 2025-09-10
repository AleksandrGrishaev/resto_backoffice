<template>
  <base-layout>
    <v-layout class="pos-layout">
      <!-- Tables sidebar -->
      <div class="pos-sidebar" :style="{ width: sidebarWidth }">
        <slot name="tables"></slot>
      </div>

      <!-- Main content area -->
      <div class="pos-content">
        <!-- Menu section -->
        <div class="pos-menu">
          <slot name="menu"></slot>
        </div>

        <!-- Order section -->
        <div class="pos-order">
          <slot name="order"></slot>
        </div>
      </div>
    </v-layout>
  </base-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import BaseLayout from './BaseLayout.vue'

const { width } = useDisplay()

const sidebarWidth = computed(() => {
  const calculatedWidth = Math.max(width.value * 0.08, 80)
  return `${calculatedWidth}px`
})
</script>

<style scoped>
.pos-layout {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.pos-sidebar {
  flex: none;
  background-color: var(--v-surface-base);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow-y: auto;
  overflow-x: hidden;
}

.pos-content {
  flex: 1;
  display: flex;
  min-width: 0;
}

.pos-menu {
  flex: 0 0 62%;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.pos-order {
  flex: 0 0 38%;
  overflow: hidden;
}
</style>
