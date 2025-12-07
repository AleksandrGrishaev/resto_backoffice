# NextTodo - Product Usage Checking & Archive Prevention

## &5;L

>1028BL ?@>25@:C 8A?>;L7>20=8O ?@>4C:B>2 ?5@54 0@E828@>20=85< 8 8A?@028BL >B>1@065=85 8A?>;L7>20=8O 2 480;>35 ?@>A<>B@0 ?@>4C:B0.

## "5:CI55 A>AB>O=85

- Recipes/Preparations: @01>B05B ?@>25@:0 G5@57 `useUsageCheck.ts` + `UsageWarningDialog.vue`
- Products: **" ?@>25@:8**, `UsageTrackingWidget.vue` ?>:07K205B mock 40==K5

## "@51>20=8O

1. @>25@OBL 8A?>;L7>20=85 2> **2A5E 8AB>G=8:0E** (<5=N + @5F5?BK + ?>;CD01@8:0BK)
2. !>740BL **>B45;L=K9** `ProductUsageWarningDialog.vue`

---

## $09;K 4;O 87<5=5=8O

### >2K5 D09;K

- `src/views/products/components/ProductUsageWarningDialog.vue` - 480;>3 ?@54C?@5645=8O

### >48D8:0F8O ACI5AB2CNI8E D09;>2

| $09;                                                      | 7<5=5=8O                                           |
| --------------------------------------------------------- | -------------------------------------------------- |
| `src/stores/productsStore/composables/useProductUsage.ts` | 50;87>20BL @50;L=K5 70?@>AK 2<5AB> ?CABKE <0AA82>2 |
| `src/views/products/components/UsageTrackingWidget.vue`   | A?>;L7>20BL @50;L=K5 40==K5 87 stores              |
| `src/views/products/ProductsView.vue`                     | >1028BL ?@>25@:C ?5@54 0@E828@>20=85<              |

---

## 5B0;L=K9 ?;0= @50;870F88

### (03 1: 1=>28BL `useProductUsage.ts`

50;87>20BL DC=:F88:

```typescript
// 1. getProductUsageInPreparations(productId)
// - B5@8@>20BL ?> recipesStore.preparations
// - A:0BL 2 preparation.recipe[] 345 type='product' && id=productId
// - >72@0I0BL [{preparationId, preparationName, preparationCode, quantity, unit, isActive}]

// 2. getProductUsageInRecipes(productId)
// - B5@8@>20BL ?> recipesStore.recipes
// - A:0BL 2 recipe.components[] 345 componentType='product' && componentId=productId
// - >72@0I0BL [{recipeId, recipeName, recipeCode, quantity, unit, isActive}]

// 3. getProductUsageInMenu(productId)
// - B5@8@>20BL ?> menuStore.menuItems
// - A:0BL 2 item.variants[].composition[] 345 type='product' && id=productId
// - >72@0I0BL [{menuItemId, menuItemName, variantName, quantity, isActive}]

// 4. checkProductCanArchive(productId) - /
// - K720BL 2A5 3 DC=:F88 2KH5
// - $8;LB@>20BL B>;L:> isActive=true
// - >72@0I0BL {canArchive: boolean, usageLocations: UsageLocation[]}
```

### (03 2: 1=>28BL `UsageTrackingWidget.vue`

```typescript
// 0<5=8BL loadMockData() =0:
async function loadRealUsageData() {
  const { getProductUsageInPreparations, getProductUsageInRecipes, getProductUsageInMenu } =
    useProductUsage()

  usageData.recipes = await getProductUsageInRecipes(props.product.id)
  usageData.preparations = await getProductUsageInPreparations(props.product.id)

  // ;O can_be_sold ?@>4C:B>2 B0:65 703@C605< <5=N
  if (props.product.canBeSold) {
    usageData.menuItems = await getProductUsageInMenu(props.product.id)
  }
}
```

### (03 3: !>740BL `ProductUsageWarningDialog.vue`

!B@C:BC@0 (0=0;>38G=> recipes/UsageWarningDialog.vue):

- Props: `modelValue`, `productName`, `usageLocations`
- B>1@060BL: 8:>=:8 ?> B8?C (preparation/recipe/menu), =0720=85, 45B0;8
- =AB@C:F88: C40;8BL 87 2A5E @5F5?B>2/?>;CD01@8:0B>2/<5=N ?5@54 0@E828@>20=85<

### (03 4: 1=>28BL `ProductsView.vue`

 DC=:F88 toggle/archive 4>1028BL ?@>25@:C:

```typescript
async function toggleProductActive(product: Product) {
  // A;8 0@E828@C5< (isActive=true), ?@>25@O5< 8A?>;L7>20=85
  if (product.isActive) {
    const usageResult = await checkProductCanArchive(product.id)

    if (!usageResult.canArchive) {
      // >:070BL ProductUsageWarningDialog
      usageWarning.value = {
        productName: product.name,
        usageLocations: usageResult.usageLocations
      }
      showUsageWarningDialog.value = true
      return // @5@20BL 0@E828@>20=85
    }
  }

  // @>4>;68BL A 0@E828@>20=85<
  await store.updateProduct(product.id, { isActive: !product.isActive })
}
```

---

## !B@C:BC@0 40==KE UsageLocation

```typescript
interface UsageLocation {
  type: 'preparation' | 'recipe' | 'menu'
  id: string
  name: string
  code?: string // >4 @5F5?B0/?>;CD01@8:0B0
  details?: string // "Variant: Large" 4;O <5=N
  quantity?: number
  unit?: string
  isActive: boolean
}
```

---

## >@O4>: 2K?>;=5=8O

- [ ] **useProductUsage.ts** - @50;87>20BL @50;L=K5 70?@>AK
- [ ] **ProductUsageWarningDialog.vue** - A>740BL :><?>=5=B
- [ ] **ProductsView.vue** - 4>1028BL ?@>25@:C + 8<?>@B 480;>30
- [ ] **UsageTrackingWidget.vue** - 70<5=8BL mock =0 @50;L=K5 40==K5
- [ ] "5AB8@>20=85

---

## @8B8G5A:85 D09;K

```
src/stores/productsStore/composables/useProductUsage.ts
src/views/products/ProductsView.vue
src/views/products/components/ProductUsageWarningDialog.vue (NEW)
src/views/products/components/UsageTrackingWidget.vue
src/views/products/components/ProductDetailsDialog.vue
```

## 028A8<>AB8

- `recipesStore` - 4;O ?>;CG5=8O preparations 8 recipes
- `menuStore` - 4;O ?>;CG5=8O menu items
- "8?K 87 `recipes/types.ts`: `ProductUsageInPreparation`, `ProductUsageInRecipe`

---

## 5D5@5=AK

!<>B@5BL @50;870F8N 4;O recipes/preparations:

- `src/stores/recipes/composables/useUsageCheck.ts` - ;>38:0 ?@>25@:8
- `src/views/recipes/components/UsageWarningDialog.vue` - UI 480;>30
- `src/views/recipes/RecipesView.vue` (lines 676-716) - 8=B53@0F8O 2 toggleStatus
