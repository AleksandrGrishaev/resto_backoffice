<script setup lang="ts">
import { ref } from 'vue'

// Import screenshots
import loginScreen from '../../assets/screenshots/kitchen/01_login_kitchen_tab.png'
import ordersScreen from '../../assets/screenshots/kitchen/02_kitchen_main_orders.png'
import preparationScreen from '../../assets/screenshots/kitchen/03_kitchen_preparation.png'
import kpiScreen from '../../assets/screenshots/kitchen/04_kitchen_kpi.png'

const activeSection = ref('login')

const sections = [
  { id: 'login', title: 'Masuk', icon: 'mdi-login' },
  { id: 'orders', title: 'Pesanan', icon: 'mdi-chef-hat' },
  { id: 'preparation', title: 'Persiapan', icon: 'mdi-food-variant' },
  { id: 'kpi', title: 'KPI', icon: 'mdi-chart-line' }
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
  <div class="monitor-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" :to="{ name: 'help-kitchen' }" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Panduan Kitchen Monitor</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap menggunakan antarmuka Kitchen Monitor
        </p>
      </div>
    </div>

    <!-- Quick Navigation -->
    <v-card class="mb-6" variant="outlined">
      <v-card-text class="pa-2">
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="section in sections"
            :key="section.id"
            :prepend-icon="section.icon"
            :variant="activeSection === section.id ? 'flat' : 'outlined'"
            :color="activeSection === section.id ? 'primary' : undefined"
            @click="scrollToSection(section.id)"
          >
            {{ section.title }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Section 1: Login -->
    <section id="login" class="guide-section">
      <div class="section-header">
        <v-icon color="primary" class="mr-2">mdi-numeric-1-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Masuk</h2>
      </div>

      <v-card class="screenshot-card mb-4">
        <v-img :src="loginScreen" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="primary" class="mb-6">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Langkah-langkah:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item prepend-icon="mdi-numeric-1-circle-outline">
              <v-list-item-title>Buka aplikasi</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-2-circle-outline">
              <v-list-item-title>
                Pilih tab
                <strong>KITCHEN</strong>
                di bagian atas
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-3-circle-outline">
              <v-list-item-title>
                Masukkan kode PIN Anda (Staf dapur:
                <code>1111</code>
                )
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-4-circle-outline">
              <v-list-item-title>
                Klik
                <strong>LOGIN</strong>
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <v-alert type="info" variant="tonal" density="compact" class="mt-3">
            <strong>Tips:</strong>
            Dalam mode pengembangan, PIN uji coba ditampilkan untuk akses cepat
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <v-divider class="my-6" />

    <!-- Section 2: Orders -->
    <section id="orders" class="guide-section">
      <div class="section-header">
        <v-icon color="primary" class="mr-2">mdi-numeric-2-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Layar Pesanan</h2>
      </div>

      <v-card class="screenshot-card mb-4">
        <v-img :src="ordersScreen" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="orange" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Elemen Antarmuka:</h3>

          <v-expansion-panels variant="accordion">
            <v-expansion-panel title="Sidebar Kiri (Navigasi)">
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-chef-hat">
                    <v-list-item-title>
                      <strong>Pesanan</strong>
                      - Lihat pesanan masuk (badge menunjukkan jumlah)
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-food-variant">
                    <v-list-item-title>
                      <strong>Persiapan</strong>
                      - Kelola produk setengah jadi
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-chart-line">
                    <v-list-item-title>
                      <strong>KPI</strong>
                      - Lihat metrik performa
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel title="Kolom Menunggu">
              <v-expansion-panel-text>
                <p class="mb-2">
                  Menampilkan pesanan yang menunggu untuk disiapkan. Setiap kartu menampilkan:
                </p>
                <v-list density="compact">
                  <v-list-item>
                    Nomor pesanan (contoh:
                    <code>ORD-20251213-6509</code>
                    )
                  </v-list-item>
                  <v-list-item>Waktu tunggu (merah jika melebihi batas)</v-list-item>
                  <v-list-item>Nama hidangan dan ukuran</v-list-item>
                  <v-list-item>
                    Jenis pesanan:
                    <v-chip size="x-small" color="purple">Makan di tempat</v-chip>
                    <v-chip size="x-small" color="orange">Pengiriman</v-chip>
                  </v-list-item>
                  <v-list-item>Nomor meja (untuk pesanan makan di tempat)</v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel title="Kolom Memasak">
              <v-expansion-panel-text>
                <p>
                  Menampilkan pesanan yang sedang disiapkan. Status kosong menampilkan "Tidak ada
                  hidangan yang dimasak".
                </p>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel title="Kustomisasi">
              <v-expansion-panel-text>
                <p>Modifikasi khusus ditandai dalam kotak merah dengan detail seperti:</p>
                <v-chip color="error" variant="tonal" class="mt-2">Ikan → Salmon</v-chip>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>

      <v-card variant="outlined" class="mb-6">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-2">Aksi:</h3>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-fire">
              <v-list-item-title>
                Klik
                <v-chip size="small" color="primary">MULAI MEMASAK</v-chip>
                untuk memindahkan pesanan ke kolom Memasak
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-check">
              <v-list-item-title>
                Klik
                <v-chip size="small" color="success">SELESAI</v-chip>
                untuk menandai selesai
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </section>

    <v-divider class="my-6" />

    <!-- Section 3: Preparation -->
    <section id="preparation" class="guide-section">
      <div class="section-header">
        <v-icon color="primary" class="mr-2">mdi-numeric-3-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Manajemen Persiapan</h2>
      </div>

      <v-card class="screenshot-card mb-4">
        <v-img :src="preparationScreen" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="green" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Bar Aksi Atas:</h3>
          <div class="d-flex flex-wrap gap-2 mb-4">
            <v-chip prepend-icon="mdi-refresh">Segarkan</v-chip>
            <v-chip prepend-icon="mdi-lightbulb-on">Buat Jadwal</v-chip>
            <v-chip prepend-icon="mdi-plus" color="primary">Produksi Baru</v-chip>
            <v-chip prepend-icon="mdi-delete" color="warning">Hapus Persiapan</v-chip>
            <v-chip prepend-icon="mdi-package-variant-remove" color="error">Hapus Produk</v-chip>
          </div>

          <h3 class="text-subtitle-1 font-weight-bold mb-3">Tab:</h3>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-calendar-check">
              <v-list-item-title>
                <strong>Jadwal Produksi</strong>
                - Tugas harian yang perlu disiapkan
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-package-variant">
              <v-list-item-title>
                <strong>Daftar Stok</strong>
                - Inventaris saat ini
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-history">
              <v-list-item-title>
                <strong>Riwayat</strong>
                - Catatan produksi sebelumnya
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card variant="outlined" color="error">
            <v-card-title class="text-subtitle-1">
              <v-icon color="error" class="mr-2">mdi-alert</v-icon>
              Tugas Mendesak
            </v-card-title>
            <v-card-text>
              Item yang habis stok atau kedaluwarsa hari ini. Memerlukan perhatian segera.
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined" color="warning">
            <v-card-title class="text-subtitle-1">
              <v-icon color="warning" class="mr-2">mdi-weather-sunset-up</v-icon>
              Tugas Pagi (6:00 - 12:00)
            </v-card-title>
            <v-card-text>
              Tugas yang dijadwalkan untuk shift pagi. Menampilkan peringatan "Mendekati
              kedaluwarsa".
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <v-divider class="my-6" />

    <!-- Section 4: KPI -->
    <section id="kpi" class="guide-section">
      <div class="section-header">
        <v-icon color="primary" class="mr-2">mdi-numeric-4-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Dasbor KPI</h2>
      </div>

      <v-card class="screenshot-card mb-4">
        <v-img :src="kpiScreen" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="blue" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Metrik KPI Waktu:</h3>

          <v-table density="compact">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Item Selesai</strong></td>
                <td>Total hidangan selesai hari ini</td>
              </tr>
              <tr>
                <td><strong>Rata-rata Total Waktu</strong></td>
                <td>Rata-rata waktu dari pesanan hingga selesai (target: 15:00)</td>
              </tr>
              <tr>
                <td><strong>Rata-rata Menunggu</strong></td>
                <td>Rata-rata waktu pesanan menunggu</td>
              </tr>
              <tr>
                <td><strong>Rata-rata Memasak</strong></td>
                <td>Rata-rata waktu memasak</td>
              </tr>
              <tr>
                <td><strong>Melebihi Target</strong></td>
                <td>Pesanan yang memakan waktu lebih lama dari target</td>
              </tr>
              <tr>
                <td><strong>Deviasi dari Target</strong></td>
                <td>Persentase deviasi dari waktu target</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert type="info" variant="tonal" density="compact" class="mt-4">
            <strong>Tab:</strong>
            Beralih antara tampilan
            <strong>Waktu</strong>
            dan
            <strong>Biaya Makanan</strong>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Footer Navigation -->
    <v-divider class="my-6" />

    <div class="d-flex justify-space-between">
      <v-btn variant="text" :to="{ name: 'help-kitchen' }" prepend-icon="mdi-arrow-left">
        Kembali ke Bantuan Dapur
      </v-btn>

      <v-btn variant="text" color="primary" href="/" append-icon="mdi-open-in-new">
        Buka Kitchen Monitor
      </v-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
.monitor-guide {
  max-width: 900px;
}

.guide-section {
  scroll-margin-top: 80px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.screenshot-card {
  overflow: hidden;
  border-radius: 8px;

  :deep(.v-img) {
    border-radius: 8px;
  }
}

code {
  background: rgba(var(--v-theme-primary), 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: monospace;
}
</style>
