<!-- src/views/products/components/ProductDialog.vue -->
<template>
  <v-dialog v-model="localModelValue" max-width="800px" persistent scrollable>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">
          {{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}
        </v-icon>
        <span>{{ isEdit ? 'Edit Product' : 'New Product' }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-6">
        <v-form ref="formRef" v-model="formValid">
          <v-row>
            <!-- Product Name -->
            <v-col cols="12">
              <v-text-field
                v-model="formData.name"
                label="Product Name *"
                variant="outlined"
                :rules="nameRules"
                prepend-inner-icon="mdi-food"
                counter="100"
                maxlength="100"
                placeholder="Enter product name"
              />
            </v-col>

            <!-- ✅ ДОБАВИТЬ: Department Selection -->

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.usedInDepartments"
                :items="departmentOptions"
                label="Used in Departments *"
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                :rules="[v => (v && v.length > 0) || 'Select at least one department']"
                hint="Select where this product is used"
                persistent-hint
                class="mb-4"
              >
                <template #chip="{ item, props }">
                  <v-chip
                    v-bind="props"
                    :color="getDepartmentColor(item.value)"
                    :prepend-icon="getDepartmentIcon(item.value)"
                    size="small"
                  >
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>
            </v-col>

            <!-- Category and Base Unit -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.category"
                :items="categoryOptions"
                label="Category *"
                variant="outlined"
                :rules="categoryRules"
                prepend-inner-icon="mdi-tag"
                attach
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.baseUnit"
                :items="baseUnitOptions"
                label="Base Unit *"
                variant="outlined"
                :rules="baseUnitRules"
                prepend-inner-icon="mdi-scale"
                :hint="getBaseUnitHint()"
                persistent-hint
                attach
              />
            </v-col>

            <!-- Base Cost Per Unit -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.baseCostPerUnit"
                label="Base Cost Per Unit *"
                variant="outlined"
                type="number"
                :rules="costRules"
                prepend-inner-icon="mdi-currency-usd"
                suffix="IDR"
                min="0"
                step="1"
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props: tooltipProps }">
                      <v-icon v-bind="tooltipProps" color="info" size="small">
                        mdi-help-circle
                      </v-icon>
                    </template>
                    <div>
                      Purchase price per {{ getBaseUnitName() }}
                      <br />
                      (cost only, selling price is set in menu)
                    </div>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>

            <!-- Yield Percentage -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.yieldPercentage"
                label="Yield Percentage *"
                variant="outlined"
                type="number"
                :rules="yieldRules"
                prepend-inner-icon="mdi-percent"
                suffix="%"
                min="1"
                max="100"
                step="0.1"
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props: tooltipProps }">
                      <v-icon v-bind="tooltipProps" color="info" size="small">
                        mdi-help-circle
                      </v-icon>
                    </template>
                    <div>
                      Percentage of finished product after processing
                      <br />
                      (accounts for waste during cleaning, cutting, etc.)
                    </div>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>

            <!-- Can Be Sold Switch -->
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-switch
                v-model="formData.canBeSold"
                label="Can Be Sold"
                color="primary"
                hide-details
              />
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-icon v-bind="tooltipProps" color="info" size="small" class="ml-2">
                    mdi-help-circle
                  </v-icon>
                </template>
                <div>Enable if this product can be sold directly to customers</div>
              </v-tooltip>
            </v-col>

            <!-- Active Switch -->
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-switch
                v-model="formData.isActive"
                label="Active"
                color="success"
                :prepend-icon="formData.isActive ? 'mdi-check-circle' : 'mdi-pause-circle'"
                hide-details
              />
            </v-col>

            <!-- Description -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description"
                variant="outlined"
                rows="3"
                counter="500"
                maxlength="500"
                prepend-inner-icon="mdi-text"
                placeholder="Product description (optional)"
              />
            </v-col>

            <!-- Advanced Settings -->
            <v-col cols="12">
              <v-expansion-panels variant="accordion">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon start>mdi-cog</v-icon>
                    Additional Parameters
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row>
                      <!-- Storage Conditions -->
                      <v-col cols="12">
                        <v-text-field
                          v-model="formData.storageConditions"
                          label="Storage Conditions"
                          variant="outlined"
                          prepend-inner-icon="mdi-thermometer"
                          placeholder="E.g.: Refrigerator +2°C to +4°C"
                          counter="200"
                          maxlength="200"
                        />
                      </v-col>

                      <!-- Shelf Life -->
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="formData.shelfLife"
                          label="Shelf Life"
                          variant="outlined"
                          type="number"
                          prepend-inner-icon="mdi-calendar-clock"
                          suffix="days"
                          min="1"
                          placeholder="Number of days"
                        />
                      </v-col>

                      <!-- Minimum Stock -->
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="formData.minStock"
                          label="Minimum Stock"
                          variant="outlined"
                          type="number"
                          prepend-inner-icon="mdi-package-down"
                          :suffix="getBaseUnitName()"
                          min="0"
                          step="0.1"
                          placeholder="For notifications"
                        />
                      </v-col>
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>

            <!-- Package Options Section (for both create and edit) -->
            <v-col cols="12">
              <v-divider class="my-4" />

              <!-- Info alert for new products -->
              <v-alert v-if="!isEdit" type="info" variant="tonal" density="compact" class="mb-4">
                <v-icon start>mdi-information</v-icon>
                A default package will be created automatically. You can add more packages now or
                after creating the product.
              </v-alert>

              <!-- Local packages list -->
              <div class="packages-section">
                <div class="d-flex justify-space-between align-center mb-3">
                  <h4>Packages</h4>
                  <v-btn
                    size="small"
                    color="primary"
                    variant="outlined"
                    @click="openPackageDialog()"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Add Package
                  </v-btn>
                </div>

                <div v-if="!localPackageOptions.length" class="text-center text-grey py-4">
                  No additional packages. A default package will be created.
                </div>

                <div v-else>
                  <v-card
                    v-for="(pkg, index) in localPackageOptions"
                    :key="pkg.tempId || pkg.id"
                    class="mb-2"
                    variant="outlined"
                    :color="index === 0 ? 'primary' : undefined"
                  >
                    <v-card-text class="py-2">
                      <div class="d-flex justify-space-between align-center">
                        <div class="flex-grow-1">
                          <div class="d-flex align-center gap-2">
                            <strong>{{ pkg.packageName }}</strong>
                            <v-chip
                              v-if="pkg.brandName"
                              size="x-small"
                              color="info"
                              variant="tonal"
                            >
                              {{ pkg.brandName }}
                            </v-chip>
                            <v-chip
                              v-if="index === 0"
                              size="x-small"
                              color="success"
                              variant="tonal"
                            >
                              Default
                            </v-chip>
                          </div>

                          <div class="text-body-2 text-grey-darken-1 mt-1">
                            {{ pkg.packageSize }} {{ getBaseUnitName() }}
                            <span v-if="pkg.packagePrice">
                              • {{ formatPrice(pkg.packagePrice) }} per package
                            </span>
                            • {{ formatPrice(pkg.baseCostPerUnit) }}/{{ getBaseUnitName() }}
                          </div>

                          <div v-if="pkg.notes" class="text-caption text-grey-darken-2 mt-1">
                            {{ pkg.notes }}
                          </div>
                        </div>

                        <div class="d-flex align-center gap-1">
                          <v-btn
                            size="x-small"
                            variant="text"
                            color="primary"
                            @click="openPackageDialog(pkg, index)"
                          >
                            <v-icon>mdi-pencil</v-icon>
                          </v-btn>

                          <v-btn
                            size="x-small"
                            variant="text"
                            color="error"
                            @click="deleteLocalPackage(index)"
                          >
                            <v-icon>mdi-delete</v-icon>
                          </v-btn>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-divider />
      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid"
          @click="saveProduct"
        >
          {{ isEdit ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Package Dialog -->
    <PackageOptionDialog
      v-model="packageDialogOpen"
      :product-id="'temp'"
      :base-unit="getBaseUnitName()"
      :package="editingPackage"
      :product-base-cost="formData.baseCostPerUnit"
      :loading="false"
      @save="handleSaveLocalPackage"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductCategory,
  BaseUnit,
  PackageOption,
  CreatePackageOptionDto,
  UpdatePackageOptionDto,
  Department
} from '@/stores/productsStore/types'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import PackageOptionDialog from './package/PackageOptionDialog.vue'

const MODULE_NAME = 'ProductDialog'
const productsStore = useProductsStore()

// Props
interface Props {
  modelValue: boolean
  product?: Product | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
  loading: false
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: CreateProductData | UpdateProductData, packages: LocalPackage[]): void
}

