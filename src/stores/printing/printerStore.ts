// src/stores/printing/printerStore.ts
// Pinia store for printer connection state and settings

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BluetoothPrinterDevice,
  PrinterConnectionStatus,
  PrinterSettings,
  PrintResult,
  ReceiptData
} from '@/core/printing/types'
import { DEFAULT_PRINTER_SETTINGS } from '@/core/printing/types'
import { getBluetoothPrinterService } from '@/core/printing/BluetoothPrinterService'
import { ReceiptBuilder } from '@/core/printing/ReceiptBuilder'
import { DebugUtils } from '@/utils'
import { supabase } from '@/supabase/client'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'PrinterStore'
const SETTINGS_STORAGE_KEY = 'printer_settings'

export const usePrinterStore = defineStore('printer', () => {
  // ===== State =====

  const status = ref<PrinterConnectionStatus>('disconnected')
  const device = ref<BluetoothPrinterDevice | null>(null)
  const error = ref<string | null>(null)
  const settings = ref<PrinterSettings>({ ...DEFAULT_PRINTER_SETTINGS })
  const initialized = ref(false)

  // ===== Computed =====

  const isConnected = computed(() => status.value === 'connected')
  const isConnecting = computed(() => status.value === 'connecting')
  const isAvailable = computed(() => getBluetoothPrinterService().isAvailable())

  // ===== Actions =====

  /**
   * Initialize store - load settings
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return

    DebugUtils.info(MODULE_NAME, 'Initializing printer store...')

    await loadSettings()

    // Set up disconnect callback
    const printerService = getBluetoothPrinterService()
    printerService.onDisconnect(() => {
      DebugUtils.warn(MODULE_NAME, 'Printer disconnected')
      status.value = 'disconnected'
      device.value = null
    })

    printerService.onError(err => {
      DebugUtils.error(MODULE_NAME, 'Printer error', err)
      error.value = err.message
    })

    initialized.value = true
    DebugUtils.info(MODULE_NAME, 'Printer store initialized')
  }

  /**
   * Connect to a Bluetooth printer
   * Must be called from a user gesture (click event)
   */
  async function connect(): Promise<boolean> {
    if (status.value === 'connecting') {
      DebugUtils.warn(MODULE_NAME, 'Already connecting...')
      return false
    }

    const printerService = getBluetoothPrinterService()

    if (!printerService.isAvailable()) {
      error.value = 'Web Bluetooth is not available in this browser'
      DebugUtils.error(MODULE_NAME, error.value)
      return false
    }

    try {
      status.value = 'connecting'
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Requesting Bluetooth device...')

      // Request device (shows browser picker)
      const selectedDevice = await printerService.requestDevice()

      if (!selectedDevice) {
        // User cancelled
        status.value = 'disconnected'
        return false
      }

      // Connect to the device
      const connected = await printerService.connect(selectedDevice)

      if (connected) {
        status.value = 'connected'
        device.value = printerService.getDevice()

        // Save last connected device to localStorage
        if (device.value) {
          localStorage.setItem(
            'last_printer_device',
            JSON.stringify({
              id: device.value.id,
              name: device.value.name
            })
          )
        }

        DebugUtils.info(MODULE_NAME, 'Connected to printer', { device: device.value })
        return true
      } else {
        status.value = 'error'
        error.value = 'Failed to connect to printer'
        return false
      }
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Connection failed'
      DebugUtils.error(MODULE_NAME, 'Connection failed', err)
      return false
    }
  }

  /**
   * Disconnect from the printer
   */
  async function disconnect(): Promise<void> {
    const printerService = getBluetoothPrinterService()

    try {
      await printerService.disconnect()
      status.value = 'disconnected'
      device.value = null
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Disconnected from printer')
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Disconnect failed', err)
    }
  }

  /**
   * Print raw data to the printer
   */
  async function print(data: Uint8Array): Promise<PrintResult> {
    if (!isConnected.value) {
      return {
        success: false,
        error: 'Printer not connected'
      }
    }

    const printerService = getBluetoothPrinterService()
    return printerService.sendData(data)
  }

  /**
   * Print a pre-bill receipt
   */
  async function printPreBill(receiptData: ReceiptData): Promise<PrintResult> {
    const builder = new ReceiptBuilder()
    const data = {
      ...receiptData,
      restaurantName: settings.value.restaurantName,
      restaurantAddress: settings.value.restaurantAddress,
      restaurantPhone: settings.value.restaurantPhone,
      footerMessage: settings.value.footerMessage
    }
    const commands = builder.buildPreBill(data)
    return print(commands)
  }

  /**
   * Print a payment receipt
   */
  async function printPaymentReceipt(receiptData: ReceiptData): Promise<PrintResult> {
    const builder = new ReceiptBuilder()
    const data = {
      ...receiptData,
      restaurantName: settings.value.restaurantName,
      restaurantAddress: settings.value.restaurantAddress,
      restaurantPhone: settings.value.restaurantPhone,
      footerMessage: settings.value.footerMessage
    }
    const commands = builder.buildPaymentReceipt(data)
    return print(commands)
  }

  /**
   * Print a test receipt
   */
  async function printTest(): Promise<PrintResult> {
    const builder = new ReceiptBuilder()
    const commands = builder.buildTestPrint(settings.value.restaurantName)
    return print(commands)
  }

  // ===== Settings Management =====

  /**
   * Load settings from Supabase or localStorage
   */
  async function loadSettings(): Promise<void> {
    try {
      // Try Supabase first
      if (ENV.useSupabase && supabase) {
        const { data, error: supabaseError } = await supabase
          .from('printer_settings')
          .select('*')
          .limit(1)
          .single()

        if (!supabaseError && data) {
          settings.value = {
            id: data.id,
            restaurantName: data.restaurant_name,
            restaurantAddress: data.restaurant_address || '',
            restaurantPhone: data.restaurant_phone || '',
            footerMessage: data.footer_message || DEFAULT_PRINTER_SETTINGS.footerMessage,
            autoPrintCashReceipt: data.auto_print_cash_receipt ?? true,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          }
          DebugUtils.info(MODULE_NAME, 'Loaded settings from Supabase')
          return
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        settings.value = { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(stored) }
        DebugUtils.info(MODULE_NAME, 'Loaded settings from localStorage')
      }
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load settings, using defaults', err)
      settings.value = { ...DEFAULT_PRINTER_SETTINGS }
    }
  }

  /**
   * Save settings to Supabase and localStorage
   */
  async function saveSettings(newSettings: Partial<PrinterSettings>): Promise<boolean> {
    const updatedSettings = {
      ...settings.value,
      ...newSettings,
      updatedAt: new Date().toISOString()
    }

    try {
      // Save to Supabase
      if (ENV.useSupabase && supabase) {
        const supabaseData = {
          restaurant_name: updatedSettings.restaurantName,
          restaurant_address: updatedSettings.restaurantAddress || null,
          restaurant_phone: updatedSettings.restaurantPhone || null,
          footer_message: updatedSettings.footerMessage,
          auto_print_cash_receipt: updatedSettings.autoPrintCashReceipt,
          updated_at: updatedSettings.updatedAt
        }

        if (settings.value.id) {
          // Update existing
          const { error: supabaseError } = await supabase
            .from('printer_settings')
            .update(supabaseData)
            .eq('id', settings.value.id)

          if (supabaseError) {
            throw supabaseError
          }
        } else {
          // Insert new
          const { data, error: supabaseError } = await supabase
            .from('printer_settings')
            .insert(supabaseData)
            .select('id')
            .single()

          if (supabaseError) {
            throw supabaseError
          }

          updatedSettings.id = data.id
        }

        DebugUtils.info(MODULE_NAME, 'Saved settings to Supabase')
      }

      // Also save to localStorage as backup
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))

      settings.value = updatedSettings
      return true
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to save settings', err)

      // Fallback: save to localStorage only
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings))
      settings.value = updatedSettings

      return false
    }
  }

  // ===== Return =====

  return {
    // State
    status,
    device,
    error,
    settings,
    initialized,

    // Computed
    isConnected,
    isConnecting,
    isAvailable,

    // Actions
    initialize,
    connect,
    disconnect,
    print,
    printPreBill,
    printPaymentReceipt,
    printTest,

    // Settings
    loadSettings,
    saveSettings
  }
})
