# Kitchen App - TODO

**Last Updated:** 2025-11-23
**Current Branch:** `feature/vercel-deployment-setup`
**Project Version:** 0.0.320

---

## 📍 Current Status

**Development Environment:** ✅ **DEPLOYED ON VERCEL**

### Deployment Information

We are now using **Vercel** for all deployments:

- **Dev (Preview):** Auto-deploys from `dev` branch

  - URL: https://resto-backoffice-git-dev-alexs-projects-f4358626.vercel.app
  - Environment: Preview with development settings
  - Debug enabled: Yes
  - Service key: No (removed for security)

- **Production:** Not yet configured
  - Will deploy from `main` branch
  - Production Supabase database
  - Debug disabled
  - No service key (security)

**Vercel Configuration:**

- Framework: Vite (auto-detected)
- Build command: `pnpm build`
- Output directory: `dist`
- Node version: 20.x
- Environment variables: Configured via Vercel dashboard

---

## ✅ Recently Completed

- ✅ Supabase integration (dev + prod databases, 36 tables migrated)
- ✅ Authentication system (Email + PIN auth for POS/Kitchen)
- ✅ CI/CD workflows (GitHub Actions)
- ✅ Vercel deployment setup (dev environment)
- ✅ Fixed critical build errors
- ✅ Environment variables configured for Preview

---

## 🎯 Active Tasks

### High Priority

#### 1. Fix Debug Logging in Preview Environment

**Problem:** Debug logs don't work in Vercel Preview (production build mode)

**Solution needed:**

- Modify `src/utils/debugger.ts` to check `VITE_DEBUG_ENABLED` instead of `import.meta.env.DEV`
- Update Vite config to conditionally strip console logs

**Files to update:**

- `src/utils/debugger.ts`
- `vite.config.ts` (optional)

#### 2. Review Supabase RLS Policies

**Problem:** Some tables show permission denied errors

**Action items:**

- Use `/db` command to check affected tables
- Review and fix RLS policies for authenticated users
- Run `mcp__supabase__get_advisors` to check security issues
- Test with different user roles

### Medium Priority

#### 3. Configure Production Deployment

After dev environment is stable:

1. Add production environment variables in Vercel
2. Set production branch to `main`
3. Merge dev → main
4. Verify production deployment

#### 4. Code Quality Fixes

**Prettier (auto-fix):**

```bash
pnpm format
```

**TypeScript errors to fix:**

- AlertsBadge.vue - Missing store properties
- DateRangePicker.vue - Type mismatches
- components/index.ts - Missing PinInput import
- BaseDialog.vue - Unused 'props' variable

**ESLint warnings:** 838 warnings (optional cleanup)

### Low Priority

#### 5. Re-enable CI Checks

After code quality is fixed:

- Re-enable lint job in `.github/workflows/ci.yml`
- Re-enable typecheck job in `.github/workflows/ci.yml`

#### 6. Documentation Updates

- Update README.md with Vercel deployment info
- Create DEPLOYMENT.md with environment setup guide
- Update CLAUDE.md with new deployment strategy

---

## 🐛 Known Issues

### 1. Debug Logs Not Working (Preview)

- **Impact:** No console output in dev environment
- **Cause:** Production build strips console.log
- **Fix:** Check `VITE_DEBUG_ENABLED` env var

### 2. Supabase RLS Errors

- **Impact:** Some features have permission errors
- **Cause:** Missing/incomplete RLS policies
- **Fix:** Review and update policies

### 3. Code Quality

- 40 prettier errors
- 10 TypeScript errors
- 838 ESLint warnings

---

## 🚀 Future Phases

### Phase 6: Production Deployment

- Production environment on Vercel
- Production Supabase configuration
- Error tracking (Sentry)
- Performance monitoring
- Domain and SSL setup

### Phase 7: Mobile Build

- Capacitor configuration
- iOS/Android builds
- App store deployment

### Phase 8: Feature Development

- Complete POS features
- Kitchen Display System
- Advanced reporting
- Multi-restaurant support (future)

---

## 📊 Quick Stats

**Build:**

- Build time: ~28s
- Bundle size: 6.7 MB
- Main chunk: 1.96 MB (needs optimization)

**Codebase:**

- ~50,000 lines of code
- 100+ components
- 15+ stores
- 25+ routes

**CI/CD:**

- 3 GitHub workflows
- Auto-deploy on push to dev (Vercel)
- Artifact retention: 7 days (dev), 30 days (prod)

---

## 📝 Environment Variables

**Required for all environments:**

- `VITE_APP_TITLE`
- `VITE_PLATFORM`
- `VITE_USE_SUPABASE`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Dev only:**

- `VITE_DEBUG_ENABLED=true`
- `VITE_DEBUG_STORES=true`
- `VITE_SHOW_DEV_TOOLS=true`
- `VITE_SUPABASE_USE_SERVICE_KEY=true` (⚠️ DEV ONLY!)

**Production:**

- All debug flags = false
- NO service key
- `VITE_USE_API=true`

---

## 🎯 Next Actions

1. **Immediate:** Fix debug logging for Preview environment
2. **This week:** Review and fix RLS policies
3. **This week:** Configure production deployment
4. **Next week:** Code quality cleanup
5. **Next week:** Documentation updates

---

**Current Focus:** Stabilizing dev deployment and fixing environment-specific issues

**Deployment Strategy:** Vercel auto-deploy (dev → Preview, main → Production)
