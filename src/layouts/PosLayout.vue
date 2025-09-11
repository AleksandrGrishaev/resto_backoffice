<!-- src/layouts/PosLayout.vue -->
<template>
  <div class="pos-layout">
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
// Простой layout без логики - только структура
</script>

<style scoped>
.pos-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
  background-color: var(--v-theme-background);
}

/* Sidebar Section - фиксированная ширина */
.pos-sidebar {
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Main Content Area - остальное пространство */
.pos-main {
  flex: 1;
  min-width: 0;
  display: flex;
}

/* Menu Section - 2/3 главной области */
.pos-menu {
  flex: 2;
  min-width: 0;
  background-color: var(--v-theme-background);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

/* Order Section - 1/3 главной области */
.pos-order {
  flex: 1;
  min-width: 320px;
  max-width: 400px;
  background-color: var(--v-theme-surface);
  overflow: hidden;
}

/* Custom scrollbar for sidebar */
.pos-sidebar::-webkit-scrollbar {
  width: 6px;
}

.pos-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.pos-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.pos-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive */
@media (max-width: 1200px) {
  .pos-sidebar {
    width: 240px;
    min-width: 240px;
    max-width: 240px;
  }

  .pos-order {
    min-width: 300px;
    max-width: 350px;
  }
}

@media (max-width: 992px) {
  .pos-sidebar {
    width: 200px;
    min-width: 200px;
    max-width: 200px;
  }

  .pos-order {
    min-width: 280px;
    max-width: 320px;
  }
}
</style>
