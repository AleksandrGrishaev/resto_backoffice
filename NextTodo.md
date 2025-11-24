# Next Sprint - Production Readiness & POS Enhancements

**Created:** 2025-11-24
**Updated:** 2025-11-24
**Priority:** High
**Status:** ✅ Phase 1 Complete - Production Ready

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

### Phase 1: Production Database Preparation ✅ COMPLETE

**Goal:** Prepare Supabase production database with essential seed data

- [x] **1.1 Create seed script for users** - COMPLETE

  - ✅ 12 users created (6 kitchen-app.com + 6 synced from DEV)
  - ✅ PIN authentication setup (4 RPC functions)
  - ✅ auth.users records for Supabase Auth integration
  - ✅ Email users: admin@resto.local, manager@resto.local
  - Scripts: `seedUsersProduction.sql`, `createAuthUsersProduction.sql`, `createPinAuthFunctions.sql`

- [x] **1.3 Create seed script for warehouse** - COMPLETE

  - ✅ Main Warehouse created
  - ✅ RLS policies configured
  - Script: `seedWarehouseProduction.sql`

- [ ] **1.2 Create seed script for products** - DEFERRED

  - Minimal setup strategy - products will be added later

- [ ] **1.4 Create seed script for menu** - DEFERRED
  - Minimal setup strategy - menu will be added later

### Phase 2: Production Deployment Setup ✅ COMPLETE

**Goal:** Configure and deploy production environment on Vercel

- [x] **2.1 Configure production environment variables** - COMPLETE

  - ✅ Production Supabase URL configured
  - ✅ Anon key (NOT service key)
  - ✅ Debug disabled in production

- [x] **2.2 Run seed scripts on production database** - COMPLETE

  - ✅ Users seeded and verified (12 users)
  - ✅ Warehouse seeded and verified
  - ✅ Login tested with PIN and email auth

- [x] **2.3 Configure production branch deployment** - COMPLETE

  - ✅ Vercel deploys from `main` branch
  - ✅ Auto-deploy configured
  - ✅ Production URL accessible

- [x] **2.4 Production verification** - COMPLETE
  - ✅ Login tested (PIN: 1111, 3333, 4444)
  - ✅ Login tested (Email: admin@resto.local, manager@resto.local)
  - ✅ System running successfully

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

- [x] **Production database is seeded** with users and warehouse (minimal setup)
- [x] **Production environment is deployed** and accessible on Vercel
- [x] **Users can login** with seeded credentials in production (PIN + Email)
- [x] **Documentation is updated** with deployment info (PRODUCTION_SETUP.md, PRODUCTION_CREDENTIALS.md)
- [ ] **All TypeScript errors are fixed** (0 errors) - DEFERRED
- [ ] **Code is formatted** according to Prettier rules (0 errors) - DEFERRED
- [ ] **Debug logging works** in both dev and preview environments - DEFERRED

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

## ✅ Phase 1 Completion Summary

**Date:** 2025-11-24
**Status:** Production Ready - Minimal Viable Setup

### What Was Accomplished

1. **Production Database Setup**

   - Users table with 12 users (PIN + Email auth)
   - Main Warehouse with RLS policies
   - PIN authentication RPC functions (4 functions)
   - auth.users integration for Supabase Auth

2. **Deployment**

   - Vercel production deployment from `main` branch
   - Environment variables configured
   - Login verified (PIN + Email)

3. **Documentation**
   - `PRODUCTION_SETUP.md` - Step-by-step setup guide
   - `PRODUCTION_CREDENTIALS.md` - User credentials (gitignored)
   - Scripts created in `src/scripts/seed/`

### Key Files Created

- `src/scripts/seed/seedUsersProduction.sql` - Initial 6 users
- `src/scripts/seed/syncUsersFromDev.sql` - Additional 6 users from DEV
- `src/scripts/seed/createAuthUsersProduction.sql` - auth.users records
- `src/scripts/seed/createPinAuthFunctions.sql` - PIN auth RPC functions
- `src/scripts/seed/seedWarehouseProduction.sql` - Main warehouse
- `src/scripts/seed/addWarehouseRLS.sql` - RLS policies

### Next Steps (Future Sprints)

- Add products seed data
- Add menu seed data
- Fix TypeScript errors
- Code quality improvements (Phase 3)
- Documentation updates (Phase 4)

---

## 🔗 Related Files

- `todo.md` - Overall project roadmap
- `src/About/errors.md` - Known bugs and issues
- `.env.production` - Production environment template
- `src/config/environment.ts` - Environment configuration
- `PRODUCTION_SETUP.md` - Production setup guide
- `PRODUCTION_CREDENTIALS.md` - User credentials (NOT in git)
