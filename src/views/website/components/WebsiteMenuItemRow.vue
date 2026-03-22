<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { WebsiteMenuItem, VariantDisplayMode } from '@/stores/websiteMenu'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'

const props = defineProps<{
  item: WebsiteMenuItem
  menuItem?: MenuItem
  websiteMenuStore: any
  categoryId: string
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

const editing = ref(false)
const editValue = ref('')
const editInput = ref<HTMLInputElement>()

const displayName = computed(() => {
  if (props.item.displayName) return props.item.displayName
  if (props.item.variantId && props.menuItem) {
    const variant = props.menuItem.variants.find(
      (v: MenuItemVariant) => v.id === props.item.variantId
    )
    return variant ? `${props.menuItem.name} — ${variant.name}` : props.menuItem?.name || '?'
  }
  return props.menuItem?.name || '?'
})

const imageUrl = computed(() => props.item.displayImageUrl || props.menuItem?.imageUrl)

const activeVariants = computed<MenuItemVariant[]>(
  () => props.menuItem?.variants?.filter((v: MenuItemVariant) => v.isActive) || []
)

const variantCount = computed(() => activeVariants.value.length)

const isVariantRow = computed(() => !!props.item.variantId)

const displayMode = computed(() => props.item.variantDisplayMode)

async function toggleDisplayMode(mode: VariantDisplayMode) {
  if (mode === displayMode.value || !props.menuItem) return

  await props.websiteMenuStore.setVariantDisplayMode(
    props.item.id,
    props.categoryId,
    mode,
    props.menuItem.id,
    props.menuItem.name,
    activeVariants.value.map((v: MenuItemVariant) => ({ id: v.id, name: v.name }))
  )
}

function startEdit() {
  editValue.value = props.item.displayName || displayName.value
  editing.value = true
  nextTick(() => editInput.value?.focus())
}

async function saveEdit() {
  editing.value = false
  const newName = editValue.value.trim()
  if (newName && newName !== displayName.value) {
    await props.websiteMenuStore.updateItem(props.item.id, {
      displayName: newName
    })
  }
}

function cancelEdit() {
  editing.value = false
}
</script>

<template>
  <div class="item-row d-flex align-center pa-2 rounded mb-1">
    <v-icon class="item-drag-handle mr-2 cursor-grab" size="18" color="grey-lighten-1">
      mdi-drag-vertical
    </v-icon>

    <v-avatar size="32" rounded class="mr-2" color="grey-lighten-3">
      <v-img v-if="imageUrl" :src="imageUrl" cover />
      <v-icon v-else size="18" color="grey">mdi-food</v-icon>
    </v-avatar>

    <div class="flex-grow-1 overflow-hidden">
      <div class="d-flex align-center">
        <!-- Inline edit mode -->
        <input
          v-if="editing"
          ref="editInput"
          v-model="editValue"
          class="edit-input text-body-2"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
          @blur="saveEdit"
        />

        <!-- Display mode -->
        <span
          v-else
          class="text-body-2 font-weight-medium text-truncate editable-name"
          title="Double-click to edit name"
          @dblclick="startEdit"
        >
          {{ displayName }}
        </span>

        <v-chip
          v-if="isVariantRow && !editing"
          size="x-small"
          class="ml-1"
          variant="tonal"
          color="info"
        >
          variant
        </v-chip>

        <v-btn
          v-if="!editing"
          icon="mdi-pencil"
          size="x-small"
          variant="text"
          color="grey-lighten-1"
          class="ml-1 edit-btn"
          @click="startEdit"
        />
      </div>

      <!-- Variant display mode toggle (only for non-variant parent rows with multiple variants) -->
      <div v-if="!isVariantRow && variantCount > 1" class="mt-1">
        <v-btn-toggle
          :model-value="displayMode"
          density="compact"
          mandatory
          divided
          variant="outlined"
          color="primary"
          size="x-small"
        >
          <v-btn value="options" size="x-small" @click="toggleDisplayMode('options')">
            Options
          </v-btn>
          <v-btn value="separate" size="x-small" @click="toggleDisplayMode('separate')">
            Separate
          </v-btn>
        </v-btn-toggle>
        <span class="text-caption text-grey ml-2">{{ variantCount }} variants</span>
      </div>
    </div>

    <v-btn
      icon="mdi-close"
      size="x-small"
      variant="text"
      color="grey"
      @click="emit('remove', item.id)"
    />
  </div>
</template>

<style scoped>
.item-row {
  border: 1px solid transparent;
  transition: all 0.15s;
}

.item-row:hover {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

.cursor-grab {
  cursor: grab;
}

.editable-name {
  cursor: default;
}

.edit-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.item-row:hover .edit-btn {
  opacity: 1;
}

.edit-input {
  background: transparent;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  width: 100%;
  max-width: 280px;
  color: inherit;
  font-family: inherit;
}
</style>
