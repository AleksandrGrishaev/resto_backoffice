<script setup lang="ts">
// Screenshots - Recipes Main Page
import recipesMainImg from '@/help/assets/screenshots/backoffice/recipes/recipes_01_main.png'
import recipesListWithCostImg from '@/help/assets/screenshots/backoffice/recipes/recipes_02_list_with_cost.png'
import preparationsTabImg from '@/help/assets/screenshots/backoffice/recipes/recipes_03_preparations_tab.png'
import preparationsExpandedImg from '@/help/assets/screenshots/backoffice/recipes/recipes_04_preparations_expanded.png'
import quickViewImg from '@/help/assets/screenshots/backoffice/recipes/recipes_05_quick_view.png'
import editRecipeImg from '@/help/assets/screenshots/backoffice/recipes/recipes_06_edit_recipe.png'
</script>

<template>
  <div class="recipes-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="deep-purple" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-book-open-page-variant</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Resep & Polufabrikaty</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk mengelola resep, semi-finished products, dan kalkulasi biaya
        </p>
      </div>
    </div>

    <!-- Overview -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Fitur Utama:</strong>
      <ol class="mt-2 mb-0">
        <li>
          <strong>Recipes</strong>
          - Resep hidangan lengkap untuk menu restoran
        </li>
        <li>
          <strong>Preparations</strong>
          - Semi-finished products (polufabrikaty) yang digunakan dalam resep
        </li>
        <li>
          <strong>Cost Calculation</strong>
          - Kalkulasi biaya otomatis berdasarkan komponen
        </li>
        <li>
          <strong>Quick View</strong>
          - Preview resep dengan detail komponen dan biaya
        </li>
      </ol>
    </v-alert>

    <!-- Key Concept -->
    <v-alert type="warning" variant="tonal" class="mb-6">
      <v-icon class="mr-2">mdi-lightbulb</v-icon>
      <strong>Konsep Penting:</strong>
      <p class="mt-2 mb-0">
        <strong>Recipes</strong>
        adalah hidangan final yang dijual ke pelanggan.
        <strong>Preparations</strong>
        (polufabrikaty) adalah komponen yang disiapkan terlebih dahulu dan digunakan dalam beberapa
        resep. Contoh: Sauce Hollandaise bisa digunakan di berbagai hidangan breakfast.
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
            <v-list-item-title>Ikhtisar Halaman Resep</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-2-circle" href="#recipes">
            <v-list-item-title>Recipes (Resep Hidangan)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-3-circle" href="#preparations">
            <v-list-item-title>Preparations (Semi-Finished Products)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-4-circle" href="#costing">
            <v-list-item-title>Kalkulasi Biaya & Margin</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-5-circle" href="#edit">
            <v-list-item-title>Membuat & Edit Resep</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- ==================== SECTION 1: OVERVIEW ==================== -->
    <section id="overview" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-deep-purple-darken-3">
          <v-icon color="white" class="mr-2">mdi-view-dashboard</v-icon>
          <span class="text-white">1. Ikhtisar Halaman Resep</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Halaman Recipes & Preparations adalah pusat manajemen semua resep dan polufabrikaty di
            restoran Anda. Di sini Anda dapat melihat, membuat, dan mengelola semua item.
          </p>

          <!-- Main Screen Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-monitor</v-icon>
            Halaman Utama
          </h4>

          <v-img :src="recipesMainImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="deep-purple">mdi-tab</v-icon>
                  Tab Navigation
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>RECIPES (83)</strong>
                      - Semua resep hidangan
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>PREPARATIONS (65)</strong>
                      - Semi-finished products
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-filter</v-icon>
                  Filters & Department
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Department</strong>
                      - Filter by Kitchen atau Bar
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - Active, Archive, atau All
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Tombol Aksi:</strong>
            <v-row class="mt-2">
              <v-col cols="6" md="4">
                <v-chip color="grey" variant="flat" size="small">
                  <v-icon start size="16">mdi-file-pdf-box</v-icon>
                  EXPORT PDF
                </v-chip>
                <p class="text-caption mt-1">Export semua resep ke PDF</p>
              </v-col>
              <v-col cols="6" md="4">
                <v-chip color="deep-purple" variant="flat" size="small">
                  <v-icon start size="16">mdi-plus</v-icon>
                  NEW RECIPE
                </v-chip>
                <p class="text-caption mt-1">Buat resep baru</p>
              </v-col>
              <v-col cols="6" md="4">
                <v-chip color="grey" variant="flat" size="small">
                  <v-icon start size="16">mdi-arrow-collapse-vertical</v-icon>
                  COLLAPSE ALL
                </v-chip>
                <p class="text-caption mt-1">Tutup semua kategori</p>
              </v-col>
            </v-row>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 2: RECIPES ==================== -->
    <section id="recipes" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-purple-darken-3">
          <v-icon color="white" class="mr-2">mdi-book-open-page-variant</v-icon>
          <span class="text-white">2. Recipes (Resep Hidangan)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Tab Recipes menampilkan semua resep hidangan yang dikelompokkan berdasarkan kategori.
            Setiap resep menampilkan informasi penting seperti biaya, waktu persiapan, dan jumlah
            komponen.
          </p>

          <!-- Recipe List with Cost -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-format-list-bulleted</v-icon>
            Daftar Resep dengan Informasi Biaya
          </h4>

          <v-img :src="recipesListWithCostImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-currency-usd</v-icon>
                  Informasi Biaya
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Total Cost</strong>
                      - Biaya total semua komponen (Rp 28.907)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Per Portion</strong>
                      - Biaya per porsi
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Fresh</strong>
                      - Status kalkulasi (Fresh = baru dihitung)
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-clock-outline</v-icon>
                  Informasi Waktu
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Prep Time</strong>
                      - Waktu persiapan (15m prep)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Cook Time</strong>
                      - Waktu memasak (10m cook)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Difficulty</strong>
                      - Easy, Medium, Hard
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="warning" variant="tonal" class="mb-4">
            <v-icon class="mr-2">mdi-alert</v-icon>
            <strong>Uncalculated Components:</strong>
            Jika ada komponen dengan biaya tidak terhitung, akan muncul badge
            <v-chip size="x-small" color="warning">1 uncalculated</v-chip>
            . Klik tombol "Calculate recipe cost" untuk menghitung ulang.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 3: PREPARATIONS ==================== -->
    <section id="preparations" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-teal-darken-3">
          <v-icon color="white" class="mr-2">mdi-food-variant</v-icon>
          <span class="text-white">3. Preparations (Semi-Finished Products)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Preparations atau polufabrikaty adalah komponen yang disiapkan terlebih dahulu dan dapat
            digunakan dalam beberapa resep. Contoh: sauce, marinade, dough, pre-cut vegetables.
          </p>

          <!-- Preparations Tab -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-view-list</v-icon>
            Tab Preparations
          </h4>

          <v-img :src="preparationsTabImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="amber">mdi-pot-mix</v-icon>
                  Sauces & Dressings
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Sauce, dressing, dan bumbu siap pakai. Contoh: Hollandaise, Black pepper sauce.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="red">mdi-food-steak</v-icon>
                  Meat/Seafood Portions
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Potongan daging dan seafood siap masak. Contoh: Salmon portion, Beef patty.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-leaf</v-icon>
                  Vegetable Preps
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Sayuran yang sudah dipotong atau disiapkan. Contoh: Diced onion, Tomato concasse.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Preparations Expanded -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-chevron-down</v-icon>
            Detail Preparation
          </h4>

          <v-img :src="preparationsExpandedImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Informasi Preparation:</strong>
            <v-list density="compact" class="pa-0 mt-2">
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="blue" class="mr-2">mdi-package-variant</v-icon>
                </template>
                <v-list-item-subtitle>
                  <strong>Output</strong>
                  - Hasil produksi (70 ml, 400 ml, dll)
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="orange" class="mr-2">mdi-clock-outline</v-icon>
                </template>
                <v-list-item-subtitle>
                  <strong>Shelf Life</strong>
                  - Masa simpan (1-5 days)
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="green" class="mr-2">mdi-currency-usd</v-icon>
                </template>
                <v-list-item-subtitle>
                  <strong>Cost per Unit</strong>
                  - Biaya per satuan (Rp 57/ml, Rp 151/ml)
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 4: COSTING ==================== -->
    <section id="costing" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-green-darken-3">
          <v-icon color="white" class="mr-2">mdi-calculator</v-icon>
          <span class="text-white">4. Kalkulasi Biaya & Margin</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Sistem menghitung biaya resep secara otomatis berdasarkan harga komponen (products dan
            preparations). Quick View menampilkan detail lengkap breakdown biaya.
          </p>

          <!-- Quick View Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-eye</v-icon>
            Quick View - Detail Biaya
          </h4>

          <v-img :src="quickViewImg" class="rounded-lg mb-4 border" max-height="550" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-cash</v-icon>
                  Cost Information
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Total Cost</strong>
                      - Rp 3.988 (total semua komponen)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Cost per Unit</strong>
                      - Rp 57/ml (biaya per satuan output)
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="purple">mdi-format-list-numbered</v-icon>
                  Recipe Components
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Products</strong>
                      - Bahan baku (Black pepper, Vinegar)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Preparations</strong>
                      - Polufabrikaty yang digunakan
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Cara Kerja Kalkulasi:</strong>
            <ol class="mt-2 mb-0">
              <li>Sistem mengambil harga per unit dari setiap komponen (product/preparation)</li>
              <li>Dikalikan dengan jumlah yang digunakan dalam resep</li>
              <li>Total Cost = Sum of (quantity × unit price) untuk semua komponen</li>
              <li>Cost per Unit = Total Cost / Output quantity</li>
            </ol>
          </v-alert>

          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="tonal" color="green" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-percent</v-icon>
                  Contoh Breakdown Biaya
                </h5>
                <v-table density="compact" class="rounded">
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th>Qty</th>
                      <th>Price/Unit</th>
                      <th>Total</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Black pepper crash</td>
                      <td>8g</td>
                      <td>Rp 85/g</td>
                      <td>Rp 680</td>
                      <td>17.1%</td>
                    </tr>
                    <tr>
                      <td>Balzamic vinegar</td>
                      <td>2ml</td>
                      <td>Rp 174/ml</td>
                      <td>Rp 348</td>
                      <td>8.7%</td>
                    </tr>
                    <tr>
                      <td>Water cleo</td>
                      <td>70ml</td>
                      <td>Rp 1/ml</td>
                      <td>Rp 70</td>
                      <td>1.8%</td>
                    </tr>
                    <tr>
                      <td>Demi glass KNOR</td>
                      <td>17g</td>
                      <td>Rp 170/g</td>
                      <td>Rp 2.890</td>
                      <td>72.5%</td>
                    </tr>
                    <tr class="font-weight-bold">
                      <td colspan="3">Total</td>
                      <td>Rp 3.988</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 5: EDIT RECIPE ==================== -->
    <section id="edit" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-blue-darken-3">
          <v-icon color="white" class="mr-2">mdi-pencil</v-icon>
          <span class="text-white">5. Membuat & Edit Resep</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Untuk membuat resep baru, klik tombol "NEW RECIPE" atau "NEW PREPARATION". Untuk
            mengedit, klik menu (3-dot) pada resep dan pilih "Edit".
          </p>

          <!-- Edit Recipe Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-form-textbox</v-icon>
            Dialog Edit Recipe
          </h4>

          <v-img :src="editRecipeImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-information</v-icon>
                  Informasi Dasar
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Name</strong>
                      - Nama resep (Required)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Code</strong>
                      - Kode unik resep (R-13)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Description</strong>
                      - Deskripsi opsional
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-tag-multiple</v-icon>
                  Klasifikasi
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Category</strong>
                      - Kategori resep (Steaks, Breakfast, dll)
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
                      <strong>Difficulty</strong>
                      - Easy, Medium, Hard
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-package-variant</v-icon>
                  Output
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Portion Size</strong>
                      - Ukuran porsi (1, 2, dll)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Portion Unit</strong>
                      - Satuan (piece, gram, ml)
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="purple">mdi-clock</v-icon>
                  Waktu
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Prep Time</strong>
                      - Waktu persiapan (menit)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Cook Time</strong>
                      - Waktu memasak (menit)
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Langkah Membuat Resep:</strong>
            <ol class="mt-2 mb-0">
              <li>Klik "NEW RECIPE" atau "NEW PREPARATION"</li>
              <li>Isi informasi dasar (Name, Code, Category, Department)</li>
              <li>Tentukan Portion Size dan Unit</li>
              <li>Set waktu Prep Time dan Cook Time</li>
              <li>Pilih Difficulty level</li>
              <li>Klik "CREATE" untuk menyimpan</li>
              <li>
                Setelah dibuat, tambahkan komponen (Products/Preparations) melalui Quick View atau
                Edit
              </li>
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
              <v-icon color="deep-purple" class="mr-2">mdi-book-open-page-variant</v-icon>
            </template>
            <v-list-item-title>Recipes</v-list-item-title>
            <v-list-item-subtitle>
              Hidangan final dengan komponen dan biaya otomatis
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="teal" class="mr-2">mdi-food-variant</v-icon>
            </template>
            <v-list-item-title>Preparations</v-list-item-title>
            <v-list-item-subtitle>
              Semi-finished products dengan shelf life dan output
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="green" class="mr-2">mdi-calculator</v-icon>
            </template>
            <v-list-item-title>Cost Calculation</v-list-item-title>
            <v-list-item-subtitle>
              Kalkulasi otomatis dengan breakdown per komponen
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="blue" class="mr-2">mdi-eye</v-icon>
            </template>
            <v-list-item-title>Quick View</v-list-item-title>
            <v-list-item-subtitle>
              Preview lengkap dengan opsi recalculate dan edit
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.recipes-guide {
  max-width: 1000px;
  margin: 0 auto;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
