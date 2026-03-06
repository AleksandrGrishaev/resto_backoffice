<!-- src/views/products/components/ProductDialog.vue -->
<template>
  <v-dialog v-model="localModelValue" max-width="800px" persistent scrollable>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 pb-0">
        <span class="text-h6">{{ isEdit ? 'Edit Product' : 'New Product' }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" color="primary" class="px-4">
        <v-tab value="general">General</v-tab>
        <v-tab value="packages">
          Packages
          <v-badge
            v-if="localPackageOptions.length"
            :content="localPackageOptions.length"
            color="primary"
            inline
            class="ml-1"
          />
        </v-tab>
      </v-tabs>
      <v-divider />

      <!-- Tab Content -->
      <v-card-text class="pa-6">
        <v-form ref="formRef" v-model="formValid">
          <v-tabs-window v-model="activeTab">
            <!-- === General Tab === -->
            <v-tabs-window-item value="general">
              <v-row>
                <!-- Product Name -->
                <v-col cols="12">
                  <v-text-field
                    v-model="formData.name"
                    label="Product Name *"
                    variant="outlined"
                    :rules="nameRules"
                    counter="100"
                    maxlength="100"
                    placeholder="Enter product name"
                    autofocus
                  />
                </v-col>

                <!-- Department + Category -->
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

                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.category"
                    :items="categoryOptions"
                    label="Category *"
                    variant="outlined"
                    :rules="categoryRules"
                    attach
                  />
                </v-col>

                <!-- Base Unit + Cost -->
                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.baseUnit"
                    :items="baseUnitOptions"
                    label="Base Unit *"
                    variant="outlined"
                    :rules="baseUnitRules"
                    :hint="getBaseUnitHint()"
                    persistent-hint
                    attach
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <NumericInputField
                    v-model="formData.baseCostPerUnit"
                    label="Base Cost Per Unit *"
                    variant="outlined"
                    :rules="costRules"
                    suffix="IDR"
                    :min="0"
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
                  </NumericInputField>
                </v-col>

                <!-- Yield + Switches -->
                <v-col cols="12" md="4">
                  <NumericInputField
                    v-model="formData.yieldPercentage"
                    label="Yield *"
                    variant="outlined"
                    :rules="yieldRules"
                    suffix="%"
                    :min="1"
                    :max="100"
                    :allow-decimal="true"
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
                  </NumericInputField>
                </v-col>

                <v-col cols="12" md="4" class="d-flex align-center">
                  <v-switch
                    v-model="formData.canBeSold"
                    label="Can Be Sold"
                    color="primary"
                    hide-details
                  />
                </v-col>

                <v-col v-if="isEdit" cols="12" md="4" class="d-flex align-center">
                  <v-switch
                    v-model="formData.isActive"
                    label="Active"
                    color="success"
                    hide-details
                  />
                </v-col>

                <!-- Description -->
                <v-col cols="12">
                  <v-textarea
                    v-model="formData.description"
                    label="Description (optional)"
                    variant="outlined"
                    rows="2"
                    counter="500"
                    maxlength="500"
                    placeholder="Product description"
                  />
                </v-col>

                <!-- Storage section -->
                <v-col cols="12">
                  <div class="storage-section pa-3 rounded-lg">
                    <div class="text-subtitle-2 text-medium-emphasis mb-3">Storage</div>
                    <v-row dense>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="formData.storageConditions"
                          label="Storage Conditions"
                          variant="outlined"
                          density="compact"
                          placeholder="+2°C to +4°C"
                          maxlength="200"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <NumericInputField
                          v-model="formData.shelfLife"
                          label="Shelf Life"
                          variant="outlined"
                          density="compact"
                          suffix="days"
                          :min="1"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <NumericInputField
                          v-model="formData.minStock"
                          label="Minimum Stock"
                          variant="outlined"
                          density="compact"
                          :suffix="getBaseUnitName()"
                          :min="0"
                          :allow-decimal="true"
                        />
                      </v-col>
                    </v-row>
                  </div>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- === Packages Tab === -->
            <v-tabs-window-item value="packages">
              <!-- Info alert for new products -->
              <v-alert v-if="!isEdit" type="info" variant="tonal" density="compact" class="mb-4">
                A default package will be created automatically. You can add more packages now or
                after creating the product.
              </v-alert>

              <div class="d-flex justify-space-between align-center mb-4">
                <div class="text-subtitle-2">
                  {{ localPackageOptions.length }} package{{
                    localPackageOptions.length !== 1 ? 's' : ''
                  }}
                </div>
                <v-btn size="small" color="primary" variant="tonal" @click="openPackageDialog()">
                  <v-icon start>mdi-plus</v-icon>
                  Add Package
                </v-btn>
              </div>

              <div
                v-if="!localPackageOptions.length"
                class="text-center text-medium-emphasis py-8"
                style="
                  border: 1px dashed var(--color-border, rgba(255, 255, 255, 0.12));
                  border-radius: 8px;
                "
              >
                <v-icon icon="mdi-package-variant" size="40" class="mb-2 text-medium-emphasis" />
                <div>No packages added yet</div>
                <div class="text-caption">A default package will be created automatically</div>
              </div>

              <div v-else class="d-flex flex-column gap-2">
                <v-card
                  v-for="(pkg, index) in localPackageOptions"
                  :key="pkg.tempId || pkg.id"
                  variant="outlined"
                  :color="index === 0 ? 'primary' : undefined"
                >
                  <v-card-text class="py-3 px-4">
                    <div class="d-flex justify-space-between align-center">
                      <div class="flex-grow-1">
                        <div class="d-flex align-center gap-2">
                          <strong>{{ pkg.packageName }}</strong>
                          <v-chip v-if="pkg.brandName" size="x-small" color="info" variant="tonal">
                            {{ pkg.brandName }}
                          </v-chip>
                          <v-chip v-if="index === 0" size="x-small" color="success" variant="tonal">
                            Default
                          </v-chip>
                        </div>

                        <div class="text-body-2 text-medium-emphasis mt-1">
                          {{ pkg.packageSize }} {{ getBaseUnitName() }}
                          <span v-if="pkg.packagePrice">
                            &middot; {{ formatPrice(pkg.packagePrice) }} per package
                          </span>
                          &middot; {{ formatPrice(pkg.baseCostPerUnit) }}/{{ getBaseUnitName() }}
                        </div>

                        <div v-if="pkg.notes" class="text-caption text-medium-emphasis mt-1">
                          {{ pkg.notes }}
                        </div>
                      </div>

                      <div class="d-flex align-center gap-1">
                        <v-btn
                          size="x-small"
                          variant="text"
                          color="primary"
                          icon
                          @click="openPackageDialog(pkg, index)"
                        >
                          <v-icon>mdi-pencil</v-icon>
                        </v-btn>

                        <v-btn
                          v-if="localPackageOptions.length > 1"
                          size="x-small"
                          variant="text"
                          color="error"
                          icon
                          @click="deleteLocalPackage(index)"
                        >
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-divider />
      <v-card-actions class="px-6 py-3 d-flex justify-end">
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :variant="formValid ? 'flat' : 'outlined'"
          :loading="loading"
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
      :product-base-cost="Number(formData.baseCostPerUnit) || 0"
      :loading="false"
      @save="handleSaveLocalPackage"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
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
import { NumericInputField } from '@/components/input'

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
const activeTab = ref('general')
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
  // Get first available category UUID or empty string
  const defaultCategory = categoryOptions.value.length > 0 ? categoryOptions.value[0].value : ''

  formData.value = {
    name: '',
    category: defaultCategory,
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
      // Filter only active packages (soft deleted packages are hidden)
      localPackageOptions.value = (newProduct.packageOptions || [])
        .filter(pkg => pkg.isActive)
        .map(pkg => ({ ...pkg }))
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
      activeTab.value = 'general'
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
  // Prevent deleting the last package
  if (localPackageOptions.value.length <= 1) {
    DebugUtils.warn(MODULE_NAME, 'Cannot delete the last package')
    return
  }
  localPackageOptions.value.splice(index, 1)
}

// ✅ ДОБАВИТЬ: Helper functions
function getDepartmentColor(dept: Department): string {
  return dept === 'kitchen' ? 'success' : 'primary'
}

function getDepartmentIcon(dept: Department): string {
  return dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
}

// Initialize default category on mount
onMounted(() => {
  if (!props.product && categoryOptions.value.length > 0) {
    formData.value.category = categoryOptions.value[0].value
  }
})
</script>

<style scoped>
.storage-section {
  background: rgba(var(--v-theme-info), 0.06);
  border: 1px solid rgba(var(--v-theme-info), 0.15);
}

.gap-2 {
  gap: 8px;
}

/* Fix z-index for selects inside dialog */
:deep(.v-select__content) {
  z-index: 9999 !important;
}

:deep(.v-menu__content) {
  z-index: 9999 !important;
}
</style>
