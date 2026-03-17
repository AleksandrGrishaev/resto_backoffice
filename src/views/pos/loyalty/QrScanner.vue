<!-- src/views/pos/loyalty/QrScanner.vue -->
<template>
  <div class="qr-scanner">
    <!-- Camera container — always in DOM with real dimensions so html5-qrcode can initialize -->
    <div class="qr-reader-wrapper">
      <div ref="readerEl" class="qr-reader" />

      <!-- Overlay: starting / error states -->
      <div v-if="!scanning" class="qr-overlay d-flex flex-column align-center justify-center">
        <template v-if="error">
          <v-icon size="48" color="error">mdi-camera-off</v-icon>
          <span class="text-body-2 text-medium-emphasis mt-2">{{ error }}</span>
        </template>
        <template v-else>
          <v-progress-circular size="32" width="3" indeterminate color="primary" />
          <span class="text-body-2 text-medium-emphasis mt-2">Starting camera...</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'QrScanner'

const emit = defineEmits<{
  scanned: [token: string]
  error: [message: string]
}>()

const readerEl = ref<HTMLElement>()
const scanning = ref(false)
const error = ref('')

let scanner: Html5Qrcode | null = null
let lastScanToken: string | null = null
let cooldownTimer: ReturnType<typeof setTimeout> | null = null
const READER_ID = 'qr-reader-' + Math.random().toString(36).slice(2, 8)
// Token format: 24 hex chars (12 bytes encoded by Supabase encode(gen_random_bytes(12), 'hex'))
const TOKEN_LENGTH = 24

/**
 * Parse customer token from QR content.
 * Supports:
 * - Full URL: https://winterbali.com/c/{token}
 * - Path only: /c/{token}
 * - Raw token: {token} (exactly 24 hex chars)
 */
function parseToken(raw: string): string | null {
  const trimmed = raw.trim()

  // Try URL with /c/ path
  const urlMatch = trimmed.match(/\/c\/([a-f0-9]{24})\b/i)
  if (urlMatch) return urlMatch[1]

  // Raw hex token (exactly 24 chars)
  if (new RegExp(`^[a-f0-9]{${TOKEN_LENGTH}}$`, 'i').test(trimmed)) return trimmed

  return null
}

async function start() {
  error.value = ''

  if (!readerEl.value) return

  // Set the id for html5-qrcode
  readerEl.value.id = READER_ID

  try {
    scanner = new Html5Qrcode(READER_ID)

    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      },
      onScanSuccess,
      () => {
        // ignore scan failures (no QR in frame)
      }
    )

    scanning.value = true
    DebugUtils.info(MODULE_NAME, 'Camera started')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    DebugUtils.error(MODULE_NAME, 'Camera start failed', { error: msg })

    if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
      error.value = 'Camera access denied. Please allow camera permissions.'
    } else if (msg.includes('NotFoundError') || msg.includes('no camera')) {
      error.value = 'No camera found on this device.'
    } else {
      error.value = `Camera error: ${msg}`
    }
    emit('error', error.value)
  }
}

function onScanSuccess(decodedText: string) {
  const token = parseToken(decodedText)
  if (!token) return

  // Prevent re-scanning the same token (cooldown after error)
  if (token === lastScanToken) return

  lastScanToken = token
  DebugUtils.info(MODULE_NAME, 'QR scanned', { token: token.slice(0, 8) + '...' })

  // Stop scanning after successful read
  stop()
  emit('scanned', token)
}

async function stop() {
  if (cooldownTimer) {
    clearTimeout(cooldownTimer)
    cooldownTimer = null
  }
  const ref = scanner
  scanner = null
  scanning.value = false

  if (ref) {
    try {
      if (ref.isScanning) {
        await ref.stop()
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Scanner stop error', { error: String(err) })
    }
    try {
      ref.clear()
    } catch {
      // clear() may fail if stop() already cleaned up internal state — safe to ignore
    }
  }
}

async function restart() {
  await stop()
  // Cooldown before restarting to prevent tight scan-fail loops
  await new Promise<void>(resolve => {
    cooldownTimer = setTimeout(resolve, 1500)
  })
  lastScanToken = null
  await start()
}

onMounted(() => {
  start()
})

onBeforeUnmount(() => {
  stop()
})

defineExpose({ stop, restart })
</script>

<style scoped lang="scss">
.qr-scanner {
  width: 100%;
}

.qr-reader-wrapper {
  position: relative;
  width: 100%;
  min-height: 300px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.qr-reader {
  width: 100%;
  min-height: 300px;

  // Override html5-qrcode default styles
  :deep(video) {
    border-radius: 8px;
    object-fit: cover;
  }

  :deep(#qr-shaded-region) {
    border-color: rgba(255, 255, 255, 0.4) !important;
  }
}

.qr-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1;
}
</style>
