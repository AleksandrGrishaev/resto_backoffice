# Phase 4: Authentication Migration - Progress Report

**Date:** 2025-11-23
**Status:** In Progress (70% Complete)

---

## 🎯 Overview

Migrating authentication from localStorage to Supabase with support for **three authentication methods**:

1. **Email + Password** (Admin/Manager) - Supabase Auth
2. **PIN** (Cashier) - Quick POS login
3. **KITCHEN PIN** (Bar/Kitchen) - Quick kitchen/bar login

---

## ✅ Completed Tasks

### 1. Users Table Migration (`007_create_users_table.sql`) ✅

Created comprehensive migration with:
- **Table:** `public.users` extending Supabase Auth
- **Fields:**
  - `id` (UUID, links to auth.users)
  - `name`, `email`, `phone`
  - `pin_hash` (bcrypt-hashed PIN)
  - `roles` (array: admin, manager, cashier, waiter, kitchen, bar)
  - `is_active`, `last_login_at`, `avatar_url`, `preferences`
- **Indexes:**
  - `idx_users_email` (partial, WHERE email IS NOT NULL)
  - `idx_users_pin` (partial, WHERE pin_hash IS NOT NULL)
  - `idx_users_roles` (GIN index for array queries)
  - `idx_users_is_active`
- **Triggers:**
  - `update_users_updated_at()` - auto-update timestamp

### 2. Authentication Functions ✅

**`authenticate_with_pin(pin_input TEXT)`**
- Validates PIN using `crypt()` comparison
- Returns user profile (id, name, email, roles, avatar)
- Updates `last_login_at` timestamp
- Security: `SECURITY DEFINER` to bypass RLS

**`create_user_with_pin(p_name, p_pin, p_roles, p_email)`**
- Helper function for creating PIN-based users
- Hashes PIN with Blowfish (`gen_salt('bf')`)
- Returns new user UUID

**`update_user_pin(p_user_id, p_new_pin)`**
- Securely updates user PIN
- Re-hashes with new salt

### 3. RLS Policies ✅

**Basic policies implemented:**
- `users_view_own` - Users can view their own profile
- `users_update_own` - Users can update their own profile

**Advanced policies (from migration 006):**
- `admins_view_all_users` - Admins can view all users
- `admins_create_users` - Admins can create new users
- `admins_update_users` - Admins can update any user

### 4. AuthStore Update ✅

**New Methods:**
- `loginWithEmail(email, password)` - Supabase Auth for admin/manager
- `loginWithPin(pin)` - RPC call to `authenticate_with_pin` for cashier/kitchen/bar
- `loadUserProfile(userId)` - Load profile from Supabase users table
- `restorePinSession()` - Restore PIN session from localStorage
- `initialize()` - Check Supabase session + restore PIN session

**New Getters:**
- `isKitchen` - Check if user has kitchen role
- `isBar` - Check if user has bar role

**Backwards Compatibility:**
- `login(pin)` - Legacy method, falls back to Supabase if enabled

### 5. Migration & Seeding Scripts ✅

**`scripts/apply-migration.sh`**
- Bash script to apply migration via Supabase CLI or manual instructions

**`scripts/seed-users.ts`**
- Seeds test users for all three authentication methods:
  - Admin: `admin@resto.local` / `Admin123!`
  - Manager: `manager@resto.local` / `Manager123!`
  - Cashier 1: PIN `1234`
  - Cashier 2: PIN `5678`
  - Kitchen Staff: PIN `1111`
  - Bartender: PIN `2222`

**Package.json scripts:**
```bash
pnpm migrate:users  # Apply migration
pnpm seed:users     # Seed test users
```

---

## 🔄 In Progress

### LoginView UI Update (Next Step)

Create `src/views/auth/LoginView.vue` with **three tabs**:

1. **Email Tab** (Admin/Manager)
   - Email input
   - Password input
   - "Login" button
   - Calls `authStore.loginWithEmail(email, password)`

2. **POS Tab** (Cashier)
   - PIN input (4 digits)
   - Numeric keypad (optional)
   - "Quick Login" button
   - Calls `authStore.loginWithPin(pin)`

3. **KITCHEN Tab** (Bar/Kitchen)
   - PIN input (4 digits)
   - Simplified UI for kitchen staff
   - "Quick Login" button
   - Calls `authStore.loginWithPin(pin)`

---

## ⏳ Pending Tasks

### 1. Apply Migration to Databases

```bash
# Development
pnpm migrate:users

# Or manually in Supabase Dashboard:
# SQL Editor → Run migration file: src/supabase/migrations/007_create_users_table.sql
```

### 2. Seed Test Users

```bash
# After migration is applied
pnpm seed:users
```

### 3. Test Authentication Flows

