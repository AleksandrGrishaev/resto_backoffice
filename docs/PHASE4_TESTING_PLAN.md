# Phase 4: Testing Plan

**Date:** 2025-11-23
**Status:** Ready for Testing

---

## 🎯 Testing Objectives

1. **Apply migration** to development Supabase
2. **Seed test users** for all authentication methods
3. **Test development build** (hot reload mode)
4. **Test production build** locally
5. **Verify authentication** works in both modes

---

## 📋 Step-by-Step Testing Guide

### Step 1: Apply Migration to Supabase

**Option A: Using Supabase Dashboard (Recommended)**

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your **development project**
3. Go to **SQL Editor**
4. Open file: `src/supabase/migrations/007_create_users_table.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click **Run** button
8. Verify success (should see "Success. No rows returned")

**Option B: Using CLI** (if you have npx supabase CLI)

```bash
pnpm migrate:users
```

**Verification:**

Check that tables/functions were created:

```sql
-- Check users table
SELECT * FROM users;

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%pin%';
```

---

### Step 2: Seed Test Users

**After migration is applied:**

```bash
# Set environment variables (if not in .env.development)
export VITE_SUPABASE_URL="your-dev-supabase-url"
export VITE_SUPABASE_SERVICE_KEY="your-service-key"

# Run seed script
pnpm seed:users
```

**Expected Output:**

```
🌱 Seeding users to Supabase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email Authentication Users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Creating email user: admin@resto.local...
   ✅ Created: admin@resto.local (password: Admin123!)

