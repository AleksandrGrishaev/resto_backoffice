// src/views/accounts/DashboardView.vue
<template>
  <div class="dashboard-view">
    <v-card>
      <v-card-title class="d-flex align-center py-3 px-4">
        <span class="text-h5">Дашборд счетов</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="text-center">
          <v-icon icon="mdi-chart-box" size="64" color="primary" class="mb-4" />
          <h3 class="text-h6 mb-2">Скоро будет доступно</h3>
          <p class="text-medium-emphasis">
            Здесь будет отображаться сводная информация по счетам и финансовая аналитика
          </p>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
// Заглушка для будущего функционала
</script>

<style lang="scss" scoped>
.dashboard-view {
  height: 100%;
  padding: 16px;
}
</style>