const emit = defineEmits<Emits>()

// Local package type (with temporary ID)
interface LocalPackage extends Omit<PackageOption, 'id' | 'productId' | 'createdAt' | 'updatedAt'> {
  id?: string
  tempId?: string
  productId?: string
  createdAt?: string
  updatedAt?: string
}

// Refs
const formRef = ref()
const formValid = ref(false)
const packageDialogOpen = ref(false)
const editingPackage = ref<PackageOption | undefined>(undefined)
const editingPackageIndex = ref<number | null>(null)
const localPackageOptions = ref<LocalPackage[]>([])
const departmentOptions = [
  { value: 'kitchen' as Department, title: 'Kitchen' },
  { value: 'bar' as Department, title: 'Bar' }
]
// Computed
const localModelValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.product?.id)

// Form Data
const formData = ref<CreateProductData & { id?: string }>({
  name: '',
  category: '', // Will be set to first category or 'other' on mount
  baseUnit: 'gram' as BaseUnit,
  baseCostPerUnit: 0,
  yieldPercentage: 100,
  usedInDepartments: ['kitchen'],
  canBeSold: false,
  isActive: true,
  description: '',
  storageConditions: '',
  shelfLife: undefined,
  minStock: undefined
})

// ✅ UPDATED: Options from store
const categoryOptions = computed(() =>
  productsStore.activeCategories.map(cat => ({
    title: cat.name,
    value: cat.id
  }))
)

