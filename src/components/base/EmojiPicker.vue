<template>
  <div class="emoji-picker">
    <div class="emoji-picker__selected" @click="open = !open">
      <span class="emoji-preview">{{ modelValue || placeholder }}</span>
      <v-icon size="16" class="ml-1">mdi-chevron-down</v-icon>
    </div>

    <v-menu v-model="open" :close-on-content-click="false" location="bottom start" max-width="340">
      <template #activator="{ props }">
        <div v-bind="props" class="emoji-picker__activator" />
      </template>
      <v-card class="emoji-card">
        <v-text-field
          v-model="search"
          placeholder="Search..."
          variant="outlined"
          density="compact"
          hide-details
          autofocus
          class="ma-2"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
        <div class="emoji-grid">
          <template v-for="group in filteredGroups" :key="group.label">
            <div class="emoji-group-label">{{ group.label }}</div>
            <div class="emoji-group-items">
              <button
                v-for="e in group.items"
                :key="e.emoji"
                type="button"
                class="emoji-btn"
                :class="{ 'emoji-btn--active': modelValue === e.emoji }"
                :title="e.name"
                @click="select(e.emoji)"
              >
                {{ e.emoji }}
              </button>
            </div>
          </template>
          <div v-if="filteredGroups.length === 0" class="emoji-empty">No matches</div>
        </div>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const search = ref('')

interface EmojiItem {
  emoji: string
  name: string
}
interface EmojiGroup {
  label: string
  items: EmojiItem[]
}

