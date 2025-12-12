<!-- src/views/kitchen/kpi/components/FoodCostKpiTab.vue -->
<!-- Placeholder component for Food Cost KPI Tab - To be implemented -->
<template>
  <v-card class="food-cost-kpi-tab" flat>
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-table</v-icon>
      Food Cost Details
    </v-card-title>

    <v-card-text>
      <div class="placeholder-content">
        <v-icon size="48" color="grey-lighten-1">mdi-table-large</v-icon>
        <p class="text-body-1 mt-4 text-medium-emphasis">Cost breakdown by product</p>
        <p class="text-body-2 text-disabled">
          View detailed cost analysis, compare actual vs recipe costs, and track variances.
        </p>
        <v-btn class="mt-4" variant="outlined" color="primary" disabled>
          <v-icon start>mdi-plus</v-icon>
          Add Cost Entry
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// Placeholder - no logic yet
</script>

<style scoped lang="scss">
.food-cost-kpi-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  min-height: 300px;
  text-align: center;
}
</style>
