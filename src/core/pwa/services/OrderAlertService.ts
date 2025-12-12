// src/core/pwa/services/OrderAlertService.ts
// Updated for order_items table architecture (Migration 053-054)

import { ref, readonly } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/supabase/client'
import { useNotifications } from '../composables/useNotifications'
import type { OrderAlertConfig, OrderAlertEvent } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'OrderAlertService'

// Default configuration
const DEFAULT_CONFIG: OrderAlertConfig = {
  soundEnabled: true,
  soundUrl: '/sounds/new-order.mp3',
  soundVolume: 0.7,
  notificationEnabled: true,
  vibrationEnabled: true,
  vibrationPattern: [200, 100, 200, 100, 200]
}

/**
 * Service for handling order alerts via Supabase Realtime
 * Plays sounds and shows notifications when new orders arrive
 *
 * Architecture (Migration 053-054):
 * - Subscribes to order_items table (not orders!)
 * - Triggers alert when item.status changes to 'waiting'
 * - Filters by user's department (kitchen vs bar)
 */
class OrderAlertService {
  private channel: RealtimeChannel | null = null
  private config: OrderAlertConfig = { ...DEFAULT_CONFIG }
  private isInitialized = ref(false)
  private isSubscribed = ref(false)
  private notifications = useNotifications()

  /**
   * Initialize the service
   * Can be called multiple times to update config (e.g., when switching departments)
   */
  async initialize(config?: Partial<OrderAlertConfig>): Promise<void> {
    // Always merge config (allows updating userDepartment when switching views)
    if (config) {
      const oldDepartment = this.config.userDepartment
      this.config = { ...this.config, ...config }

      if (this.isInitialized.value && oldDepartment !== config.userDepartment) {
        DebugUtils.info(MODULE_NAME, 'Department changed, updating config', {
          oldDepartment,
          newDepartment: config.userDepartment
        })
      }
    }

    if (this.isInitialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized, config updated')
      return
    }

    // Configure notifications
    this.notifications.configureSound({
      url: this.config.soundUrl,
      volume: this.config.soundVolume,
      enabled: this.config.soundEnabled
    })
    this.notifications.configureVibration(this.config.vibrationEnabled)

    // Request notification permission
    if (this.config.notificationEnabled) {
      await this.notifications.requestPermission()
    }

    this.isInitialized.value = true
    DebugUtils.info(MODULE_NAME, 'Initialized', { config: this.config })
  }

