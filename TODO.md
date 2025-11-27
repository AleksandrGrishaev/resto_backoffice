- ✅ Supabase integration (dev + prod databases, 36 tables migrated)
- ✅ Authentication system (Email + PIN auth for POS/Kitchen)
- ✅ RLS policies fixed (infinite recursion, RPC permissions)
- ✅ Recipe decomposition formula fixed (ERROR-POS-001)
- ✅ Negative stock allowed for POS operations
- ✅ CI/CD workflows (GitHub Actions)
- ✅ Vercel deployment setup (dev environment)
- ✅ Fixed critical build errors
- ✅ Environment variables configured for Preview

---

## 🎯 Active Sprint

**Current Sprint:** Sprint 2 - Production Readiness & POS Enhancements (see `NextTodo.md` for details)

**Sprint Duration:** 2-3 weeks
**Sprint Goals:**

1. ✅ **COMPLETED**: Authentication & Session Management Refactoring (Sprint 1)
2. Prepare production database with seed data (users, products, warehouse, menu)
3. Integrate thermal printer for POS receipt printing
4. Deploy production environment on Vercel
5. Stabilize code quality and fix bugs

### High Priority Tasks

#### 1. Production Database Seeding

- Create seed scripts for users, products, warehouse, menu
- Run seeds on production Supabase
- Verify data integrity

#### 3. Production Deployment

- Configure production environment variables in Vercel
- Set production branch to `main`
- Merge dev → main after testing
- Verify production deployment

### Medium Priority Tasks

#### 4. Code Quality & Bug Fixes

- Fix debug logging in preview environment
- Fix TypeScript errors (10 errors)
- Run Prettier formatting
- Address critical ESLint warnings

#### 5. Documentation

- Update README.md with deployment info
- Create DEPLOYMENT.md guide
- Create PRINTER_INTEGRATION.md
- Update CLAUDE.md

---

## 🐛 Known Issues

### 1. Debug Logs Not Working (Preview)

- **Impact:** No console output in dev environment
- **Cause:** Production build strips console.log
- **Fix:** Check `VITE_DEBUG_ENABLED` env var

### 2. Code Quality

- 40 prettier errors
- 10 TypeScript errors
- 838 ESLint warnings

---

## 🚀 Future Phases

### PHASE: P&L & Food Cost Implementation (8 Sprints, 16-24 weeks)

**Цель:** Внедрить корректный учет себестоимости, остатков и прибыли для расчета P&L бизнеса с устранением двойного списания продуктов.

**Критическая проблема:** Двойное списание продуктов:

- При создании полуфабрикатов списываются сырые продукты
- При продаже через POS полуфабрикаты декомпозируются обратно в сырые продукты и списываются повторно
- Food cost рассчитывается неправильно (из декомпозиции вместо FIFO batches)

**Решение:**

- Полуфабрикаты НЕ декомпозируются до продуктов при продаже
- Фактическая себестоимость рассчитывается из FIFO allocation batches
- Автосписание сырья при создании полуфабрикатов
- P&L отчеты с правильным COGS и Gross Profit

#### ✅ ФАЗА 1: Исправление базовой логики (Спринты 1-2) - ЗАВЕРШЕНА (Nov 27, 2025)

**✅ Sprint 1: Устранение двойного списания (2 недели) - COMPLETED**

Цель: Исправить декомпозицию - полуфабрикаты НЕ разворачиваются до сырых продуктов.

Файлы:

- ✅ `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` - остановить рекурсию
- ✅ `src/stores/sales/recipeWriteOff/types.ts` - добавить type: 'preparation'
- ✅ `src/stores/sales/types.ts` - DecomposedItem с type: 'preparation' | 'product'

Критерии:

- ✅ Полуфабрикаты возвращаются как конечные элементы
- ✅ Нет рекурсивного разворачивания preparation → products
- ✅ Тесты проходят (создать preparation → recipe → продажа)

