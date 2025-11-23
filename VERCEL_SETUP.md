# Vercel Deployment Setup Guide

## Current Status

✅ Repository connected to Vercel
✅ vercel.json configuration created
⏳ Need to configure environment variables

## Step-by-Step Setup for DEV Environment

### 1. Open Vercel Dashboard

Go to: https://vercel.com/dashboard

### 2. Find Your Project

Look for `kitchen-app` or `backoffice` project in the dashboard

### 3. Configure Project Settings

Click on your project → **Settings** tab

#### Build & Development Settings

- **Framework Preset**: Vite
- **Build Command**: `pnpm build` (already configured in vercel.json)
- **Output Directory**: `dist` (already configured in vercel.json)
- **Install Command**: `pnpm install --frozen-lockfile` (already configured in vercel.json)
- **Node Version**: 20.x

#### Root Directory

- Leave as root (default) or set to `backoffice` if you have a monorepo

### 4. Configure Environment Variables (DEV)

Go to: **Settings → Environment Variables**

Add the following variables for **Preview** environment (dev branch):

```
# Application
VITE_APP_TITLE=Kitchen App - Development
VITE_PLATFORM=web
VITE_USE_API=false
VITE_ENABLE_LOGS=true
VITE_ENABLE_OFFLINE=true
VITE_USE_MOCK_DATA=true

# Storage
VITE_STORAGE_TYPE=localStorage
VITE_ENABLE_SYNC=false
VITE_STORAGE_PREFIX=kitchen-app-dev

# Supabase (Development)
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://fjkfckjpnbcyuknsnchy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqa2Zja2pwbmJjeXVrbnNuY2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzYyMzYsImV4cCI6MjA3ODYxMjIzNn0.j3nOWhthpdNhuXLCcO7iMGrucUvKiypOSF7SvawzGoQ
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqa2Zja2pwbmJjeXVrbnNuY2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzNjIzNiwiZXhwIjoyMDc4NjEyMjM2fQ.WEFJdktaYaZ6F5cEY1kYQ_GsdKNHoZUsQy5txBFpUCI
VITE_SUPABASE_USE_SERVICE_KEY=true

# Firebase (disabled)
VITE_USE_FIREBASE=false

# POS Settings
VITE_POS_OFFLINE_FIRST=true
VITE_POS_CACHE_TTL=300
VITE_POS_AUTO_SYNC_INTERVAL=30000

# Debug
VITE_DEBUG_ENABLED=true
VITE_DEBUG_STORES=true
VITE_DEBUG_ROUTING=false
VITE_DEBUG_PERSISTENCE=true
VITE_DEBUG_LEVEL=verbose
VITE_SHOW_STORE_DETAILS=false
VITE_SHOW_INIT_SUMMARY=true
VITE_SHOW_DEVICE_INFO=true
VITE_USE_BLACKLIST=false

# Dev Tools
VITE_SHOW_DEV_TOOLS=true
VITE_MOCK_NETWORK_DELAY=500
VITE_ENABLE_HOT_RELOAD=true
```

**IMPORTANT:** For each variable, select environment:

- ✅ **Preview** (for dev branch deployments)
- ❌ Production (leave unchecked for now)

### 5. Configure Git Integration

Go to: **Settings → Git**

**Production Branch**: `main` (we'll configure this later)
**Preview Branches**: Enable for `dev` branch

This means:

- Push to `dev` → Deploy to Preview URL (development environment)
- Push to `main` → Deploy to Production URL (production environment)

### 6. Trigger First Deployment

Two options:

**Option A: Push to dev branch (recommended)**

```bash
# Make sure you're on dev branch
git checkout dev

# Commit vercel.json
git add vercel.json VERCEL_SETUP.md
git commit -m "chore(deploy): add Vercel configuration for dev deployment"
git push origin dev
```

**Option B: Redeploy from Vercel Dashboard**

- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment
- Select **Use existing Build Cache** (no)

### 7. Monitor Deployment

After pushing:

1. Go to Vercel Dashboard → **Deployments**
2. Watch the build logs in real-time
3. Build should take ~30-40 seconds
4. You'll get a preview URL like: `https://backoffice-abc123.vercel.app`

### 8. Verify Deployment

Open the preview URL and check:

- ✅ App loads without errors
- ✅ Login page shows
- ✅ Supabase connection works
- ✅ Console shows debug logs (since VITE_DEBUG_ENABLED=true)

## Production Environment Setup (Later)

After dev is working, configure production:

### Production Environment Variables

Add the same variables but with **Production** environment selected:

```
# Application
VITE_APP_TITLE=Kitchen App
VITE_PLATFORM=web
VITE_USE_API=true
VITE_ENABLE_LOGS=false
VITE_ENABLE_OFFLINE=false
VITE_USE_MOCK_DATA=false

# Storage
VITE_STORAGE_TYPE=api
VITE_ENABLE_SYNC=true
VITE_STORAGE_PREFIX=kitchen-app

# Supabase (Production)
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://bkntdcvzatawencxghob.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_LRVBIw0EIit0VBgtMBvO9A_q0PkAPFK

# Firebase (disabled)
VITE_USE_FIREBASE=false

# POS Settings
VITE_POS_OFFLINE_FIRST=false
VITE_POS_CACHE_TTL=600
VITE_POS_AUTO_SYNC_INTERVAL=10000

# Debug (disabled in production)
VITE_DEBUG_ENABLED=false
VITE_DEBUG_STORES=false
VITE_DEBUG_ROUTING=false
VITE_DEBUG_PERSISTENCE=false

# Production Optimizations
VITE_SHOW_DEV_TOOLS=false
VITE_MOCK_NETWORK_DELAY=0
VITE_ENABLE_HOT_RELOAD=false
```

Then push to `main` branch for production deployment.

## Troubleshooting

### Build Fails

Check Vercel build logs for:

- **TypeScript errors**: Temporarily disabled in vite.config (using `vite build` without tsc)
- **Missing dependencies**: Check `pnpm install` step
- **Environment variables**: Verify all VITE\_\* vars are set

### App Loads but Shows Errors

- Check browser console
- Verify Supabase URL and keys are correct
- Check Network tab for failed API calls

### Deployment URL Not Working

- Wait 1-2 minutes for DNS propagation
- Clear browser cache
- Try incognito mode

## GitHub Actions Integration (Optional)

Your current GitHub Actions workflows will continue to work:

- They build and upload artifacts
- Vercel handles actual deployment automatically on push
- You can keep both or disable GitHub workflows (Vercel is enough)

## Next Steps After Successful Deployment

1. ✅ Get dev preview URL
2. ✅ Test all features on dev URL
3. ✅ Share dev URL with team for testing
4. ✅ Configure production environment
5. ✅ Push to main for production deployment
6. ✅ Update TODO.md with deployment URLs

## Useful Vercel CLI Commands (Optional)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy manually
vercel --prod  # Production
vercel         # Preview

# Check deployment status
vercel ls

# View logs
vercel logs
```

## Cost Estimation

**Vercel Free Tier:**

- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Edge Network (CDN)

This should be enough for development and small production use.
