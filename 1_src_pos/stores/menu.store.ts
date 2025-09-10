// src/stores/menu.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MenuItem, Category, MenuItemVariant } from '@/types/menu'

interface SelectItemPayload {
  item: MenuItem
  variant: MenuItemVariant
  note?: string
}

export const useMenuStore = defineStore('menu', () => {
  // State
  const categories = ref<Category[]>([
    {
      id: 'cat1',
      name: 'Hot Drinks',
      description: 'Warm beverages',
      sortOrder: 1,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'cat2',
      name: 'Cold Drinks',
      description: 'Refreshing cold beverages',
      sortOrder: 2,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 'cat3',
      name: 'Main Dishes',
      description: 'Primary meal options',
      sortOrder: 3,
      isActive: true,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ])

  const items = ref<MenuItem[]>([
    {
      id: 'item1',
      categoryId: 'cat1',
      name: 'Espresso',
      description: 'Strong Italian coffee',
      isActive: true,
      type: 'beverage',
      variants: [{ id: 'var1', name: 'Single', price: 3.5, isActive: true, sortOrder: 1 }],
      sortOrder: 1,
      preparationTime: 3,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: 'item2',
      categoryId: 'cat1',
      name: 'Latte',
      description: 'Espresso with steamed milk',
      isActive: true,
      type: 'beverage',
      variants: [
        { id: 'var3', name: 'Regular', price: 4.5, isActive: true, sortOrder: 1 },
        { id: 'var4', name: 'Large', price: 5.5, isActive: true, sortOrder: 2 }
      ],
      sortOrder: 2,
      preparationTime: 5,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: 'item3',
      categoryId: 'cat2',
      name: 'Iced Coffee',
      description: 'Chilled coffee with ice',
      isActive: true,
      type: 'beverage',
      variants: [
        { id: 'var5', name: 'Regular', price: 4.0, isActive: true, sortOrder: 1 },
        { id: 'var6', name: 'Large', price: 5.0, isActive: true, sortOrder: 2 }
      ],
      sortOrder: 1,
      preparationTime: 4,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: 'item4',
      categoryId: 'cat3',
      name: 'Chicken Rice',
      description: 'Steamed chicken with flavored rice',
      isActive: true,
      type: 'food',
      variants: [
        { id: 'var7', name: 'Regular', price: 12.0, isActive: true, sortOrder: 1 },
        { id: 'var8', name: 'Large', price: 15.0, isActive: true, sortOrder: 2 }
      ],
      sortOrder: 1,
      preparationTime: 15,
      tags: ['popular', 'chicken'],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ])

  const selectedCategory = ref<string | null>(null)

  // Getters
  const activeCategories = computed(() =>
    categories.value.filter(cat => cat.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const itemsByCategory = computed(
    () => (categoryId: string) =>
      items.value
        .filter(item => item.isActive && item.categoryId === categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const allSortedItems = computed(() => {
    const sortedCategories = categories.value
      .filter(cat => cat.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    return sortedCategories.reduce((acc, category) => {
      const categoryItems = items.value
        .filter(item => item.isActive && item.categoryId === category.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return [...acc, ...categoryItems]
    }, [] as MenuItem[])
  })

  const getMenuItemById = computed(() => (id: string) => items.value.find(item => item.id === id))

  const getItemVariantById = computed(() => (itemId: string, variantId: string) => {
    const item = getMenuItemById.value(itemId)
    return item?.variants?.find(variant => variant.id === variantId)
  })

  // Actions
  function selectCategory(categoryId: string | null) {
    selectedCategory.value = categoryId
  }

  return {
    // State
    categories,
    items,
    selectedCategory,

    // Getters
    activeCategories,
    itemsByCategory,
    allSortedItems,
    getMenuItemById,
    getItemVariantById,

    // Actions
    selectCategory
  }
})
