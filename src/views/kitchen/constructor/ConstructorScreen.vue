<!-- Constructor Screen — Hub dashboard + standard dialogs -->
<template>
  <div class="constructor-screen">
    <ConstructorHub
      @create-new="handleCreateNew"
      @create-product="handleCreateProduct"
      @create-category="showCategoryTypePicker = true"
      @view-item="handleViewItem"
      @view-in-catalog="(ref: { id: string; type: string }) => emit('viewInCatalog', ref)"
      @clone-item="handleCloneItemRequest"
      @delete-item="handleDeleteItem"
    />

    <!-- Standard edit/create dialogs -->
    <MenuItemDialog v-model="showMenuDialog" :item="editMenuItem" @saved="handleDialogSaved" />
    <UnifiedRecipeDialog
      v-model="showRecipeDialog"
      :type="editRecipeType"
      :item="editRecipe"
      tablet
      @saved="handleDialogSaved"
    />
    <ProductDialog v-model="showProductDialog" :product="editProduct" @save="handleProductSave" />

    <!-- Category dialogs -->
    <MenuCategoryDialog v-model="showMenuCategoryDialog" @saved="handleDialogSaved" />
    <RecipeCategoryDialog
      v-model="showRecipeCategoryDialog"
      :type="recipeCategoryType"
      @save="handleRecipeCategorySave"
    />

    <!-- Category type picker -->
    <v-dialog v-model="showCategoryTypePicker" max-width="400">
      <v-card>
        <v-card-title>Category for…</v-card-title>
        <v-card-text class="create-options">
          <div class="create-option" @click="openCategoryDialog('menu')">
            <v-icon size="28" color="purple">mdi-silverware-variant</v-icon>
            <div>
              <div class="create-option-title">Menu</div>
              <div class="create-option-desc">Category for menu items</div>
            </div>
          </div>
          <div class="create-option" @click="openCategoryDialog('recipe')">
            <v-icon size="28" color="green">mdi-book-open-variant</v-icon>
            <div>
              <div class="create-option-title">Recipe</div>
              <div class="create-option-desc">Category for recipes</div>
            </div>
          </div>
          <div class="create-option" @click="openCategoryDialog('preparation')">
            <v-icon size="28" color="orange">mdi-flask-outline</v-icon>
            <div>
              <div class="create-option-title">Preparation</div>
              <div class="create-option-desc">Category for semi-finished products</div>
            </div>
          </div>
          <div class="create-option" @click="openCategoryDialog('product')">
            <v-icon size="28" color="blue">mdi-package-variant</v-icon>
            <div>
              <div class="create-option-title">Product</div>
              <div class="create-option-desc">Category for raw ingredients</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Clone confirmation dialog -->
    <v-dialog v-model="showCloneConfirm" max-width="400">
      <v-card>
        <v-card-title>Clone "{{ cloneTarget?.name }}"?</v-card-title>
        <v-card-text>A copy will be created with all components and settings.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCloneConfirm = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="cloning" @click="confirmClone">
            Clone
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Archive confirmation dialog -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title>Archive "{{ deleteTarget?.name }}"?</v-card-title>
        <v-card-text>
          The item will be deactivated and hidden from active lists. You can restore it later.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="warning" variant="flat" :loading="deleting" @click="confirmDelete">
            Archive
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { useMenuStore } from '@/stores/menu'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import ConstructorHub from './ConstructorHub.vue'
import MenuItemDialog from '@/views/menu/components/MenuItemDialog.vue'
import UnifiedRecipeDialog from '@/views/recipes/components/UnifiedRecipeDialog.vue'
import ProductDialog from '@/views/products/components/ProductDialog.vue'
import MenuCategoryDialog from '@/views/menu/components/MenuCategoryDialog.vue'
import RecipeCategoryDialog from '@/views/recipes/components/CategoryDialog.vue'
import type { CreateType, HubItemRef } from './ConstructorHub.vue'
import type { Preparation, Recipe } from '@/stores/recipes/types'
import type { MenuItem } from '@/stores/menu/types'
import type { Product, CreateProductData, UpdateProductData } from '@/stores/productsStore/types'

