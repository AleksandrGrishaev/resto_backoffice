<template>
  <v-dialog :model-value="dialogModel" max-width="1200" persistent @click:outside="handleCancel">
    <v-card class="base-dialog-card">
      <v-card-title class="d-flex align-center pa-4 base-dialog-card__title">
        <span class="text-h5">{{ isEdit ? 'Edit Dish' : 'Add Dish' }}</span>
        <v-chip v-if="isDraft" color="warning" size="small" class="ml-3">Draft</v-chip>
        <v-spacer />
      </v-card-title>

      <v-card-text class="pa-4 base-dialog-card__content">
        <v-form ref="form" v-model="isValid">
          <!-- Tabs -->
          <div class="d-flex align-center mb-6">
            <v-tabs v-model="currentTab" class="menu-item-tabs flex-grow-1" height="52">
              <v-tab value="basic" class="tab-basic">
                <v-icon icon="mdi-information-outline" size="22" class="mr-2" />
                Basic
              </v-tab>
              <v-tab value="variants" class="tab-variants">
                <v-icon icon="mdi-format-list-bulleted" size="22" class="mr-2" />
                Variants
                <v-badge
                  v-if="formData.variants.length > 0"
                  :content="formData.variants.length"
                  color="info"
                  inline
                  class="ml-2"
                />
              </v-tab>
              <v-tab v-if="showAdvancedTab" value="modifiers" class="tab-modifiers">
                <v-icon icon="mdi-puzzle-outline" size="22" class="mr-2" />
                Modifiers
                <v-badge
                  v-if="modifierCount > 0"
                  :content="modifierCount"
                  color="deep-purple"
                  inline
                  class="ml-2"
                />
              </v-tab>
              <v-tab v-if="showAdvancedTab" value="templates" class="tab-templates">
                <v-icon icon="mdi-content-copy" size="22" class="mr-2" />
                Templates
                <v-badge
                  v-if="templateCount > 0"
                  :content="templateCount"
                  color="teal"
                  inline
                  class="ml-2"
                />
              </v-tab>
            </v-tabs>

            <v-btn
              v-if="!showAdvancedTab"
              variant="tonal"
              color="primary"
              size="small"
              class="add-tab-btn ml-2"
              @click="enableAdvancedTab"
            >
              <v-icon icon="mdi-plus" size="18" class="mr-1" />
              Modifiers & Templates
            </v-btn>
          </div>

          <v-window v-model="currentTab">
            <!-- ====== BASIC TAB ====== -->
            <v-window-item value="basic">
              <div class="tab-content">
                <!-- Image + Name row -->
                <div class="d-flex align-start mb-5" style="gap: 16px">
                  <image-uploader
                    v-if="canUploadImage"
                    :model-value="formData.imageUrl"
                    :item-id="imageUploadId"
                    :item-name="formData.name"
                    @update:model-value="handleImageUpdate"
                  />
                  <div class="flex-grow-1">
                    <v-text-field
                      v-model="formData.name"
                      label="Dish Name"
                      :rules="[v => !!v || 'Required field']"
                      hide-details="auto"
                    />
                  </div>
                </div>

                <!-- Category -->
                <v-select
                  v-model="formData.categoryId"
                  :items="hierarchicalCategories"
                  item-title="displayName"
                  item-value="id"
                  label="Category"
                  hide-details="auto"
                  class="mb-5"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps" :class="{ 'pl-8': item.raw.isSubcategory }">
                      <template v-if="item.raw.isSubcategory" #prepend>
                        <v-icon size="16" class="mr-1">mdi-subdirectory-arrow-right</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>

                <!-- Department toggle -->
                <div class="section-label mb-2">Department</div>
                <v-btn-toggle
                  v-model="formData.type"
                  mandatory
                  rounded="lg"
                  color="primary"
                  class="w-100 mb-5 dept-toggle"
                >
                  <v-btn value="food" class="flex-grow-1" height="48">
                    <v-icon icon="mdi-silverware-fork-knife" size="22" class="mr-2" />
                    Kitchen
                  </v-btn>
                  <v-btn value="beverage" class="flex-grow-1" height="48">
                    <v-icon icon="mdi-coffee" size="22" class="mr-2" />
                    Bar
                  </v-btn>
                </v-btn-toggle>

                <!-- Description -->
                <v-textarea
                  v-model="formData.description"
                  label="Description"
                  rows="3"
                  hide-details="auto"
                  class="mb-5"
                />

                <!-- Status indicator (edit only) -->
                <div v-if="isEdit">
                  <div class="section-label mb-2">Status</div>
                  <v-chip
                    :color="formData.isActive ? 'success' : 'warning'"
                    variant="flat"
                    size="default"
                  >
                    <v-icon
                      :icon="formData.isActive ? 'mdi-check-circle' : 'mdi-archive'"
                      size="18"
                      class="mr-1"
                    />
                    {{ formData.isActive ? 'Active' : 'Archived' }}
                  </v-chip>
                </div>

                <!-- Channel Availability -->
                <div class="mt-5">
                  <div class="section-label mb-2">Available on Channels</div>
                  <div class="channel-chips">
                    <v-chip
                      v-for="channel in channelsStore.activeChannels"
                      :key="channel.id"
                      :color="formData.channelIds.includes(channel.id) ? 'primary' : undefined"
                      :variant="formData.channelIds.includes(channel.id) ? 'flat' : 'outlined'"
                      size="large"
                      class="channel-chip"
                      @click="toggleChannel(channel.id)"
                    >
                      <v-icon
                        :icon="
                          formData.channelIds.includes(channel.id)
                            ? 'mdi-check-circle'
                            : 'mdi-circle-outline'
                        "
                        size="18"
                        class="mr-1"
                      />
                      {{ channel.name }}
                    </v-chip>
                  </div>
                </div>
              </div>
            </v-window-item>

            <!-- ====== VARIANTS TAB ====== -->
            <v-window-item value="variants">
              <div class="tab-content">
                <!-- Only Modifiers toggle — on tab level -->
                <div class="d-flex align-center mb-4">
                  <v-switch
                    v-model="formData.onlyModifiers"
                    label="Only Modifiers"
                    hide-details
                    density="compact"
                    color="primary"
                    @update:model-value="handleOnlyModifiersToggle"
                  />
                  <span
                    v-if="formData.onlyModifiers"
                    class="text-caption text-medium-emphasis ml-3"
                  >
                    Base price is 0 — final price comes from selected modifiers
                  </span>
                </div>

                <div v-if="!formData.onlyModifiers" class="d-flex align-center mb-4">
                  <div class="section-title text-info">
                    <v-icon icon="mdi-format-list-bulleted" size="22" class="mr-2" color="info" />
                    Dish Variants
                  </div>
                  <v-spacer />
                  <v-btn
                    color="info"
                    variant="tonal"
                    size="default"
                    height="44"
                    @click="addVariant"
                  >
                    <v-icon icon="mdi-plus" size="20" class="mr-1" />
                    Add Variant
                  </v-btn>
                </div>

                <div v-if="!formData.onlyModifiers" class="variants-list">
                  <menu-item-variant-component
                    v-for="(variant, index) in formData.variants"
                    :key="variant.id"
                    :variant="variant"
                    :index="index"
                    :can-delete="formData.variants.length > 1"
                    :item-name="formData.name"
                    :dish-type="effectiveDishType"
                    :dish-options="dishOptions"
                    :product-options="productOptions"
                    :unit-options="unitOptions"
                    :role-options="roleOptions"
                    :only-modifiers="formData.onlyModifiers"
                    class="mb-4"
                    @update:variant="updateVariant(index, $event)"
                    @delete="removeVariant(index)"
                  />
                </div>
              </div>
            </v-window-item>

            <!-- ====== MODIFIERS TAB ====== -->
            <v-window-item v-if="showAdvancedTab" value="modifiers">
              <div class="tab-content">
                <div class="accent-bar accent-bar--purple-subtle mb-4">
                  <v-icon icon="mdi-puzzle" size="20" class="mr-2" />
                  <span>
                    <strong>Required</strong>
                    = customer must choose.
                    <strong class="ml-2">Optional</strong>
                    = customer can add.
                  </span>
                </div>

                <modifiers-editor-widget
                  :modifier-groups="formData.modifierGroups"
                  :dish-type="effectiveDishType"
                  :dish-options="dishOptions"
                  :product-options="allProductOptions"
                  :variant-composition="currentVariantComposition"
                  @update:modifier-groups="formData.modifierGroups = $event"
                />
              </div>
            </v-window-item>

            <!-- ====== TEMPLATES TAB ====== -->
            <v-window-item v-if="showAdvancedTab" value="templates">
              <div class="tab-content">
                <div class="accent-bar accent-bar--teal mb-4">
                  <v-icon icon="mdi-lightning-bolt" size="20" class="mr-2" />
                  <span>Preset modifier combos for quick POS selection</span>
                </div>

                <templates-editor-widget
                  :templates="formData.templates"
                  :modifier-groups="formData.modifierGroups"
                  :parent-item-id="item?.id"
                  @update:templates="formData.templates = $event"
                />
              </div>
            </v-window-item>
          </v-window>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 base-dialog-card__actions">
        <v-btn
          v-if="isEdit"
          :color="formData.isActive ? 'warning' : 'success'"
          variant="outlined"
          height="44"
          :prepend-icon="formData.isActive ? 'mdi-archive-arrow-down' : 'mdi-archive-arrow-up'"
          @click="handleArchive"
        >
          {{ formData.isActive ? 'Archive' : 'Restore' }}
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="!isEdit"
          variant="outlined"
          color="warning"
          class="text-uppercase mr-2"
          height="44"
          :loading="savingDraft"
          :disabled="!canSaveDraft || loading"
          @click="handleSaveDraft"
        >
          <v-icon icon="mdi-content-save-outline" size="20" class="mr-1" />
          Save Draft
        </v-btn>
        <v-btn
          variant="text"
          class="text-uppercase mr-2"
          height="44"
          :disabled="loading"
          @click="handleCancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :variant="isFormValid ? 'flat' : 'outlined'"
          class="text-uppercase"
          height="44"
          :loading="loading"
          :disabled="!isFormValid || loading"
          @click="handleSubmit"
        >
          {{ isEdit ? 'Update' : 'Save' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useChannelsStore } from '@/stores/channels'
import type { MenuItem, CreateMenuItemDto, MenuItemVariant, DishType } from '@/stores/menu'
import MenuItemVariantComponent from './MenuItemVariant.vue'
import ModifiersEditorWidget from '@/views/recipes/components/widgets/ModifiersEditorWidget.vue'
import TemplatesEditorWidget from './widgets/TemplatesEditorWidget.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'

const MODULE_NAME = 'MenuItemDialog'

// Props & Emits
interface Props {
  modelValue: boolean
  item?: MenuItem | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  item: null
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: []
  archive: [item: MenuItem]
}>()

// Stores
const menuStore = useMenuStore()
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()
const channelsStore = useChannelsStore()

// State
const form = ref()
const loading = ref(false)
const savingDraft = ref(false)
const isValid = ref(false)
const currentTab = ref('basic')
const showAdvancedTab = ref(false)

function createDefaultVariant(): MenuItemVariant {
  return {
    id: crypto.randomUUID(),
    name: '',
    price: 0,
    isActive: true,
    sortOrder: 0,
    composition: [],
    portionMultiplier: 1
  }
}

const formData = ref({
  categoryId: '',
  name: '',
  description: '',
  type: 'food' as 'food' | 'beverage',
  dishType: 'simple' as DishType,
  isActive: true,
  sortOrder: 0,
  variants: [createDefaultVariant()],
  modifierGroups: [] as any[],
  templates: [] as any[],
  channelIds: [] as string[],
  onlyModifiers: false,
  imageUrl: ''
})

// Computed
const isEdit = computed(() => !!props.item)

// Auto-detect dishType from modifiers
const effectiveDishType = computed<DishType>(() => {
  return formData.value.modifierGroups && formData.value.modifierGroups.length > 0
    ? 'modifiable'
    : 'simple'
})

const hierarchicalCategories = computed(() => {
  const result: Array<{
    id: string
    name: string
    displayName: string
    isSubcategory: boolean
    parentName?: string
  }> = []

  const rootCategories = menuStore.activeRootCategories

  for (const rootCat of rootCategories) {
    result.push({
      id: rootCat.id,
      name: rootCat.name,
      displayName: rootCat.name,
      isSubcategory: false
    })

    const subcategories = menuStore.getActiveSubcategories(rootCat.id)
    for (const subCat of subcategories) {
      result.push({
        id: subCat.id,
        name: subCat.name,
        displayName: subCat.name,
        isSubcategory: true,
        parentName: rootCat.name
      })
    }
  }

  return result
})

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const currentMenuItemDepartment = computed<'kitchen' | 'bar'>(() => {
  return formData.value.type === 'food' ? 'kitchen' : 'bar'
})

const dishOptions = computed(() => {
  const options: Array<{
    id: string
    name: string
    type: 'recipe' | 'preparation'
    unit: string
    outputQuantity: number
    category?: string
    portionType?: 'weight' | 'portion'
    portionSize?: number
  }> = []

  try {
    const menuDepartment = currentMenuItemDepartment.value

    const activeRecipes = recipesStore.activeRecipes || []
    const filteredRecipes = activeRecipes.filter(recipe => recipe.department === menuDepartment)

    filteredRecipes.forEach(recipe => {
      options.push({
        id: recipe.id,
        name: recipe.name,
        type: 'recipe',
        unit: recipe.outputUnit,
        outputQuantity: recipe.outputQuantity
      })
    })

    const activePreparations = recipesStore.activePreparations || []

    if (Array.isArray(activePreparations)) {
      const filteredPreparations = activePreparations.filter(
        prep => prep.department === menuDepartment
      )

      filteredPreparations.forEach(prep => {
        options.push({
          id: prep.id,
          name: prep.name,
          type: 'preparation',
          unit: prep.outputUnit || 'gram',
          outputQuantity: prep.outputQuantity || 1,
          category: prep.type,
          portionType: prep.portionType,
          portionSize: prep.portionSize
        })
      })
    }
  } catch (error) {
    console.warn('Error building dish options:', error)
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
})

const productOptions = computed(() => {
  const options: Array<{
    id: string
    name: string
    category: string
    unit: string
    costPerUnit: number
  }> = []

  try {
    const menuDepartment = currentMenuItemDepartment.value

    const sellableProducts = productsStore.sellableProducts || []

    const filteredProducts = sellableProducts.filter(
      product => product.usedInDepartments && product.usedInDepartments.includes(menuDepartment)
    )

    filteredProducts.forEach(product => {
      options.push({
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.baseUnit,
        costPerUnit: product.baseCostPerUnit
      })
    })
  } catch (error) {
    console.warn('Error building product options:', error)
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
})

const allProductOptions = computed(() => {
  const options: Array<{
    id: string
    name: string
    category: string
    unit: string
    costPerUnit: number
  }> = []

  try {
    const menuDepartment = currentMenuItemDepartment.value

    const allProducts = productsStore.products.filter(p => p.isActive) || []

    const filteredProducts = allProducts.filter(
      product => product.usedInDepartments && product.usedInDepartments.includes(menuDepartment)
    )

    filteredProducts.forEach(product => {
      options.push({
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.baseUnit,
        costPerUnit: product.baseCostPerUnit
      })
    })
  } catch (error) {
    console.warn('Error building all product options:', error)
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
})

const currentVariantComposition = computed(() => {
  if (formData.value.variants.length > 0) {
    return formData.value.variants[0].composition || []
  }
  return []
})

const unitOptions = computed(() => [
  { title: 'Grams', value: 'gram' },
  { title: 'Milliliters', value: 'ml' },
  { title: 'Pieces', value: 'piece' },
  { title: 'Liters', value: 'liter' },
  { title: 'Kilograms', value: 'kg' },
  { title: 'Portions', value: 'portion' }
])

const roleOptions = computed(() => [
  { title: 'Main', value: 'main' },
  { title: 'Side', value: 'garnish' },
  { title: 'Sauce', value: 'sauce' },
  { title: 'Add-on', value: 'addon' }
])

const isDraft = computed(() => {
  return isEdit.value && props.item?.status === 'draft'
})

// Image upload: only available when editing (item has an ID)
const canUploadImage = computed(() => isEdit.value && !!props.item?.id)
const imageUploadId = computed(() => props.item?.id || '')

function handleImageUpdate(url: string) {
  formData.value.imageUrl = url
  // Persist imageUrl immediately to DB (no need to wait for form submit)
  if (props.item) {
    menuStore.updateMenuItem(props.item.id, {
      imageUrl: url || undefined,
      department: props.item.department
    })
  }
}

const canSaveDraft = computed(() => {
  return formData.value.name.trim().length > 0
})

const modifierCount = computed(() => formData.value.modifierGroups?.length || 0)
const templateCount = computed(() => formData.value.templates?.length || 0)

const isFormValid = computed(() => {
  const hasVariants = formData.value.onlyModifiers || formData.value.variants.length > 0
  const variantsValid =
    formData.value.onlyModifiers || formData.value.variants.every(v => v.price > 0)
  return (
    isValid.value &&
    formData.value.name.trim().length > 0 &&
    formData.value.categoryId &&
    hasVariants &&
    variantsValid
  )
})

// Methods
function handleOnlyModifiersToggle(value: boolean | null) {
  if (value) {
    // Create a single system variant with price 0
    const systemVariant = {
      ...createDefaultVariant(),
      price: 0,
      onlyModifiers: true,
      composition: []
    }
    formData.value.variants = [systemVariant]
  } else {
    // Reset to normal variant
    formData.value.variants = formData.value.variants.map(v => ({
      ...v,
      onlyModifiers: false
    }))
  }
}

function addVariant() {
  formData.value.variants.push({
    ...createDefaultVariant(),
    sortOrder: formData.value.variants.length
  })
}

function removeVariant(index: number) {
  if (formData.value.variants.length > 1) {
    formData.value.variants.splice(index, 1)
  }
}

function updateVariant(index: number, updatedVariant: MenuItemVariant) {
  formData.value.variants[index] = updatedVariant
}

function toggleChannel(channelId: string) {
  const idx = formData.value.channelIds.indexOf(channelId)
  if (idx !== -1) {
    formData.value.channelIds.splice(idx, 1)
  } else {
    formData.value.channelIds.push(channelId)
  }
}

function getNextSortOrder(categoryId: string): number {
  const categoryItems = menuStore.getItemsByCategory(categoryId)
  if (categoryItems.length === 0) return 0
  return Math.max(...categoryItems.map(item => item.sortOrder || 0)) + 1
}

/**
 * Deep-clone modifierGroups/templates to decouple form state from the store.
 * Without this, Vuetify's form.reset() sets v-model-bound fields to null,
 * corrupting the reactive store objects through shared references.
 */
function deepCloneModifiers(groups: any[]): any[] {
  if (!groups || groups.length === 0) return []
  return JSON.parse(JSON.stringify(groups))
}

function resetForm() {
  // NOTE: Do NOT call form.value.reset() here.
  // Vuetify's VForm.reset() sets all v-model values to null, which corrupts
  // store objects when modifierGroups/templates share references with the store.
  if (form.value) {
    form.value.resetValidation()
  }
  formData.value = {
    categoryId: '',
    name: '',
    description: '',
    type: 'food',
    dishType: 'simple',
    isActive: true,
    sortOrder: 0,
    variants: [createDefaultVariant()],
    modifierGroups: [],
    templates: [],
    channelIds: channelsStore.activeChannels
      .filter(c => c.type !== 'delivery_platform')
      .map(c => c.id),
    onlyModifiers: false,
    imageUrl: ''
  }
  currentTab.value = 'basic'
  showAdvancedTab.value = false
}

function enableAdvancedTab() {
  showAdvancedTab.value = true
  currentTab.value = 'modifiers'
}

function handleArchive() {
  if (props.item) {
    emit('archive', props.item)
    dialogModel.value = false
  }
}

function handleCancel() {
  resetForm()
  dialogModel.value = false
}

async function handleSaveDraft() {
  if (!canSaveDraft.value) return

  try {
    savingDraft.value = true

    const processedVariants = formData.value.variants.map((variant, index) => ({
      id: variant.id,
      name: variant.name?.trim() || '',
      price: variant.price || 0,
      isActive: variant.isActive ?? true,
      sortOrder: index,
      portionMultiplier: variant.portionMultiplier,
      composition:
        variant.composition?.map(comp => ({
          type: comp.type,
          id: comp.id,
          quantity: comp.quantity,
          unit: comp.unit,
          role: comp.role,
          notes: comp.notes
        })) || []
    }))

    const itemData: CreateMenuItemDto = {
      categoryId: formData.value.categoryId || '',
      name: formData.value.name.trim(),
      description: formData.value.description?.trim(),
      type: formData.value.type,
      department: formData.value.type === 'food' ? 'kitchen' : 'bar',
      dishType: effectiveDishType.value,
      modifierGroups: formData.value.modifierGroups || [],
      templates: formData.value.templates || [],
      status: 'draft',
      variants: processedVariants.map(v => ({
        name: v.name,
        price: v.price,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        portionMultiplier: v.portionMultiplier,
        onlyModifiers: v.onlyModifiers,
        composition: v.composition
      }))
    }

    let savedItemId: string | undefined

    if (isEdit.value && props.item) {
      await menuStore.updateMenuItem(props.item.id, {
        ...itemData,
        isActive: false,
        sortOrder: formData.value.sortOrder,
        variants: processedVariants
      })
      savedItemId = props.item.id
    } else {
      const newItem = await menuStore.addMenuItem({
        ...itemData,
        sortOrder: getNextSortOrder(formData.value.categoryId)
      })
      savedItemId = newItem?.id
    }

    // Save channel availability
    if (savedItemId) {
      const availability = channelsStore.activeChannels.map(ch => ({
        channelId: ch.id,
        isAvailable: formData.value.channelIds.includes(ch.id)
      }))
      await channelsStore.setMenuItemChannels(savedItemId, availability)
    }

    emit('saved')
    dialogModel.value = false
    resetForm()
  } catch (error) {
    console.error('Failed to save draft:', error)
  } finally {
    savingDraft.value = false
  }
}

async function handleSubmit() {
  if (!isFormValid.value) return

  try {
    loading.value = true

    const processedVariants = formData.value.variants.map((variant, index) => ({
      id: variant.id,
      name: variant.name?.trim() || '',
      price: variant.price,
      isActive: variant.isActive ?? true,
      sortOrder: index,
      portionMultiplier: variant.portionMultiplier,
      onlyModifiers: variant.onlyModifiers || false,
      composition:
        variant.composition?.map(comp => ({
          type: comp.type,
          id: comp.id,
          quantity: comp.quantity,
          unit: comp.unit,
          role: comp.role,
          notes: comp.notes
        })) || []
    }))

    const itemData: CreateMenuItemDto = {
      categoryId: formData.value.categoryId,
      name: formData.value.name.trim(),
      description: formData.value.description?.trim(),
      type: formData.value.type,
      department: formData.value.type === 'food' ? 'kitchen' : 'bar',
      dishType: effectiveDishType.value,
      modifierGroups: formData.value.modifierGroups || [],
      templates: formData.value.templates || [],
      variants: processedVariants.map(v => ({
        name: v.name,
        price: v.price,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        portionMultiplier: v.portionMultiplier,
        onlyModifiers: v.onlyModifiers,
        composition: v.composition
      }))
    }

    let savedItemId: string | undefined

    if (isEdit.value && props.item) {
      await menuStore.updateMenuItem(props.item.id, {
        ...itemData,
        isActive: formData.value.isActive,
        sortOrder: formData.value.sortOrder,
        variants: processedVariants
      })
      savedItemId = props.item.id
    } else {
      const newItem = await menuStore.addMenuItem({
        ...itemData,
        sortOrder: getNextSortOrder(formData.value.categoryId)
      })
      savedItemId = newItem?.id
    }

    // Save channel availability
    if (savedItemId) {
      const availability = channelsStore.activeChannels.map(ch => ({
        channelId: ch.id,
        isAvailable: formData.value.channelIds.includes(ch.id)
      }))
      await channelsStore.setMenuItemChannels(savedItemId, availability)
    }

    emit('saved')
    dialogModel.value = false
    if (!isEdit.value) {
      resetForm()
    }
  } catch (error) {
    console.error('Failed to save menu item:', error)
  } finally {
    loading.value = false
  }
}

// Watch for item changes
watch(
  () => props.item,
  newItem => {
    if (newItem) {
      const hasModifiers = (newItem.modifierGroups?.length || 0) > 0
      // Detect onlyModifiers: either explicitly set, or legacy items with price=0 + empty composition + has modifiers
      const isOnlyModifiers =
        newItem.variants.length > 0 &&
        newItem.variants.every(
          v =>
            v.onlyModifiers ||
            (hasModifiers && v.price === 0 && (!v.composition || v.composition.length === 0))
        )
      formData.value = {
        categoryId: newItem.categoryId,
        name: newItem.name,
        description: newItem.description || '',
        type: newItem.type,
        dishType: newItem.dishType || 'simple',
        isActive: newItem.isActive,
        sortOrder: newItem.sortOrder,
        variants: newItem.variants.map(variant => ({
          ...variant,
          composition: variant.composition || []
        })),
        modifierGroups: deepCloneModifiers(newItem.modifierGroups || []),
        templates: deepCloneModifiers(newItem.templates || []),
        channelIds: channelsStore.getMenuItemChannelIds(newItem.id),
        onlyModifiers: isOnlyModifiers,
        imageUrl: newItem.imageUrl || ''
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen) {
      // Lazy-init channels store (may not be loaded in backoffice/kitchen contexts)
      if (!channelsStore.initialized) {
        await channelsStore.initialize()
      }

      if (props.item) {
        const hasMods = (props.item.modifierGroups?.length || 0) > 0
        const isOnlyMods =
          props.item.variants.length > 0 &&
          props.item.variants.every(
            v =>
              v.onlyModifiers ||
              (hasMods && v.price === 0 && (!v.composition || v.composition.length === 0))
          )
        formData.value = {
          categoryId: props.item.categoryId,
          name: props.item.name,
          description: props.item.description || '',
          type: props.item.type,
          dishType: props.item.dishType || 'simple',
          isActive: props.item.isActive,
          sortOrder: props.item.sortOrder,
          variants: props.item.variants.map(variant => ({
            ...variant,
            composition: variant.composition || []
          })),
          modifierGroups: deepCloneModifiers(props.item.modifierGroups || []),
          templates: deepCloneModifiers(props.item.templates || []),
          channelIds: channelsStore.getMenuItemChannelIds(props.item.id),
          onlyModifiers: isOnlyMods,
          imageUrl: props.item.imageUrl || ''
        }
        // Show modifiers tab if item has modifiers or templates
        showAdvancedTab.value =
          (props.item.modifierGroups?.length || 0) > 0 || (props.item.templates?.length || 0) > 0
      } else {
        resetForm()
      }
    }
  }
)

// Initialize stores
onMounted(async () => {
  try {
    await productsStore.loadProducts()

    if (recipesStore && typeof recipesStore.initialize === 'function') {
      await recipesStore.initialize()
    }
  } catch (error) {
    console.error('MenuItemDialog: Failed to initialize stores:', error)
  }
})
</script>

<style lang="scss" scoped>
// Dialog card layout (mirrors BaseDialog)
.base-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  background: var(--color-surface);
  border: 1px solid var(--color-border);

  &__title {
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  &__actions {
    flex-shrink: 0;
  }
}

// Tab color coding
.menu-item-tabs {
  :deep(.v-tab) {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.02em;
    min-height: 52px;
    padding: 0 20px;
  }
}

.tab-basic {
  &.v-tab--selected {
    color: var(--color-secondary) !important;
  }
}

.tab-variants {
  &.v-tab--selected {
    color: var(--color-info) !important;
  }
}

.tab-modifiers {
  &.v-tab--selected {
    color: var(--color-primary) !important;
  }
}

.tab-templates {
  &.v-tab--selected {
    color: var(--color-success) !important;
  }
}

.add-tab-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

// Tab content
.tab-content {
  padding: 12px 8px;
}

// Accent bars (replace verbose alerts)
.accent-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.4;

  &--purple {
    background: rgba(163, 149, 233, 0.12);
    border-left: 4px solid var(--color-primary);
    color: var(--color-primary);
  }

  &--purple-subtle {
    background: rgba(163, 149, 233, 0.08);
    border-left: 4px solid var(--color-primary);
    color: rgba(255, 255, 255, 0.8);
  }

  &--blue {
    background: rgba(118, 176, 255, 0.12);
    border-left: 4px solid var(--color-info);
    color: var(--color-info);
  }

  &--teal {
    background: rgba(146, 201, 175, 0.12);
    border-left: 4px solid var(--color-success);
    color: var(--color-success);
  }
}

// Section labels
.section-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

// Toggles
.dept-toggle,
.status-toggle {
  :deep(.v-btn) {
    font-weight: 600;
    font-size: 14px;
  }
}

:deep(.v-btn-toggle) {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
}

// Channel chips
.channel-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.channel-chip {
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}

// Variants list
.variants-list {
  max-height: 100%;
  overflow-y: auto;
}

// Tab badges
:deep(.v-tab) {
  .v-badge {
    margin-left: 8px;
  }
}
</style>
