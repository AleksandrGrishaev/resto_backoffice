# Sprint: Admin Dashboard

## Overview

Widget-based dashboard at `/admin` (default screen).
Date picker with period selection (day/week/month/custom).
All times use Asia/Makassar timezone via TimeUtils.

## Completed

- [x] Install chart.js + vue-chartjs
- [x] Types, service, all components
- [x] Period selection (day/week/month/custom) with navigation
- [x] SummaryWidget — 7 KPI metrics with delta vs previous period
- [x] HourlySalesWidget — bar chart + staff overlay lines
- [x] RevenueByDeptWidget — line chart, revenue by department over time
- [x] WriteOffsWidget — by type and department
- [x] PaymentMethodsWidget — donut (cash/card/QR)
- [x] DepartmentSalesWidget — kitchen vs bar breakdown
- [x] Widget visibility toggle (settings panel)
- [x] Error banner on fetch failure
- [x] Dashboard = default screen, moved to top of sidebar

## Bug Fixes Applied

- [x] Timezone: all queries use TimeUtils.getStartOfDay/getEndOfDay (Asia/Makassar)
- [x] Date boundaries: use next day T00:00 instead of 23:59:59.999
- [x] Overnight shifts: handle endHour < startHour
- [x] Row limits: .limit(10000) on sales_transactions queries
- [x] Error UI: error banner + proper error state
- [x] DatePicker: connected to v-menu activator properly
- [x] Settings panel: position absolute (not fixed)
- [x] formatIDR used in all tooltips and displays

## File Structure

```
src/views/admin/dashboard/
├── DashboardScreen.vue
├── types.ts
├── services/dashboardService.ts
├── components/
│   ├── DashboardHeader.vue
│   ├── WidgetCard.vue
│   └── MetricCard.vue
└── widgets/
    ├── SummaryWidget.vue
    ├── HourlySalesWidget.vue
    ├── RevenueByDeptWidget.vue
    ├── WriteOffsWidget.vue
    ├── PaymentMethodsWidget.vue
    └── DepartmentSalesWidget.vue
```
