<template>
  <div class="variant-item">
    <!-- Заголовок варианта -->
    <div class="variant-item__header d-flex align-center mb-2">
      <div class="text-subtitle-2">Вариант {{ index + 1 }}</div>
      <v-spacer />
      <v-btn
        size="small"
        color="error"
        variant="text"
        :disabled="!canDelete"
        @click="$emit('delete')"
      >
        <v-icon icon="mdi-delete" size="20" />
      </v-btn>
    </div>

    <!-- Основные поля варианта -->
    <div class="variant-item__fields">
      <div class="d-flex gap-2 mb-3">
        <v-text-field
          v-model="localVariant.name"
          label="Название варианта"
          hide-details="auto"
          placeholder="Оставьте пустым если не требуется"
          class="flex-grow-1"
          bg-color="surface"
          @update:model-value="emitUpdate"
        />
        <v-text-field
          v-model.number="localVariant.price"
          type="number"
          label="Цена"
          hide-details="auto"
          suffix="IDR"
          :rules="[v => v > 0 || 'Цена должна быть больше 0']"
          required
          style="width: 150px"
          bg-color="surface"
          @update:model-value="emitUpdate"
        />
      </div>

      <!-- Источник варианта (если нет общего источника) -->
      <div v-if="!hasCommonSource" class="mb-3">
        <v-select
          v-model="localVariant.source"
          :items="sourceOptions"
          item-title="displayName"
          item-value="source"
          label="Источник варианта"
          return-object
          clearable
          hide-details="auto"
          bg-color="surface"
          @update:model-value="handleSourceChange"
        >
          <template #selection="{ item }">
            <v-chip color="secondary" variant="outlined" size="small">
              <v-icon :icon="getSourceIcon(item.raw.source.type)" size="14" class="mr-1" />
              {{ item.raw.displayName }}
            </v-chip>
          </template>
        </v-select>
      </div>

      <!-- Множитель порции (для простых рецептов) -->
      <div v-if="showPortionMultiplier" class="mb-3">
        <v-text-field
          v-model.number="localVariant.portionMultiplier"
          type="number"
          label="Множитель порции"
          hide-details="auto"
          step="0.1"
          min="0.1"
          placeholder="1.0"
          bg-color="surface"
          @update:model-value="emitUpdate"
        />
      </div>

      <!-- Композиция (если нет источника ни у блюда, ни у варианта) -->
      <div v-if="showComposition" class="composition-section">
        <div class="d-flex align-center mb-2">
          <div class="text-subtitle-2">Композиция</div>
          <v-spacer />
          <v-btn size="small" variant="text" color="primary" @click="addComponent">
            <v-icon icon="mdi-plus" size="16" class="mr-1" />
            Компонент
          </v-btn>
        </div>

        <div
          v-if="!localVariant.composition || localVariant.composition.length === 0"
          class="text-caption text-medium-emphasis mb-2"
        >
          Добавьте компоненты для создания композитного блюда
        </div>

        <div
          v-for="(component, compIndex) in localVariant.composition"
          :key="compIndex"
          class="composition-item mb-2"
        >
          <div class="d-flex gap-2 align-center">
            <!-- Источник компонента -->
            <v-select
              v-model="component.sourceRef"
              :items="compositionSourceOptions"
              item-title="displayName"
              item-value="source"
              label="Компонент"
              return-object
              hide-details="auto"
              bg-color="background"
              style="min-width: 200px"
              @update:model-value="updateComponentFromSource(component, $event)"
            >
              <template #selection="{ item }">
                <v-chip color="info" variant="outlined" size="small">
                  <v-icon :icon="getSourceIcon(item.raw.source.type)" size="12" class="mr-1" />
                  {{ item.raw.displayName }}
                </v-chip>
              </template>
            </v-select>

            <!-- Количество -->
            <v-text-field
              v-model.number="component.quantity"
              type="number"
              label="Кол-во"
              hide-details="auto"
              bg-color="background"
              style="width: 100px"
              @update:model-value="emitUpdate"
            />

            <!-- Единицы -->
            <v-select
              v-model="component.unit"
              :items="unitOptions"
              label="Ед."
              hide-details="auto"
              bg-color="background"
              style="width: 100px"
              @update:model-value="emitUpdate"
            />

            <!-- Роль -->
            <v-select
              v-model="component.role"
              :items="roleOptions"
              label="Роль"
              hide-details="auto"
              bg-color="background"
              style="width: 120px"
              @update:model-value="emitUpdate"
            />

            <!-- Удалить -->
            <v-btn
              size="small"
              color="error"
              variant="text"
              icon
              @click="removeComponent(compIndex)"
            >
              <v-icon icon="mdi-delete" size="16" />
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Предпросмотр -->
      <div class="variant-preview mt-3">
        <div class="variant-preview__label text-caption text-medium-emphasis mb-1">
          Предпросмотр:
        </div>
        <div class="variant-preview__content d-flex justify-space-between align-center">
          <div class="text-body-2">
            {{ getFullItemName(itemName, localVariant.name) }}
          </div>
          <div class="variant-preview__price">{{ formatPrice(localVariant.price) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MenuItemVariant, MenuComposition, SourceOption } from '@/types/menu'

interface ExtendedMenuItemVariant extends MenuItemVariant {
  source?: SourceOption | null
}

interface Props {
  variant: ExtendedMenuItemVariant
  index: number
  canDelete: boolean
  itemName: string
  hasCommonSource: boolean
  commonSource?: SourceOption | null
  sourceOptions: SourceOption[]
  compositionSourceOptions: SourceOption[]
  unitOptions: Array<{ title: string; value: string }>
  roleOptions: Array<{ title: string; value: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:variant': [ExtendedMenuItemVariant]
  delete: []
}>()

// Local copy для предотвращения мутаций
const localVariant = ref<ExtendedMenuItemVariant>({ ...props.variant })

// Computed
const showPortionMultiplier = computed(() => {
  return (
    props.commonSource?.source.type === 'recipe' ||
    localVariant.value.source?.source.type === 'recipe'
  )
})

const showComposition = computed(() => {
  return !props.hasCommonSource && !localVariant.value.source
})

// Methods
function emitUpdate() {
  emit('update:variant', { ...localVariant.value })
}

function handleSourceChange(sourceOption: SourceOption | null) {
  localVariant.value.source = sourceOption
  // Очищаем композицию при выборе источника
  if (sourceOption && localVariant.value.composition) {
    localVariant.value.composition = []
  }
  emitUpdate()
}

function addComponent() {
  if (!localVariant.value.composition) {
    localVariant.value.composition = []
  }
  localVariant.value.composition.push({
    type: 'product',
    id: '',
    quantity: 0,
    unit: 'gram',
    role: 'main'
  })
  emitUpdate()
}

function removeComponent(index: number) {
  if (localVariant.value.composition) {
    localVariant.value.composition.splice(index, 1)
    emitUpdate()
  }
}

function updateComponentFromSource(
  component: MenuComposition & { sourceRef?: SourceOption },
  sourceOption: SourceOption | null
) {
  if (sourceOption) {
    component.type = sourceOption.source.type as any
    component.id = sourceOption.source.id
    component.sourceRef = sourceOption
  } else {
    component.type = 'product'
    component.id = ''
    component.sourceRef = undefined
  }
  emitUpdate()
}

function getFullItemName(itemName: string, variantName: string): string {
  return variantName ? `${itemName} (${variantName})` : itemName
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

function getSourceIcon(type: string): string {
  switch (type) {
    case 'product':
      return 'mdi-package-variant'
    case 'recipe':
      return 'mdi-chef-hat'
    case 'preparation':
      return 'mdi-food-variant'
    default:
      return 'mdi-help-circle'
  }
}

// Watch for external changes
watch(
  () => props.variant,
  newVariant => {
    localVariant.value = { ...newVariant }
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.variant-item {
  background: var(--color-background);
  border-radius: 8px;
  padding: 16px;

  &__header {
    padding: 0 4px;
  }
}

.composition-section {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
}

.composition-item {
  background: var(--color-background);
  border-radius: 6px;
  padding: 8px;
}

.variant-preview {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 16px;

  &__price {
    font-weight: 500;
    color: var(--color-primary);
    padding: 4px 8px;
    background: var(--color-background);
    border-radius: 4px;
    min-width: 120px;
    text-align: right;
  }
}

.gap-2 {
  gap: 8px;
}
</style>
