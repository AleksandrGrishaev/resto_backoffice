// src/supabase/types.ts - Supabase database types
// Auto-generated from Supabase schema using mcp__supabase__generate_typescript_types
// Last updated: 2025-11-16 (after Migration 004 - Menu tables added)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          }
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          dish_type: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          modifier_groups: Json | null
          name: string
          name_en: string | null
          price: number
          sort_order: number | null
          updated_at: string | null
          variants: Json | null
        }
        Insert: {
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          dish_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          modifier_groups?: Json | null
          name: string
          name_en?: string | null
          price?: number
          sort_order?: number | null
          updated_at?: string | null
          variants?: Json | null
        }
        Update: {
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          dish_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          modifier_groups?: Json | null
          name?: string
          name_en?: string | null
          price?: number
          sort_order?: number | null
          updated_at?: string | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          bill_id: string
          bill_number: string | null
          menu_item_id: string
          menu_item_name: string
          variant_id: string | null
          variant_name: string | null
          quantity: number
          unit_price: number
          modifiers_total: number | null
          total_price: number
          selected_modifiers: Json | null
          discounts: Json | null
          status: string
          department: string | null
          payment_status: string | null
          paid_by_payment_ids: string[] | null
          kitchen_notes: string | null
          draft_at: string | null
          sent_to_kitchen_at: string | null
          cooking_started_at: string | null
          ready_at: string | null
          served_at: string | null
          write_off_status: string | null
          write_off_at: string | null
          write_off_triggered_by: string | null
          write_off_operation_id: string | null
          cached_actual_cost: Json | null
          recipe_writeoff_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          bill_id: string
          bill_number?: string | null
          menu_item_id: string
          menu_item_name: string
          variant_id?: string | null
          variant_name?: string | null
          quantity?: number
          unit_price: number
          modifiers_total?: number | null
          total_price: number
          selected_modifiers?: Json | null
          discounts?: Json | null
          status?: string
          department?: string | null
          payment_status?: string | null
          paid_by_payment_ids?: string[] | null
          kitchen_notes?: string | null
          draft_at?: string | null
          sent_to_kitchen_at?: string | null
          cooking_started_at?: string | null
          ready_at?: string | null
          served_at?: string | null
          write_off_status?: string | null
          write_off_at?: string | null
          write_off_triggered_by?: string | null
          write_off_operation_id?: string | null
          cached_actual_cost?: Json | null
          recipe_writeoff_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          bill_id?: string
          bill_number?: string | null
          menu_item_id?: string
          menu_item_name?: string
          variant_id?: string | null
          variant_name?: string | null
          quantity?: number
          unit_price?: number
          modifiers_total?: number | null
          total_price?: number
          selected_modifiers?: Json | null
          discounts?: Json | null
          status?: string
          department?: string | null
          payment_status?: string | null
          paid_by_payment_ids?: string[] | null
          kitchen_notes?: string | null
          draft_at?: string | null
          sent_to_kitchen_at?: string | null
          cooking_started_at?: string | null
          ready_at?: string | null
          served_at?: string | null
          write_off_status?: string | null
          write_off_at?: string | null
          write_off_triggered_by?: string | null
          write_off_operation_id?: string | null
          cached_actual_cost?: Json | null
          recipe_writeoff_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
      orders: {
        Row: {
          actual_ready_time: string | null
          bills: Json | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          discount: number
          discount_amount: number | null
          estimated_ready_time: string | null
          final_amount: number | null
          id: string
          notes: string | null
          order_number: string
          paid_amount: number | null
          paid_at: string | null
          payment_ids: string[] | null
          payment_method: string | null
          payment_status: string
          shift_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          tax: number
          tax_amount: number | null
          total: number
          total_amount: number | null
          type: string
          updated_at: string
          waiter_name: string | null
        }
        Insert: {
          actual_ready_time?: string | null
          bills?: Json | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount?: number
          discount_amount?: number | null
          estimated_ready_time?: string | null
          final_amount?: number | null
          id?: string
          notes?: string | null
          order_number: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_ids?: string[] | null
          payment_method?: string | null
          payment_status?: string
          shift_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          tax?: number
          tax_amount?: number | null
          total?: number
          total_amount?: number | null
          type: string
          updated_at?: string
          waiter_name?: string | null
        }
        Update: {
          actual_ready_time?: string | null
          bills?: Json | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount?: number
          discount_amount?: number | null
          estimated_ready_time?: string | null
          final_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_ids?: string[] | null
          payment_method?: string | null
          payment_status?: string
          shift_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          tax?: number
          tax_amount?: number | null
          total?: number
          total_amount?: number | null
          type?: string
          updated_at?: string
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tables'
            referencedColumns: ['id']
          }
        ]
      }
      payments: {
        Row: {
          amount: number
          bill_ids: string[] | null
          change_amount: number | null
          created_at: string
          details: Json
          id: string
          item_ids: string[] | null
          order_id: string | null
          original_payment_id: string | null
          payment_method: string
          payment_number: string | null
          processed_at: string | null
          processed_by: string | null
          processed_by_name: string | null
          receipt_number: string | null
          receipt_printed: boolean | null
          received_amount: number | null
          reconciled_at: string | null
          reconciled_by: string | null
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          shift_id: string | null
          status: string
          sync_status: string | null
          synced_at: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          bill_ids?: string[] | null
          change_amount?: number | null
          created_at?: string
          details?: Json
          id?: string
          item_ids?: string[] | null
          order_id?: string | null
          original_payment_id?: string | null
          payment_method: string
          payment_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processed_by_name?: string | null
          receipt_number?: string | null
          receipt_printed?: boolean | null
          received_amount?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          shift_id?: string | null
          status?: string
          sync_status?: string | null
          synced_at?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          bill_ids?: string[] | null
          change_amount?: number | null
          created_at?: string
          details?: Json
          id?: string
          item_ids?: string[] | null
          order_id?: string | null
          original_payment_id?: string | null
          payment_method?: string
          payment_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processed_by_name?: string | null
          receipt_number?: string | null
          receipt_printed?: boolean | null
          received_amount?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          shift_id?: string | null
          status?: string
          sync_status?: string | null
          synced_at?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_original_payment_id_fkey'
            columns: ['original_payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          }
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string
          cost: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          min_stock: number | null
          name: string
          name_ru: string | null
          price: number
          sku: string | null
          tags: string[] | null
          track_stock: boolean
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: string
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          min_stock?: number | null
          name: string
          name_ru?: string | null
          price: number
          sku?: string | null
          tags?: string[] | null
          track_stock?: boolean
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          min_stock?: number | null
          name?: string
          name_ru?: string | null
          price?: number
          sku?: string | null
          tags?: string[] | null
          track_stock?: boolean
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          account_balances: Json
          account_transaction_ids: string[] | null
          cash_discrepancy: number | null
          cash_discrepancy_type: string | null
          cashier_id: string | null
          cashier_name: string
          corrections: Json
          created_at: string
          device_id: string | null
          duration: number | null
          end_time: string | null
          ending_cash: number | null
          expected_cash: number | null
          expense_operations: Json
          id: string
          last_sync_at: string | null
          last_sync_attempt: string | null
          location: string | null
          notes: string | null
          payment_methods: Json
          pending_payments: Json
          pending_sync: boolean
          shift_number: number
          start_time: string
          starting_cash: number
          starting_cash_verified: boolean
          status: string
          sync_attempts: number | null
          sync_error: string | null
          sync_queued_at: string | null
          sync_status: string
          synced_at: string | null
          synced_to_account: boolean
          total_card: number
          total_cash: number
          total_qr: number
          total_sales: number
          total_transactions: number
          updated_at: string
        }
        Insert: {
          account_balances?: Json
          account_transaction_ids?: string[] | null
          cash_discrepancy?: number | null
          cash_discrepancy_type?: string | null
          cashier_id?: string | null
          cashier_name: string
          corrections?: Json
          created_at?: string
          device_id?: string | null
          duration?: number | null
          end_time?: string | null
          ending_cash?: number | null
          expected_cash?: number | null
          expense_operations?: Json
          id?: string
          last_sync_at?: string | null
          last_sync_attempt?: string | null
          location?: string | null
          notes?: string | null
          payment_methods?: Json
          pending_payments?: Json
          pending_sync?: boolean
          shift_number: number
          start_time: string
          starting_cash?: number
          starting_cash_verified?: boolean
          status: string
          sync_attempts?: number | null
          sync_error?: string | null
          sync_queued_at?: string | null
          sync_status?: string
          synced_at?: string | null
          synced_to_account?: boolean
          total_card?: number
          total_cash?: number
          total_qr?: number
          total_sales?: number
          total_transactions?: number
          updated_at?: string
        }
        Update: {
          account_balances?: Json
          account_transaction_ids?: string[] | null
          cash_discrepancy?: number | null
          cash_discrepancy_type?: string | null
          cashier_id?: string | null
          cashier_name?: string
          corrections?: Json
          created_at?: string
          device_id?: string | null
          duration?: number | null
          end_time?: string | null
          ending_cash?: number | null
          expected_cash?: number | null
          expense_operations?: Json
          id?: string
          last_sync_at?: string | null
          last_sync_attempt?: string | null
          location?: string | null
          notes?: string | null
          payment_methods?: Json
          pending_payments?: Json
          pending_sync?: boolean
          shift_number?: number
          start_time?: string
          starting_cash?: number
          starting_cash_verified?: boolean
          status?: string
          sync_attempts?: number | null
          sync_error?: string | null
          sync_queued_at?: string | null
          sync_status?: string
          synced_at?: string | null
          synced_to_account?: boolean
          total_card?: number
          total_cash?: number
          total_qr?: number
          total_sales?: number
          total_transactions?: number
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          area: string | null
          capacity: number
          created_at: string
          current_order_id: string | null
          id: string
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {}
  }
} as const

// ===== HELPER TYPES =====

// Menu Categories types
export type SupabaseMenuCategory = Tables<'menu_categories'>
export type SupabaseMenuCategoryInsert = TablesInsert<'menu_categories'>
export type SupabaseMenuCategoryUpdate = TablesUpdate<'menu_categories'>

// Menu Items types
export type SupabaseMenuItem = Tables<'menu_items'>
export type SupabaseMenuItemInsert = TablesInsert<'menu_items'>
export type SupabaseMenuItemUpdate = TablesUpdate<'menu_items'>

// Orders types
export type SupabaseOrder = Tables<'orders'>
export type SupabaseOrderInsert = TablesInsert<'orders'>
export type SupabaseOrderUpdate = TablesUpdate<'orders'>

// Order Items types (Migration 053)
export type SupabaseOrderItem = Tables<'order_items'>
export type SupabaseOrderItemInsert = TablesInsert<'order_items'>
export type SupabaseOrderItemUpdate = TablesUpdate<'order_items'>

// Payments types
export type SupabasePayment = Tables<'payments'>
export type SupabasePaymentInsert = TablesInsert<'payments'>
export type SupabasePaymentUpdate = TablesUpdate<'payments'>

// Shifts types
export type SupabaseShift = Tables<'shifts'>
export type SupabaseShiftInsert = TablesInsert<'shifts'>
export type SupabaseShiftUpdate = TablesUpdate<'shifts'>

// Tables types
export type SupabaseTable = Tables<'tables'>
export type SupabaseTableInsert = TablesInsert<'tables'>
export type SupabaseTableUpdate = TablesUpdate<'tables'>
