// src/stores/pos/service/supabaseMappers.ts - Supabase data mappers for department notifications

import type { DepartmentNotification, DepartmentItem } from './DepartmentNotificationService'
import type { Database } from '@/supabase/types'

type SupabaseDepartmentNotification =
  Database['public']['Tables']['department_notifications']['Row']
type SupabaseDepartmentNotificationInsert =
  Database['public']['Tables']['department_notifications']['Insert']
type SupabaseDepartmentNotificationUpdate =
  Database['public']['Tables']['department_notifications']['Update']

/**
 * Convert DepartmentNotification to Supabase format for INSERT
 */
export function toSupabaseInsert(
  notification: DepartmentNotification
): SupabaseDepartmentNotificationInsert {
  return {
    id: notification.notificationId,
    department: notification.department,

    // Order info as JSONB
    order_id: notification.orderInfo.orderId,
    order_number: notification.orderInfo.orderNumber,
    order_type: notification.orderInfo.orderType,
    table_number: notification.orderInfo.tableNumber || null,
    customer_name: notification.orderInfo.customerName || null,
    waiter_name: notification.orderInfo.waiterName || null,

    // Items as JSONB array
    items: notification.items.map(item => ({
      id: item.itemId,
      menu_item_id: item.menuItemId,
      item_name: item.itemName,
      variant_name: item.variantName,
      quantity: item.quantity,
      modifications: item.modifications,
      kitchen_notes: item.kitchenNotes || null,
      urgency: item.urgency,
      estimated_time: item.estimatedTime || null
    })) as any,

    // Metadata
    total_items: notification.totalItems,
    estimated_total_time: notification.estimatedTotalTime || null,
    urgency_level: notification.urgencyLevel,

    // Status
    status: 'pending', // 'pending' | 'acknowledged' | 'in_progress' | 'ready' | 'completed'
    acknowledged_at: null,
    completed_at: null,

    // Timestamps
    created_at: notification.timestamp,
    updated_at: notification.timestamp
  }
}

/**
 * Convert DepartmentNotification to Supabase format for UPDATE
 */
export function toSupabaseUpdate(
  notification: DepartmentNotification
): SupabaseDepartmentNotificationUpdate {
  const insert = toSupabaseInsert(notification)
  return {
    ...insert,
    // Don't update created_at on updates
    created_at: undefined,
    // Supabase has updated_at trigger, but we can override if needed
    updated_at: new Date().toISOString()
  }
}

/**
 * Convert Supabase department notification to app format
 */
export function fromSupabase(
  supabaseNotification: SupabaseDepartmentNotification
): DepartmentNotification {
  const items = ((supabaseNotification.items as any[]) || []).map(item => ({
    itemId: item.id,
    menuItemId: item.menu_item_id,
    itemName: item.item_name,
    variantName: item.variant_name || '',
    quantity: item.quantity,
    modifications: item.modifications || [],
    kitchenNotes: item.kitchen_notes || undefined,
    urgency: item.urgency as 'normal' | 'urgent',
    estimatedTime: item.estimated_time || undefined
  }))

  return {
    notificationId: supabaseNotification.id,
    department: supabaseNotification.department as 'kitchen' | 'bar',
    items,
    orderInfo: {
      orderId: supabaseNotification.order_id,
      orderNumber: supabaseNotification.order_number,
      orderType: supabaseNotification.order_type as 'dine_in' | 'takeaway' | 'delivery',
      tableNumber: supabaseNotification.table_number || undefined,
      customerName: supabaseNotification.customer_name || undefined,
      waiterName: supabaseNotification.waiter_name || undefined
    },
    timestamp: supabaseNotification.created_at,
    totalItems: supabaseNotification.total_items,
    estimatedTotalTime: supabaseNotification.estimated_total_time || undefined,
    urgencyLevel: supabaseNotification.urgency_level as 'normal' | 'urgent'
  }
}

/**
 * Convert DepartmentNotification to Supabase format for status update
 */
export function toSupabaseStatusUpdate(
  notificationId: string,
  status: 'acknowledged' | 'in_progress' | 'ready' | 'completed',
  metadata?: { acknowledged_by?: string; completed_by?: string }
): SupabaseDepartmentNotificationUpdate {
  const update: SupabaseDepartmentNotificationUpdate = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'acknowledged') {
    update.acknowledged_at = new Date().toISOString()
    if (metadata?.acknowledged_by) {
      // Add acknowledged_by to metadata if needed in the future
      update.acknowledged_by = metadata.acknowledged_by
    }
  }

  if (status === 'completed') {
    update.completed_at = new Date().toISOString()
    if (metadata?.completed_by) {
      // Add completed_by to metadata if needed in the future
      update.completed_by = metadata.completed_by
    }
  }

  return update
}
