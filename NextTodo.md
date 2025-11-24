# Next Sprint - Production Readiness & POS Enhancements

**Created:** 2025-11-24
**Updated:** 2025-11-24
**Priority:** High
**Status:** 📝 Planning

---

## 🎯 Sprint Goal

> **Prepare the application for production deployment**
>
> This sprint focuses on getting the app ready for production:
>
> 1. Production deployment readiness (seed data, environment setup)
> 2. Stabilization and bug fixes from preview environment
> 3. Code quality improvements

---

## 📋 Tasks

### Phase 1: Production Database Preparation

**Goal:** Prepare Supabase production database with essential seed data

- [ ] **1.1 Create seed script for users** (`src/scripts/seed/users.ts`)

  - Admin user (full access)
  - Manager user (backoffice access)
  - Cashier user (POS access)
  - Kitchen user (kitchen display access)
  - Use bcrypt/argon2 for password hashing
  - Store in `profiles` table with proper role assignments

- [ ] **1.2 Create seed script for products** (`src/scripts/seed/products.ts`)

  - Basic product categories (Beverages, Food, Snacks, etc.)
  - 20-30 demo products with realistic data
  - Link products to categories
  - Include product images (URLs to placeholder images)

- [ ] **1.3 Create seed script for warehouse** (`src/scripts/seed/warehouse.ts`)

  - Create default warehouse ("Main Warehouse")
  - Seed ingredients/raw materials (20-30 items)
  - Initial stock levels
  - Units of measurement (kg, ml, pcs, etc.)

- [ ] **1.4 Create seed script for menu** (`src/scripts/seed/menu.ts`)

  - Create default menu ("Main Menu")
  - Link products to menu
  - Set prices and availability
  - Create menu categories

- [ ] **1.5 Create master seed script** (`src/scripts/seed/index.ts`)
  - Orchestrate all seed scripts in correct order
  - Add CLI commands to package.json
  - Add `pnpm seed:all` and `pnpm seed:[entity]` commands
  - Include dry-run mode for testing

### Phase 2: Production Deployment Setup

**Goal:** Configure and deploy production environment on Vercel

- [ ] **2.1 Configure production environment variables**

  - Add all required env vars in Vercel dashboard
  - Use production Supabase URL and anon key
  - Set `VITE_DEBUG_ENABLED=false`
  - Set `VITE_USE_API=true`
  - Verify no service key is included

- [ ] **2.2 Run seed scripts on production database**

  - Execute `pnpm seed:all` against production Supabase
  - Verify all tables populated correctly
  - Test user login with seeded credentials
  - Verify products, menu, and warehouse data

- [ ] **2.3 Configure production branch deployment**

  - Set Vercel production branch to `main`
  - Merge `dev` → `main` after testing
  - Verify auto-deploy triggers
  - Test production URL

- [ ] **2.4 Production verification**
  - Login with seeded users (admin, manager, cashier)
  - Navigate through all main routes
  - Test POS functionality
  - Test backoffice functionality
  - Verify no console errors or warnings

### Phase 3: Code Quality & Stabilization

**Goal:** Fix critical bugs and improve code quality

- [ ] **3.1 Fix debug logging in preview** (HIGH PRIORITY)

  - Modify `src/utils/debugger.ts` to check `VITE_DEBUG_ENABLED`
  - Update Vite config for conditional console.log stripping
  - Test in both dev and preview environments

- [ ] **3.2 Fix code formatting**

  - Run `pnpm format` to auto-fix Prettier errors
  - Commit formatting changes

- [ ] **3.3 Fix TypeScript errors**

  - AlertsBadge.vue - Missing store properties
  - DateRangePicker.vue - Type mismatches
  - components/index.ts - Missing PinInput import
  - BaseDialog.vue - Unused 'props' variable

- [ ] **3.4 Address critical ESLint warnings**
  - Fix unused variables
  - Fix any-type usage (top 20 critical warnings)
  - Run `pnpm lint:fix` for auto-fixable issues

### Phase 4: Documentation & Developer Experience

**Goal:** Update documentation for new deployment strategy

- [ ] **4.1 Update README.md**

  - Add Vercel deployment section
  - Document environment setup
  - Add seed script usage guide

- [ ] **4.2 Create DEPLOYMENT.md**

  - Step-by-step deployment guide
  - Environment variables reference
  - Troubleshooting section
  - Rollback procedures

- [ ] **4.3 Update CLAUDE.md**
  - Add printer integration section
  - Update deployment strategy section
  - Add seed scripts section

---

## 🎯 Success Criteria

- [ ] **Production database is seeded** with users, products, warehouse, and menu data
- [ ] **Production environment is deployed** and accessible on Vercel
- [ ] **All TypeScript errors are fixed** (0 errors)
- [ ] **Code is formatted** according to Prettier rules (0 errors)
- [ ] **Debug logging works** in both dev and preview environments
- [ ] **Users can login** with seeded credentials in production
- [ ] **Documentation is updated** with deployment info

---

## 📝 Notes

### Seed Data Considerations

- Use realistic data (Indonesian restaurant context)
- Include proper currency formatting (IDR)
- Add placeholder images from unsplash.com or placeholder.com
- Ensure data integrity (foreign key constraints)
- Include demo transactions/orders (optional)

### Security Notes

- **Production:** NEVER use service key in Vercel environment
- **Seed passwords:** Use strong defaults, force password change on first login

### Technical Debt

- Large bundle size (1.96 MB main chunk) - needs optimization (future)
- 838 ESLint warnings - gradual cleanup (low priority)
- Missing tests - add integration tests (future)

### Future Enhancements (Next Sprints)

- **POS Printer Integration** (Sprint 2 - practice production updates)
- Mobile app build (Capacitor)
- Kitchen Display System (KDS)
- Advanced reporting and analytics
- Multi-restaurant support

---

## 🔗 Related Files

- `todo.md` - Overall project roadmap
- `src/About/errors.md` - Known bugs and issues
- `.env.production` - Production environment template
- `src/config/environment.ts` - Environment configuration
