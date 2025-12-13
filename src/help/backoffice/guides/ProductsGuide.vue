<script setup lang="ts">
// Screenshots - Products
import productsMainImg from '@/help/assets/screenshots/backoffice/products/products_01_main.png'
import productsDetailsYieldImg from '@/help/assets/screenshots/backoffice/products/products_02_details_yield.png'
import productsUsageImg from '@/help/assets/screenshots/backoffice/products/products_03_usage.png'
import productsUsageRecipesImg from '@/help/assets/screenshots/backoffice/products/products_04_usage_recipes.png'
import productsUsagePreparationsImg from '@/help/assets/screenshots/backoffice/products/products_05_usage_preparations.png'
</script>

<template>
  <div class="products-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="primary" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-package-variant</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Produk</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk mengelola produk, bahan baku, dan kalkulasi biaya
        </p>
      </div>
    </div>

    <!-- Overview -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Fitur Utama:</strong>
      <ol class="mt-2 mb-0">
        <li>
          <strong>Katalog Produk</strong>
          - Daftar semua bahan baku dan produk jadi
        </li>
        <li>
          <strong>Yield Percentage</strong>
          - Persentase hasil setelah pengolahan
        </li>
        <li>
          <strong>Cost Analysis</strong>
          - Kalkulasi biaya efektif berdasarkan yield
        </li>
        <li>
          <strong>Usage Tracking</strong>
          - Melihat di mana produk digunakan (resep, preparasi)
        </li>
      </ol>
    </v-alert>

    <!-- Key Concept -->
    <v-alert type="warning" variant="tonal" class="mb-6">
      <v-icon class="mr-2">mdi-lightbulb</v-icon>
      <strong>Konsep Penting - Yield Percentage:</strong>
      <p class="mt-2 mb-0">
        <strong>Yield</strong>
        adalah persentase produk yang dapat digunakan setelah pengolahan. Contoh: Avocado dengan
        yield 75% berarti dari 100g avocado mentah, hanya 75g yang bisa digunakan (sisanya kulit dan
        biji). Sistem menghitung
        <strong>Effective Cost</strong>
        = Unit Cost / Yield%.
      </p>
    </v-alert>

    <!-- Table of Contents -->
    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        Daftar Isi
      </v-card-title>
      <v-card-text>
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-numeric-1-circle" href="#overview">
            <v-list-item-title>Ikhtisar Halaman Products</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-2-circle" href="#details">
            <v-list-item-title>Detail Produk & Yield</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-3-circle" href="#cost">
            <v-list-item-title>Cost Analysis</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-4-circle" href="#usage">
            <v-list-item-title>Usage Tracking</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- ==================== SECTION 1: OVERVIEW ==================== -->
    <section id="overview" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-primary">
          <v-icon color="white" class="mr-2">mdi-view-dashboard</v-icon>
          <span class="text-white">1. Ikhtisar Halaman Products</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Halaman Products adalah katalog semua bahan baku dan produk yang digunakan di restoran.
            Setiap produk memiliki informasi lengkap termasuk kategori, departemen, unit, cost, dan
            yield.
          </p>

          <!-- Main Screen Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-monitor</v-icon>
            Halaman Utama
          </h4>

          <v-img :src="productsMainImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="primary">mdi-filter</v-icon>
                  Filter & Search
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Search</strong>
                      - Cari produk berdasarkan nama
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Category</strong>
                      - Filter by Vegetables, Meat, Beverages, dll
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Department</strong>
                      - Kitchen atau Bar
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - Active atau Inactive
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-table</v-icon>
                  Kolom Tabel
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Name</strong>
                      - Nama produk
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Category</strong>
                      - Kategori produk (warna-coded)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Unit/Cost</strong>
                      - Satuan dan harga per unit
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>% (Yield)</strong>
                      - Persentase hasil pengolahan
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Aksi pada Produk:</strong>
            <v-row class="mt-2">
              <v-col cols="4">
                <v-chip color="info" variant="flat" size="small">
                  <v-icon start size="16">mdi-eye</v-icon>
                  View
                </v-chip>
                <p class="text-caption mt-1">Lihat detail lengkap produk</p>
              </v-col>
              <v-col cols="4">
                <v-chip color="primary" variant="flat" size="small">
                  <v-icon start size="16">mdi-pencil</v-icon>
                  Edit
                </v-chip>
                <p class="text-caption mt-1">Edit informasi produk</p>
              </v-col>
              <v-col cols="4">
                <v-chip color="warning" variant="flat" size="small">
                  <v-icon start size="16">mdi-pause</v-icon>
                  Deactivate
                </v-chip>
                <p class="text-caption mt-1">Nonaktifkan produk</p>
              </v-col>
            </v-row>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 2: DETAILS & YIELD ==================== -->
    <section id="details" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-orange-darken-3">
          <v-icon color="white" class="mr-2">mdi-information</v-icon>
          <span class="text-white">2. Detail Produk & Yield</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Klik ikon
            <v-icon size="18">mdi-eye</v-icon>
            pada produk untuk melihat detail lengkap. Dialog menampilkan semua informasi termasuk
            yield percentage dan effective cost.
          </p>

          <!-- Product Details Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-card-text</v-icon>
            Dialog Product Details
          </h4>

          <v-img :src="productsDetailsYieldImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="primary">mdi-tag-multiple</v-icon>
                  Header Tags
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <v-chip size="x-small" color="green" class="mr-1">Vegetables</v-chip>
                      Kategori produk
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <v-chip size="x-small" color="success" class="mr-1">Kitchen</v-chip>
                      Departemen penggunaan
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <v-chip size="x-small" color="orange" class="mr-1">Raw Material</v-chip>
                      Bahan baku (tidak dijual langsung)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <v-chip size="x-small" color="warning" class="mr-1">Yield: 75%</v-chip>
                      Persentase hasil pengolahan
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-clipboard-list</v-icon>
                  Basic Parameters
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Measurement Unit</strong>
                      - Gram, ml, pcs, dll
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Unit Cost</strong>
                      - Harga per unit (Rp 43,8/g)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Yield Percentage</strong>
                      - 75% (hasil setelah olah)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Minimum Stock</strong>
                      - Stok minimum (1500g)
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="warning" variant="tonal" class="mb-4">
            <v-icon class="mr-2">mdi-percent</v-icon>
            <strong>Memahami Yield Percentage:</strong>
            <p class="mt-2 mb-0">
              Yield 75% pada Avocado berarti:
              <br />
              - Dari 100g avocado mentah, 75g dapat digunakan
              <br />
              - 25g adalah waste (kulit, biji)
              <br />
              - Ini mempengaruhi kalkulasi biaya efektif
            </p>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 3: COST ANALYSIS ==================== -->
    <section id="cost" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-green-darken-3">
          <v-icon color="white" class="mr-2">mdi-calculator</v-icon>
          <span class="text-white">3. Cost Analysis</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Sistem menghitung biaya efektif berdasarkan yield percentage. Ini penting untuk
            kalkulasi food cost yang akurat.
          </p>

          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="tonal" color="green" class="pa-4">
                <h5 class="text-subtitle-2 font-weight-medium mb-3">
                  <v-icon size="18" class="mr-1">mdi-calculator-variant</v-icon>
                  Contoh Kalkulasi - Avocado
                </h5>
                <v-table density="compact" class="rounded">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Nilai</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Unit Cost</strong></td>
                      <td>Rp 43,8/gram</td>
                      <td>Harga beli per gram avocado mentah</td>
                    </tr>
                    <tr>
                      <td><strong>Yield</strong></td>
                      <td>75%</td>
                      <td>Hanya 75% yang bisa digunakan</td>
                    </tr>
                    <tr>
                      <td><strong>Effective Cost</strong></td>
                      <td>Rp 58,4/gram</td>
                      <td>= 43,8 / 0.75 = biaya per gram yang usable</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Mengapa Effective Cost Penting?</strong>
            <p class="mt-2 mb-0">
              Ketika menghitung food cost untuk resep, sistem menggunakan
              <strong>Effective Cost</strong>
              bukan Unit Cost. Ini memastikan kalkulasi biaya yang akurat dengan memperhitungkan
              waste.
            </p>
          </v-alert>

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-success font-weight-bold">Rp 43,8</div>
                <div class="text-caption">Price per Gram</div>
                <div class="text-caption text-medium-emphasis">Harga pembelian</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-info font-weight-bold">Rp 58,4</div>
                <div class="text-caption">Effective Cost</div>
                <div class="text-caption text-medium-emphasis">Setelah yield 75%</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-warning font-weight-bold">75%</div>
                <div class="text-caption">Product Yield</div>
                <div class="text-caption text-medium-emphasis">Bagian yang usable</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 4: USAGE TRACKING ==================== -->
    <section id="usage" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-purple-darken-3">
          <v-icon color="white" class="mr-2">mdi-sitemap</v-icon>
          <span class="text-white">4. Usage Tracking</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Tab "Usage" menampilkan di mana produk digunakan - dalam resep, preparasi, atau menu
            items. Ini membantu memahami dampak perubahan harga atau ketersediaan produk.
          </p>

          <!-- Usage Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-chart-bar</v-icon>
            Usage Overview
          </h4>

          <v-img :src="productsUsageImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-primary font-weight-bold">5</div>
                <div class="text-caption">Recipes</div>
                <div class="text-caption text-medium-emphasis">5 active</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-secondary font-weight-bold">1</div>
                <div class="text-caption">Preparations</div>
                <div class="text-caption text-medium-emphasis">1 active</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-success font-weight-bold">0</div>
                <div class="text-caption">Menu</div>
                <div class="text-caption text-medium-emphasis">Not for sale</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 text-info font-weight-bold">7793</div>
                <div class="text-caption">Per Day</div>
                <div class="text-caption text-medium-emphasis">Estimated usage</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Recipes List -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-chef-hat</v-icon>
            Daftar Resep yang Menggunakan Produk
          </h4>

          <v-img :src="productsUsageRecipesImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-card variant="outlined" class="pa-3 mb-4">
            <h5 class="text-subtitle-2 font-weight-medium mb-2">
              <v-icon size="18" class="mr-1" color="primary">mdi-format-list-bulleted</v-icon>
              Informasi per Resep
            </h5>
            <v-list density="compact" class="pa-0">
              <v-list-item class="px-0">
                <v-list-item-subtitle>
                  <strong>Nama Resep</strong>
                  - Croissant salmon, PokeTuna, Salmon ciabatta
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="px-0">
                <v-list-item-subtitle>
                  <strong>Quantity per Portion</strong>
                  - Jumlah produk yang digunakan per porsi (65g, 40g, 75g)
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="px-0">
                <v-list-item-subtitle>
                  <strong>Usage per Day</strong>
                  - Estimasi penggunaan harian berdasarkan penjualan
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- Preparations List -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-food-variant</v-icon>
            Daftar Preparasi yang Menggunakan Produk
          </h4>

          <v-img
            :src="productsUsagePreparationsImg"
            class="rounded-lg mb-4 border"
            max-height="450"
          />

          <v-alert type="warning" variant="tonal" class="mb-4">
            <v-icon class="mr-2">mdi-alert</v-icon>
            <strong>Peringatan Deaktivasi:</strong>
            <p class="mt-2 mb-0">
              "Product is used in 6 active items. Deactivation may affect dish availability."
              <br />
              Sistem memperingatkan jika produk yang akan dinonaktifkan masih digunakan di resep
              atau preparasi aktif.
            </p>
          </v-alert>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Manfaat Usage Tracking:</strong>
            <ol class="mt-2 mb-0">
              <li>Melihat dampak perubahan harga produk terhadap food cost</li>
              <li>Merencanakan pembelian berdasarkan kebutuhan</li>
              <li>Mengidentifikasi produk yang tidak terpakai</li>
              <li>Menghindari menghapus produk yang masih digunakan</li>
            </ol>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Summary -->
    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-check-circle</v-icon>
        Ringkasan
      </v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item>
            <template #prepend>
              <v-icon color="primary" class="mr-2">mdi-package-variant</v-icon>
            </template>
            <v-list-item-title>Katalog Produk</v-list-item-title>
            <v-list-item-subtitle>
              Daftar lengkap bahan baku dengan filter dan pencarian
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="orange" class="mr-2">mdi-percent</v-icon>
            </template>
            <v-list-item-title>Yield Percentage</v-list-item-title>
            <v-list-item-subtitle>
              Persentase hasil pengolahan untuk kalkulasi biaya akurat
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="green" class="mr-2">mdi-calculator</v-icon>
            </template>
            <v-list-item-title>Cost Analysis</v-list-item-title>
            <v-list-item-subtitle>Effective Cost = Unit Cost / Yield%</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="purple" class="mr-2">mdi-sitemap</v-icon>
            </template>
            <v-list-item-title>Usage Tracking</v-list-item-title>
            <v-list-item-subtitle>
              Lihat di mana produk digunakan (resep, preparasi, menu)
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.products-guide {
  max-width: 1000px;
  margin: 0 auto;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
