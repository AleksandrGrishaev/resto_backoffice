import type { RouteRecordRaw } from 'vue-router'

// Lazy load all help components
const HelpLayout = () => import('./HelpLayout.vue')
const HelpHomeView = () => import('./HelpHomeView.vue')

// Kitchen
const KitchenHelpView = () => import('./kitchen/KitchenHelpView.vue')
const KitchenMonitorGuide = () => import('./kitchen/guides/MonitorGuide.vue')

// POS - main guide view
const PosGuide = () => import('./pos/guides/PosGuide.vue')

// Backoffice
const BackofficeHelpView = () => import('./backoffice/BackofficeHelpView.vue')
const SupplierGuide = () => import('./backoffice/guides/SupplierGuide.vue')
const AccountsGuide = () => import('./backoffice/guides/AccountsGuide.vue')
const RecipesGuide = () => import('./backoffice/guides/RecipesGuide.vue')
const ProductsGuide = () => import('./backoffice/guides/ProductsGuide.vue')

// Kitchen guides
const PreparationGuide = () => import('./kitchen/guides/PreparationGuide.vue')
const OrdersGuide = () => import('./kitchen/guides/OrdersGuide.vue')
const KpiGuide = () => import('./kitchen/guides/KpiGuide.vue')

// POS sub-guides
const PosOverviewGuide = () => import('./pos/guides/PosOverviewGuide.vue')
const PosOrdersGuide = () => import('./pos/guides/PosOrdersGuide.vue')
const PosDiscountsGuide = () => import('./pos/guides/PosDiscountsGuide.vue')
const PosCancelMoveGuide = () => import('./pos/guides/PosCancelMoveGuide.vue')
const PosPaymentGuide = () => import('./pos/guides/PosPaymentGuide.vue')
const PosShiftGuide = () => import('./pos/guides/PosShiftGuide.vue')

export const helpRoutes: RouteRecordRaw[] = [
  {
    path: '/help',
    component: HelpLayout,
    meta: {
      public: true // No auth required
    },
    children: [
      {
        path: '',
        name: 'help-home',
        component: HelpHomeView,
        meta: {
          title: 'Help & Documentation'
        }
      },
      // Kitchen section
      {
        path: 'kitchen',
        name: 'help-kitchen',
        component: KitchenHelpView,
        meta: {
          title: 'Kitchen Help',
          section: 'kitchen'
        }
      },
      {
        path: 'kitchen/monitor',
        name: 'help-kitchen-monitor',
        component: KitchenMonitorGuide,
        meta: {
          title: 'Kitchen Monitor Guide',
          section: 'kitchen'
        }
      },
      {
        path: 'kitchen/preparation',
        name: 'help-kitchen-preparation',
        component: PreparationGuide,
        meta: {
          title: 'Panduan Persiapan',
          section: 'kitchen'
        }
      },
      {
        path: 'kitchen/orders',
        name: 'help-kitchen-orders',
        component: OrdersGuide,
        meta: {
          title: 'Manajemen Pesanan',
          section: 'kitchen'
        }
      },
      {
        path: 'kitchen/kpi',
        name: 'help-kitchen-kpi',
        component: KpiGuide,
        meta: {
          title: 'KPI Dashboard',
          section: 'kitchen'
        }
      },
      // POS section
      {
        path: 'pos',
        name: 'help-pos',
        component: PosGuide,
        meta: {
          title: 'Panduan POS',
          section: 'pos'
        }
      },
      {
        path: 'pos/overview',
        name: 'help-pos-overview',
        component: PosOverviewGuide,
        meta: {
          title: 'Ikhtisar POS',
          section: 'pos'
        }
      },
      {
        path: 'pos/orders',
        name: 'help-pos-orders',
        component: PosOrdersGuide,
        meta: {
          title: 'Kelola Pesanan',
          section: 'pos'
        }
      },
      {
        path: 'pos/discounts',
        name: 'help-pos-discounts',
        component: PosDiscountsGuide,
        meta: {
          title: 'Diskon',
          section: 'pos'
        }
      },
      {
        path: 'pos/cancel-move',
        name: 'help-pos-cancel-move',
        component: PosCancelMoveGuide,
        meta: {
          title: 'Pembatalan & Pindah Item',
          section: 'pos'
        }
      },
      {
        path: 'pos/payment',
        name: 'help-pos-payment',
        component: PosPaymentGuide,
        meta: {
          title: 'Pembayaran',
          section: 'pos'
        }
      },
      {
        path: 'pos/shift',
        name: 'help-pos-shift',
        component: PosShiftGuide,
        meta: {
          title: 'Shift & Pengeluaran',
          section: 'pos'
        }
      },
      // Backoffice section
      {
        path: 'backoffice',
        name: 'help-backoffice',
        component: BackofficeHelpView,
        meta: {
          title: 'Backoffice Help',
          section: 'backoffice'
        }
      },
      {
        path: 'backoffice/supplier',
        name: 'help-backoffice-supplier',
        component: SupplierGuide,
        meta: {
          title: 'Manajemen Pemasok',
          section: 'backoffice'
        }
      },
      {
        path: 'backoffice/accounts',
        name: 'help-backoffice-accounts',
        component: AccountsGuide,
        meta: {
          title: 'Manajemen Akun',
          section: 'backoffice'
        }
      },
      {
        path: 'backoffice/recipes',
        name: 'help-backoffice-recipes',
        component: RecipesGuide,
        meta: {
          title: 'Manajemen Resep',
          section: 'backoffice'
        }
      },
      {
        path: 'backoffice/products',
        name: 'help-backoffice-products',
        component: ProductsGuide,
        meta: {
          title: 'Manajemen Produk',
          section: 'backoffice'
        }
      }
    ]
  }
]