**✅ Sprint 2: FIFO Allocation для фактической себестоимости (2-3 недели) - COMPLETED**

Цель: Внедрить расчет actualCost через FIFO allocation из batches.

Новые файлы:

- ✅ `src/stores/sales/composables/useActualCostCalculation.ts` - FIFO allocation logic
- ✅ `src/supabase/migrations/017_create_sales_transactions.sql` - sales_transactions table
- ✅ `src/supabase/migrations/018_add_actual_cost_to_sales_transactions.sql` - actual_cost column

Изменяемые:

- ✅ `src/stores/sales/types.ts` - ActualCostBreakdown, BatchAllocation types
- ✅ `src/stores/sales/salesStore.ts` - использовать calculateActualCost()
- ✅ `src/stores/sales/composables/useProfitCalculation.ts` - actualCost.totalCost

Критерии:

- ✅ ActualCostBreakdown рассчитывается из FIFO batches
- ✅ SalesTransaction сохраняет actualCost
- ✅ Прибыль рассчитывается корректно (revenue - actualCost)

**✅ Phase 1 Completion Fixes (Nov 27, 2025) - COMPLETED**

Исправлена недоработка Phase 1 - поддержка preparations в write-off:

Файлы:

- ✅ `src/stores/sales/recipeWriteOff/recipeWriteOffStore.ts` - правильный itemType для preparations
- ✅ `src/stores/storage/types.ts` - WriteOffItem.itemType: 'preparation' | 'product'
- ✅ `src/stores/storage/storageService.ts` - allocatePreparationFIFO() метод
- ✅ `src/stores/storage/storageService.ts` - обработка preparations в createWriteOff()
- ✅ `src/stores/storage/storageStore.ts` - reload preparation batches после write-off

Исправленные баги:

- ✅ Cost/Unit = Rp 0 для preparations → вычисляется из batch allocations
- ✅ UI не обновлялся после write-off → добавлен reload preparation batches
- ✅ preparation_batches.status constraint → используется 'depleted' вместо 'consumed'

Критерии:

- ✅ Preparations списываются из preparation_batches через FIFO
- ✅ Products списываются из storage_batches через FIFO
- ✅ Mixed write-offs (preparation + product) работают корректно
- ✅ UI обновляется после write-off
- ✅ Actual costs отображаются правильно в write-off details

#### ФАЗА 2: Автоматизация производства (Спринты 3-4) - В ПРОЦЕССЕ

**✅ Sprint 3: Автосписание при создании полуфабрикатов (2 недели) - COMPLETED (Nov 25-26, 2025)**

Цель: Автоматически списывать сырье при production preparations.

Файлы:

- ✅ `src/stores/preparation/preparationService.ts` - auto write-off logic (lines 692-758)
- ✅ `src/stores/preparation/types.ts` - relatedStorageOperationIds, skipAutoWriteOff
- ✅ `src/stores/storage/types.ts` - WriteOffReason: 'production_consumption'
- ✅ `src/supabase/migrations/015_add_operation_links_for_auto_writeoff.sql` - operation links

Критерии:

- ✅ При createReceipt() автоматически создается StorageOperation (write_off)
- ✅ relatedStorageOperationIds заполняется
- ✅ Остатки продуктов уменьшаются
- ✅ cost_per_unit рассчитывается правильно из consumed raw materials
- ✅ skipAutoWriteOff флаг работает для inventory corrections

**Sprint 4: Улучшение расчета себестоимости (2 недели)**

Цель: Использовать фактическую себестоимость из batches вместо планируемой.

Файлы:

- `src/stores/recipes/composables/useCostCalculation.ts` - режимы 'planned' | 'actual'
- `src/views/backoffice/recipes/RecipeCard.vue` - показывать planned vs actual
- `src/views/backoffice/menu/MenuItemCard.vue` - показывать variance

Критерии:

