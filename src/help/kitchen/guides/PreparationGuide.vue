<script setup lang="ts">
import { ref } from 'vue'

// Import screenshots
import mainScreen from '../../assets/screenshots/kitchen/01_preparation_main.png'
import newProductionDialog from '../../assets/screenshots/kitchen/02_new_production_dialog.png'
import newProductionDropdown from '../../assets/screenshots/kitchen/03_new_production_dropdown.png'
import newProductionFilled from '../../assets/screenshots/kitchen/04_new_production_filled.png'
import writeoffPrepDialog from '../../assets/screenshots/kitchen/05_writeoff_prep_dialog.png'
import writeoffProductDialog from '../../assets/screenshots/kitchen/06_writeoff_product_dialog.png'
import stockListTab from '../../assets/screenshots/kitchen/07_stock_list_tab.png'
import historyTab from '../../assets/screenshots/kitchen/08_history_tab.png'

const activeSection = ref('overview')

const sections = [
  { id: 'overview', title: 'Ikhtisar', icon: 'mdi-information' },
  { id: 'new-production', title: 'Produksi Baru', icon: 'mdi-plus-circle' },
  { id: 'writeoff-prep', title: 'Hapus Prep', icon: 'mdi-package-variant-remove' },
  { id: 'writeoff-product', title: 'Hapus Produk', icon: 'mdi-delete' },
  { id: 'stock-list', title: 'Daftar Stok', icon: 'mdi-package-variant' },
  { id: 'history', title: 'Riwayat', icon: 'mdi-history' }
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
  <div class="guide">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" :to="{ name: 'help-kitchen' }" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Persiapan (Preparation)</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk mengelola produksi semi-jadi dan stok bahan
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

    <!-- Section 1: Overview -->
    <section id="overview" class="guide-section">
      <div class="section-header">
        <v-icon color="primary" class="mr-2">mdi-numeric-1-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Ikhtisar Layar Preparation</h2>
      </div>

      <v-card class="screenshot-card mb-4">
        <v-img :src="mainScreen" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="blue" class="mb-6">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Penjelasan Tombol Utama:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item prepend-icon="mdi-refresh">
              <v-list-item-title>
                <strong>Refresh</strong>
                - Memperbarui data stok dari server
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-lightbulb-on">
              <v-list-item-title>
                <strong>Generate Schedule</strong>
                - Membuat jadwal produksi otomatis berdasarkan kebutuhan
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-plus">
              <v-list-item-title>
                <strong>New Production</strong>
                - Menambah produksi baru (polufabrikat)
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-package-variant-remove">
              <v-list-item-title>
                <strong>Write-off Prep</strong>
                - Menghapus stok polufabrikat (rusak/kadaluarsa)
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-delete">
              <v-list-item-title>
                <strong>Write-off Product</strong>
                - Menghapus stok produk mentah
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-alert type="info" variant="tonal" density="compact" class="mb-4">
        <strong>Tips:</strong>
        Layar ini menampilkan 3 tab utama: Production Schedule (jadwal produksi), Stock List (daftar
        stok), dan History (riwayat aktivitas).
      </v-alert>
    </section>

    <v-divider class="my-6" />

    <!-- Section 2: New Production -->
    <section id="new-production" class="guide-section">
      <div class="section-header">
        <v-icon color="green" class="mr-2">mdi-numeric-2-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Menambah Produksi Baru</h2>
      </div>

      <p class="text-body-1 mb-4">
        Gunakan dialog ini untuk mencatat produksi polufabrikat (bahan semi-jadi) seperti saus,
        potongan daging, sayuran yang sudah disiapkan, dll.
      </p>

      <v-card class="screenshot-card mb-4">
        <v-img :src="newProductionDialog" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="green" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Langkah-langkah:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item prepend-icon="mdi-numeric-1-circle-outline">
              <v-list-item-title>
                Klik tombol
                <strong>"New Production"</strong>
                (warna hijau)
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-2-circle-outline">
              <v-list-item-title>Pilih jenis polufabrikat dari dropdown</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-3-circle-outline">
              <v-list-item-title>Masukkan jumlah yang diproduksi</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-4-circle-outline">
              <v-list-item-title>Sistem akan menghitung estimasi biaya otomatis</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-5-circle-outline">
              <v-list-item-title>
                Klik
                <strong>"Confirm Production"</strong>
                untuk menyimpan
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-card class="screenshot-card">
            <v-img :src="newProductionDropdown" max-height="300" contain class="bg-grey-darken-4" />
            <v-card-text class="text-center text-caption">Dropdown daftar polufabrikat</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="screenshot-card">
            <v-img :src="newProductionFilled" max-height="300" contain class="bg-grey-darken-4" />
            <v-card-text class="text-center text-caption">
              Form yang sudah diisi dengan estimasi biaya
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-alert type="success" variant="tonal" density="compact" class="mb-4">
        <strong>Contoh:</strong>
        Avocado cleaned, 100 gr = Estimasi Rp 5.840
      </v-alert>
    </section>

    <v-divider class="my-6" />

    <!-- Section 3: Write-off Prep -->
    <section id="writeoff-prep" class="guide-section">
      <div class="section-header">
        <v-icon color="orange" class="mr-2">mdi-numeric-3-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Menghapus Stok Polufabrikat (Write-off Prep)</h2>
      </div>

      <p class="text-body-1 mb-4">
        Gunakan fitur ini ketika polufabrikat rusak, kadaluarsa, atau perlu dihapus dari stok.
        Setiap penghapusan akan tercatat dalam laporan KPI.
      </p>

      <v-card class="screenshot-card mb-4">
        <v-img :src="writeoffPrepDialog" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="orange" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Cara Menggunakan:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item prepend-icon="mdi-numeric-1-circle-outline">
              <v-list-item-title>
                Klik tombol
                <strong>"Write-off Prep"</strong>
                (warna oranye)
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-2-circle-outline">
              <v-list-item-title>
                Pilih
                <strong>alasan penghapusan</strong>
                (Expired, Damaged, Training, Other)
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-3-circle-outline">
              <v-list-item-title>
                Gunakan
                <strong>pencarian</strong>
                untuk menemukan item
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-4-circle-outline">
              <v-list-item-title>
                Filter berdasarkan
                <strong>lokasi penyimpanan</strong>
                (Fridge, Shelf, Freezer)
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-5-circle-outline">
              <v-list-item-title>
                Klik item yang ingin dihapus dan masukkan jumlah
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-table density="compact" class="mb-4">
        <thead>
          <tr>
            <th>Alasan</th>
            <th>Keterangan</th>
            <th>Dampak KPI</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Expired</strong></td>
            <td>Bahan sudah melewati tanggal kadaluarsa</td>
            <td class="text-error">Mempengaruhi KPI</td>
          </tr>
          <tr>
            <td><strong>Damaged</strong></td>
            <td>Bahan rusak (terjatuh, tumpah, dll)</td>
            <td class="text-error">Mempengaruhi KPI</td>
          </tr>
          <tr>
            <td><strong>Training</strong></td>
            <td>Digunakan untuk pelatihan karyawan</td>
            <td class="text-success">Tidak mempengaruhi KPI</td>
          </tr>
          <tr>
            <td><strong>Other</strong></td>
            <td>Alasan lainnya</td>
            <td class="text-warning">Tergantung pengaturan</td>
          </tr>
        </tbody>
      </v-table>
    </section>

    <v-divider class="my-6" />

    <!-- Section 4: Write-off Product -->
    <section id="writeoff-product" class="guide-section">
      <div class="section-header">
        <v-icon color="red" class="mr-2">mdi-numeric-4-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Menghapus Stok Produk Mentah (Write-off Product)</h2>
      </div>

      <p class="text-body-1 mb-4">
        Berbeda dengan Write-off Prep, fitur ini digunakan untuk menghapus produk mentah langsung
        dari gudang (bukan polufabrikat).
      </p>

      <v-card class="screenshot-card mb-4">
        <v-img :src="writeoffProductDialog" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="red" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            Perbedaan Write-off Prep vs Product:
          </h3>
          <v-table density="compact" class="bg-transparent">
            <thead>
              <tr>
                <th>Aspek</th>
                <th>Write-off Prep</th>
                <th>Write-off Product</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Target</strong></td>
                <td>Polufabrikat (semi-jadi)</td>
                <td>Produk mentah dari gudang</td>
              </tr>
              <tr>
                <td><strong>Contoh</strong></td>
                <td>Saus, potongan daging siap masak</td>
                <td>Sayuran, daging mentah, bumbu</td>
              </tr>
              <tr>
                <td><strong>Lokasi Stok</strong></td>
                <td>Kitchen prep area</td>
                <td>Storage/Gudang</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </section>

    <v-divider class="my-6" />

    <!-- Section 5: Stock List -->
    <section id="stock-list" class="guide-section">
      <div class="section-header">
        <v-icon color="purple" class="mr-2">mdi-numeric-5-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Tab Daftar Stok (Stock List)</h2>
      </div>

      <p class="text-body-1 mb-4">
        Tab ini menampilkan semua polufabrikat beserta status stoknya secara real-time.
      </p>

      <v-card class="screenshot-card mb-4">
        <v-img :src="stockListTab" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="purple" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Penjelasan Status:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item>
              <template #prepend>
                <v-chip size="small" color="error" class="mr-2">Expiring</v-chip>
              </template>
              <v-list-item-title>
                Stok akan segera kadaluarsa (perlu digunakan segera)
              </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-chip size="small" color="error" variant="outlined" class="mr-2">OUT</v-chip>
              </template>
              <v-list-item-title>Stok habis (OUT OF STOCK)</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-chip size="small" color="warning" class="mr-2">Low</v-chip>
              </template>
              <v-list-item-title>Stok rendah (perlu segera diproduksi)</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-chip size="small" color="success" class="mr-2">OK</v-chip>
              </template>
              <v-list-item-title>Stok mencukupi</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-alert type="info" variant="tonal" density="compact" class="mb-4">
        <strong>Tips:</strong>
        Gunakan filter lokasi (Fridge, Shelf, Freezer) dan filter status (Low, Expiring) untuk
        menemukan item yang perlu perhatian segera.
      </v-alert>

      <v-card variant="outlined" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Tombol Aksi Cepat:</h3>
          <div class="d-flex gap-4 flex-wrap">
            <div class="d-flex align-center">
              <v-btn icon size="small" color="green" class="mr-2">
                <v-icon>mdi-plus-thick</v-icon>
              </v-btn>
              <span>
                <strong>Produce</strong>
                - Langsung tambah produksi item ini
              </span>
            </div>
            <div class="d-flex align-center">
              <v-btn icon size="small" color="red" class="mr-2">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
              <span>
                <strong>Write-off</strong>
                - Langsung hapus stok item ini
              </span>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </section>

    <v-divider class="my-6" />

    <!-- Section 6: History -->
    <section id="history" class="guide-section">
      <div class="section-header">
        <v-icon color="cyan" class="mr-2">mdi-numeric-6-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Tab Riwayat (History)</h2>
      </div>

      <p class="text-body-1 mb-4">
        Tab ini menampilkan semua aktivitas produksi dan penghapusan hari ini.
      </p>

      <v-card class="screenshot-card mb-4">
        <v-img :src="historyTab" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="cyan" class="mb-4">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Informasi yang Ditampilkan:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item prepend-icon="mdi-chart-bar">
              <v-list-item-title>
                <strong>Ringkasan</strong>
                - Total operasi, jumlah produksi, jumlah write-off
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-filter">
              <v-list-item-title>
                <strong>Filter</strong>
                - All, Productions only, Write-offs only
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-clock">
              <v-list-item-title>
                <strong>Waktu</strong>
                - Jam operasi dilakukan
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-account">
              <v-list-item-title>
                <strong>Operator</strong>
                - Siapa yang melakukan operasi
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-tag">
              <v-list-item-title>
                <strong>Label</strong>
                - KPI/Non-KPI, Urgent, dll
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
        <strong>Catatan:</strong>
        Riwayat hanya menampilkan aktivitas hari ini. Untuk laporan lengkap, gunakan menu Reports di
        Backoffice.
      </v-alert>
    </section>

    <v-divider class="my-6" />

    <!-- Quick Reference -->
    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
        Referensi Cepat
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Aksi</th>
              <th>Tombol</th>
              <th>Kapan Digunakan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tambah produksi</td>
              <td><v-chip size="small" color="green">New Production</v-chip></td>
              <td>Setelah membuat polufabrikat baru</td>
            </tr>
            <tr>
              <td>Hapus polufabrikat</td>
              <td><v-chip size="small" color="orange">Write-off Prep</v-chip></td>
              <td>Polufabrikat rusak/kadaluarsa</td>
            </tr>
            <tr>
              <td>Hapus produk mentah</td>
              <td><v-chip size="small" color="red">Write-off Product</v-chip></td>
              <td>Bahan mentah dari gudang rusak</td>
            </tr>
            <tr>
              <td>Lihat stok</td>
              <td><v-chip size="small" color="purple">Stock List</v-chip></td>
              <td>Cek status stok saat ini</td>
            </tr>
            <tr>
              <td>Lihat aktivitas</td>
              <td><v-chip size="small" color="cyan">History</v-chip></td>
              <td>Review aktivitas hari ini</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.guide {
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
}
</style>
