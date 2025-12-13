<script setup lang="ts">
import { ref } from 'vue'

// Import screenshots
import ordersMain from '../../assets/screenshots/kitchen/orders_01_main.png'
import ordersCooking from '../../assets/screenshots/kitchen/orders_02_cooking.png'
import ordersReady from '../../assets/screenshots/kitchen/orders_03_ready.png'

const activeSection = ref('overview')

const sections = [
  { id: 'overview', title: 'Ikhtisar', icon: 'mdi-information' },
  { id: 'waiting', title: 'Antrian Menunggu', icon: 'mdi-clock-outline' },
  { id: 'cooking', title: 'Proses Memasak', icon: 'mdi-fire' },
  { id: 'ready', title: 'Siap Disajikan', icon: 'mdi-check-circle' },
  { id: 'order-card', title: 'Kartu Pesanan', icon: 'mdi-card-text' }
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
  <div class="orders-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="orange" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-chef-hat</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Pesanan</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk mengelola pesanan dapur secara real-time
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
            :color="activeSection === section.id ? 'orange' : undefined"
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
        <v-icon class="mr-2" color="orange">mdi-information</v-icon>
        Ikhtisar
      </h2>

      <v-card variant="tonal" color="orange" class="mb-4">
        <v-card-text>
          <p class="text-body-1 mb-4">
            Layar
            <strong>Orders</strong>
            adalah pusat kendali untuk manajemen pesanan dapur. Layar ini menampilkan semua pesanan
            yang masuk secara real-time dan memungkinkan staf dapur untuk melacak status setiap
            hidangan dari saat dipesan hingga siap disajikan.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <div class="d-flex align-start mb-3">
                <v-icon color="orange-darken-2" class="mr-2 mt-1">mdi-clock-outline</v-icon>
                <div>
                  <div class="text-subtitle-2 font-weight-medium">Kolom Waiting</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Pesanan baru yang menunggu untuk dimasak
                  </div>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="d-flex align-start mb-3">
                <v-icon color="orange-darken-2" class="mr-2 mt-1">mdi-fire</v-icon>
                <div>
                  <div class="text-subtitle-2 font-weight-medium">Kolom Cooking</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Pesanan yang sedang dalam proses memasak
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-img :src="ordersMain" class="rounded-lg elevation-2 mb-4" max-width="100%" />
      <p class="text-caption text-medium-emphasis text-center">
        Tampilan utama layar Orders dengan kolom Waiting dan Cooking
      </p>
    </section>

    <!-- Waiting Section -->
    <section id="waiting" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="blue">mdi-clock-outline</v-icon>
        Antrian Menunggu (Waiting)
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <p class="text-body-1 mb-4">
            Kolom
            <strong>Waiting</strong>
            menampilkan semua pesanan baru yang masuk dari POS. Setiap kartu pesanan menunjukkan
            informasi penting yang diperlukan untuk persiapan hidangan.
          </p>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Tips:</strong>
            Timer berwarna merah menunjukkan pesanan yang sudah melebihi waktu tunggu standar.
            Prioritaskan pesanan ini terlebih dahulu!
          </v-alert>

          <h3 class="text-subtitle-1 font-weight-bold mb-3">Informasi pada Kartu Pesanan:</h3>
          <v-list density="compact" class="bg-transparent">
            <v-list-item prepend-icon="mdi-identifier">
              <v-list-item-title>Nomor Order</v-list-item-title>
              <v-list-item-subtitle>
                ID unik pesanan (contoh: ORD-20251213-6509)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-timer">
              <v-list-item-title>Timer Tunggu</v-list-item-title>
              <v-list-item-subtitle>Waktu sejak pesanan diterima</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-food">
              <v-list-item-title>Nama Hidangan</v-list-item-title>
              <v-list-item-subtitle>Menu yang harus disiapkan</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-tag">
              <v-list-item-title>Tipe Pesanan</v-list-item-title>
              <v-list-item-subtitle>Dine-in, Delivery, atau Takeaway</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-table-furniture">
              <v-list-item-title>Nomor Meja</v-list-item-title>
              <v-list-item-subtitle>Untuk pesanan Dine-in</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-card class="mb-4" color="blue-darken-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-cursor-default-click</v-icon>
            Cara Memulai Memasak
          </h3>
          <v-stepper
            :items="['Pilih pesanan', 'Klik tombol', 'Mulai masak']"
            class="bg-transparent"
          >
            <template #[`item.1`]>
              <p class="text-body-2">
                Identifikasi pesanan yang ingin Anda kerjakan dari kolom Waiting
              </p>
            </template>
            <template #[`item.2`]>
              <p class="text-body-2">
                Klik tombol
                <v-chip color="primary" size="small">START COOKING</v-chip>
                pada kartu pesanan
              </p>
            </template>
            <template #[`item.3`]>
              <p class="text-body-2">
                Pesanan akan berpindah ke kolom Cooking dan timer memasak dimulai
              </p>
            </template>
          </v-stepper>
        </v-card-text>
      </v-card>
    </section>

    <!-- Cooking Section -->
    <section id="cooking" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="deep-orange">mdi-fire</v-icon>
        Proses Memasak (Cooking)
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <p class="text-body-1 mb-4">
            Ketika Anda menekan
            <strong>START COOKING</strong>
            , pesanan berpindah ke kolom
            <strong>Cooking</strong>
            . Timer berubah menjadi waktu memasak (cooking time) yang menghitung berapa lama proses
            memasak berlangsung.
          </p>

          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>Penting:</strong>
            Kartu pesanan di kolom Cooking memiliki border kuning untuk membedakan dengan pesanan
            yang masih menunggu.
          </v-alert>
        </v-card-text>
      </v-card>

      <v-img :src="ordersCooking" class="rounded-lg elevation-2 mb-4" max-width="100%" />
      <p class="text-caption text-medium-emphasis text-center mb-4">
        Pesanan yang sedang dimasak ditampilkan di kolom Cooking dengan tombol MARK READY
      </p>

      <v-card class="mb-4" color="deep-orange-darken-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-check-circle</v-icon>
            Menandai Pesanan Siap
          </h3>
          <p class="text-body-2 mb-3">
            Setelah hidangan selesai dimasak, klik tombol
            <v-chip color="success" size="small">MARK READY</v-chip>
            untuk menandai bahwa hidangan siap disajikan.
          </p>
          <v-list density="compact" class="bg-transparent">
            <v-list-item prepend-icon="mdi-bell-ring">
              <v-list-item-title>Notifikasi ke Pelayan</v-list-item-title>
              <v-list-item-subtitle>
                Sistem akan memberitahu pelayan bahwa hidangan siap
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-chart-line">
              <v-list-item-title>Data KPI Tersimpan</v-list-item-title>
              <v-list-item-subtitle>
                Waktu tunggu dan memasak dicatat untuk analisis performa
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </section>

    <!-- Ready Section -->
    <section id="ready" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
        Siap Disajikan (Ready)
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <p class="text-body-1 mb-4">
            Setelah hidangan ditandai siap, kartu pesanan akan menghilang dari layar Kitchen
            Monitor. Pesanan tersebut kini sudah tercatat selesai dan menunggu untuk diambil oleh
            pelayan.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="success">
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-icon color="success" class="mr-2">mdi-check-all</v-icon>
                    <strong>Status Pesanan</strong>
                  </div>
                  <p class="text-body-2 mb-0">
                    Status berubah menjadi "Ready" dan pelayan dapat melihat di POS
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="info">
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-icon color="info" class="mr-2">mdi-history</v-icon>
                    <strong>Riwayat KPI</strong>
                  </div>
                  <p class="text-body-2 mb-0">Data performa tercatat di tab KPI untuk evaluasi</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-img :src="ordersReady" class="rounded-lg elevation-2 mb-4" max-width="100%" />
      <p class="text-caption text-medium-emphasis text-center">
        Setelah pesanan ditandai Ready, kartu menghilang dari layar
      </p>
    </section>

    <!-- Order Card Details -->
    <section id="order-card" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon class="mr-2" color="purple">mdi-card-text</v-icon>
        Detail Kartu Pesanan
      </h2>

      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Elemen-elemen Kartu Pesanan</h3>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Elemen</th>
                <th>Deskripsi</th>
                <th>Contoh</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><v-chip size="small" color="red">Order ID</v-chip></td>
                <td>Nomor unik pesanan dengan tanggal</td>
                <td>ORD-20251213-6509</td>
              </tr>
              <tr>
                <td>
                  <v-icon size="small">mdi-timer</v-icon>
                  Timer
                </td>
                <td>Waktu tunggu atau memasak (mm:ss)</td>
                <td>235:41</td>
              </tr>
              <tr>
                <td><strong>Nama Hidangan</strong></td>
                <td>Menu yang harus disiapkan</td>
                <td>Pumpkin Soup</td>
              </tr>
              <tr>
                <td>Variant</td>
                <td>Ukuran atau varian hidangan</td>
                <td>Regular, Standard</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="primary">Dine-in</v-chip></td>
                <td>Tipe pesanan</td>
                <td>Dine-in, Delivery, Takeaway</td>
              </tr>
              <tr>
                <td>
                  <v-icon size="small">mdi-table-furniture</v-icon>
                  Table
                </td>
                <td>Nomor meja (untuk dine-in)</td>
                <td>Table T1</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-card class="mb-4" color="purple-darken-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
            <v-icon class="mr-2">mdi-tune</v-icon>
            Kustomisasi Pesanan
          </h3>
          <p class="text-body-2 mb-3">
            Jika pelanggan meminta modifikasi pada hidangan, kartu pesanan akan menampilkan bagian
            <strong>CUSTOMIZATIONS</strong>
            berwarna merah yang berisi:
          </p>
          <v-list density="compact" class="bg-transparent">
            <v-list-item prepend-icon="mdi-swap-horizontal">
              <v-list-item-title>Penggantian Bahan</v-list-item-title>
              <v-list-item-subtitle>Contoh: Fish → Salmon</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-plus">
              <v-list-item-title>Tambahan Bahan</v-list-item-title>
              <v-list-item-subtitle>Contoh: Extra cheese</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-minus">
              <v-list-item-title>Pengurangan Bahan</v-list-item-title>
              <v-list-item-subtitle>Contoh: No onion</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="error" variant="tonal" class="mt-3" density="compact">
            <strong>Perhatian:</strong>
            Selalu periksa bagian CUSTOMIZATIONS sebelum memasak!
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Tips Section -->
    <v-card variant="tonal" color="success" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-lightbulb</v-icon>
        Tips untuk Efisiensi Dapur
      </v-card-title>
      <v-card-text>
        <v-list density="compact" class="bg-transparent">
          <v-list-item prepend-icon="mdi-numeric-1-circle">
            <v-list-item-title>Prioritaskan pesanan dengan timer merah</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-2-circle">
            <v-list-item-title>Kelompokkan pesanan serupa untuk efisiensi</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-3-circle">
            <v-list-item-title>Selalu cek CUSTOMIZATIONS sebelum memasak</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-4-circle">
            <v-list-item-title>Segera tekan MARK READY setelah hidangan selesai</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-5-circle">
            <v-list-item-title>Pantau KPI untuk evaluasi performa harian</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.orders-guide {
  max-width: 900px;
}

section {
  scroll-margin-top: 80px;
}
</style>
