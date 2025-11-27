// src/core/connection/ConnectionHealthMonitor.ts
// Monitors Supabase connection health and detects stale connections

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ConnectionHealthMonitor'

interface HealthCheckResult {
  success: boolean
  latency: number
  timestamp: string
  error?: string
}

interface ConnectionStats {
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  avgLatency: number
  lastCheckTime: string | null
  consecutiveFailures: number
}

class ConnectionHealthMonitor {
  private checkInterval: number = 2 * 60 * 1000 // 2 minutes
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private stats: ConnectionStats = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    avgLatency: 0,
    lastCheckTime: null,
    consecutiveFailures: 0
  }

  private latencyHistory: number[] = []
  private readonly MAX_HISTORY = 10

  /**
   * Start health check monitoring
   * Runs a simple query every 2 minutes to keep connection alive
   */
  start() {
    console.log(`🔍 [ConnectionHealthMonitor] start() called, isRunning=${this.isRunning}`)

    if (this.isRunning) {
      console.warn('⚠️ [ConnectionHealthMonitor] Already running, skipping')
      return
    }

    console.log('🏥 [ConnectionHealthMonitor] Starting health checks...')
    console.log(
      `⏰ [ConnectionHealthMonitor] Check interval: ${this.checkInterval}ms (${this.checkInterval / 1000 / 60} minutes)`
    )
    this.isRunning = true

    // Run first check immediately
    console.log('▶️ [ConnectionHealthMonitor] Running first health check immediately...')
    this.performHealthCheck()

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      console.log('⏰ [ConnectionHealthMonitor] Scheduled health check triggered')
      this.performHealthCheck()
    }, this.checkInterval)

    console.log('✅ [ConnectionHealthMonitor] Health checks started successfully')
  }

  /**
   * Stop health check monitoring
   */
  stop() {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 [ConnectionHealthMonitor] Stopping health checks...')

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
  }

  /**
   * Perform a health check by executing a simple query
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = performance.now()
    const timestamp = new Date().toISOString()

    try {
      console.log('🏥 [ConnectionHealthMonitor] Performing health check...')

      // Simple query to check connection
      const { data, error } = await supabase.from('users').select('id').limit(1).maybeSingle()

      const latency = Math.round(performance.now() - startTime)

      if (error) {
        throw error
      }

      // Success
      this.recordSuccess(latency, timestamp)

      console.log('✅ [ConnectionHealthMonitor] Health check passed', {
        latency: `${latency}ms`,
        consecutiveSuccess: this.stats.totalChecks - this.stats.failedChecks,
        avgLatency: `${Math.round(this.stats.avgLatency)}ms`
      })

      return {
        success: true,
        latency,
        timestamp
      }
    } catch (error: any) {
      const latency = Math.round(performance.now() - startTime)
      this.recordFailure(latency, timestamp, error)

      console.error('❌ [ConnectionHealthMonitor] Health check FAILED', {
        latency: `${latency}ms`,
        error: error?.message || String(error),
        consecutiveFailures: this.stats.consecutiveFailures,
        timestamp
      })

      // Alert if multiple consecutive failures
      if (this.stats.consecutiveFailures >= 3) {
        console.error('🚨 [ConnectionHealthMonitor] CRITICAL: 3+ consecutive failures!', {
          totalFailures: this.stats.failedChecks,
          totalChecks: this.stats.totalChecks,
          lastCheckTime: this.stats.lastCheckTime
        })

        // Emit event for UI notification (optional)
        this.emitConnectionWarning()
      }

      return {
        success: false,
        latency,
        timestamp,
        error: error?.message || String(error)
      }
    }
  }

  /**
   * Record successful health check
   */
  private recordSuccess(latency: number, timestamp: string) {
    this.stats.totalChecks++
    this.stats.successfulChecks++
    this.stats.consecutiveFailures = 0
    this.stats.lastCheckTime = timestamp

    // Update latency stats
    this.latencyHistory.push(latency)
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift()
    }
    this.stats.avgLatency =
      this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length
  }

  /**
   * Record failed health check
   */
  private recordFailure(latency: number, timestamp: string, error: any) {
    this.stats.totalChecks++
    this.stats.failedChecks++
    this.stats.consecutiveFailures++
    this.stats.lastCheckTime = timestamp

    DebugUtils.error(MODULE_NAME, 'Health check failed', {
      error: error?.message || String(error),
      latency,
      consecutiveFailures: this.stats.consecutiveFailures
    })
  }

  /**
   * Emit connection warning event
   */
  private emitConnectionWarning() {
    // Dispatch custom event for UI components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('supabase-connection-warning', {
          detail: {
            consecutiveFailures: this.stats.consecutiveFailures,
            stats: this.getStats()
          }
        })
      )
    }
  }

  /**
   * Get current connection stats
   */
  getStats(): ConnectionStats {
    return { ...this.stats }
  }

  /**
   * Get health status
   */
  getStatus(): 'healthy' | 'degraded' | 'critical' {
    if (this.stats.consecutiveFailures === 0) {
      return 'healthy'
    } else if (this.stats.consecutiveFailures < 3) {
      return 'degraded'
    } else {
      return 'critical'
    }
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      avgLatency: 0,
      lastCheckTime: null,
      consecutiveFailures: 0
    }
    this.latencyHistory = []
    console.log('🔄 [ConnectionHealthMonitor] Stats reset')
  }
}

// Singleton instance
let monitorInstance: ConnectionHealthMonitor | null = null

/**
 * Get connection health monitor singleton
 */
export function getConnectionHealthMonitor(): ConnectionHealthMonitor {
  if (!monitorInstance) {
    monitorInstance = new ConnectionHealthMonitor()
  }
  return monitorInstance
}

/**
 * Export class for testing
 */
export { ConnectionHealthMonitor }