  /**
   * Subscribe to order_items updates (NEW: Migration 053-054)
   * Sound plays when item status changes to 'waiting' (sent to kitchen/bar)
   */
  subscribe(): void {
    if (this.isSubscribed.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed')
      return
    }

    if (!this.isInitialized.value) {
      DebugUtils.warn(MODULE_NAME, 'Not initialized, call initialize() first')
      return
    }

    // Subscribe to order_items table changes (NOT orders!)
    // This allows direct filtering by item status and department
    this.channel = supabase
      .channel('order-item-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
          filter: 'status=eq.waiting'
        },
        payload => this.handleItemSentToKitchen(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
          filter: 'status=eq.ready'
        },
        payload => this.handleItemReady(payload)
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed.value = true
          DebugUtils.info(MODULE_NAME, 'Subscribed to order_items alerts', {
            userDepartment: this.config.userDepartment
          })
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, 'Failed to subscribe to order_items alerts')
        }
      })
  }

  /**
   * Unsubscribe from order updates
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel)
      this.channel = null
      this.isSubscribed.value = false
      DebugUtils.info(MODULE_NAME, 'Unsubscribed from order alerts')
    }
  }

  /**
   * Handle item sent to kitchen (NEW: Migration 053-054)
   * Triggers when item.status CHANGES TO 'waiting'
   * Filters by user's department (kitchen vs bar)
   */
  private handleItemSentToKitchen(payload: any): void {
    const item = payload.new
    const oldItem = payload.old

    // Validate payload.old exists (requires REPLICA IDENTITY FULL)
    // If oldItem is null, this could be INSERT (legitimate) or UPDATE without REPLICA IDENTITY (problem)
    if (!oldItem && item?.status === 'waiting') {
      DebugUtils.warn(MODULE_NAME, 'payload.old is null - assuming new item INSERT', {
        itemId: item?.id,
        itemName: item?.menu_item_name,
        status: item?.status,
        hint: 'If this is UPDATE, check REPLICA IDENTITY FULL on order_items table'
      })
      // Continue processing - treat as new item entering kitchen
    }

    // STRICT CHECK: Only trigger when status CHANGED TO 'waiting'
    // For INSERT: oldItem is null, undefined !== 'waiting' = true (correct)
    // For UPDATE: requires REPLICA IDENTITY FULL for proper change detection
    const statusChangedToWaiting = oldItem?.status !== 'waiting' && item?.status === 'waiting'

    if (!statusChangedToWaiting) {
      DebugUtils.debug(MODULE_NAME, 'Ignoring - not a status change to waiting', {
        itemId: item?.id,
        oldStatus: oldItem?.status,
        newStatus: item?.status
      })
      return
    }

    // Department filter: only alert if item belongs to user's department
    const itemDepartment = item?.department || 'kitchen'
    if (this.config.userDepartment && itemDepartment !== this.config.userDepartment) {
      DebugUtils.debug(MODULE_NAME, '🚫 Ignoring - item not for user department', {
        itemId: item?.id,
        itemName: item?.menu_item_name,
        itemDepartment,
        userDepartment: this.config.userDepartment
      })
      return
    }

    // TEMPORARY: Skip sound alerts for bar (bar staff take orders directly, they know about them)
    // TODO: Remove this when bar needs sound alerts
    if (this.config.userDepartment === 'bar') {
      DebugUtils.debug(MODULE_NAME, '🔇 Bar alerts disabled (temporary)', {
        itemId: item?.id,
        itemName: item?.menu_item_name
      })
      return
    }

    DebugUtils.info(MODULE_NAME, '🔔 Item sent to kitchen!', {
      itemId: item.id,
      itemName: item.menu_item_name,
      orderId: item.order_id,
      billNumber: item.bill_number,
      department: itemDepartment,
      previousStatus: oldItem?.status,
      userDepartment: this.config.userDepartment
    })

    const event: OrderAlertEvent = {
      orderId: item.order_id,
      orderNumber: item.bill_number || 'N/A',
      tableNumber: undefined, // Not available at item level
      itemCount: 1,
      type: 'new_order',
      timestamp: new Date().toISOString()
    }

    this.triggerAlert(event)
  }

  /**
   * Handle item ready (NEW: Migration 053-054)
   * Triggers when item.status CHANGES TO 'ready'
   * NOTE: This is for POS/waiters to know when to pick up dishes
   */
  private handleItemReady(payload: any): void {
    const item = payload.new
    const oldItem = payload.old

    // Kitchen/Bar staff don't need "ready" alerts - they mark items ready themselves
    // This alert is only for POS/waiters
    if (this.config.userDepartment === 'kitchen' || this.config.userDepartment === 'bar') {
      DebugUtils.debug(MODULE_NAME, '🔇 Ready alerts disabled for kitchen/bar staff')
      return
    }

    // STRICT CHECK: Only trigger when status CHANGED TO 'ready'
    const statusChangedToReady = oldItem?.status !== 'ready' && item?.status === 'ready'

    if (!statusChangedToReady) {
      DebugUtils.debug(MODULE_NAME, 'Ignoring - not a status change to ready', {
        itemId: item?.id,
        oldStatus: oldItem?.status,
        newStatus: item?.status
      })
      return
    }

    DebugUtils.info(MODULE_NAME, '✅ Item ready (for POS/waiter)!', {
      itemId: item.id,
      itemName: item.menu_item_name,
      orderId: item.order_id,
      billNumber: item.bill_number,
      department: item.department,
      previousStatus: oldItem?.status
    })

    const event: OrderAlertEvent = {
      orderId: item.order_id,
      orderNumber: item.bill_number || 'N/A',
      tableNumber: undefined,
      itemCount: 1,
      type: 'order_ready',
      timestamp: new Date().toISOString()
    }

    this.triggerAlert(event)
  }

  /**
   * Trigger alert (notification + sound)
   * Sound is played FIRST and independently of notification permission
   */
  private async triggerAlert(event: OrderAlertEvent): Promise<void> {
    // Build notification message
    const title = this.getAlertTitle(event)
    const body = this.getAlertBody(event)

    DebugUtils.info(MODULE_NAME, 'Triggering alert', { event, title, body })

    // ALWAYS try to play sound first if enabled (independent of notification)
    if (this.config.soundEnabled) {
      await this.notifications.playSound()
    }

    // Show notification if enabled (with silent: true since sound already played)
    if (this.config.notificationEnabled) {
      await this.notifications.notify({
        title,
        body,
        tag: `order-${event.orderId}`,
        vibrate: this.config.vibrationEnabled ? this.config.vibrationPattern : undefined,
        data: event,
        silent: true // Sound already played above
      })
    }

    // Vibrate if enabled and notifications were not shown (vibrate is in notify)
    if (this.config.vibrationEnabled && !this.config.notificationEnabled) {
      this.notifications.vibrate(this.config.vibrationPattern || [200, 100, 200, 100, 200])
    }
  }

  /**
   * Get alert title based on event type
   */
  private getAlertTitle(event: OrderAlertEvent): string {
    switch (event.type) {
      case 'new_order':
        return 'New Order!'
      case 'order_ready':
        return 'Order Ready!'
      case 'order_update':
        return 'Order Updated'
      default:
        return 'Order Alert'
    }
  }

  /**
   * Get alert body based on event
   */
  private getAlertBody(event: OrderAlertEvent): string {
    const parts: string[] = []

    if (event.orderNumber) {
      parts.push(`Order #${event.orderNumber}`)
    }

    if (event.tableNumber) {
      parts.push(`Table ${event.tableNumber}`)
    }

    if (event.itemCount > 0) {
      parts.push(`${event.itemCount} item${event.itemCount > 1 ? 's' : ''}`)
    }

    return parts.join(' - ') || 'Check the POS for details'
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrderAlertConfig>): void {
    this.config = { ...this.config, ...config }

    // Update notifications config
    if (config.soundUrl || config.soundVolume !== undefined || config.soundEnabled !== undefined) {
      this.notifications.configureSound({
        url: config.soundUrl,
        volume: config.soundVolume,
        enabled: config.soundEnabled
      })
    }

    if (config.vibrationEnabled !== undefined) {
      this.notifications.configureVibration(config.vibrationEnabled)
    }

    DebugUtils.debug(MODULE_NAME, 'Config updated', { config: this.config })
  }

  /**
   * Test alert (for settings page)
   */
  async testAlert(): Promise<void> {
    const testEvent: OrderAlertEvent = {
      orderId: 'test',
      orderNumber: '999',
      tableNumber: '5',
      itemCount: 3,
      type: 'new_order',
      timestamp: new Date().toISOString()
    }

    await this.triggerAlert(testEvent)
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isInitialized: readonly(this.isInitialized),
      isSubscribed: readonly(this.isSubscribed),
      config: { ...this.config }
    }
  }
}

// Singleton instance
let instance: OrderAlertService | null = null

/**
 * Get or create OrderAlertService instance
 */
export function useOrderAlertService(): OrderAlertService {
  if (!instance) {
    instance = new OrderAlertService()
  }
  return instance
}

/**
 * Reset instance (for testing)
 */
export function resetOrderAlertService(): void {
  if (instance) {
    instance.unsubscribe()
    instance = null
  }
}
