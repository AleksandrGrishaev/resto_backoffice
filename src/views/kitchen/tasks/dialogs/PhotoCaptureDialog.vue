<script setup lang="ts">
// PhotoCaptureDialog — camera capture + preview + confirm for production task photos
// Uses HTML5 file input with capture="environment" (rear camera on tablets)
// Compresses via useProductionPhoto composable before upload

import { ref, watch, onUnmounted } from 'vue'
import { useProductionPhoto } from '@/composables/useProductionPhoto'

const props = defineProps<{
  modelValue: boolean
  department: string
  preparationId: string
  preparationName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirmed: [photoUrl: string]
}>()

const { upload, isUploading, error } = useProductionPhoto()

const previewUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()

// Reset state when dialog opens
watch(
  () => props.modelValue,
  open => {
    if (open) {
      previewUrl.value = null
      selectedFile.value = null
      error.value = null
    }
  }
)

// Cleanup object URL on unmount
onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function close() {
  // Revoke preview object URL to free memory
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  emit('update:modelValue', false)
}

function triggerCapture() {
  fileInput.value?.click()
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  selectedFile.value = file

  // Revoke old preview URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file)

  // Reset input so same file can be re-selected
  input.value = ''
}

function handleRetake() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
  selectedFile.value = null
  triggerCapture()
}

async function handleConfirm() {
  if (!selectedFile.value) return

  try {
    const photoUrl = await upload(selectedFile.value, props.department, props.preparationId)
    emit('confirmed', photoUrl)
    close()
  } catch {
    // error is displayed via error ref
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <v-card class="photo-dialog">
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-camera</v-icon>
        Take Photo
        <v-spacer />
        <v-btn icon size="small" variant="text" :disabled="isUploading" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Hidden file input with camera capture -->
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          style="display: none"
          @change="handleFileSelected"
        />

        <!-- No photo yet: show capture button -->
        <div v-if="!previewUrl" class="capture-area" @click="triggerCapture">
          <v-icon size="64" color="grey-lighten-1">mdi-camera-plus-outline</v-icon>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Tap to take a photo of
            <br />
            <strong>{{ preparationName }}</strong>
          </p>
          <p class="text-caption text-disabled mt-1">Photo of finished item with visible label</p>
        </div>

        <!-- Preview -->
        <div v-else class="preview-area">
          <img :src="previewUrl" alt="Production photo preview" class="preview-image" />
        </div>

        <!-- Error -->
        <v-alert v-if="error" type="error" density="compact" variant="tonal" class="mt-3">
          {{ error }}
        </v-alert>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 pt-0">
        <template v-if="previewUrl">
          <v-btn variant="outlined" :disabled="isUploading" @click="handleRetake">
            <v-icon start>mdi-camera-retake</v-icon>
            Retake
          </v-btn>
          <v-spacer />
          <v-btn
            color="success"
            variant="flat"
            :loading="isUploading"
            :disabled="isUploading"
            @click="handleConfirm"
          >
            <v-icon start>mdi-check</v-icon>
            Use Photo
          </v-btn>
        </template>
        <template v-else>
          <v-spacer />
          <v-btn variant="text" @click="close">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="triggerCapture">
            <v-icon start>mdi-camera</v-icon>
            Take Photo
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.photo-dialog {
  border-radius: 12px !important;
}

.capture-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s;

  &:active {
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}

.preview-area {
  display: flex;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000;
}

.preview-image {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
}
</style>