const props = defineProps<{
  pendingClone?: { id: string; type: string; name: string } | null
}>()

const emit = defineEmits<{
  cloneConsumed: []
  viewInCatalog: [ref: { id: string; type: string }]
}>()

const menuStore = useMenuStore()
const recipesStore = useRecipesStore()
const productsStore = useProductsStore()

// Dialog state
const showMenuDialog = ref(false)
const showRecipeDialog = ref(false)
const showProductDialog = ref(false)
const editMenuItem = ref<MenuItem | null>(null)
const editRecipe = ref<Recipe | Preparation | null>(null)
const editRecipeType = ref<'recipe' | 'preparation'>('recipe')
const editProduct = ref<Product | null>(null)

// Category dialog state
const showCategoryTypePicker = ref(false)
const showMenuCategoryDialog = ref(false)
const showRecipeCategoryDialog = ref(false)
const recipeCategoryType = ref<'recipe' | 'preparation'>('recipe')
const categoryTargetType = ref<'menu' | 'recipe' | 'preparation' | 'product'>('menu')

// Clone state
const showCloneConfirm = ref(false)
const cloneTarget = ref<HubItemRef | null>(null)
const cloning = ref(false)

// Delete state
const showDeleteConfirm = ref(false)
const deleteTarget = ref<HubItemRef | null>(null)
const deleting = ref(false)

// --- Create ---
function handleCreateNew(type: CreateType) {
  if (type === 'menu') {
    editMenuItem.value = null
    showMenuDialog.value = true
  } else if (type === 'recipe') {
    editRecipe.value = null
    editRecipeType.value = 'recipe'
    showRecipeDialog.value = true
  } else if (type === 'preparation') {
    editRecipe.value = null
    editRecipeType.value = 'preparation'
    showRecipeDialog.value = true
  }
}

function handleCreateProduct() {
  editProduct.value = null
  showProductDialog.value = true
}

// --- Category ---
function openCategoryDialog(type: 'menu' | 'recipe' | 'preparation' | 'product') {
  showCategoryTypePicker.value = false
  categoryTargetType.value = type
  if (type === 'menu') {
    showMenuCategoryDialog.value = true
  } else {
    // Recipe, preparation and product categories all use the same dialog
    recipeCategoryType.value = type === 'product' ? 'recipe' : type
    showRecipeCategoryDialog.value = true
  }
}

async function handleRecipeCategorySave(data: any) {
  const { showSuccess, showError } = useSnackbar()
  try {
    if (categoryTargetType.value === 'product') {
      await productsStore.createProductCategory({
        name: data.name,
        key: data.key,
        color: data.color,
        icon: data.icon,
        sortOrder: data.sortOrder
      })
    } else if (categoryTargetType.value === 'preparation') {
      await recipesStore.createPreparationCategory(data)
    } else {
      await recipesStore.createRecipeCategory(data)
    }
    showSuccess(`Category "${data.name}" created`)
    showRecipeCategoryDialog.value = false
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create category'
    showError(msg)
  }
}

// --- View / Edit ---
function handleViewItem(ref: { id: string; type: string; status: string }) {
  openEditDialog(ref)
}

function openEditDialog(ref: { id: string; type: string }) {
  if (ref.type === 'menu') {
    editMenuItem.value = (menuStore.menuItems as MenuItem[]).find(m => m.id === ref.id) ?? null
    if (editMenuItem.value) showMenuDialog.value = true
  } else if (ref.type === 'recipe') {
    editRecipe.value = recipesStore.getRecipeById(ref.id) as Recipe | null
    editRecipeType.value = 'recipe'
    if (editRecipe.value) showRecipeDialog.value = true
  } else if (ref.type === 'preparation') {
    editRecipe.value = recipesStore.getPreparationById(ref.id) as Preparation | null
    editRecipeType.value = 'preparation'
    if (editRecipe.value) showRecipeDialog.value = true
  } else if (ref.type === 'product') {
    editProduct.value = productsStore.getProductById(ref.id) as Product | null
    if (editProduct.value) showProductDialog.value = true
  }
}

