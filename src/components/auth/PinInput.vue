// src/components/auth/PinInput.vue
<template>
  <div class="pin-input">
    <v-text-field
      v-model="pin"
      type="password"
      label="Enter PIN"
      maxlength="4"
      :rules="[rules.required, rules.length]"
      :loading="loading"
      :disabled="loading"
      @keyup.enter="handleSubmit"
    />
    <v-btn
      block
      color="primary"
      size="large"
      :loading="loading"
      :disabled="!isValid || loading"
      @click="handleSubmit"
    >
      Login
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PinInput'

const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [pin: string]
}>()

const pin = ref('')

const rules = {
  required: (v: string) => !!v || 'PIN is required',
  length: (v: string) => v.length === 4 || 'PIN must be 4 digits'
}

const isValid = computed(() => {
  return pin.value.length === 4
})

const handleSubmit = () => {
  if (!isValid.value) return

  DebugUtils.debug(MODULE_NAME, 'PIN submitted')
  emit('submit', pin.value)
}
</script>
