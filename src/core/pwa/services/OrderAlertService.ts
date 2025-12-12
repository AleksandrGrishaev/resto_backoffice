// src/core/pwa/services/OrderAlertService.ts

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
 */
class OrderAlertService {
  private channel: RealtimeChannel | null = null
  private config: OrderAlertConfig = { ...DEFAULT_CONFIG }
  private isInitialized = ref(false)
  private isSubscribed = ref(false)
  private notifications = useNotifications()

  /**
   * Initialize the service
   */
  async initialize(config?: Partial<OrderAlertConfig>): Promise<void> {
    if (this.isInitialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized')
      return
    }

    // Merge config
    if (config) {
      this.config = { ...this.config, ...config }
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
   * Subscribe to order updates
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

    // Subscribe to orders table changes
    // Sound plays when order is SENT TO KITCHEN (status becomes 'waiting')
    this.channel = supabase
      .channel('order-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.waiting'
        },
        payload => this.handleNewOrder(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.ready'
        },
        payload => this.handleOrderReady(payload)
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed.value = true
          DebugUtils.info(MODULE_NAME, 'Subscribed to order alerts')
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, 'Failed to subscribe to order alerts')
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
   * Handle new order event (order sent to kitchen)
   * Only triggers when status CHANGES TO 'waiting' from another status
   * Ignores all updates while order is already in 'waiting' status
   */
  private handleNewOrder(payload: any): void {
    const order = payload.new
    const oldOrder = payload.old

    // STRICT CHECK: Only trigger when status CHANGED TO 'waiting'
    // Must have: old status !== 'waiting' AND new status === 'waiting'
    // NOTE: Requires REPLICA IDENTITY FULL on orders table for oldOrder to have status field
    const statusChangedToWaiting = oldOrder?.status !== 'waiting' && order?.status === 'waiting'

    if (!statusChangedToWaiting) {
      DebugUtils.debug(MODULE_NAME, 'Ignoring - not a status change to waiting', {
        orderId: order?.id,
        oldStatus: oldOrder?.status,
        newStatus: order?.status
      })
      return
    }

    // Department filter: only alert if order has WAITING items for user's department
    const hasItems = this.hasItemsForDepartment(order, this.config.userDepartment)
    const waitingItems = (order?.items || []).filter((i: any) => i.status === 'waiting')
    DebugUtils.info(MODULE_NAME, '🔍 Department filter check', {
      orderId: order?.id,
      orderNumber: order?.order_number,
      userDepartment: this.config.userDepartment,
      hasWaitingItemsForDept: hasItems,
      waitingItems: waitingItems.map((i: any) => ({
        name: i.menuItemName,
        dept: i.department || 'kitchen',
        status: i.status
      }))
    })

    if (this.config.userDepartment && !hasItems) {
      DebugUtils.info(MODULE_NAME, '🚫 Ignoring - no items for user department', {
        orderId: order?.id,
        userDepartment: this.config.userDepartment
      })
      return
    }

    DebugUtils.info(MODULE_NAME, '🔔 New order sent to kitchen!', {
      orderId: order.id,
      orderNumber: order.order_number,
      previousStatus: oldOrder?.status,
      itemCount: order.items?.length || 0,
      userDepartment: this.config.userDepartment
    })

    const event: OrderAlertEvent = {
      orderId: order.id,
      orderNumber: order.order_number,
      tableNumber: order.table_id,
      itemCount: order.items?.length || 0,
      type: 'new_order',
      timestamp: new Date().toISOString()
    }

    this.triggerAlert(event)
  }

  /**
   * Handle order ready event
   * Only triggers when status CHANGES TO 'ready' from another status
   */
  private handleOrderReady(payload: any): void {
    const order = payload.new
    const oldOrder = payload.old

    // STRICT CHECK: Only trigger when status CHANGED TO 'ready'
    const statusChangedToReady = oldOrder?.status !== 'ready' && order?.status === 'ready'

    if (!statusChangedToReady) {
      DebugUtils.debug(MODULE_NAME, 'Ignoring - not a status change to ready', {
        orderId: order?.id,
        oldStatus: oldOrder?.status,
        newStatus: order?.status
      })
      return
    }

    DebugUtils.info(MODULE_NAME, '✅ Order ready!', {
      orderId: order.id,
      orderNumber: order.order_number,
      previousStatus: oldOrder?.status
    })

    const event: OrderAlertEvent = {
      orderId: order.id,
      orderNumber: order.order_number,
      tableNumber: order.table_id,
      itemCount: order.items?.length || 0,
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
   * Check if order has items with status 'waiting' for the specified department
   * Used to filter alerts - only play sound if there are NEW items (waiting) for user's department
   */
  private hasItemsForDepartment(order: any, department: 'kitchen' | 'bar' | undefined): boolean {
    if (!department) return true // No filter if department not specified

    const items = order?.items || []
    // Check for items that are:
    // 1. In 'waiting' status (just sent to kitchen/bar)
    // 2. Belong to the specified department
    return items.some(
      (item: any) => item.status === 'waiting' && (item.department || 'kitchen') === department
    )
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
