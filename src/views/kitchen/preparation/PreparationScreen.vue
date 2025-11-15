<!-- src/views/kitchen/preparation/PreparationScreen.vue -->
<template>
  <div class="preparation-screen">
    <v-container fluid class="fill-height">
      <v-row justify="center" align="center">
        <v-col cols="12" md="8" lg="6" class="text-center">
          <!-- Icon -->
          <v-icon size="120" color="primary" class="mb-6">mdi-food-variant</v-icon>

          <!-- Title -->
          <h1 class="text-h3 font-weight-bold mb-4">Preparation Management</h1>

          <!-- Description -->
          <p class="text-h6 text-medium-emphasis mb-8">
            This screen will allow managing semi-finished products and preparations.
          </p>

          <!-- Feature List -->
          <div class="feature-list mb-8">
            <v-card class="pa-4 mb-3" variant="outlined">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-3">mdi-clipboard-list-outline</v-icon>
                <div class="text-left">
                  <div class="text-subtitle-1 font-weight-medium">View Preparation Inventory</div>
                  <div class="text-caption text-medium-emphasis">
                    Track available preparations and their quantities
                  </div>
                </div>
              </div>
            </v-card>

            <v-card class="pa-4 mb-3" variant="outlined">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-3">mdi-plus-circle-outline</v-icon>
                <div class="text-left">
                  <div class="text-subtitle-1 font-weight-medium">Create & Update Batches</div>
                  <div class="text-caption text-medium-emphasis">
                    Manage preparation production batches
                  </div>
                </div>
              </div>
            </v-card>

            <v-card class="pa-4 mb-3" variant="outlined">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-3">mdi-alert-outline</v-icon>
                <div class="text-left">
                  <div class="text-subtitle-1 font-weight-medium">Low Stock Alerts</div>
                  <div class="text-caption text-medium-emphasis">
                    Get notified when preparations are running low
                  </div>
                </div>
              </div>
            </v-card>

            <v-card class="pa-4" variant="outlined">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-3">mdi-chart-line</v-icon>
                <div class="text-left">
                  <div class="text-subtitle-1 font-weight-medium">Usage Analytics</div>
                  <div class="text-caption text-medium-emphasis">
                    Track preparation consumption patterns
                  </div>
                </div>
              </div>
            </v-card>
          </div>

          <!-- Coming Soon Badge -->
          <v-chip color="primary" variant="flat" size="large" class="px-6">
            <v-icon start>mdi-calendar-clock</v-icon>
            Coming Soon in Sprint 2
          </v-chip>

          <!-- Back to Orders Button -->
          <div class="mt-8">
            <v-btn color="primary" variant="outlined" size="large" @click="navigateToOrders">
              <v-icon start>mdi-arrow-left</v-icon>
              Back to Orders
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'navigate-to-orders': []
}>()

// =============================================
// METHODS
// =============================================

const navigateToOrders = () => {
  emit('navigate-to-orders')
}
</script>

<style scoped lang="scss">
.preparation-screen {
  height: 100%;
  width: 100%;
  background-color: var(--v-theme-background);
}

.feature-list {
  max-width: 600px;
  margin: 0 auto;
}
</style>
