<!-- src/layouts/PosLayout.vue -->
<template>
  <div class="pos-layout" :style="cssVariables">
    <!-- Sidebar Section -->
    <div class="pos-sidebar">
      <slot name="sidebar" />
    </div>

    <!-- Main Content Area -->
    <div class="pos-main">
      <!-- Menu Section -->
      <div class="pos-menu">
        <slot name="menu" />
      </div>

      <!-- Order Section -->
      <div class="pos-order">
        <slot name="order" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePosLayout } from '@/layouts/pos'

const { cssVariables, checks } = usePosLayout()
</script>

<style scoped>
.pos-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
  background-color: var(--v-theme-background);
}

/* Sidebar Section - адаптивная ширина через CSS переменные */
.pos-sidebar {
  width: var(--pos-sidebar-width, 80px);
  min-width: var(--pos-sidebar-width, 80px);
  max-width: var(--pos-sidebar-width, 80px);
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

/* Main Content Area - остальное пространство */
.pos-main {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: var(--pos-gap, 0);
}

/* Menu Section - адаптивная ширина */
.pos-menu {
  width: var(--pos-menu-width);
  min-width: 0;
  background-color: var(--v-theme-background);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  flex-shrink: 0;
}

/* Order Section - адаптивная ширина */
.pos-order {
  width: var(--pos-order-width);
  min-width: var(--pos-order-width);
  max-width: var(--pos-order-width);
  background-color: var(--v-theme-surface);
  overflow: hidden;
  flex-shrink: 0;
}

/* Custom scrollbar для sidebar */
.pos-sidebar::-webkit-scrollbar {
  width: 4px;
}

.pos-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.pos-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.pos-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive fallbacks (если CSS переменные не загружены) */
@media (max-width: 768px) {
  .pos-sidebar {
    width: 64px;
    min-width: 64px;
    max-width: 64px;
  }
}

@media (min-width: 768px) and (max-width: 1200px) {
  .pos-sidebar {
    width: 80px;
    min-width: 80px;
    max-width: 80px;
  }
}

@media (min-width: 1200px) and (max-width: 1600px) {
  .pos-sidebar {
    width: 100px;
    min-width: 100px;
    max-width: 100px;
  }
}

@media (min-width: 1600px) {
  .pos-sidebar {
    width: 120px;
    min-width: 120px;
    max-width: 120px;
  }
}
</style>