const baseUnitOptions = computed(() => [
  { title: 'Grams (for solid products)', value: 'gram' },
  { title: 'Milliliters (for liquids)', value: 'ml' },
  { title: 'Pieces (for countable items)', value: 'piece' }
])

// Validation Rules
const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length <= 100 || 'Name must not exceed 100 characters',
  (v: string) => v.trim().length >= 2 || 'Name must contain at least 2 characters'
]

const categoryRules = [(v: string) => !!v || 'Category is required']
const baseUnitRules = [(v: string) => !!v || 'Base unit is required']

const costRules = [
  (v: number) => (v !== null && v !== undefined) || 'Cost is required',
  (v: number) => v >= 0 || 'Cost cannot be negative',
  (v: number) => v <= 999999999 || 'Value too large'
]

const yieldRules = [
  (v: number) => (v !== null && v !== undefined) || 'Yield percentage is required',
  (v: number) => v >= 1 || 'Yield percentage must be greater than 0',
  (v: number) => v <= 100 || 'Yield percentage cannot exceed 100%'
]

// Methods
const resetForm = (): void => {
  formData.value = {
    name: '',
    category: 'other',
    baseUnit: 'gram',
    baseCostPerUnit: 0,
    yieldPercentage: 100,
    usedInDepartments: ['kitchen'],
    canBeSold: false,
    isActive: true,
    description: '',
    storageConditions: '',
    shelfLife: undefined,
    minStock: undefined
  }
  localPackageOptions.value = []
}

const getBaseUnitName = (): string => {
  const baseUnitNames = {
    gram: 'gram',
    ml: 'ml',
    piece: 'piece'
  }
  return baseUnitNames[formData.value.baseUnit] || formData.value.baseUnit
}

