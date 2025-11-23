# Contributing to Kitchen App

Thank you for contributing to Kitchen App! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)

## Code of Conduct

- Be respectful and constructive
- Focus on what's best for the project
- Show empathy towards other contributors
- Accept constructive criticism gracefully

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Git
- Supabase account (for full functionality)

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/kitchen-app.git
cd kitchen-app

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.development

# Edit .env.development with your Supabase credentials

# Start development server
pnpm dev
```

### Project Structure

```
src/
├── components/       # Reusable Vue components
├── views/           # Page-level components
├── stores/          # Pinia state management
│   ├── pos/         # POS-related stores
│   ├── auth/        # Authentication
│   └── ...
├── core/            # Core business logic
├── config/          # Configuration files
├── utils/           # Utility functions
├── styles/          # Global styles and design tokens
└── router/          # Vue Router configuration
```

## Development Workflow

See [GIT_WORKFLOW.md](GIT_WORKFLOW.md) for detailed branching strategy.

**Quick summary:**

1. Create feature branch from `dev`
2. Make changes following code style
3. Write tests if applicable
4. Commit using conventional commits
5. Push and create Pull Request
6. Address review feedback
7. Merge after approval

## Commit Convention

We use **Conventional Commits** specification for clear and searchable commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

**Must be one of:**

- **feat** - New feature
- **fix** - Bug fix
- **refactor** - Code change that neither fixes a bug nor adds a feature
- **perf** - Performance improvement
- **docs** - Documentation changes
- **test** - Adding or updating tests
- **chore** - Maintenance tasks (deps, config, etc.)
- **style** - Code style changes (formatting, missing semicolons, etc.)
- **ci** - CI/CD changes
- **build** - Build system changes
- **revert** - Revert previous commit

### Scope

**Optional but recommended. Common scopes:**

- **pos** - POS system
- **auth** - Authentication
- **menu** - Menu management
- **products** - Product catalog
- **storage** - Inventory/warehouse
- **recipes** - Recipe management
- **suppliers** - Supplier management
- **reports** - Reporting system
- **shifts** - Shift management
- **payments** - Payment processing
- **orders** - Order management
- **tables** - Table management
- **ui** - UI components
- **core** - Core functionality
- **config** - Configuration
- **db** - Database/Supabase

### Subject

- Use imperative, present tense: "add" not "added" nor "adds"
- Don't capitalize first letter
- No period (.) at the end
- Keep under 50 characters

### Examples

#### Good Examples

```bash
# New feature
feat(pos): add offline order queue
feat(auth): implement PIN-based login for cashiers
feat(reports): add daily sales summary export

# Bug fix
fix(payments): correct rounding error in split bills
fix(auth): prevent SERVICE_KEY usage in production
fix(pos): resolve table status sync issue

# Refactoring
refactor(storage): simplify localStorage persistence layer
refactor(orders): extract calculation logic to composable

# Performance
perf(pos): optimize menu rendering with virtual scrolling
perf(db): add indexes to frequently queried tables

# Documentation
docs(readme): update installation instructions
docs(api): document authentication endpoints

# Tests
test(pos): add offline mode integration tests
test(payments): add split payment calculation tests

# Chore
chore(deps): update Supabase client to v2.39.0
chore(config): update vite build configuration

# CI/CD
ci: add automated deployment to Railway
ci: add security audit to PR checks
```

#### Bad Examples

```bash
# ❌ No type
Added new feature

# ❌ Vague subject
fix: bug fix

# ❌ Past tense
feat(pos): added offline mode

# ❌ Capitalized
feat(Auth): Add login

# ❌ Period at end
fix(payments): resolve calculation error.

# ❌ Too long subject (>50 chars)
feat(pos): implement comprehensive offline-first architecture with automatic synchronization
```

### Body (Optional but recommended for complex changes)

- Use imperative, present tense
- Explain **what** and **why**, not **how**
- Wrap at 72 characters

```bash
git commit -m "feat(pos): add offline order queue" -m "
Implement queue-based system for orders created offline.
Orders are stored in localStorage and automatically synced
when connection is restored.