const groups: EmojiGroup[] = [
  {
    label: 'Meat & Seafood',
    items: [
      { emoji: '\u{1F969}', name: 'meat' },
      { emoji: '\u{1F357}', name: 'poultry leg' },
      { emoji: '\u{1F414}', name: 'chicken' },
      { emoji: '\u{1F953}', name: 'bacon' },
      { emoji: '\u{1F990}', name: 'shrimp' },
      { emoji: '\u{1F99E}', name: 'lobster' },
      { emoji: '\u{1F41F}', name: 'fish' },
      { emoji: '\u{1F980}', name: 'crab' },
      { emoji: '\u{1F419}', name: 'octopus' },
      { emoji: '\u{1F9AA}', name: 'oyster' }
    ]
  },
  {
    label: 'Fruits & Vegetables',
    items: [
      { emoji: '\u{1F34E}', name: 'apple' },
      { emoji: '\u{1F34C}', name: 'banana' },
      { emoji: '\u{1F347}', name: 'grapes' },
      { emoji: '\u{1F353}', name: 'strawberry' },
      { emoji: '\u{1F352}', name: 'cherries' },
      { emoji: '\u{1F34A}', name: 'orange' },
      { emoji: '\u{1F34B}', name: 'lemon' },
      { emoji: '\u{1F349}', name: 'watermelon' },
      { emoji: '\u{1FAD0}', name: 'blueberries' },
      { emoji: '\u{1F951}', name: 'avocado' },
      { emoji: '\u{1F345}', name: 'tomato' },
      { emoji: '\u{1F955}', name: 'carrot' },
      { emoji: '\u{1F33D}', name: 'corn' },
      { emoji: '\u{1F336}', name: 'hot pepper' },
      { emoji: '\u{1F952}', name: 'cucumber' },
      { emoji: '\u{1F96C}', name: 'leafy green' },
      { emoji: '\u{1F954}', name: 'potato' },
      { emoji: '\u{1F9C5}', name: 'onion' },
      { emoji: '\u{1F9C4}', name: 'garlic' },
      { emoji: '\u{1F344}', name: 'mushroom' }
    ]
  },
  {
    label: 'Prepared Food',
    items: [
      { emoji: '\u{1F355}', name: 'pizza' },
      { emoji: '\u{1F354}', name: 'burger' },
      { emoji: '\u{1F35C}', name: 'noodles' },
      { emoji: '\u{1F35B}', name: 'curry rice' },
      { emoji: '\u{1F363}', name: 'sushi' },
      { emoji: '\u{1F959}', name: 'wrap' },
      { emoji: '\u{1F96A}', name: 'sandwich' },
      { emoji: '\u{1F372}', name: 'soup' },
      { emoji: '\u{1F958}', name: 'stew' },
      { emoji: '\u{1F957}', name: 'salad' },
      { emoji: '\u{1F35D}', name: 'spaghetti' },
      { emoji: '\u{1F373}', name: 'egg' },
      { emoji: '\u{1F95A}', name: 'egg raw' }
    ]
  },
  {
    label: 'Bread & Dairy',
    items: [
      { emoji: '\u{1F35E}', name: 'bread' },
      { emoji: '\u{1F950}', name: 'croissant' },
      { emoji: '\u{1FAD3}', name: 'flatbread' },
      { emoji: '\u{1F9C7}', name: 'waffle' },
      { emoji: '\u{1F95B}', name: 'milk' },
      { emoji: '\u{1F9C0}', name: 'cheese' },
      { emoji: '\u{1F9C8}', name: 'butter' }
    ]
  },
  {
    label: 'Sweets & Desserts',
    items: [
      { emoji: '\u{1F370}', name: 'cake' },
      { emoji: '\u{1F382}', name: 'birthday cake' },
      { emoji: '\u{1F36B}', name: 'chocolate' },
      { emoji: '\u{1F369}', name: 'doughnut' },
      { emoji: '\u{1F36A}', name: 'cookie' },
      { emoji: '\u{1F368}', name: 'ice cream' },
      { emoji: '\u{1F36F}', name: 'honey' }
    ]
  },
  {
    label: 'Drinks',
    items: [
      { emoji: '\u{2615}', name: 'coffee' },
      { emoji: '\u{1F375}', name: 'tea' },
      { emoji: '\u{1F9C3}', name: 'juice box' },
      { emoji: '\u{1F964}', name: 'bubble tea' },
      { emoji: '\u{1F37A}', name: 'beer' },
      { emoji: '\u{1F377}', name: 'wine' },
      { emoji: '\u{1F378}', name: 'cocktail' },
      { emoji: '\u{1F379}', name: 'tropical drink' },
      { emoji: '\u{1F95B}', name: 'milk glass' },
      { emoji: '\u{1FAD6}', name: 'teapot' }
    ]
  },
  {
    label: 'Spices & Ingredients',
    items: [
      { emoji: '\u{1F9C2}', name: 'salt' },
      { emoji: '\u{1FAD2}', name: 'olive' },
      { emoji: '\u{1F330}', name: 'chestnut' },
      { emoji: '\u{1F95C}', name: 'peanuts' },
      { emoji: '\u{1F33E}', name: 'rice' },
      { emoji: '\u{1FAD8}', name: 'beans' }
    ]
  },
  {
    label: 'Kitchen & Tools',
    items: [
      { emoji: '\u{1F468}\u{200D}\u{1F373}', name: 'chef' },
      { emoji: '\u{1F52A}', name: 'knife' },
      { emoji: '\u{1F944}', name: 'spoon' },
      { emoji: '\u{1F374}', name: 'fork and knife' },
      { emoji: '\u{1F37D}', name: 'plate' },
      { emoji: '\u{1FAD5}', name: 'fondue' },
      { emoji: '\u{1F9CA}', name: 'ice' }
    ]
  },
  {
    label: 'Other',
    items: [
      { emoji: '\u{2B50}', name: 'star' },
      { emoji: '\u{1F525}', name: 'fire' },
      { emoji: '\u{1F4E6}', name: 'package' },
      { emoji: '\u{1F3F7}', name: 'label' },
      { emoji: '\u{2764}', name: 'heart' },
      { emoji: '\u{1F31F}', name: 'glowing star' },
      { emoji: '\u{1F48E}', name: 'gem' }
    ]
  }
]

const filteredGroups = computed(() => {
  if (!search.value || search.value.length < 2) return groups
  const q = search.value.toLowerCase()
  const result: EmojiGroup[] = []
  for (const group of groups) {
    const items = group.items.filter(
      e => e.name.includes(q) || group.label.toLowerCase().includes(q)
    )
    if (items.length > 0) {
      result.push({ label: group.label, items })
    }
  }
  return result
})

function select(emoji: string) {
  emit('update:modelValue', emoji)
  open.value = false
  search.value = ''
}
</script>

<style scoped lang="scss">
.emoji-picker {
  position: relative;
  display: inline-flex;
}

.emoji-picker__selected {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-width: 70px;
  justify-content: center;
  transition: border-color 0.15s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.emoji-preview {
  font-size: 1.5rem;
  line-height: 1;
}

.emoji-picker__activator {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.emoji-card {
  max-height: 380px;
  display: flex;
  flex-direction: column;
}

.emoji-grid {
  overflow-y: auto;
  padding: 4px 8px 8px;
  flex: 1;
}

.emoji-group-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
  padding: 6px 4px 2px;
}

.emoji-group-items {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  background: none;
  transition: all 0.1s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &--active {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.15);
  }
}

.emoji-empty {
  text-align: center;
  padding: 16px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.85rem;
}
</style>