const getBaseUnitHint = (): string => {
  const hints = {
    gram: 'For solid products (meat, vegetables, spices)',
    ml: 'For liquid products (oil, milk, sauces)',
    piece: 'For countable items (bottles, cans, eggs)'
  }
  return hints[formData.value.baseUnit] || ''
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

// Watch product changes
watch(
  () => props.product,
  newProduct => {
    if (newProduct) {
      formData.value = {
        id: newProduct.id,
        name: newProduct.name,
        category: newProduct.category,
        baseUnit: newProduct.baseUnit,
        baseCostPerUnit: newProduct.baseCostPerUnit,
        yieldPercentage: newProduct.yieldPercentage,
        usedInDepartments: newProduct.usedInDepartments || ['kitchen'], // ✅ ДОБАВИТЬ
        canBeSold: newProduct.canBeSold,
        isActive: newProduct.isActive,
        description: newProduct.description || '',
        storageConditions: newProduct.storageConditions || '',
        shelfLife: newProduct.shelfLife,
        minStock: newProduct.minStock
      }
      localPackageOptions.value = (newProduct.packageOptions || []).map(pkg => ({ ...pkg }))
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      nextTick(() => {
        if (formRef.value) {
          formRef.value.resetValidation()
        }
      })
    }
  }
)

const closeDialog = (): void => {
  emit('update:modelValue', false)
  DebugUtils.debug(MODULE_NAME, 'Dialog closed')
}

const saveProduct = async (): Promise<void> => {
  try {
    if (!formRef.value) return

    const { valid } = await formRef.value.validate()
    if (!valid) {
      DebugUtils.warn(MODULE_NAME, 'Form validation failed')
      return
    }

    DebugUtils.info(MODULE_NAME, 'Saving product', { isEdit: isEdit.value })

    const { id, ...productData } = formData.value

    const cleanData = {
      ...productData,
      description: productData.description?.trim() || undefined,
      storageConditions: productData.storageConditions?.trim() || undefined,
      shelfLife: productData.shelfLife || undefined,
      minStock: productData.minStock || undefined
    }

    // Pass packages along with product data
    if (isEdit.value && id) {
      emit('save', { id, ...cleanData } as UpdateProductData, localPackageOptions.value)
    } else {
      emit('save', cleanData as CreateProductData, localPackageOptions.value)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error saving product', { error })
  }
}

// Local Package Management
const openPackageDialog = (pkg?: LocalPackage, index?: number): void => {
  editingPackage.value = pkg as PackageOption | undefined
  editingPackageIndex.value = index !== undefined ? index : null
  packageDialogOpen.value = true
}

const handleSaveLocalPackage = (data: CreatePackageOptionDto | UpdatePackageOptionDto): void => {
  if (editingPackageIndex.value !== null) {
    // Edit existing package
    localPackageOptions.value[editingPackageIndex.value] = {
      ...localPackageOptions.value[editingPackageIndex.value],
      ...data
    }
  } else {
    // Add new package
    const newPackage: LocalPackage = {
      ...data,
      tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isActive: true
    }
    localPackageOptions.value.push(newPackage)
  }

  packageDialogOpen.value = false
  editingPackage.value = undefined
  editingPackageIndex.value = null
}

const deleteLocalPackage = (index: number): void => {
  localPackageOptions.value.splice(index, 1)
}

// ✅ ДОБАВИТЬ: Helper functions
function getDepartmentColor(dept: Department): string {
  return dept === 'kitchen' ? 'success' : 'primary'
}

function getDepartmentIcon(dept: Department): string {
  return dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
}
</script>

<style scoped>
.packages-section {
  min-height: 150px;
}

/* Fix z-index for selects inside dialog */
:deep(.v-overlay-container) {
  z-index: 9999 !important;
}

:deep(.v-select__content) {
  z-index: 9999 !important;
}

:deep(.v-menu__content) {
  z-index: 9999 !important;
}
</style>
