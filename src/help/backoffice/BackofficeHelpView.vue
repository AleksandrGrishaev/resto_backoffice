<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const guides: Array<{
  id: string
  title: string
  description: string
  icon: string
  route: string
  tags: string[]
}> = [
  {
    id: 'supplier',
    title: 'Manajemen Pemasok',
    description:
      'Panduan lengkap untuk mengelola pembelian dari pemasok: request, order, invoice, dan penerimaan barang',
    icon: 'mdi-truck-delivery',
    route: 'help-backoffice-supplier',
    tags: ['Pembelian', 'Invoice', 'Request', 'Order']
  },
  {
    id: 'accounts',
    title: 'Manajemen Akun',
    description:
      'Panduan untuk mengelola akun keuangan, pembayaran tagihan, income, expense, dan transfer',
    icon: 'mdi-wallet',
    route: 'help-backoffice-accounts',
    tags: ['Keuangan', 'Pembayaran', 'Transfer', 'Kas']
  },
  {
    id: 'recipes',
    title: 'Manajemen Resep',
    description:
      'Panduan lengkap untuk mengelola resep, semi-finished products (polufabrikaty), dan kalkulasi biaya',
    icon: 'mdi-book-open-page-variant',
    route: 'help-backoffice-recipes',
    tags: ['Resep', 'Polufabrikaty', 'Biaya', 'Margin']
  }
]

const features = [
  {
    icon: 'mdi-food',
    title: 'Products & Recipes',
    description: 'Kelola produk dan resep'
  },
  {
    icon: 'mdi-silverware-fork-knife',
    title: 'Menu Configuration',
    description: 'Atur menu dan kategori produk'
  },
  {
    icon: 'mdi-chart-bar',
    title: 'Reports & Analytics',
    description: 'Laporan penjualan dan analitik bisnis'
  }
]

function goToGuide(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="backoffice-help">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="blue" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-chart-box</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Backoffice Help</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan dan instruksi untuk manajer dan administrator
        </p>
      </div>
    </div>

    <!-- Overview Section -->
    <v-card variant="tonal" color="blue" class="mb-6">
      <v-card-text>
        <h2 class="text-h6 font-weight-medium mb-3">
          <v-icon class="mr-2">mdi-information</v-icon>
          Tentang Modul Backoffice
        </h2>
        <p class="text-body-2 mb-4">
          Modul Backoffice dirancang untuk manajer dan administrator untuk mengelola operasional
          restoran, termasuk produk, resep, menu, inventaris, dan laporan.
        </p>

        <v-row>
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="4">
            <div class="d-flex align-start">
              <v-icon color="blue-darken-2" class="mr-2 mt-1">{{ feature.icon }}</v-icon>
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
          Buka Backoffice langsung
        </div>
        <v-btn color="primary" variant="flat" size="small" href="/" prepend-icon="mdi-open-in-new">
          Buka Backoffice
        </v-btn>
      </div>
    </v-alert>

    <v-divider class="mb-6" />

    <!-- Guides List -->
    <template v-if="guides.length > 0">
      <h2 class="text-h6 font-weight-medium mb-4">
        <v-icon class="mr-2">mdi-book-open-variant</v-icon>
        Panduan Tersedia
      </h2>

      <v-row>
        <v-col v-for="guide in guides" :key="guide.id" cols="12" md="6">
          <v-card class="guide-card" hover @click="goToGuide(guide.route)">
            <v-card-text class="d-flex align-start pa-4">
              <v-avatar color="blue-darken-1" size="48" class="mr-4">
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
                    color="blue"
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

      <v-divider class="my-6" />
    </template>

    <!-- Planned Topics -->
    <v-card class="mt-6" variant="outlined">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-format-list-checks</v-icon>
        Panduan Akan Datang
      </v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-food">
            <v-list-item-title>Produk & Kategori</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-silverware-fork-knife">
            <v-list-item-title>Konfigurasi Menu</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-warehouse">
            <v-list-item-title>Gudang & Inventaris</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-truck-delivery">
            <v-list-item-title>Pemasok & Pembelian</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-chart-bar">
            <v-list-item-title>Laporan & Analitik</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.backoffice-help {
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
