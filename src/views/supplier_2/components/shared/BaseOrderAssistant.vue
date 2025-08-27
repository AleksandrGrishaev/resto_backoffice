<!-- src/views/supplier_2/components/shared/BaseOrderAssistant.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useOrderAssistant } from '@/stores/supplier_2/composables/useOrderAssistant'
import type { OrderSuggestion, Department } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', message: string): void
  (e: 'error', message: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES - с безопасной деструктуризацией
// =============================================

const orderAssistant = useOrderAssistant()

// Безопасное получение свойств из composable
const selectedDepartment = computed(() => orderAssistant.selectedDepartment?.value || 'kitchen')
const selectedItems = computed(() => orderAssistant.selectedItems?.value || [])
const isGenerating = computed(() => orderAssistant.isGenerating?.value || false)
const filteredSuggestions = computed(() => orderAssistant.filteredSuggestions?.value || [])
const urgentSuggestions = computed(() => orderAssistant.urgentSuggestions?.value || [])
const requestSummary = computed(
  () => orderAssistant.requestSummary?.value || { totalItems: 0, estimatedTotal: 0 }
)
const isLoading = computed(() => orderAssistant.isLoading?.value || false)

// Безопасное получение методов
const generateSuggestions = orderAssistant.generateSuggestions || (() => Promise.resolve())
const addSuggestionToRequest = orderAssistant.addSuggestionToRequest || (() => {})
const addManualItemToRequest = orderAssistant.addManualItem || (() => {})
const removeItemFromRequest = orderAssistant.removeItemFromRequest || (() => {})
const clearSelectedItems = orderAssistant.clearSelectedItems || (() => {})
const createRequestFromItems =
  orderAssistant.createRequestFromItems || (() => Promise.resolve({ requestNumber: 'TEST' }))
const changeDepartment = orderAssistant.changeDepartment || (() => Promise.resolve())
const isSuggestionAdded = orderAssistant.isSuggestionAdded || (() => false)
const getEstimatedPrice = orderAssistant.getEstimatedPrice || (() => 0)
const formatCurrency =
  orderAssistant.formatCurrency || ((val: number) => `Rp ${val.toLocaleString()}`)
const getUrgencyColor = orderAssistant.getUrgencyColor || (() => 'primary')
const getUrgencyIcon = orderAssistant.getUrgencyIcon || (() => 'mdi-information')

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const isCreating = ref(false)
const requestedBy = ref('Chef Maria') // Default value
const priority = ref<'normal' | 'urgent'>('normal')

// Department selection state - безопасная инициализация
const selectedDepartmentIndex = ref<Department>('kitchen')

// Manual item form
const manualItem = ref({
  itemId: '',
  itemName: '',
  quantity: 1,
  unit: 'kg',
  notes: ''
})

// Mock available products (in real app, this would come from ProductsStore)
const availableProducts = ref([
  { id: 'prod-beef-steak', name: 'Beef Steak', unit: 'kg' },
  { id: 'prod-potato', name: 'Potato', unit: 'kg' },
  { id: 'prod-garlic', name: 'Garlic', unit: 'kg' },
  { id: 'prod-tomato', name: 'Fresh Tomato', unit: 'kg' },
  { id: 'prod-beer-bintang-330', name: 'Bintang Beer 330ml', unit: 'piece' },
  { id: 'prod-cola-330', name: 'Coca-Cola 330ml', unit: 'piece' },
  { id: 'prod-butter', name: 'Butter', unit: 'kg' }
])

// =============================================
// COMPUTED - с безопасными проверками
// =============================================

const canAddManualItem = computed(() => {
  try {
    return (
      manualItem.value.itemId &&
      manualItem.value.quantity > 0 &&
      Array.isArray(selectedItems.value) &&
      !selectedItems.value.some(item => item.itemId === manualItem.value.itemId)
    )
  } catch (error) {
    console.warn('Error in canAddManualItem:', error)
    return false
  }
})

const canCreateRequest = computed(() => {
  try {
    return (
      Array.isArray(selectedItems.value) &&
      selectedItems.value.length > 0 &&
      requestedBy.value.trim() !== '' &&
      !isCreating.value
    )
  } catch (error) {
    console.warn('Error in canCreateRequest:', error)
    return false
  }
})

// =============================================
// METHODS
// =============================================

async function handleDepartmentChange() {
  try {
    if (changeDepartment && typeof changeDepartment === 'function') {
      await changeDepartment(selectedDepartmentIndex.value as Department)
    }
    resetManualItem()
  } catch (error) {
    console.error('Error changing department:', error)
    emits('error', 'Failed to change department')
  }
}

function updateManualItemName() {
  const product = availableProducts.value.find(p => p.id === manualItem.value.itemId)
  if (product) {
    manualItem.value.itemName = product.name
    manualItem.value.unit = product.unit
  }
}

function addManualItem() {
  try {
    if (addManualItemToRequest && typeof addManualItemToRequest === 'function') {
      addManualItemToRequest(
        manualItem.value.itemId,
        manualItem.value.itemName,
        manualItem.value.quantity,
        manualItem.value.unit,
        manualItem.value.notes || undefined
      )
    }
    resetManualItem()
  } catch (error) {
    console.error('Error adding manual item:', error)
    emits('error', 'Failed to add item')
  }
}

function resetManualItem() {
  manualItem.value = {
    itemId: '',
    itemName: '',
    quantity: 1,
    unit: 'kg',
    notes: ''
  }
}

async function createRequest() {
  if (!canCreateRequest.value) return

  try {
    isCreating.value = true

    if (createRequestFromItems && typeof createRequestFromItems === 'function') {
      const request = await createRequestFromItems(
        requestedBy.value.trim(),
        priority.value,
        `Created via Order Assistant for ${selectedDepartment.value}`
      )

      emits('success', `Request ${request.requestNumber} created successfully!`)
      closeDialog()
    } else {
      throw new Error('createRequestFromItems function not available')
    }
  } catch (error: any) {
    console.error('Error creating request:', error)
    emits('error', error.message || 'Failed to create request')
  } finally {
    isCreating.value = false
  }
}

function closeDialog() {
  isOpen.value = false

  // Reset form after animation completes
  setTimeout(() => {
    resetForm()
  }, 300)
}

function resetForm() {
  if (clearSelectedItems && typeof clearSelectedItems === 'function') {
    clearSelectedItems()
  }
  resetManualItem()
  requestedBy.value = 'Chef Maria'
  priority.value = 'normal'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric'
  })
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  // Безопасная синхронизация начального значения департамента
  try {
    if (selectedDepartment.value) {
      selectedDepartmentIndex.value = selectedDepartment.value as Department
    }
  } catch (error) {
    console.warn('Error synchronizing department on mount:', error)
    selectedDepartmentIndex.value = 'kitchen' // fallback
  }
})

// =============================================
// WATCHERS
// =============================================

// Auto-generate suggestions when dialog opens
watch(isOpen, newValue => {
  if (newValue && generateSuggestions && typeof generateSuggestions === 'function') {
    generateSuggestions().catch(error => {
      console.warn('Error generating suggestions:', error)
    })
  }
})

// Sync department selection - с безопасной проверкой
watch(
  selectedDepartment,
  newValue => {
    try {
      if (newValue) {
        selectedDepartmentIndex.value = newValue as Department
      }
    } catch (error) {
      console.warn('Error syncing department:', error)
    }
  },
  { immediate: true }
)
</script>