- ✅ Planned cost рассчитывается из recipe
- ✅ Actual cost рассчитывается из FIFO batches
- ✅ Variance отображается в UI

#### ФАЗА 3: Аналитика и отчетность (Спринты 5-6)

**Sprint 5: P&L Report (2-3 недели)**

Цель: Создать интерфейс Profit & Loss отчета.

Новые файлы:

- `src/stores/analytics/plReportStore.ts`
- `src/views/backoffice/analytics/PLReportView.vue`
- `src/views/backoffice/analytics/components/PLSummaryCard.vue`

Критерии:

- ✅ P&L Summary (Revenue, COGS, Gross Profit, Net Profit)
- ✅ Breakdown by department
- ✅ Date range filtering

**Sprint 6: Food Cost Dashboard (2-3 недели)**

Цель: Дашборд для анализа food cost и остатков.

Новые файлы:

- `src/stores/analytics/foodCostStore.ts`
- `src/views/backoffice/analytics/FoodCostDashboardView.vue`
- `src/views/backoffice/inventory/InventoryValuationView.vue`

Критерии:

- ✅ Food Cost % dashboard (KPI, trends, top items)
- ✅ Inventory Valuation (products + preparations)
- ✅ Charts and visualizations

#### ФАЗА 4: Расширенная аналитика (Спринты 7-8)

**Sprint 7: Дебиторка и кредиторка поставщикам (2 недели)**

Цель: Учет задолженности перед поставщиками.

Файлы:

- `src/stores/counteragents/counteragentsStore.ts` - balance, debt, payments
- `src/views/backoffice/finance/PayablesView.vue`
- `src/views/backoffice/finance/ReceivablesView.vue`

Критерии:

- ✅ Counteragent balance tracking
- ✅ Payables view (кредиторка)
- ✅ Payment recording

**Sprint 8: Variance Analysis и оптимизация (2-3 недели)**

Цель: Анализ отклонений, оптимизация производительности.

Новые файлы:

- `src/stores/analytics/costVarianceStore.ts`
- `src/views/backoffice/analytics/CostVarianceReportView.vue`

Изменяемые:

- `src/views/backoffice/sales/SalesAnalyticsView.vue` - использовать actualCost

Критерии:

- ✅ Variance analysis (planned vs actual)
- ✅ Performance optimization (caching, indexes)
- ✅ Все аналитические views работают

---

### Sprint 2: POS Printer Integration (First Production Update)

**Goal:** Add thermal printer support for receipt printing + practice hot updates in production

**Why this sprint:** This will be our first feature added to live production system, providing valuable experience with:

- Hot deployments to production
- Testing updates without breaking existing functionality
- Rollback procedures if something goes wrong
- Version management and release process

**Tasks:**

1. **Research & Planning**

   - Evaluate thermal printer libraries (escpos, star-prnt, capacitor-thermal-printer)
   - Choose web-compatible library for browser-based printing
   - Research Capacitor plugin for mobile (future)
   - Document supported printer models (Epson, Star, etc.)

2. **Core Implementation**

   - Create PrinterService (`src/services/PrinterService.ts`)
     - Printer detection and connection
     - Print queue management
     - Error handling and retry logic
     - Support for USB, Network, and Bluetooth printers
   - Create receipt template (`src/templates/receipt.ts`)
     - Restaurant header (name, address, phone)
     - Order details (items, quantities, prices)
     - Subtotal, tax, discounts, total
     - Payment method and change
     - Footer (thank you message, date/time)
     - QR code support (optional, for digital receipts)

3. **POS Integration**

   - Add "Print Receipt" button in CheckoutDialog
   - Auto-print on successful payment (configurable)
   - Handle printer errors gracefully
   - Add printer status indicator in POS toolbar

4. **Settings & Configuration**

   - Create PrinterSettings.vue page
   - Printer selection and configuration
   - Test print functionality
   - Paper size settings (58mm, 80mm)
   - Auto-print preferences
   - Printer status monitoring

