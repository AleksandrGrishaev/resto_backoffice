<script setup lang="ts">
import { ref } from 'vue'

// Import screenshots
import kpiTime from '../../assets/screenshots/kitchen/kpi_01_time.png'
import kpiFoodCost from '../../assets/screenshots/kitchen/kpi_02_food_cost.png'
import kpiTotalItems from '../../assets/screenshots/kitchen/kpi_03_total_items.png'

const activeSection = ref('overview')

const sections = [
  { id: 'overview', title: 'Ikhtisar', icon: 'mdi-information' },
  { id: 'time-kpi', title: 'Time KPI', icon: 'mdi-clock-outline' },
  { id: 'food-cost', title: 'Food Cost KPI', icon: 'mdi-currency-usd' },
  { id: 'analysis', title: 'Analisis Data', icon: 'mdi-chart-line' }
]

function scrollToSection(sectionId: string) {
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="kpi-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="purple" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-chart-line</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">KPI Dashboard</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk memahami metrik performa dapur
        </p>
      </div>
    </div>

    <!-- Quick Navigation -->
    <v-card class="mb-6" variant="outlined">
      <v-card-text>
        <div class="text-subtitle-2 text-medium-emphasis mb-2">Navigasi Cepat</div>
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="section in sections"
            :key="section.id"
            :color="activeSection === section.id ? 'purple' : undefined"
            :variant="activeSection === section.id ? 'flat' : 'outlined'"
            :prepend-icon="section.icon"
            size="small"
            @click="scrollToSection(section.id)"
          >
            {{ section.title }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Overview Section -->
    <section id="overview" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="purple">mdi-information</v-icon>
        Ikhtisar
      </h2>

      <v-card variant="tonal" color="purple" class="mb-4">
        <v-card-text>
          <p class="text-body-1 mb-4">
            <strong>KPI Dashboard</strong>
            adalah alat analitik yang membantu manajer dan staf dapur memantau performa operasional
            secara real-time. Dashboard ini menyediakan metrik penting untuk evaluasi efisiensi dan
            kontrol biaya.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <div class="d-flex align-start mb-3">
                <v-icon color="purple-darken-2" class="mr-2 mt-1">mdi-clock-outline</v-icon>
                <div>
                  <div class="text-subtitle-2 font-weight-medium">Time KPI</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Melacak waktu tunggu dan memasak setiap hidangan
                  </div>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="d-flex align-start mb-3">
                <v-icon color="purple-darken-2" class="mr-2 mt-1">mdi-currency-usd</v-icon>
                <div>
                  <div class="text-subtitle-2 font-weight-medium">Food Cost KPI</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Analisis biaya bahan baku dan COGS
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Time KPI Section -->
    <section id="time-kpi" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="blue">mdi-clock-outline</v-icon>
        Time KPI
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <p class="text-body-1 mb-4">
            Tab
            <strong>Time KPI</strong>
            menampilkan metrik waktu untuk semua pesanan yang diselesaikan hari ini. Data ini
            membantu mengidentifikasi bottleneck dan mengoptimalkan alur kerja dapur.
          </p>
        </v-card-text>
      </v-card>

      <v-img :src="kpiTime" class="rounded-lg elevation-2 mb-4" max-width="100%" />
      <p class="text-caption text-medium-emphasis text-center mb-4">
        Dashboard Time KPI dengan metrik waktu dan tabel detail
      </p>

      <v-card class="mb-4" color="blue-darken-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Metrik Utama</h3>

          <v-table density="comfortable" class="bg-transparent">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Deskripsi</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Items Completed</strong></td>
                <td>Jumlah hidangan yang diselesaikan hari ini</td>
                <td>-</td>
              </tr>
              <tr>
                <td><strong>Avg Total Time</strong></td>
                <td>Rata-rata waktu dari pesanan masuk hingga selesai</td>
                <td>15:00</td>
              </tr>
              <tr>
                <td><strong>Avg Waiting</strong></td>
                <td>Rata-rata waktu pesanan menunggu di antrian</td>
                <td>Minimal</td>
              </tr>
              <tr>
                <td><strong>Avg Cooking</strong></td>
                <td>Rata-rata waktu proses memasak</td>
                <td>Sesuai resep</td>
              </tr>
              <tr>
                <td><strong>Exceeded Plan</strong></td>
                <td>Jumlah pesanan yang melebihi target waktu</td>
                <td>0%</td>
              </tr>
              <tr>
                <td><strong>Deviation from Plan</strong></td>
                <td>Persentase deviasi dari target waktu</td>
                <td>0%</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Tab Detail Data</h3>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="info">
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-icon color="info" class="mr-2">mdi-format-list-bulleted</v-icon>
                    <strong>Item Details</strong>
                  </div>
                  <p class="text-body-2 mb-0">
                    Menampilkan daftar lengkap setiap pesanan dengan waktu tunggu, waktu memasak,
                    dan status penyelesaian.
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="success">
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-icon color="success" class="mr-2">mdi-chart-bar</v-icon>
                    <strong>Total Items</strong>
                  </div>
                  <p class="text-body-2 mb-0">
                    Menampilkan statistik agregat per produk: jumlah, rata-rata waktu, dan
                    persentase yang melebihi target.
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-img :src="kpiTotalItems" class="rounded-lg elevation-2 mb-4" max-width="100%" />
      <p class="text-caption text-medium-emphasis text-center">
        Tab Total Items menampilkan statistik agregat per produk
      </p>
    </section>

    <!-- Food Cost KPI Section -->
    <section id="food-cost" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="orange">mdi-currency-usd</v-icon>
        Food Cost KPI
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <p class="text-body-1 mb-4">
            Tab
            <strong>Food Cost KPI</strong>
            menyediakan analisis mendalam tentang biaya bahan baku (COGS - Cost of Goods Sold).
            Metrik ini penting untuk memantau profitabilitas dan mengidentifikasi pemborosan.
          </p>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Target COGS:</strong>
            Idealnya, Food Cost harus di bawah 30% dari pendapatan. Nilai di atas 30% menunjukkan
            perlu evaluasi efisiensi.
          </v-alert>
        </v-card-text>
      </v-card>

      <v-img :src="kpiFoodCost" class="rounded-lg elevation-2 mb-4" max-width="100%" />
      <p class="text-caption text-medium-emphasis text-center mb-4">
        Dashboard Food Cost KPI dengan breakdown komponen COGS
      </p>

      <v-card class="mb-4" color="orange-darken-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Komponen COGS</h3>

          <v-table density="comfortable" class="bg-transparent">
            <thead>
              <tr>
                <th>Komponen</th>
                <th>Deskripsi</th>
                <th>Indikator</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <v-chip size="small" color="blue">Theoretical COGS</v-chip>
                </td>
                <td>Biaya resep berdasarkan FIFO tanpa kerugian</td>
                <td>
                  <v-icon size="small" color="info">mdi-information</v-icon>
                  Dasar
                </td>
              </tr>
              <tr>
                <td>
                  <v-chip size="small" color="error">Spoilage & Losses</v-chip>
                </td>
                <td>Write-off (expired, rusak, waste)</td>
                <td>
                  <v-icon size="small" color="warning">mdi-alert</v-icon>
                  Perlu dipantau
                </td>
              </tr>
              <tr>
                <td>
                  <v-chip size="small" color="red">Shortage</v-chip>
                </td>
                <td>Defisit inventaris (aktual &lt; ekspektasi)</td>
                <td>
                  <v-icon size="small" color="success">mdi-check</v-icon>
                  Minimal
                </td>
              </tr>
              <tr>
                <td>
                  <v-chip size="small" color="green">Surplus</v-chip>
                </td>
                <td>Kelebihan inventaris (aktual &gt; ekspektasi)</td>
                <td>
                  <v-icon size="small">mdi-minus</v-icon>
                  Netral
                </td>
              </tr>
              <tr>
                <td>
                  <v-chip size="small" color="purple">Actual COGS</v-chip>
                </td>
                <td>= Theoretical + Spoilage + Shortage - Surplus</td>
                <td>
                  <v-chip v-if="true" size="x-small" color="error">HIGH</v-chip>
                  <span class="ml-1">jika &gt; target</span>
                </td>
              </tr>
              <tr>
                <td>
                  <v-chip size="small" color="warning">Loss Impact</v-chip>
                </td>
                <td>Actual - Theoretical = biaya kerugian</td>
                <td>
                  <v-icon size="small" color="error">mdi-alert-circle</v-icon>
                  Perlu aksi
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Rumus Perhitungan COGS</h3>

          <v-alert type="info" variant="tonal" class="mb-3">
            <div class="text-body-2">
              <strong>Actual COGS</strong>
              = Theoretical COGS + Spoilage & Losses + Shortage - Surplus
            </div>
          </v-alert>

          <v-alert type="warning" variant="tonal">
            <div class="text-body-2">
              <strong>Loss Impact</strong>
              = Actual COGS - Theoretical COGS
              <br />
              <small class="text-medium-emphasis">
                Ini menunjukkan berapa banyak biaya tambahan akibat kerugian operasional
              </small>
            </div>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Analysis Section -->
    <section id="analysis" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="teal">mdi-chart-line</v-icon>
        Analisis Data
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Cara Membaca Dashboard</h3>

          <v-timeline density="compact" side="end">
            <v-timeline-item dot-color="blue" size="small">
              <template #opposite>
                <span class="text-caption">Langkah 1</span>
              </template>
              <v-card variant="tonal">
                <v-card-text class="py-2">
                  <strong>Periksa ringkasan metrik</strong>
                  di bagian atas untuk gambaran umum performa
                </v-card-text>
              </v-card>
            </v-timeline-item>

            <v-timeline-item dot-color="purple" size="small">
              <template #opposite>
                <span class="text-caption">Langkah 2</span>
              </template>
              <v-card variant="tonal">
                <v-card-text class="py-2">
                  <strong>Identifikasi indikator merah</strong>
                  yang menunjukkan area bermasalah
                </v-card-text>
              </v-card>
            </v-timeline-item>

            <v-timeline-item dot-color="orange" size="small">
              <template #opposite>
                <span class="text-caption">Langkah 3</span>
              </template>
              <v-card variant="tonal">
                <v-card-text class="py-2">
                  <strong>Drill-down ke tabel detail</strong>
                  untuk menemukan akar masalah
                </v-card-text>
              </v-card>
            </v-timeline-item>

            <v-timeline-item dot-color="green" size="small">
              <template #opposite>
                <span class="text-caption">Langkah 4</span>
              </template>
              <v-card variant="tonal">
                <v-card-text class="py-2">
                  <strong>Ambil tindakan korektif</strong>
                  berdasarkan temuan data
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
      </v-card>

      <v-card class="mb-4" color="teal-darken-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Indikator Status</h3>

          <v-row>
            <v-col cols="12" md="4">
              <div class="d-flex align-center mb-2">
                <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
                <strong>Hijau / OK</strong>
              </div>
              <p class="text-body-2 text-medium-emphasis">
                Metrik dalam target, tidak perlu tindakan
              </p>
            </v-col>
            <v-col cols="12" md="4">
              <div class="d-flex align-center mb-2">
                <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
                <strong>Kuning / Warning</strong>
              </div>
              <p class="text-body-2 text-medium-emphasis">
                Mendekati batas target, perlu perhatian
              </p>
            </v-col>
            <v-col cols="12" md="4">
              <div class="d-flex align-center mb-2">
                <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
                <strong>Merah / HIGH</strong>
              </div>
              <p class="text-body-2 text-medium-emphasis">Melebihi target, perlu tindakan segera</p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Tips Section -->
    <v-card variant="tonal" color="success" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-lightbulb</v-icon>
        Tips Optimalisasi KPI
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <h4 class="text-subtitle-2 font-weight-bold mb-2">Time KPI</h4>
            <v-list density="compact" class="bg-transparent">
              <v-list-item prepend-icon="mdi-check">
                <v-list-item-title class="text-body-2">
                  Siapkan mise en place sebelum shift
                </v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-check">
                <v-list-item-title class="text-body-2">
                  Prioritaskan pesanan dengan waktu tunggu tinggi
                </v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-check">
                <v-list-item-title class="text-body-2">
                  Optimalkan workflow stasiun memasak
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="6">
            <h4 class="text-subtitle-2 font-weight-bold mb-2">Food Cost KPI</h4>
            <v-list density="compact" class="bg-transparent">
              <v-list-item prepend-icon="mdi-check">
                <v-list-item-title class="text-body-2">
                  Kurangi waste dengan porsi yang tepat
                </v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-check">
                <v-list-item-title class="text-body-2">
                  Rotasi stok FIFO untuk hindari expired
                </v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-check">
                <v-list-item-title class="text-body-2">
                  Inventaris rutin untuk deteksi shortage
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.kpi-guide {
  max-width: 900px;
}

section {
  scroll-margin-top: 80px;
}
</style>
