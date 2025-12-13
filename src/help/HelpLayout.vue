<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const currentSection = computed(() => route.meta.section as string | undefined)
const currentRouteName = computed(() => route.name as string)

interface GuideItem {
  id: string
  title: string
  icon: string
  route: string
}

interface Section {
  id: string
  title: string
  icon: string
  route: string
  description: string
  guides: GuideItem[]
}

const sections: Section[] = [
  {
    id: 'kitchen',
    title: 'Kitchen',
    icon: 'mdi-chef-hat',
    route: 'help-kitchen',
    description: 'Kitchen Monitor documentation',
    guides: [
      {
        id: 'monitor',
        title: 'Kitchen Monitor',
        icon: 'mdi-monitor-dashboard',
        route: 'help-kitchen-monitor'
      },
      {
        id: 'preparation',
        title: 'Manajemen Persiapan',
        icon: 'mdi-food-variant',
        route: 'help-kitchen-preparation'
      },
      {
        id: 'orders',
        title: 'Manajemen Pesanan',
        icon: 'mdi-chef-hat',
        route: 'help-kitchen-orders'
      },
      { id: 'kpi', title: 'KPI Dashboard', icon: 'mdi-chart-line', route: 'help-kitchen-kpi' }
    ]
  },
  {
    id: 'pos',
    title: 'POS',
    icon: 'mdi-cash-register',
    route: 'help-pos',
    description: 'Point of Sale documentation',
    guides: []
  },
  {
    id: 'backoffice',
    title: 'Backoffice',
    icon: 'mdi-chart-box',
    route: 'help-backoffice',
    description: 'Management interface documentation',
    guides: [
      {
        id: 'supplier',
        title: 'Manajemen Pemasok',
        icon: 'mdi-truck-delivery',
        route: 'help-backoffice-supplier'
      },
      {
        id: 'accounts',
        title: 'Manajemen Akun',
        icon: 'mdi-wallet',
        route: 'help-backoffice-accounts'
      },
      {
        id: 'recipes',
        title: 'Manajemen Resep',
        icon: 'mdi-book-open-page-variant',
        route: 'help-backoffice-recipes'
      },
      {
        id: 'products',
        title: 'Manajemen Produk',
        icon: 'mdi-package-variant',
        route: 'help-backoffice-products'
      }
    ]
  }
]

const isHome = computed(() => route.name === 'help-home')

const currentSectionData = computed(() => {
  return sections.find(s => s.id === currentSection.value)
})

function goHome() {
  router.push({ name: 'help-home' })
}

function goToRoute(routeName: string) {
  router.push({ name: routeName })
}

function isActiveRoute(routeName: string): boolean {
  return currentRouteName.value === routeName
}
</script>

<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar color="surface" elevation="1">
      <v-btn icon variant="text" @click="goHome">
        <v-icon>mdi-book-open-page-variant</v-icon>
      </v-btn>

      <v-app-bar-title>
        <span class="text-h6 font-weight-medium">Help & Documentation</span>
      </v-app-bar-title>

      <template #append>
        <v-btn variant="text" color="primary" prepend-icon="mdi-arrow-left" href="/">
          Back to App
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Navigation Drawer (shown when not on home) -->
    <v-navigation-drawer v-if="!isHome" permanent width="240" color="grey-darken-4">
      <v-list density="compact" nav>
        <!-- Home link -->
        <v-list-item prepend-icon="mdi-home" title="All Sections" @click="goHome" />

        <v-divider class="my-2" />

        <!-- Sections with subsections -->
        <template v-for="section in sections" :key="section.id">
          <!-- Section header -->
          <v-list-item
            :prepend-icon="section.icon"
            :title="section.title"
            :active="currentSection === section.id && isActiveRoute(section.route)"
            @click="goToRoute(section.route)"
          />

          <!-- Subsections (guides) - shown when section is active -->
          <template v-if="currentSection === section.id && section.guides.length > 0">
            <v-list-item
              v-for="guide in section.guides"
              :key="guide.id"
              :prepend-icon="guide.icon"
              :title="guide.title"
              :active="isActiveRoute(guide.route)"
              class="ml-4"
              density="compact"
              @click="goToRoute(guide.route)"
            />
          </template>
        </template>
      </v-list>

      <!-- Section description at bottom -->
      <template #append>
        <div v-if="currentSectionData" class="pa-3 text-caption text-medium-emphasis">
          <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
          {{ currentSectionData.description }}
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container :fluid="!isHome" class="pa-4 pa-md-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped lang="scss">
:deep(.v-main) {
  background-color: rgb(var(--v-theme-background));
}

.v-list-item.ml-4 {
  margin-left: 16px;
  padding-left: 12px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.3);

  &.v-list-item--active {
    border-left-color: rgb(var(--v-theme-primary));
  }
}
</style>