Includes exponential backoff retry logic and conflict
resolution for concurrent edits.
"
```

### Footer (Optional)

Used for **breaking changes** and **issue references**.

#### Breaking Changes

```bash
feat(auth)!: migrate to Supabase Auth

BREAKING CHANGE: Firebase authentication is no longer supported.
Users must migrate to Supabase Auth. See MIGRATION.md for details.
```

#### Issue References

```bash
fix(pos): resolve payment sync error

Fixes #123
Closes #456
Related to #789
```

### Commit Message Tools

The project uses `commitlint` to enforce commit conventions:

```bash
# Commitlint is automatically run via Husky pre-commit hook

# To test commit message manually
echo "feat(pos): add offline mode" | pnpm commitlint
```

## Pull Request Process

### Before Creating PR

1. **Update your branch** with latest `dev`
   ```bash
   git checkout dev
   git pull origin dev
   git checkout your-feature-branch
   git merge dev
   ```

2. **Run linting and type checking**
   ```bash
   pnpm lint
   pnpm exec vue-tsc --noEmit
   ```

3. **Test your changes**
   ```bash
   pnpm build  # Ensure it builds successfully
   pnpm preview  # Test production build
   ```

4. **Format code**
   ```bash
   pnpm format
   ```

### Creating Pull Request

1. Push your branch to origin
2. Go to GitHub and create Pull Request
3. Use descriptive title following conventional commits:
   - ✅ `feat(pos): add offline order queue`
   - ❌ `Update POS`

4. Fill out PR template with:
   - **Description** - What does this PR do?
   - **Motivation** - Why is this change needed?
   - **Testing** - How was this tested?
   - **Screenshots** - For UI changes
   - **Breaking Changes** - If applicable
   - **Related Issues** - Link to issues

### PR Review Checklist

Reviewers will check:

- [ ] Code follows project style guidelines
- [ ] Commit messages follow conventional commits
- [ ] No console.log statements (unless intentional debug logs)
- [ ] TypeScript types are properly defined
- [ ] No new linting errors
- [ ] Build passes successfully
- [ ] Changes are tested (manual or automated)
- [ ] Documentation updated if needed
- [ ] No hardcoded secrets or sensitive data
- [ ] Performance is not negatively affected

### After Review

Address feedback by:

1. Making requested changes
2. Committing with descriptive message
3. Pushing to same branch (PR updates automatically)

```bash
git add .
git commit -m "refactor(pos): extract duplicate logic to helper"
git push
```

## Code Style

### TypeScript

- **Strict mode enabled** - no implicit any, no unused vars
- **Explicit types** - define interfaces/types for complex structures
- **Type imports** - use `import type { ... }`

```typescript
// ✅ Good
import type { Product } from '@/stores/productsStore'

interface OrderItem {
  productId: string
  quantity: number
  price: number
}

function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// ❌ Bad
function calculateTotal(items: any) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
```

### Vue

- **Composition API** with `<script setup>`
- **Multi-word component names** - except for views (e.g., `ProductCard`, not `Product`)
- **Props with types** - use `defineProps<T>()`

```vue
<!-- ✅ Good -->
<script setup lang="ts">
import type { Product } from '@/stores/productsStore'

interface Props {
  product: Product
  editable?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  save: [product: Product]
  cancel: []
}>()
</script>

<!-- ❌ Bad -->
<script setup>
const props = defineProps({
  product: Object,
  editable: Boolean
})
</script>
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
  - `ProductCard.vue`, `OrderItem.vue`
  - `useOrders.ts`, `formatCurrency.ts`

- **Variables/Functions**: camelCase
  - `currentUser`, `orderTotal`
  - `calculateDiscount()`, `fetchOrders()`

