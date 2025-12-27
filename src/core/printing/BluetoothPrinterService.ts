// src/core/printing/BluetoothPrinterService.ts
// Web Bluetooth API service for connecting to thermal printers

import type { BluetoothPrinterDevice, PrintResult } from './types'
import { PRINTER_BLUETOOTH_UUIDS } from './types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'BluetoothPrinterService'

// Maximum bytes per BLE write (typical MTU limit)
const MAX_CHUNK_SIZE = 20

/**
 * Bluetooth Printer Service
 *
 * Manages Web Bluetooth connection to thermal printers.
 * Singleton pattern for global access.
 *
 * Important: Web Bluetooth requires:
 * - HTTPS (PWA meets this requirement)
 * - User gesture to initiate connection (click event)
 * - Chrome browser (Android, ChromeOS, Windows, macOS)
 */
export class BluetoothPrinterService {
  private static instance: BluetoothPrinterService | null = null

  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private serviceUUID: string | null = null

  private disconnectCallback: (() => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BluetoothPrinterService {
    if (!BluetoothPrinterService.instance) {
      BluetoothPrinterService.instance = new BluetoothPrinterService()
    }
    return BluetoothPrinterService.instance
  }

  /**
   * Check if Web Bluetooth API is available
   */
  isAvailable(): boolean {
    return 'bluetooth' in navigator
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.device?.gatt?.connected === true && this.characteristic !== null
  }

  /**
   * Get current device info
   */
  getDevice(): BluetoothPrinterDevice | null {
    if (!this.device) return null

    return {
      id: this.device.id,
      name: this.device.name || 'Unknown Printer',
      connected: this.isConnected(),
      lastConnected: this.isConnected() ? new Date().toISOString() : undefined
    }
  }

  /**
   * Request and connect to a Bluetooth printer
   * Must be called from a user gesture (click event)
   */
  async requestDevice(): Promise<BluetoothDevice | null> {
    if (!this.isAvailable()) {
      throw new Error('Web Bluetooth is not available in this browser')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Requesting Bluetooth device...')

      // Request device with printer service filters
      // Try with optional services to find printers
      const device = await navigator.bluetooth.requestDevice({
        // Accept any device with printer-like services
        acceptAllDevices: true,
        optionalServices: PRINTER_BLUETOOTH_UUIDS.services
      })

      DebugUtils.info(MODULE_NAME, 'Device selected', {
        name: device.name,
        id: device.id
      })

      // Set up disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        DebugUtils.warn(MODULE_NAME, 'Device disconnected')
        this.handleDisconnect()
      })

      this.device = device
      return device
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        // User cancelled device selection
        DebugUtils.info(MODULE_NAME, 'User cancelled device selection')
        return null
      }
      DebugUtils.error(MODULE_NAME, 'Failed to request device', error)
      throw error
    }
  }

  /**
   * Connect to the selected device
   */
  async connect(device?: BluetoothDevice): Promise<boolean> {
    const targetDevice = device || this.device

    if (!targetDevice) {
      throw new Error('No device to connect to')
    }

    if (!targetDevice.gatt) {
      throw new Error('Device does not support GATT')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Connecting to device...', { name: targetDevice.name })

      // Connect to GATT server
      this.server = await targetDevice.gatt.connect()
      DebugUtils.info(MODULE_NAME, 'GATT server connected')

      // Try to find the printer service
      let service: BluetoothRemoteGATTService | null = null

      for (const serviceUUID of PRINTER_BLUETOOTH_UUIDS.services) {
        try {
          service = await this.server.getPrimaryService(serviceUUID)
          this.serviceUUID = serviceUUID
          DebugUtils.info(MODULE_NAME, 'Found service', { uuid: serviceUUID })
          break
        } catch {
          // Service not found, try next
          continue
        }
      }

      if (!service) {
        throw new Error('No compatible printer service found on device')
      }

      // Find write characteristic
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null

      for (const charUUID of PRINTER_BLUETOOTH_UUIDS.characteristics.write) {
        try {
          characteristic = await service.getCharacteristic(charUUID)
          DebugUtils.info(MODULE_NAME, 'Found write characteristic', { uuid: charUUID })
          break
        } catch {
          // Characteristic not found, try next
          continue
        }
      }

      if (!characteristic) {
        // Try getting all characteristics and find one that supports write
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char
            DebugUtils.info(MODULE_NAME, 'Found writable characteristic', {
              uuid: char.uuid
            })
            break
          }
        }
      }

      if (!characteristic) {
        throw new Error('No write characteristic found on printer service')
      }

      this.device = targetDevice
      this.characteristic = characteristic

      DebugUtils.info(MODULE_NAME, 'Successfully connected to printer', {
        name: targetDevice.name,
        id: targetDevice.id
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to connect', error)
      this.handleDisconnect()
      throw error
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Disconnecting from printer...')

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }

    this.handleDisconnect()
  }

  /**
   * Send data to the printer
   * Automatically chunks data to respect BLE MTU limits
   */
  async sendData(data: Uint8Array): Promise<PrintResult> {
    if (!this.isConnected() || !this.characteristic) {
      return {
        success: false,
        error: 'Printer not connected'
      }
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Sending data to printer', { bytes: data.length })

      // Split data into chunks
      const chunks = this.chunkData(data, MAX_CHUNK_SIZE)

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        // Use writeValueWithoutResponse if available for faster printing
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk)
        } else {
          await this.characteristic.writeValue(chunk)
        }

        // Small delay between chunks to prevent buffer overflow
        if (i < chunks.length - 1) {
          await this.delay(10)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Data sent successfully', {
        chunks: chunks.length,
        totalBytes: data.length
      })

      return {
        success: true,
        printedAt: new Date().toISOString()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to send data', error)

      // Check if disconnected
      if (!this.isConnected()) {
        this.handleDisconnect()
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send data to printer'
      }
    }
  }

  /**
   * Print receipt (alias for sendData)
   */
  async printReceipt(commands: Uint8Array): Promise<PrintResult> {
    return this.sendData(commands)
  }

  // ===== Event Callbacks =====

  /**
   * Register disconnect callback
   */
  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback
  }

  /**
   * Register error callback
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback
  }

  // ===== Private Helpers =====

  /**
   * Handle disconnect event
   */
  private handleDisconnect(): void {
    this.server = null
    this.characteristic = null
    this.serviceUUID = null

    if (this.disconnectCallback) {
      this.disconnectCallback()
    }
  }

  /**
   * Split data into chunks for BLE transmission
   */
  private chunkData(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = []

    for (let i = 0; i < data.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, data.length)
      chunks.push(data.slice(i, end))
    }

    return chunks
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Get the singleton instance
 */
export function getBluetoothPrinterService(): BluetoothPrinterService {
  return BluetoothPrinterService.getInstance()
}
