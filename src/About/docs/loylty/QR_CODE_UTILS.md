# QR Code Utilities

## Overview

The project uses QR codes in two contexts:

1. **Thermal printer** (ESC/POS) — via `EscPosCommandBuilder.qrCode()` (no JS library needed)
2. **Screen display** — via `qrcode` npm package (generates Data URL images)

## Dependencies

```json
{
  "qrcode": "^1.5.4",
  "@types/qrcode": "^1.5.6" // devDependency
}
```

## Reusable Component: ShowQrDialog

**Location:** `src/components/common/ShowQrDialog.vue`

A dialog that displays a QR code on screen. Useful for testing without a thermal printer or for showing QR codes to customers directly from the screen.

### Usage

```vue
<template>
  <ShowQrDialog v-model="showDialog" :url="qrUrl" title="Invite QR Code" />
</template>

<script setup lang="ts">
import ShowQrDialog from '@/components/common/ShowQrDialog.vue'
import { ref } from 'vue'

const showDialog = ref(false)
const qrUrl = ref('https://winterbali.com/join/abc123')
</script>
```

### Props

| Prop         | Type      | Required | Description                          |
| ------------ | --------- | -------- | ------------------------------------ |
| `modelValue` | `boolean` | Yes      | Controls dialog visibility (v-model) |
| `url`        | `string`  | Yes      | URL/text to encode as QR code        |
| `title`      | `string`  | No       | Dialog title (default: none)         |

### Direct QR Code Generation

For custom use cases, use the `qrcode` library directly:

```typescript
import QRCode from 'qrcode'

// Generate Data URL (for <img> tags)
const dataUrl = await QRCode.toDataURL('https://example.com', {
  width: 280,
  margin: 2,
  color: { dark: '#000000', light: '#ffffff' }
})

// Generate to canvas
await QRCode.toCanvas(canvasElement, 'https://example.com')

// Generate SVG string
const svg = await QRCode.toString('https://example.com', { type: 'svg' })
```

## Current Usage

### 1. LoyaltyPanel (POS)

**File:** `src/views/pos/loyalty/LoyaltyPanel.vue`

- **Print Invite QR** — sends QR to thermal printer (requires Bluetooth connection)
- **Show QR** — displays QR on screen via `ShowQrDialog` (no printer needed)

Both buttons generate a customer invite URL via `create_customer_invite` RPC.

### 2. PaymentDialog (POS)

**File:** `src/views/pos/payment/PaymentDialog.vue`

Pre-bill printing auto-generates order invite QR for orders without a customer attached.

### 3. Thermal Printer

**File:** `src/core/printing/EscPosCommandBuilder.ts`

```typescript
// ESC/POS QR code (thermal printer only, no JS library)
cmd.qrCode('https://winterbali.com/join/token', 6) // size 1-8
```

## Customer Invite Flow

```
Staff creates customer in POS
  → "Show QR" / "Print Invite QR"
  → create_customer_invite RPC (30-day token)
  → QR encodes: https://winterbali.com/join/{token}
  → Customer scans → web-winter /join page
  → Auth (Google/Telegram) → claim_invite RPC
  → Identity linked to POS customer
```