- **Constants**: SCREAMING_SNAKE_CASE
  - `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT`

- **Types/Interfaces**: PascalCase
  - `Product`, `OrderItem`, `UserRole`

### Imports

Organize imports in this order:

```typescript
// 1. Vue core
import { ref, computed, onMounted } from 'vue'

// 2. External libraries
import { defineStore } from 'pinia'

// 3. Internal modules (absolute imports)
import type { Product } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

// 4. Relative imports
import ProductCard from './ProductCard.vue'
```

### Comments

- **Russian allowed** for internal team comments
- **English required** for public API documentation
- Use JSDoc for functions/types

```typescript
/**
 * Calculate total price with discount and tax
 * @param subtotal - Subtotal before discount
 * @param discountPercent - Discount percentage (0-100)
 * @param taxRate - Tax rate (e.g., 0.1 for 10%)
 * @returns Final total with discount and tax
 */
function calculateTotal(
  subtotal: number,
  discountPercent: number,
  taxRate: number
): number {
  // Применяем скидку
  const afterDiscount = subtotal * (1 - discountPercent / 100)

  // Добавляем налог
  return afterDiscount * (1 + taxRate)
}
```

### Error Handling

Always handle errors gracefully:

```typescript
// ✅ Good
try {
  const order = await ordersStore.createOrder(orderData)
  showSuccessToast('Order created successfully')
  return order
} catch (error) {
  const message = ErrorHandler.handleError(error as Error, 'OrderCreation')
  showErrorToast(message)
  return null
}

// ❌ Bad
const order = await ordersStore.createOrder(orderData)
// No error handling - will crash app if fails
```

## Testing

### Manual Testing

Before submitting PR:

1. **Test happy path** - feature works as intended
2. **Test error cases** - handles failures gracefully
3. **Test offline mode** (for POS features)
4. **Test different roles** (admin, manager, cashier)
5. **Test responsive design** (mobile, tablet, desktop)

### Automated Tests (Future)

When writing tests:

```typescript
// tests/unit/calculateDiscount.spec.ts
import { describe, it, expect } from 'vitest'
import { calculateDiscount } from '@/utils/calculations'

describe('calculateDiscount', () => {
  it('should calculate 10% discount correctly', () => {
    expect(calculateDiscount(100, 10)).toBe(90)
  })

  it('should handle 0% discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100)
  })

  it('should handle 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0)
  })
})
```

## Design System

Use existing design tokens from `src/styles/variables.scss`:

```vue
<template>
  <!-- ✅ Use utility classes -->
  <div class="flex flex-col gap-md p-md">
    <v-btn class="h-button touch-target">Click Me</v-btn>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.custom-element {
  /* ✅ Use design tokens */
  padding: var(--spacing-md);
  color: var(--color-primary);
  font-size: var(--text-base);

  /* ❌ Don't hardcode values */
  /* padding: 16px; */
  /* color: #1976d2; */
}
</style>
```

## Utility Functions

Always use existing utilities instead of reimplementing:

```typescript
// ✅ Good - use existing utilities
import { DebugUtils, TimeUtils, formatIDR } from '@/utils'

DebugUtils.info(MODULE_NAME, 'Order created', { orderId: order.id })
const formattedDate = TimeUtils.formatDateForDisplay(order.createdAt)
const formattedPrice = formatIDR(order.total)

// ❌ Bad - reimplementing existing logic
console.log('Order created:', order.id)
const date = new Date(order.createdAt).toLocaleDateString()
const price = 'Rp ' + order.total.toLocaleString('id-ID')
```

## Questions?

- Check [CLAUDE.md](../CLAUDE.md) for project architecture
- Check [GIT_WORKFLOW.md](GIT_WORKFLOW.md) for git workflow
- Open an issue for questions
- Ask in team chat for quick questions

---

**Thank you for contributing to Kitchen App!** 🚀