5. **Testing & Deployment**

   - Test in dev environment
   - Test in preview environment
   - Create release branch
   - Deploy to production
   - Monitor for errors
   - Test rollback if needed

6. **Documentation**
   - Create PRINTER_INTEGRATION.md
   - Update user guide
   - Document troubleshooting

**Technical Notes:**

- Web printing: Use ESC/POS library or window.print() with custom CSS
- Mobile printing: Capacitor plugin (future)
- Printer types: USB (web), Network (web + mobile), Bluetooth (mobile only)
- Fallback: Generate PDF receipt if printer unavailable

**Success Criteria:**

- Receipts print correctly from POS checkout
- Printer settings page works
- No breaking changes to existing functionality
- Production deployment successful
- Rollback procedure documented and tested

### Sprint 3: Mobile App Deployment (Capacitor)

**Goal:** Deploy mobile apps for iOS and Android

- Mobile-specific environment configuration
- Capacitor plugin integration (printer, camera, storage)
- Offline-first optimization for POS
- Mobile UI/UX adjustments
- App store submission (iOS App Store, Google Play)
- In-app updates and versioning

### Sprint 4: Kitchen Display System (KDS)

**Goal:** Real-time kitchen order display and management

- Kitchen display interface (Vue components)
- Real-time order updates (Supabase subscriptions)
- Order status workflow (new → preparing → ready → served)
- Department-based filtering (kitchen, bar, grill)
- Audio/visual notifications for new orders
- Timer and SLA tracking
- Kitchen staff authentication (PIN-based)

### Sprint 5: Advanced Reporting & Analytics

**Goal:** Business intelligence and data insights

- Sales reports (daily, weekly, monthly)
- Product performance analytics
- Inventory tracking and alerts
- Staff performance reports
- Customer analytics (order history, preferences)
- Financial reports (profit/loss, cash flow)
- Export to Excel/PDF
- Dashboard with charts and KPIs

### Sprint 6: Performance Optimization

**Goal:** Improve app performance and bundle size

- Code splitting and lazy loading
- Bundle size optimization (target: <1MB main chunk)
- Image optimization (WebP, lazy loading)
- Database query optimization
- Caching strategies (service workers)
- Performance monitoring (Lighthouse, Web Vitals)

### Sprint 7: Multi-Restaurant Support

**Goal:** Support multiple restaurant locations

- Restaurant/location management
- Multi-tenant data isolation
- Cross-location reporting
- Central admin dashboard
- Location-specific menus and pricing
- Inventory transfer between locations

### Sprint 8: Advanced POS Features

**Goal:** Enhance POS functionality

- Customer loyalty program
- Gift cards and vouchers
- Advanced discounts (BOGO, bundle deals)
- Split payments (multiple payment methods)
- Refunds and returns
- Email receipts (alternative to printing)
- QR code payment integration (QRIS, GoPay, OVO)
- Reservation system integration

### Sprint 9: Integration & Automation

**Goal:** Third-party integrations and workflow automation

- Accounting software integration (Xero, QuickBooks)
- Payment gateway integration (Stripe, Midtrans)
- Delivery platform integration (GrabFood, GoFood)
- Email marketing (Mailchimp, SendGrid)
- SMS notifications (Twilio)
- Automated inventory ordering
- Scheduled reports and backups

### Long-term Vision

- AI-powered demand forecasting
- Recipe optimization and cost analysis
- Employee scheduling and payroll
- Supplier management and procurement
- Quality control and food safety compliance
- Franchise management tools

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
2. **This week:** Configure production deployment
3. **Next week:** Code quality cleanup
4. **Next week:** Documentation updates

---

**Current Focus:** Stabilizing dev deployment and fixing environment-specific issues

**Deployment Strategy:** Vercel auto-deploy (dev → Preview, main → Production)