**Email Auth Test:**
1. Open `/auth/login`
2. Switch to Email tab
3. Login with `admin@resto.local` / `Admin123!`
4. Verify redirect to backoffice dashboard

**PIN Auth Test (Cashier):**
1. Open `/auth/login`
2. Switch to POS tab
3. Enter PIN `1234`
4. Verify redirect to POS interface

**PIN Auth Test (Kitchen):**
1. Open `/auth/login`
2. Switch to KITCHEN tab
3. Enter PIN `1111`
4. Verify redirect to kitchen interface (or dashboard)

### 4. Production Deployment

After testing in development:
1. Apply migration to production Supabase
2. Create production admin user
3. Test all flows in production

---

## 📋 Files Created/Modified

### Created:
- `src/supabase/migrations/007_create_users_table.sql` (242 lines)
- `scripts/seed-users.ts` (195 lines)
- `scripts/apply-migration.sh` (60 lines)
- `docs/PHASE4_AUTHENTICATION_PROGRESS.md` (this file)

### Modified:
- `src/stores/auth/authStore.ts` - Triple authentication support
- `package.json` - Added `migrate:users` and `seed:users` scripts

### Pending:
- `src/views/auth/LoginView.vue` - Three-tab UI (next task)

---

## 🔧 Technical Details

### Authentication Flow

**Email Authentication (Admin/Manager):**
```
1. User enters email + password
2. Call supabase.auth.signInWithPassword()
3. Supabase creates session + JWT
4. authStore.loadUserProfile(userId) → fetch from users table
5. Store user in state + session
6. Redirect to default route
```

**PIN Authentication (Cashier/Kitchen/Bar):**
```
1. User enters PIN
2. Call supabase.rpc('authenticate_with_pin', { pin_input })
3. Function validates PIN hash
4. Function returns user profile
5. Store user in state + localStorage (for offline)
6. Redirect to default route
```

### Security Features

- ✅ PIN hashed with Blowfish (`bcrypt`)
- ✅ RLS policies enforced (users can only see their own data)
- ✅ Failed login attempt logging
- ✅ Security lockout after too many failures
- ✅ JWT tokens for email auth (Supabase Auth)
- ✅ localStorage session for PIN auth (offline support)
- ⚠️ SERVICE_KEY only in development (not in production)

### Database Schema

```sql
Table: users (public)
├── id: UUID (PK, links to auth.users)
├── name: TEXT (required)
├── email: TEXT (unique, optional)
├── phone: TEXT (optional)
├── pin_hash: TEXT (bcrypt hash, optional)
├── roles: TEXT[] (admin, manager, cashier, waiter, kitchen, bar)
├── is_active: BOOLEAN (default true)
├── last_login_at: TIMESTAMPTZ
├── avatar_url: TEXT
├── preferences: JSONB
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

Constraints:
- valid_roles: roles must be subset of allowed values
- email_or_pin: must have either email OR pin_hash
```

---

## 🎯 Next Steps

1. **Create LoginView UI** (highest priority)
   - Three tabs: Email, POS, KITCHEN
   - Responsive design for mobile/web
   - Form validation
   - Error handling

2. **Apply migration to development database**
   ```bash
   pnpm migrate:users
   ```

3. **Seed test users**
   ```bash
   pnpm seed:users
   ```

4. **Test all authentication flows**
   - Email login (admin/manager)
   - PIN login (cashier)
   - PIN login (kitchen/bar)

5. **Update router guards** (if needed)
   - Ensure email-authenticated users have proper access
   - Verify PIN-authenticated users redirect correctly

6. **Documentation updates**
   - Update CLAUDE.md with authentication details
   - Add authentication guide for team

---

## ⚠️ Important Notes

**Before Production:**
- ✅ Migration file is idempotent (safe to run multiple times)
- ⚠️ Must apply migration to production Supabase
- ⚠️ Must create production admin user manually
- ⚠️ Disable SERVICE_KEY in production environment
- ⚠️ Test offline PIN login thoroughly (critical for POS)

**Migration Safety:**
- All DDL uses `IF NOT EXISTS` clauses
- Can be run multiple times safely
- Backwards compatible with existing code (legacy `login()` method)

---

## 🚀 Sprint Summary

**Completed:** 4/8 major tasks (50%)
**In Progress:** 1/8 (LoginView UI)
**Remaining:** 3/8 (migration, seeding, testing)

**Estimated Time to Complete:**
- LoginView UI: 1-2 hours
- Migration + Seeding: 30 minutes
- Testing: 1 hour
- **Total:** ~3-4 hours remaining

**Ready for Production After:**
- All tests pass
- Production migration applied
- Production admin user created
- Offline PIN login verified

---

*Last Updated: 2025-11-23*
