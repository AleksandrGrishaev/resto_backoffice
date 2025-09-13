<!-- src/views/pos/tables/dialogs/OrderTypeDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="order-type-dialog">
      <v-card-text class="dialog-content">
        <div class="order-types-grid">
          <!-- Delivery Button -->
          <v-btn
            class="order-type-btn delivery-btn"
            variant="outlined"
            size="x-large"
            :loading="loading && selectedType === 'delivery'"
            :disabled="loading"
            @click="handleOrderType('delivery')"
          >
            <template #prepend>
              <v-icon icon="mdi-bike-fast" size="32" />
            </template>
            <div class="btn-content">
              <div class="btn-title">Delivery</div>
              <div class="btn-subtitle">Door to door</div>
            </div>
          </v-btn>

          <!-- Takeaway Button -->
          <v-btn
            class="order-type-btn takeaway-btn"
            variant="outlined"
            size="x-large"
            :loading="loading && selectedType === 'takeaway'"
            :disabled="loading"
            @click="handleOrderType('takeaway')"
          >
            <template #prepend>
              <v-icon icon="mdi-shopping" size="32" />
            </template>
            <div class="btn-content">
              <div class="btn-title">Takeaway</div>
              <div class="btn-subtitle">Pick up</div>
            </div>
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-btn variant="text" block :disabled="loading" @click="handleCancel">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OrderType } from '@/types/order'
import { useOrders } from '@/stores/pos/orders/composables/useOrders'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'create-order': [type: OrderType]
}>()

// =============================================
// COMPOSABLES
// =============================================

const { loading } = useOrders()

// =============================================
// STATE
// =============================================

const selectedType = ref<OrderType | null>(null)

// =============================================
// METHODS
// =============================================

/**
 * Обработать выбор типа заказа
 */
async function handleOrderType(type: OrderType): Promise<void> {
  selectedType.value = type

  try {
    // Просто эмитим тип заказа
    emit('create-order', type)
    handleClose()
  } catch (error) {
    console.error('Order creation error:', error)
    selectedType.value = null
  }
}

/**
 * Отменить создание заказа
 */
function handleCancel(): void {
  handleClose()
}

/**
 * Закрыть диалог и сбросить состояние
 */
function handleClose(): void {
  emit('update:modelValue', false)

  // Сбросить состояние после закрытия анимации
  setTimeout(() => {
    selectedType.value = null
  }, 300)
}
</script>

<style scoped>
/* =============================================
   DIALOG STRUCTURE
   ============================================= */

.order-type-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-content {
  padding: 32px 24px 24px 24px;
}

.dialog-actions {
  padding: 0 24px 24px 24px;
}

/* =============================================
   ORDER TYPE BUTTONS
   ============================================= */

.order-types-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.order-type-btn {
  height: 140px !important;
  border-radius: 16px;
  border-width: 2px;
  transition: all 0.2s ease;
  text-transform: none;
  font-size: inherit;
}

.order-type-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgb(var(--v-theme-primary));
}

.delivery-btn:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.takeaway-btn:hover {
  background-color: rgba(var(--v-theme-success), 0.05);
  border-color: rgb(var(--v-theme-success));
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.btn-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.2;
}

.btn-subtitle {
  font-size: 0.9375rem;
  opacity: 0.7;
  line-height: 1;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 480px) {
  .order-types-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .order-type-btn {
    height: 120px !important;
  }

  .dialog-content {
    padding: 24px 16px 16px 16px;
  }

  .dialog-actions {
    padding: 0 16px 16px 16px;
  }

  .btn-title {
    font-size: 1rem;
  }

  .btn-subtitle {
    font-size: 0.875rem;
  }
}

/* =============================================
   LOADING STATE
   ============================================= */

.order-type-btn:disabled {
  opacity: 0.6;
}

/* =============================================
   FOCUS STATES
   ============================================= */

.order-type-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
