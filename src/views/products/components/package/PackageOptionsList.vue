<template>
  <div class="package-options-list">
    <div class="d-flex justify-space-between align-center mb-3">
      <h4>Packages</h4>
      <v-btn size="small" color="primary" variant="outlined" @click="$emit('add-package')">
        <v-icon start>mdi-plus</v-icon>
        Add Package
      </v-btn>
    </div>

    <div v-if="!packageOptions.length" class="text-center text-grey py-4">No packages</div>

    <div v-else>
      <v-card
        v-for="pkg in packageOptions"
        :key="pkg.id"
        class="mb-2"
        variant="outlined"
        :color="pkg.id === recommendedPackageId ? 'primary' : undefined"
      >
        <v-card-text class="py-2">
          <div class="d-flex justify-space-between align-center">
            <div class="flex-grow-1">
              <div class="d-flex align-center gap-2">
                <strong>{{ pkg.packageName }}</strong>
                <v-chip v-if="pkg.brandName" size="x-small" color="info" variant="tonal">
                  {{ pkg.brandName }}
                </v-chip>
                <v-chip
                  v-if="pkg.id === recommendedPackageId"
                  size="x-small"
                  color="success"
                  variant="tonal"
                >
                  Recommended
                </v-chip>
                <v-chip v-if="!pkg.isActive" size="x-small" color="error" variant="tonal">
                  Inactive
                </v-chip>
              </div>

              <div class="text-body-2 text-grey-darken-1 mt-1">
                {{ pkg.packageSize }} {{ baseUnit }}
                <span v-if="pkg.packagePrice">
                  • {{ formatPrice(pkg.packagePrice) }} per package
                </span>
                • {{ formatPrice(pkg.baseCostPerUnit) }}/{{ baseUnit }}
              </div>

              <div v-if="pkg.notes" class="text-caption text-grey-darken-2 mt-1">
                {{ pkg.notes }}
              </div>
            </div>

            <div class="d-flex align-center gap-1">
              <v-btn
                v-if="pkg.id !== recommendedPackageId"
                size="x-small"
                variant="text"
                color="success"
                @click="$emit('set-recommended', pkg.id)"
              >
                <v-icon>mdi-star-outline</v-icon>
              </v-btn>

              <v-btn
                size="x-small"
                variant="text"
                color="primary"
                @click="$emit('edit-package', pkg)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>

              <v-btn
                v-if="packageOptions.length > 1"
                size="x-small"
                variant="text"
                color="error"
                @click="$emit('delete-package', pkg.id)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PackageOption } from '@/stores/productsStore/types'

interface Props {
  packageOptions: PackageOption[]
  recommendedPackageId?: string
  baseUnit: string
}

interface Emits {
  (e: 'add-package'): void
  (e: 'edit-package', pkg: PackageOption): void
  (e: 'delete-package', packageId: string): void
  (e: 'set-recommended', packageId: string): void
}

defineProps<Props>()
defineEmits<Emits>()

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}
</script>

<style scoped>
.package-options-list {
  min-height: 200px;
}
</style>
