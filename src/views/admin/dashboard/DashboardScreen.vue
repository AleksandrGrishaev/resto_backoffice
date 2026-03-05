<!-- src/views/admin/dashboard/DashboardScreen.vue -->
<template>
  <div class="dashboard-screen">
    <div class="screen-header">
      <h2>FOOD COST DASHBOARD</h2>
    </div>

    <div class="dashboard-content">
      <div class="placeholder-card">
        <v-icon size="48" color="grey">mdi-chart-box-outline</v-icon>
        <h3>Dashboard</h3>
        <p>Food cost KPIs and overview coming in Sprint 5</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-header {
  padding: 16px;

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.dashboard-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
</style>
