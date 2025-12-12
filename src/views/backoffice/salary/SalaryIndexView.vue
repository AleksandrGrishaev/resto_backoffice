<!-- src/views/backoffice/salary/SalaryIndexView.vue -->
<template>
  <v-container fluid class="salary-index">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">Salary & KPI</h1>
      </v-col>
    </v-row>

    <v-row>
      <!-- Kitchen Time KPI Card -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="kpi-card" hover @click="navigateTo('salary-kitchen-time-kpi')">
          <v-card-item>
            <template #prepend>
              <v-avatar color="primary" size="56">
                <v-icon size="32">mdi-clock-fast</v-icon>
              </v-avatar>
            </template>

            <v-card-title>Kitchen Time KPI</v-card-title>
            <v-card-subtitle>Order processing time tracking</v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <p class="text-body-2">
              Monitor kitchen and bar order processing times. Track waiting, cooking, and total
              times against plan targets (Kitchen: 15min, Bar: 5min).
            </p>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="text" append-icon="mdi-chevron-right">
              View Report
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Production KPI Card (Placeholder) -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="kpi-card kpi-card--disabled">
          <v-card-item>
            <template #prepend>
              <v-avatar color="grey" size="56">
                <v-icon size="32">mdi-chef-hat</v-icon>
              </v-avatar>
            </template>

            <v-card-title>Production KPI</v-card-title>
            <v-card-subtitle>Staff production tracking</v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <p class="text-body-2 text-disabled">
              Track staff production counts, on-time completions, and schedule adherence.
            </p>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-chip size="small" color="grey" variant="tonal">Coming Soon</v-chip>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Write-off KPI Card (Placeholder) -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="kpi-card kpi-card--disabled">
          <v-card-item>
            <template #prepend>
              <v-avatar color="grey" size="56">
                <v-icon size="32">mdi-delete-circle</v-icon>
              </v-avatar>
            </template>

            <v-card-title>Write-off KPI</v-card-title>
            <v-card-subtitle>Waste and loss tracking</v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <p class="text-body-2 text-disabled">
              Monitor write-offs by staff member, track KPI-affecting vs non-KPI losses.
            </p>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-chip size="small" color="grey" variant="tonal">Coming Soon</v-chip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateTo = (routeName: string) => {
  router.push({ name: routeName })
}
</script>

<style scoped lang="scss">
.salary-index {
  padding: var(--spacing-lg);
}

.kpi-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &--disabled {
    cursor: default;
    opacity: 0.7;

    &:hover {
      transform: none;
    }
  }
}
</style>
