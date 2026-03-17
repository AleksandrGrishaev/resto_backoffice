<template>
  <div class="image-uploader">
    <!-- Current image or placeholder -->
    <div
      class="image-uploader__preview"
      :class="{ 'image-uploader__preview--has-image': modelValue }"
      @click="openFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- Loading overlay -->
      <div v-if="imageUpload.isUploading.value" class="image-uploader__loading">
        <v-progress-circular indeterminate color="primary" size="40" />
      </div>

      <!-- Current image -->
      <template v-else-if="modelValue">
        <img
          v-if="!imageError"
          :src="modelValue"
          class="image-uploader__image"
          @error="imageError = true"
        />
        <!-- Broken image fallback (transient error — don't erase URL) -->
        <div v-else class="image-uploader__broken">
          <v-icon icon="mdi-image-broken-variant" size="32" color="warning" />
        </div>
      </template>

      <!-- Empty state -->
      <div
        v-else
        class="image-uploader__empty"
        :class="{ 'image-uploader__empty--dragging': isDragging }"
      >
        <v-icon icon="mdi-image-plus" size="36" color="grey" />
        <span class="text-caption text-medium-emphasis mt-1">Click or drop image</span>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="modelValue && !imageUpload.isUploading.value" class="image-uploader__actions">
      <v-btn
        icon="mdi-pencil"
        size="x-small"
        variant="tonal"
        color="primary"
        @click="openFilePicker"
      />
      <v-btn icon="mdi-delete" size="x-small" variant="tonal" color="error" @click="handleRemove" />
    </div>

    <!-- Error -->
    <div v-if="imageUpload.error.value" class="text-caption text-error mt-1">
      {{ imageUpload.error.value }}
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="d-none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImageUpload } from '@/composables/useImageUpload'
import { useSnackbar } from '@/composables/useSnackbar'

interface Props {
  modelValue: string // current image URL
  itemId: string
  itemName: string // dish name — used for SEO-friendly file slug
  subfolder?: string // storage subfolder (default: 'items')
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [url: string]
}>()

const imageUpload = useImageUpload()
const { showSuccess, showError } = useSnackbar()

const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)
const imageError = ref(false)

// Reset error state when URL changes (e.g. after re-upload)
watch(
  () => props.modelValue,
  () => {
    imageError.value = false
  }
)

function openFilePicker() {
  if (imageUpload.isUploading.value) return
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) uploadFile(file)
  // Reset input so the same file can be re-selected
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (imageUpload.isUploading.value) return
  const file = event.dataTransfer?.files[0]
  if (file && imageUpload.isValidFile(file)) {
    uploadFile(file)
  }
}

async function uploadFile(file: File) {
  try {
    const result = await imageUpload.upload(
      file,
      props.itemId,
      props.itemName,
      props.modelValue || undefined,
      props.subfolder || 'items'
    )
    emit('update:modelValue', result.url)
    showSuccess('Image uploaded')
  } catch {
    showError('Failed to upload image')
  }
}

async function handleRemove() {
  if (!props.modelValue) return
  try {
    await imageUpload.remove(props.modelValue)
    emit('update:modelValue', '')
    showSuccess('Image removed')
  } catch {
    showError('Failed to remove image')
  }
}
</script>

<style lang="scss" scoped>
.image-uploader {
  position: relative;
  width: 120px;

  &__preview {
    width: 120px;
    height: 120px;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 2px dashed rgba(255, 255, 255, 0.15);
    transition: border-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);

    &:hover {
      border-color: rgba(255, 255, 255, 0.3);
    }

    &--has-image {
      border-style: solid;
      border-color: rgba(255, 255, 255, 0.1);
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__broken {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(255, 152, 0, 0.08);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transition: background 0.2s;

    &--dragging {
      background: rgba(var(--v-theme-primary), 0.1);
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  &__actions {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin-top: 4px;
  }
}
</style>
