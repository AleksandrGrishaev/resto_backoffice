<!-- src/views/pos/PosMainView.vue - ПРОСТАЯ заглушка с Logout -->
<template>
  <div class="pos-main-view">
    <v-container fluid class="fill-height">
      <v-row justify="center" align="center">
        <v-col cols="12" class="text-center">
          <v-card class="mx-auto pa-8" max-width="500">
            <v-card-text>
              <v-icon icon="mdi-cash-register" size="80" color="primary" class="mb-4" />

              <h1 class="text-h3 mb-4">POS System</h1>

              <p class="text-h6 text-medium-emphasis mb-6">Point of Sale interface will be here</p>

              <v-chip color="success" variant="tonal" size="large" class="mb-6">
                <v-icon start>mdi-account</v-icon>
                Cashier Mode Active
              </v-chip>

              <div class="logout-section">
                <LogoutButton variant="full" size="large" text="Exit POS" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import LogoutButton from '@/components/atoms/buttons/LogoutButton.vue'
</script>

<style lang="scss" scoped>
.pos-main-view {
  height: 100%;
  min-height: calc(100vh - 120px); // header + footer
}

.logout-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 24px;
  margin-top: 24px;
}
</style>
