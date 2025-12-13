<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const sections = [
  {
    id: 'kitchen',
    title: 'Kitchen',
    description: 'Kitchen Monitor, Preparation Management, KPI tracking',
    icon: 'mdi-chef-hat',
    color: 'orange',
    route: 'help-kitchen',
    guides: 1
  },
  {
    id: 'pos',
    title: 'POS',
    description: 'Point of Sale, Orders, Payments, Tables',
    icon: 'mdi-cash-register',
    color: 'green',
    route: 'help-pos',
    guides: 0
  },
  {
    id: 'backoffice',
    title: 'Backoffice',
    description: 'Products, Recipes, Menu, Storage, Reports',
    icon: 'mdi-chart-box',
    color: 'blue',
    route: 'help-backoffice',
    guides: 0
  }
]

function goToSection(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="help-home">
    <!-- Header -->
    <div class="text-center mb-8">
      <v-icon size="64" color="primary" class="mb-4">mdi-book-open-page-variant</v-icon>
      <h1 class="text-h3 font-weight-bold mb-2">Help & Documentation</h1>
      <p class="text-body-1 text-medium-emphasis">
        Select a section to view available guides and instructions
      </p>
    </div>

    <!-- Section Cards -->
    <v-row justify="center">
      <v-col v-for="section in sections" :key="section.id" cols="12" sm="6" md="4" lg="3">
        <v-card
          class="section-card h-100"
          :class="{ 'section-card--empty': section.guides === 0 }"
          hover
          @click="goToSection(section.route)"
        >
          <v-card-text class="text-center pa-6">
            <v-avatar :color="section.color" size="80" class="mb-4">
              <v-icon size="40" color="white">{{ section.icon }}</v-icon>
            </v-avatar>

            <h3 class="text-h5 font-weight-bold mb-2">{{ section.title }}</h3>

            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ section.description }}
            </p>

            <v-chip :color="section.guides > 0 ? 'primary' : 'grey'" variant="tonal" size="small">
              {{ section.guides }} {{ section.guides === 1 ? 'guide' : 'guides' }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Links -->
    <v-divider class="my-8" />

    <div class="text-center">
      <p class="text-body-2 text-medium-emphasis mb-4">Need help with something specific?</p>
      <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" href="/">
        Back to Application
      </v-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
.help-home {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.section-card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
  }

  &--empty {
    opacity: 0.7;
  }
}
</style>
