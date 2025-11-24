# Next Sprint - Product Categories Table

**Created:** 2025-11-24
**Priority:** High
**Status:** 🚀 Ready to Start

---

## 🎯 Sprint Goal

> **Create `product_categories` table and integrate into existing products store**
>
> Simple refactoring:
>
> 1. Create categories table in database
> 2. Migrate products.category from string to UUID
> 3. Update products store to load categories
> 4. Update components to display categories

---

## 📋 Tasks

### Phase 1: Database Schema

- [ ] **1.1 Create product_categories table**

  ```sql
  -- Migration: create_product_categories
  CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes
  CREATE UNIQUE INDEX idx_product_categories_key ON product_categories(key);
  CREATE INDEX idx_product_categories_sort ON product_categories(sort_order);

  -- RLS
  ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Allow read for authenticated"
    ON product_categories FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Allow all for admins"
    ON product_categories FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND 'admin' = ANY(users.roles)
      )
    );

  -- Seed data
  INSERT INTO product_categories (key, name, color, sort_order) VALUES
    ('meat', 'Meat & Poultry', 'red', 1),
    ('vegetables', 'Vegetables', 'green', 2),
    ('fruits', 'Fruits', 'orange', 3),
    ('dairy', 'Dairy Products', 'blue', 4),
    ('cereals', 'Grains & Cereals', 'amber', 5),
    ('spices', 'Spices & Condiments', 'purple', 6),
    ('seafood', 'Seafood', 'cyan', 7),
    ('beverages', 'Beverages', 'indigo', 8),
    ('other', 'Other', 'grey', 9);
  ```

- [ ] **1.2 Migrate products.category to foreign key**

  ```sql
  -- Migration: migrate_products_category

  -- Add new column
  ALTER TABLE products ADD COLUMN category_new UUID;

  -- Copy data (match by key)
  UPDATE products
  SET category_new = pc.id
  FROM product_categories pc
  WHERE products.category = pc.key;

  -- Drop old, rename new
  ALTER TABLE products DROP COLUMN category;
  ALTER TABLE products RENAME COLUMN category_new TO category;

  -- Add constraints
  ALTER TABLE products ALTER COLUMN category SET NOT NULL;
  ALTER TABLE products
    ADD CONSTRAINT fk_products_category
    FOREIGN KEY (category) REFERENCES product_categories(id);
  ```

### Phase 2: Update TypeScript Types

- [ ] **2.1 Create ProductCategory interface**

  Add to `src/stores/productsStore/types.ts`:

  ```typescript
  export interface ProductCategory {
    id: string
    key: string
    name: string
    color?: string
    icon?: string
    sortOrder: number
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  ```

- [ ] **2.2 Update Product interface**

  ```typescript
  export interface Product {
    // ... existing fields
    category: string // UUID (FK to product_categories)
    // ... rest
  }
  ```

- [ ] **2.3 Remove old PRODUCT_CATEGORIES constant**

  Delete from `src/stores/productsStore/types.ts`:

  ```typescript
  // ❌ DELETE:
  export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = { ... }
  ```

### Phase 3: Update Products Store

- [ ] **3.1 Add categories to productsStore state**

  Update `src/stores/productsStore/productsStore.ts`:

  ```typescript
  interface ProductsState {
    products: Product[]
    categories: ProductCategory[] // ADD THIS
    loading: boolean
    error: string | null
    initialized: boolean
  }

  export const useProductsStore = defineStore('products', {
    state: (): ProductsState => ({
      products: [],
      categories: [], // ADD THIS
      loading: false,
      error: null,
      initialized: false
    }),

    getters: {
      // ADD these getters
      activeCategories: state =>
        state.categories.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),

      getCategoryById: state => (id: string) => state.categories.find(c => c.id === id),

      getCategoryName: state => (id: string) => state.categories.find(c => c.id === id)?.name || id,

      getCategoryColor: state => (id: string) =>
        state.categories.find(c => c.id === id)?.color || 'grey'
    },

    actions: {
      async initialize() {
        await this.loadCategories() // ADD THIS
        await this.loadProducts()
      },

      async loadCategories() {
        // ADD THIS method
        const categories = await productsService.getCategories()
        this.categories = categories
      }
    }
  })
  ```

- [ ] **3.2 Add categories methods to productsService**

  Update `src/stores/productsStore/productsService.ts`:

  ```typescript
  class ProductsService {
    // ADD THIS method
    async getCategories(): Promise<ProductCategory[]> {
      if (!isSupabaseAvailable()) return []

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data.map(row => ({
        id: row.id,
        key: row.key,
        name: row.name,
        color: row.color,
        icon: row.icon,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    }
  }
  ```

### Phase 4: Update Components

- [ ] **4.1 Update ProductsList.vue**

  Replace `getCategoryLabel` and `getCategoryColor`:

  ```typescript
  import { useProductsStore } from '@/stores/productsStore'

  const productsStore = useProductsStore()

  // Use store getters
  const getCategoryLabel = (categoryId: string) => productsStore.getCategoryName(categoryId)
  const getCategoryColor = (categoryId: string) => productsStore.getCategoryColor(categoryId)
  ```

- [ ] **4.2 Update ProductsFilters.vue**

  Replace hardcoded categories:

  ```typescript
  import { computed } from 'vue'
  import { useProductsStore } from '@/stores/productsStore'

  const productsStore = useProductsStore()

  const categoryOptions = computed(() => [
    { value: 'all', label: 'All categories' },
    ...productsStore.activeCategories.map(c => ({
      value: c.id,
      label: c.name
    }))
  ])
  ```

- [ ] **4.3 Update ProductCard.vue**
- [ ] **4.4 Update ProductDetailsDialog.vue**
- [ ] **4.5 Update AddItemDialog.vue** (supplier_2)

### Phase 5: Testing

- [ ] **5.1 Run migrations on DEV database**
- [ ] **5.2 Test categories load**
- [ ] **5.3 Test product display**
- [ ] **5.4 Test filters work**
- [ ] **5.5 Run migrations on PROD database**

---

## 🎯 Success Criteria

- [ ] Categories table created with 9 categories
- [ ] Products migrated to use category UUID
- [ ] All product views show correct category names
- [ ] No TypeScript errors
- [ ] Works in both DEV and PROD

---

## 📝 Files to Modify

- `supabase/migrations/` - 2 new migration files
- `src/stores/productsStore/types.ts` - Add ProductCategory, remove PRODUCT_CATEGORIES
- `src/stores/productsStore/productsStore.ts` - Add categories state + getters
- `src/stores/productsStore/productsService.ts` - Add getCategories()
- `src/views/products/components/ProductsList.vue`
- `src/views/products/components/ProductsFilters.vue`
- `src/views/products/components/ProductCard.vue`
- `src/views/products/components/ProductDetailsDialog.vue`
- `src/views/supplier_2/components/procurement/AddItemDialog.vue`

---

## 🚀 Ready to Start?

Начинаем с Phase 1 - создание миграций?