📧 Creating email user: manager@resto.local...
   ✅ Created: manager@resto.local (password: Manager123!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POS (Cashier) PIN Users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Creating PIN user: Cashier 1...
   ✅ Created: Cashier 1 (PIN: 1234)

📌 Creating PIN user: Cashier 2...
   ✅ Created: Cashier 2 (PIN: 5678)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KITCHEN (Bar/Kitchen) PIN Users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Creating PIN user: Kitchen Staff...
   ✅ Created: Kitchen Staff (PIN: 1111)

📌 Creating PIN user: Bartender...
   ✅ Created: Bartender (PIN: 2222)

✅ Total users in database: 6
```

**Verification:**

```sql
-- Check users in Supabase
SELECT name, email, roles FROM users ORDER BY created_at;
```

---

### Step 3: Test Development Build

**Start dev server:**

```bash
pnpm dev
```

**Open browser:** http://localhost:5174/auth/login

**Test Email Authentication:**

1. Click **"Email"** tab
2. Enter credentials:
   - Email: `admin@resto.local`
   - Password: `Admin123!`
3. Click **"Login"**
4. ✅ Should redirect to dashboard
5. Verify user name appears in header
6. Test logout

**Test POS PIN Authentication:**

1. Logout if needed
2. Go back to /auth/login
3. Click **"POS"** tab
4. Enter PIN: `1234`
5. Click **"LOGIN"** or auto-submit
6. ✅ Should redirect to /pos
7. Verify user name: "Cashier 1"

**Test KITCHEN PIN Authentication:**

1. Logout
2. Go to /auth/login
3. Click **"KITCHEN"** tab
4. Enter PIN: `1111`
5. Click **"LOGIN"**
6. ✅ Should redirect to dashboard
7. Verify user name: "Kitchen Staff"

---

### Step 4: Test Production Build

**Build for production:**

```bash
# Build production version
pnpm build

# Preview production build
pnpm preview
```

**Open browser:** http://localhost:4173/auth/login

**Important Checks:**

1. ✅ No console errors in browser DevTools
2. ✅ No debug logs visible (debug should be disabled in prod)
3. ✅ SERVICE_KEY not used (check Network tab - should use ANON_KEY only)
4. ✅ All 3 authentication methods work
5. ✅ Redirects work correctly
6. ✅ Session persistence works (refresh page)

**Test all authentication flows again** (same as Step 3)

---

### Step 5: Environment Configuration Check

**Verify .env files exist:**

```bash
# Check if .env.development exists
ls -la .env.development

# Check if .env.production exists
ls -la .env.production
```

**If missing, create them:**

**`.env.development`:**

```bash
# App
VITE_APP_TITLE=Kitchen App (DEV)
VITE_PLATFORM=web

# Features
VITE_USE_API=false
VITE_USE_FIREBASE=false
VITE_USE_SUPABASE=true

# Debug
VITE_DEBUG_ENABLED=true
VITE_DEBUG_STORES=true
VITE_DEBUG_LEVEL=verbose

# Supabase (DEV)
VITE_SUPABASE_URL=https://fjkfckjpnbcyuknsnchy.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_SUPABASE_SERVICE_KEY=your-dev-service-key
VITE_SUPABASE_USE_SERVICE_KEY=true

# POS
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
```

**`.env.production`:**

```bash
# App
VITE_APP_TITLE=Kitchen App
VITE_PLATFORM=web

# Features
VITE_USE_API=true
VITE_USE_FIREBASE=false
VITE_USE_SUPABASE=true

# Debug (DISABLED!)
VITE_DEBUG_ENABLED=false
VITE_DEBUG_STORES=false
VITE_DEBUG_LEVEL=silent

# Supabase (PRODUCTION)
VITE_SUPABASE_URL=https://bkntdcvzatawencxghob.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
# NO SERVICE_KEY IN PRODUCTION!
VITE_SUPABASE_USE_SERVICE_KEY=false

# POS
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
```

---

## 🔍 Troubleshooting

### Issue: Migration fails with "table already exists"

**Solution:** Migration is idempotent (can run multiple times safely). Ignore this error if tables exist.

### Issue: Seed script fails with "duplicate key"

**Solution:** Users already exist. You can either:
- Delete existing users in Supabase Dashboard
- Or skip seeding (users already there)

### Issue: Login fails with "Invalid email or password"

**Possible causes:**
1. Migration not applied yet
2. Users not seeded
3. Wrong Supabase project URL in .env
4. SERVICE_KEY not set (needed for seeding)

**Check:**
```bash
# Verify environment
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_SERVICE_KEY

# Check users in Supabase Dashboard → Table Editor → users
```

### Issue: PIN login fails

**Possible causes:**
1. `authenticate_with_pin` function not created
2. PIN hash not matching
3. User not active

**Check:**
```sql
-- Verify function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'authenticate_with_pin';

-- Check user PIN hash exists
SELECT name, pin_hash FROM users WHERE pin_hash IS NOT NULL;
```

### Issue: Production build shows debug logs

**Solution:** Check `.env.production` has:
```bash
VITE_DEBUG_ENABLED=false
VITE_DEBUG_LEVEL=silent
```

Rebuild:
```bash
pnpm build
```

---

## ✅ Success Criteria

**Development Build:**
- ✅ All 3 auth methods work
- ✅ Debug logs visible in console
- ✅ Hot reload works
- ✅ Session persistence works

**Production Build:**
- ✅ All 3 auth methods work
- ✅ No debug logs in console
- ✅ No SERVICE_KEY used
- ✅ Minified code (check bundle size)
- ✅ Fast load time (<3s)
- ✅ Session persistence works

**Database:**
- ✅ Users table exists with 6 test users
- ✅ Functions created (authenticate_with_pin, etc.)
- ✅ RLS policies active
- ✅ No errors in Supabase logs

---

## 📊 Testing Checklist

Use this checklist while testing:

### Pre-Testing
- [ ] Migration applied to Supabase
- [ ] Test users seeded (6 users)
- [ ] .env.development configured
- [ ] .env.production configured

### Development Build
- [ ] `pnpm dev` starts successfully
- [ ] Email login works (admin@resto.local)
- [ ] POS PIN login works (1234)
- [ ] KITCHEN PIN login works (1111)
- [ ] Session persists after page refresh
- [ ] Logout works correctly
- [ ] Debug logs visible in console

### Production Build
- [ ] `pnpm build` completes without errors
- [ ] `pnpm preview` starts successfully
- [ ] Email login works
- [ ] POS PIN login works
- [ ] KITCHEN PIN login works
- [ ] No debug logs in console
- [ ] No console errors
- [ ] Bundle size reasonable (<2MB total)
- [ ] Fast page load

### Security Checks
- [ ] SERVICE_KEY not visible in Network tab (production)
- [ ] RLS policies active (check Supabase Dashboard)
- [ ] No hardcoded credentials in code
- [ ] Session tokens stored securely (localStorage)

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. **Commit test results** (optional documentation)
2. **Apply migration to production** Supabase
3. **Create production admin user**
4. **Deploy to staging/production**
5. **Phase 5: CI/CD Setup**

---

*Last Updated: 2025-11-23*
