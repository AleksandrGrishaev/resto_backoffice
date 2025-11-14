// src/supabase/types.ts - Supabase database types
// This file will be auto-generated using: supabase gen types typescript --project-id fjkfckjpnbcyuknsnchy

/**
 * Database type definitions
 * These types will be auto-generated from Supabase schema
 * For now, we define them manually
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Payment method type
export interface PaymentMethod {
  type: 'cash' | 'card' | 'qr'
  amount: number
  label?: string
}

// Correction operation
export interface CorrectionOperation {
  id: string
  reason: string
  amount: number
  timestamp: string
}

// Expense operation
export interface ExpenseOperation {
  id: string
  description: string
  amount: number
  timestamp: string
}

// Order item
export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  price: number
  total: number
  notes?: string
}

// Payment details
export interface PaymentDetails {
  cash?: number
  card?: number
  qr?: number
  change?: number
}

// Database schema
export interface Database {
  public: {
    Tables: {
      shifts: {
        Row: {
          id: string
          shift_number: number
          cashier_id: string | null
          cashier_name: string
          status: 'active' | 'completed'
          start_time: string
          end_time: string | null
          total_sales: number
          total_cash: number
          total_card: number
          total_qr: number
          payment_methods: PaymentMethod[]
          corrections: CorrectionOperation[]
          expense_operations: ExpenseOperation[]
          synced_to_account: boolean
          synced_at: string | null
          account_transaction_ids: string[] | null
          sync_error: string | null
          sync_attempts: number
          last_sync_attempt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shift_number: number
          cashier_id?: string | null
          cashier_name: string
          status: 'active' | 'completed'
          start_time: string
          end_time?: string | null
          total_sales?: number
          total_cash?: number
          total_card?: number
          total_qr?: number
          payment_methods?: PaymentMethod[]
          corrections?: CorrectionOperation[]
          expense_operations?: ExpenseOperation[]
          synced_to_account?: boolean
          synced_at?: string | null
          account_transaction_ids?: string[] | null
          sync_error?: string | null
          sync_attempts?: number
          last_sync_attempt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shift_number?: number
          cashier_id?: string | null
          cashier_name?: string
          status?: 'active' | 'completed'
          start_time?: string
          end_time?: string | null
          total_sales?: number
          total_cash?: number
          total_card?: number
          total_qr?: number
          payment_methods?: PaymentMethod[]
          corrections?: CorrectionOperation[]
          expense_operations?: ExpenseOperation[]
          synced_to_account?: boolean
          synced_at?: string | null
          account_transaction_ids?: string[] | null
          sync_error?: string | null
          sync_attempts?: number
          last_sync_attempt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          table_id: string | null
          shift_id: string | null
          type: 'dine_in' | 'takeaway' | 'delivery'
          status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
          items: OrderItem[]
          subtotal: number
          discount: number
          tax: number
          total: number
          payment_status: string
          payment_method: string | null
          paid_at: string | null
          notes: string | null
          customer_name: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          order_number: string
          table_id?: string | null
          shift_id?: string | null
          type: 'dine_in' | 'takeaway' | 'delivery'
          status?: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
          items?: OrderItem[]
          subtotal?: number
          discount?: number
          tax?: number
          total?: number
          payment_status?: string
          payment_method?: string | null
          paid_at?: string | null
          notes?: string | null
          customer_name?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          table_id?: string | null
          shift_id?: string | null
          type?: 'dine_in' | 'takeaway' | 'delivery'
          status?: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
          items?: OrderItem[]
          subtotal?: number
          discount?: number
          tax?: number
          total?: number
          payment_status?: string
          payment_method?: string | null
          paid_at?: string | null
          notes?: string | null
          customer_name?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          name_ru: string | null
          category: string
          price: number
          cost: number | null
          unit: string
          sku: string | null
          barcode: string | null
          is_active: boolean
          is_available: boolean
          track_stock: boolean
          current_stock: number | null
          min_stock: number | null
          description: string | null
          image_url: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ru?: string | null
          category: string
          price: number
          cost?: number | null
          unit?: string
          sku?: string | null
          barcode?: string | null
          is_active?: boolean
          is_available?: boolean
          track_stock?: boolean
          current_stock?: number | null
          min_stock?: number | null
          description?: string | null
          image_url?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string | null
          category?: string
          price?: number
          cost?: number | null
          unit?: string
          sku?: string | null
          barcode?: string | null
          is_active?: boolean
          is_available?: boolean
          track_stock?: boolean
          current_stock?: number | null
          min_stock?: number | null
          description?: string | null
          image_url?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string
          shift_id: string | null
          amount: number
          payment_method: 'cash' | 'card' | 'qr' | 'mixed'
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          details: PaymentDetails
          transaction_id: string | null
          receipt_number: string | null
          processed_at: string | null
          processed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          shift_id?: string | null
          amount: number
          payment_method: 'cash' | 'card' | 'qr' | 'mixed'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          details?: PaymentDetails
          transaction_id?: string | null
          receipt_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          shift_id?: string | null
          amount?: number
          payment_method?: 'cash' | 'card' | 'qr' | 'mixed'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          details?: PaymentDetails
          transaction_id?: string | null
          receipt_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          table_number: string
          area: string | null
          capacity: number
          status: 'available' | 'occupied' | 'reserved'
          current_order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: string
          area?: string | null
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved'
          current_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: string
          area?: string | null
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved'
          current_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
