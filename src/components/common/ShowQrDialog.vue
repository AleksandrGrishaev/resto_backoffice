<!-- src/components/common/ShowQrDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-center pt-4">
        {{ title }}
      </v-card-title>
      <v-card-text class="d-flex flex-column align-center pa-6">
        <div v-if="loading" class="d-flex align-center justify-center" style="height: 200px">
          <v-progress-circular indeterminate size="48" />
        </div>
        <template v-else-if="qrDataUrl">
          <img :src="qrDataUrl" alt="QR Code" style="width: 280px; height: 280px" />
          <p
            class="text-body-2 text-medium-emphasis mt-3 text-center"
            style="word-break: break-all"
          >
            {{ url }}
          </p>
        </template>
        <v-alert v-else-if="error" type="error" variant="tonal" class="w-100">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-center pb-4">
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  modelValue: boolean
  url: string
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const qrDataUrl = ref('')
const loading = ref(false)
const error = ref('')

watch(
  () => props.modelValue,
  async open => {
    if (open && props.url) {
      loading.value = true
      error.value = ''
      qrDataUrl.value = ''
      try {
        qrDataUrl.value = await QRCode.toDataURL(props.url, {
          width: 280,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        })
      } catch (e) {
        error.value = 'Failed to generate QR code'
        console.error('QR generation error:', e)
      } finally {
        loading.value = false
      }
    }
  }
)
</script>
