<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const guides = [
  {
    id: 'monitor',
    title: 'Kitchen Monitor',
    description:
      'Panduan lengkap menggunakan antarmuka Kitchen Monitor untuk mengelola pesanan, persiapan, dan melacak KPI',
    icon: 'mdi-monitor-dashboard',
    route: 'help-kitchen-monitor',
    tags: ['Pesanan', 'Persiapan', 'KPI']
  },
  {
    id: 'preparation',
    title: 'Manajemen Persiapan',
    description:
      'Panduan lengkap untuk mengelola produksi polufabrikat, write-off, dan stok bahan semi-jadi',
    icon: 'mdi-food-variant',
    route: 'help-kitchen-preparation',
    tags: ['Produksi', 'Write-off', 'Stok']
  },
  {
    id: 'orders',
    title: 'Manajemen Pesanan',
    description:
      'Panduan lengkap untuk mengelola pesanan dapur secara real-time, dari antrian hingga siap disajikan',
    icon: 'mdi-chef-hat',
    route: 'help-kitchen-orders',
    tags: ['Pesanan', 'Memasak', 'Status']
  },
  {
    id: 'kpi',
    title: 'KPI Dashboard',
    description:
      'Panduan memahami metrik performa dapur: Time KPI dan Food Cost KPI untuk evaluasi efisiensi',
    icon: 'mdi-chart-line',
    route: 'help-kitchen-kpi',
    tags: ['Time KPI', 'Food Cost', 'Analisis']
  }
]

const features = [
  {
    icon: 'mdi-chef-hat',
    title: 'Manajemen Pesanan',
    description: 'Lihat dan kelola pesanan masuk secara real-time'
  },
  {
    icon: 'mdi-food-variant',
    title: 'Kontrol Persiapan',
    description: 'Lacak produk setengah jadi dan jadwal produksi'
  },
  {
    icon: 'mdi-chart-line',
    title: 'Pelacakan KPI',
    description: 'Pantau metrik performa dapur'
  }
]

function goToGuide(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="kitchen-help">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="orange" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-chef-hat</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Bantuan Dapur</h1>
        <p class="text-body-2 text-medium-emphasis">Panduan dan instruksi untuk staf dapur</p>
      </div>
    </div>

    <!-- Overview Section -->
    <v-card variant="tonal" color="orange" class="mb-6">
      <v-card-text>
        <h2 class="text-h6 font-weight-medium mb-3">
          <v-icon class="mr-2">mdi-information</v-icon>
          Tentang Modul Dapur
        </h2>
        <p class="text-body-2 mb-4">
          Modul Dapur dirancang untuk staf dapur agar dapat mengelola pesanan secara efisien,
          melacak persiapan, dan memantau performa. Modul ini menyediakan tampilan real-time yang
          dioptimalkan untuk lingkungan dapur dengan kontrol sentuh yang besar.
        </p>

        <v-row>
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="4">
            <div class="d-flex align-start">
              <v-icon color="orange-darken-2" class="mr-2 mt-1">{{ feature.icon }}</v-icon>
              <div>
                <div class="text-subtitle-2 font-weight-medium">{{ feature.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ feature.description }}</div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Quick Access -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <strong>Akses Cepat:</strong>
          Buka Kitchen Monitor secara langsung
        </div>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          href="/kitchen"
          prepend-icon="mdi-open-in-new"
        >
          Buka Kitchen Monitor
        </v-btn>
      </div>
    </v-alert>

    <v-divider class="mb-6" />

    <!-- Guides List -->
    <h2 class="text-h6 font-weight-medium mb-4">
      <v-icon class="mr-2">mdi-book-open-variant</v-icon>
      Panduan Tersedia
    </h2>

    <v-row>
      <v-col v-for="guide in guides" :key="guide.id" cols="12" md="6">
        <v-card class="guide-card" hover @click="goToGuide(guide.route)">
          <v-card-text class="d-flex align-start pa-4">
            <v-avatar color="orange-darken-1" size="48" class="mr-4">
              <v-icon color="white">{{ guide.icon }}</v-icon>
            </v-avatar>

            <div class="flex-grow-1">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">
                {{ guide.title }}
              </h3>
              <p class="text-body-2 text-medium-emphasis mb-3">
                {{ guide.description }}
              </p>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="tag in guide.tags"
                  :key="tag"
                  size="x-small"
                  variant="tonal"
                  color="orange"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </div>

            <v-icon color="grey">mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State for future -->
    <v-alert v-if="guides.length === 0" type="info" variant="tonal" class="mt-4">
      Belum ada panduan tersedia. Periksa kembali nanti!
    </v-alert>
  </div>
</template>

<style scoped lang="scss">
.kitchen-help {
  max-width: 900px;
}

.guide-card {
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(4px);
  }
}
</style>
