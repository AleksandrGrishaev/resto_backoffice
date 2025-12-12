<!-- src/views/kitchen/kpi/components/FoodCostKpiCard.vue -->
<!-- Placeholder component for Food Cost KPI - To be implemented -->
<template>
  <v-card class="food-cost-kpi-card">
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-currency-usd</v-icon>
      Food Cost KPI
      <v-chip class="ml-2" size="small" color="grey" variant="tonal">Coming Soon</v-chip>
    </v-card-title>

    <v-card-text>
      <div class="placeholder-content">
        <v-icon size="64" color="grey-lighten-1">mdi-chart-pie</v-icon>
        <p class="text-h6 mt-4 text-medium-emphasis">Food Cost Analytics</p>
        <p class="text-body-2 text-disabled">
          Track actual vs theoretical food costs, identify waste patterns, and optimize ingredient
          usage.
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// Placeholder - no logic yet
</script>

<style scoped lang="scss">
.food-cost-kpi-card {
  background-color: rgba(var(--v-theme-surface), 1);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
}
</style>