function handleDialogSaved() {
  // Stores update reactively, hub auto-refreshes
}

async function handleProductSave(data: CreateProductData | UpdateProductData, packages: any[]) {
  const { showSuccess, showError } = useSnackbar()
  try {
    if ('id' in data) {
      await productsStore.updateProduct(data)
      for (const pkg of packages) {
        if (pkg.id && !pkg.tempId) {
          await productsStore.updatePackageOption(pkg)
        } else if (pkg.tempId) {
          const { tempId, ...packageData } = pkg
          await productsStore.addPackageOption({ ...packageData, productId: data.id })
        }
      }
      showSuccess(`"${data.name}" updated`)
    } else {
      const newProduct = await productsStore.createProduct(data)
      if (newProduct && packages.length > 0) {
        for (const pkg of packages) {
          const { tempId, ...packageData } = pkg
          await productsStore.addPackageOption({ ...packageData, productId: newProduct.id })
        }
      }
      showSuccess(`"${data.name}" created`)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Save failed'
    showError(msg)
  }
  showProductDialog.value = false
}

// --- Clone ---
function handleCloneItemRequest(ref: HubItemRef) {
  cloneTarget.value = ref
  showCloneConfirm.value = true
}

async function confirmClone() {
  if (!cloneTarget.value) return
  cloning.value = true
  const { showSuccess, showError } = useSnackbar()
  const ref = cloneTarget.value
  const newName = `Copy of ${ref.name}`

  try {
    if (ref.type === 'menu') {
      const cloned = await menuStore.duplicateMenuItem(ref.id, newName)
      showSuccess(`"${newName}" created`)
      if (cloned) {
        editMenuItem.value =
          (menuStore.menuItems as MenuItem[]).find(m => m.id === cloned.id) ?? null
        if (editMenuItem.value) showMenuDialog.value = true
      }
    } else if (ref.type === 'recipe') {
      const cloned = await recipesStore.duplicateRecipe(ref.id, newName)
      showSuccess(`"${newName}" created`)
      editRecipe.value = cloned
      editRecipeType.value = 'recipe'
      showRecipeDialog.value = true
    } else if (ref.type === 'preparation') {
      const cloned = await recipesStore.duplicatePreparation(ref.id, newName)
      showSuccess(`"${newName}" created`)
      editRecipe.value = cloned
      editRecipeType.value = 'preparation'
      showRecipeDialog.value = true
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Clone failed'
    showError(msg)
  } finally {
    cloning.value = false
    showCloneConfirm.value = false
    cloneTarget.value = null
  }
}

async function handleCloneItem(ref: HubItemRef) {
  cloneTarget.value = ref
  await confirmClone()
}

// --- Pending clone from Catalog ---
watch(
  () => props.pendingClone,
  clone => {
    if (clone) {
      handleCloneItem({ id: clone.id, type: clone.type as CreateType, name: clone.name })
      emit('cloneConsumed')
    }
  },
  { immediate: true }
)

// --- Delete (Archive) ---
function handleDeleteItem(ref: HubItemRef) {
  deleteTarget.value = ref
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  const { showSuccess, showError } = useSnackbar()

  try {
    const archiveData = { status: 'archived', isActive: false }
    if (deleteTarget.value.type === 'menu') {
      await menuStore.updateMenuItem(deleteTarget.value.id, archiveData)
    } else if (deleteTarget.value.type === 'recipe') {
      await recipesStore.updateRecipe(deleteTarget.value.id, archiveData)
    } else if (deleteTarget.value.type === 'preparation') {
      await recipesStore.updatePreparation({ id: deleteTarget.value.id, ...archiveData } as any)
    }
    showSuccess(`"${deleteTarget.value.name}" archived`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Archive failed'
    showError(msg)
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}
</script>

<style scoped lang="scss">
.constructor-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.create-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px 16px !important;
}

.create-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }
}

.create-option-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.create-option-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 1px;
}
</style>
