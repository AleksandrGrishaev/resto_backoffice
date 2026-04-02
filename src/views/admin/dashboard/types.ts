// src/views/admin/dashboard/types.ts

export interface DashboardWidgetConfig {
  id: string
  visible: boolean
}

export interface DashboardConfig {
  widgets: DashboardWidgetConfig[]
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

export interface WidgetDefinition {
  id: string
  title: string
  icon: string
  size: WidgetSize
}

// --- Period selection ---

export type PeriodType = 'day' | 'week' | 'month' | 'custom'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export interface PeriodPreset {
  type: PeriodType
  label: string
  icon: string
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  { type: 'day', label: 'Day', icon: 'mdi-calendar-today' },
  { type: 'week', label: 'Week', icon: 'mdi-calendar-week' },
  { type: 'month', label: 'Month', icon: 'mdi-calendar-month' },
  { type: 'custom', label: 'Custom', icon: 'mdi-calendar-range' }
]

// --- Data types ---

export interface DaySummary {
  grossRevenue: number
  netRevenue: number
  totalOrders: number
  totalGuests: number
  avgCheckPerGuest: number
  foodCostPercent: number
  totalFoodCost: number
  totalDiscounts: number
  totalTax: number
  // Delta vs previous period
  revenueDelta: number | null
  ordersDelta: number | null
  avgCheckDelta: number | null
  foodCostDelta: number | null
}

export interface HourlySale {
  hour: number
  revenue: number
  itemsSold: number
}

export interface StaffHourly {
  hour: number
  kitchen: number
  bar: number
  service: number
}

export interface WriteOffSummary {
  total: number
  byType: { type: string; count: number }[]
  byDepartment: { department: string; count: number }[]
}

export interface PaymentBreakdown {
  cash: number
  card: number
  qr: number
}

export interface DepartmentSale {
  department: string
  revenue: number
  itemsSold: number
}

export interface DepartmentRevenue {
  date: string
  department: string
  revenue: number
}

export interface ChannelSale {
  channel: string
  orders: number
  revenue: number
}

export interface LoyaltySale {
  type: 'anonymous' | 'cashback' | 'stamp_card'
  orders: number
  revenue: number
  guests: number
}

export interface DashboardData {
  summary: DaySummary
  hourlySales: HourlySale[]
  staffByHour: StaffHourly[]
  writeOffs: WriteOffSummary
  paymentMethods: PaymentBreakdown
  departmentSales: DepartmentSale[]
  revenueByDepartment: DepartmentRevenue[]
  channelSales: ChannelSale[]
  loyaltySales: LoyaltySale[]
}

// Widget registry
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { id: 'summary', title: 'Summary', icon: 'mdi-chart-box-outline', size: 'full' },
  { id: 'hourly-sales', title: 'Sales by Hour', icon: 'mdi-chart-bar', size: 'large' },
  {
    id: 'revenue-by-dept',
    title: 'Revenue by Department',
    icon: 'mdi-chart-timeline-variant',
    size: 'large'
  },
  { id: 'write-offs', title: 'Write-offs', icon: 'mdi-delete-sweep', size: 'medium' },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    icon: 'mdi-credit-card-outline',
    size: 'small'
  },
  { id: 'department-sales', title: 'Sales by Department', icon: 'mdi-domain', size: 'medium' },
  { id: 'channel-sales', title: 'Sales by Channel', icon: 'mdi-store', size: 'medium' },
  { id: 'loyalty-sales', title: 'Customer Loyalty', icon: 'mdi-account-heart', size: 'medium' }
]
