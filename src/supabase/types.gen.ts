export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_transaction_date: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          last_transaction_date?: string | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          balance?: number
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_transaction_date?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      counteragents: {
        Row: {
          address: string | null
          average_delivery_time: number | null
          balance_history: Json | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          delivery_schedule: string | null
          description: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          last_balance_update: string | null
          last_order_date: string | null
          lead_time_days: number
          min_order_amount: number | null
          name: string
          notes: string | null
          payment_terms: string
          phone: string | null
          product_categories: string[] | null
          tags: string[] | null
          total_order_value: number | null
          total_orders: number | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          average_delivery_time?: number | null
          balance_history?: Json | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          delivery_schedule?: string | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          last_balance_update?: string | null
          last_order_date?: string | null
          lead_time_days?: number
          min_order_amount?: number | null
          name: string
          notes?: string | null
          payment_terms?: string
          phone?: string | null
          product_categories?: string[] | null
          tags?: string[] | null
          total_order_value?: number | null
          total_orders?: number | null
          type: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          average_delivery_time?: number | null
          balance_history?: Json | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          delivery_schedule?: string | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          last_balance_update?: string | null
          last_order_date?: string | null
          lead_time_days?: number
          min_order_amount?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string
          phone?: string | null
          product_categories?: string[] | null
          tags?: string[] | null
          total_order_value?: number | null
          total_orders?: number | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      inventory_documents: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          document_number: string
          id: string
          inventory_date: string
          item_type: string
          items: Json
          notes: string | null
          responsible_person: string
          status: string
          total_discrepancies: number
          total_items: number
          total_value_difference: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          document_number: string
          id: string
          inventory_date: string
          item_type?: string
          items?: Json
          notes?: string | null
          responsible_person: string
          status?: string
          total_discrepancies?: number
          total_items?: number
          total_value_difference?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          document_number?: string
          id?: string
          inventory_date?: string
          item_type?: string
          items?: Json
          notes?: string | null
          responsible_person?: string
          status?: string
          total_discrepancies?: number
          total_items?: number
          total_value_difference?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string | null
          cost: number | null
          created_at: string | null
          department: string | null
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
          type: string | null
          updated_at: string | null
          variants: Json | null
        }
        Insert: {
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          department?: string | null
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
          type?: string | null
          updated_at?: string | null
          variants?: Json | null
        }
        Update: {
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          department?: string | null
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
          type?: string | null
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
      orders: {
        Row: {
          actual_ready_time: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          discount: number
          discount_amount: number | null
          estimated_ready_time: string | null
          final_amount: number | null
          id: string
          items: Json
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
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount?: number
          discount_amount?: number | null
          estimated_ready_time?: string | null
          final_amount?: number | null
          id?: string
          items?: Json
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
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount?: number
          discount_amount?: number | null
          estimated_ready_time?: string | null
          final_amount?: number | null
          id?: string
          items?: Json
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
      package_options: {
        Row: {
          base_cost_per_unit: number
          brand_name: string | null
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          package_name: string
          package_price: number | null
          package_size: number
          package_unit: string
          product_id: string
          updated_at: string
        }
        Insert: {
          base_cost_per_unit: number
          brand_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          package_name: string
          package_price?: number | null
          package_size: number
          package_unit: string
          product_id: string
          updated_at?: string
        }
        Update: {
          base_cost_per_unit?: number
          brand_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          package_name?: string
          package_price?: number | null
          package_size?: number
          package_unit?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'package_options_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
      payment_methods: {
        Row: {
          account_id: string | null
          code: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_pos_cash_register: boolean
          name: string
          requires_details: boolean
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_pos_cash_register?: boolean
          name: string
          requires_details?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_pos_cash_register?: boolean
          name?: string
          requires_details?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_methods_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
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
      pending_payments: {
        Row: {
          amount: number
          amount_history: Json | null
          assigned_shift_id: string | null
          assigned_to_account: string | null
          auto_sync_enabled: boolean | null
          category: string
          confirmation_status: string | null
          confirmed_at: string | null
          confirmed_by: Json | null
          counteragent_id: string
          counteragent_name: string
          created_at: string
          created_by: Json
          description: string
          due_date: string | null
          id: string
          invoice_number: string | null
          last_amount_update: string | null
          linked_orders: Json | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          priority: string
          rejection_reason: string | null
          requires_cashier_confirmation: boolean | null
          source_order_id: string | null
          status: string
          updated_at: string
          used_amount: number | null
        }
        Insert: {
          amount: number
          amount_history?: Json | null
          assigned_shift_id?: string | null
          assigned_to_account?: string | null
          auto_sync_enabled?: boolean | null
          category: string
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: Json | null
          counteragent_id: string
          counteragent_name: string
          created_at?: string
          created_by: Json
          description: string
          due_date?: string | null
          id: string
          invoice_number?: string | null
          last_amount_update?: string | null
          linked_orders?: Json | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          priority?: string
          rejection_reason?: string | null
          requires_cashier_confirmation?: boolean | null
          source_order_id?: string | null
          status?: string
          updated_at?: string
          used_amount?: number | null
        }
        Update: {
          amount?: number
          amount_history?: Json | null
          assigned_shift_id?: string | null
          assigned_to_account?: string | null
          auto_sync_enabled?: boolean | null
          category?: string
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: Json | null
          counteragent_id?: string
          counteragent_name?: string
          created_at?: string
          created_by?: Json
          description?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          last_amount_update?: string | null
          linked_orders?: Json | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          priority?: string
          rejection_reason?: string | null
          requires_cashier_confirmation?: boolean | null
          source_order_id?: string | null
          status?: string
          updated_at?: string
          used_amount?: number | null
        }
        Relationships: []
      }
      preparation_batches: {
        Row: {
          affected_recipe_ids: string[] | null
          batch_number: string
          cost_per_unit: number
          created_at: string | null
          created_by: string | null
          current_quantity: number
          department: string
          expiry_date: string | null
          id: string
          initial_quantity: number
          is_active: boolean
          is_negative: boolean | null
          negative_created_at: string | null
          negative_reason: string | null
          notes: string | null
          preparation_id: string
          production_date: string | null
          reconciled_at: string | null
          source_batch_id: string | null
          source_operation_type: string | null
          source_type: string
          status: string
          total_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          affected_recipe_ids?: string[] | null
          batch_number: string
          cost_per_unit: number
          created_at?: string | null
          created_by?: string | null
          current_quantity: number
          department?: string
          expiry_date?: string | null
          id?: string
          initial_quantity: number
          is_active?: boolean
          is_negative?: boolean | null
          negative_created_at?: string | null
          negative_reason?: string | null
          notes?: string | null
          preparation_id: string
          production_date?: string | null
          reconciled_at?: string | null
          source_batch_id?: string | null
          source_operation_type?: string | null
          source_type?: string
          status?: string
          total_value: number
          unit: string
          updated_at: string
        }
        Update: {
          affected_recipe_ids?: string[] | null
          batch_number?: string
          cost_per_unit?: number
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number
          department?: string
          expiry_date?: string | null
          id?: string
          initial_quantity?: number
          is_active?: boolean
          is_negative?: boolean | null
          negative_created_at?: string | null
          negative_reason?: string | null
          notes?: string | null
          preparation_id?: string
          production_date?: string | null
          reconciled_at?: string | null
          source_batch_id?: string | null
          source_operation_type?: string | null
          source_type?: string
          status?: string
          total_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'preparation_batches_preparation_id_fkey'
            columns: ['preparation_id']
            isOneToOne: false
            referencedRelation: 'preparations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'preparation_batches_source_batch_id_fkey'
            columns: ['source_batch_id']
            isOneToOne: false
            referencedRelation: 'preparation_batches'
            referencedColumns: ['id']
          }
        ]
      }
      preparation_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          emoji: string
          icon: string
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          emoji?: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          emoji?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      preparation_ingredients: {
        Row: {
          id: string
          notes: string | null
          preparation_id: string
          product_id: string
          quantity: number
          sort_order: number
          type: string
          unit: string
        }
        Insert: {
          id?: string
          notes?: string | null
          preparation_id: string
          product_id: string
          quantity: number
          sort_order?: number
          type?: string
          unit: string
        }
        Update: {
          id?: string
          notes?: string | null
          preparation_id?: string
          product_id?: string
          quantity?: number
          sort_order?: number
          type?: string
          unit?: string
        }
        Relationships: []
      }
      preparation_inventory_documents: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          document_number: string
          id: string
          inventory_date: string
          items: Json
          notes: string | null
          responsible_person: string
          status: string
          total_discrepancies: number
          total_items: number
          total_value_difference: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          document_number: string
          id?: string
          inventory_date?: string
          items?: Json
          notes?: string | null
          responsible_person: string
          status?: string
          total_discrepancies?: number
          total_items?: number
          total_value_difference?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          document_number?: string
          id?: string
          inventory_date?: string
          items?: Json
          notes?: string | null
          responsible_person?: string
          status?: string
          total_discrepancies?: number
          total_items?: number
          total_value_difference?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      preparation_operations: {
        Row: {
          consumption_details: Json | null
          correction_details: Json | null
          created_at: string | null
          department: string
          document_number: string
          id: string
          items: Json
          notes: string | null
          operation_date: string
          operation_type: string
          related_inventory_id: string | null
          related_storage_operation_ids: string[] | null
          responsible_person: string | null
          status: string
          total_value: number
          updated_at: string | null
          write_off_details: Json | null
        }
        Insert: {
          consumption_details?: Json | null
          correction_details?: Json | null
          created_at?: string | null
          department: string
          document_number: string
          id?: string
          items: Json
          notes?: string | null
          operation_date?: string
          operation_type: string
          related_inventory_id?: string | null
          related_storage_operation_ids?: string[] | null
          responsible_person?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
          write_off_details?: Json | null
        }
        Update: {
          consumption_details?: Json | null
          correction_details?: Json | null
          created_at?: string | null
          department?: string
          document_number?: string
          id?: string
          items?: Json
          notes?: string | null
          operation_date?: string
          operation_type?: string
          related_inventory_id?: string | null
          related_storage_operation_ids?: string[] | null
          responsible_person?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
          write_off_details?: Json | null
        }
        Relationships: []
      }
      preparations: {
        Row: {
          allow_negative_inventory: boolean | null
          closed_at: string | null
          code: string
          cost_per_portion: number | null
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          id: string
          instructions: string
          is_active: boolean
          last_known_cost: number | null
          name: string
          output_quantity: number
          output_unit: string
          preparation_time: number
          shelf_life: number
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_negative_inventory?: boolean | null
          closed_at?: string | null
          code: string
          cost_per_portion?: number | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          id?: string
          instructions: string
          is_active?: boolean
          last_known_cost?: number | null
          name: string
          output_quantity: number
          output_unit: string
          preparation_time: number
          shelf_life?: number
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_negative_inventory?: boolean | null
          closed_at?: string | null
          code?: string
          cost_per_portion?: number | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          last_known_cost?: number | null
          name?: string
          output_quantity?: number
          output_unit?: string
          preparation_time?: number
          shelf_life?: number
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_preparations_type'
            columns: ['type']
            isOneToOne: false
            referencedRelation: 'preparation_categories'
            referencedColumns: ['id']
          }
        ]
      }
      product_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          allow_negative_inventory: boolean | null
          barcode: string | null
          base_cost_per_unit: number
          base_unit: string
          can_be_sold: boolean | null
          category: string
          code: string | null
          cost: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          last_known_cost: number | null
          lead_time_days: number | null
          max_stock: number | null
          min_stock: number | null
          name: string
          name_en: string | null
          name_ru: string | null
          price: number
          primary_supplier_id: string | null
          recommended_package_id: string | null
          shelf_life: number | null
          sku: string | null
          storage_conditions: string | null
          tags: string[] | null
          track_stock: boolean
          unit: string
          updated_at: string
          used_in_departments: string[] | null
          yield_percentage: number | null
        }
        Insert: {
          allow_negative_inventory?: boolean | null
          barcode?: string | null
          base_cost_per_unit: number
          base_unit: string
          can_be_sold?: boolean | null
          category: string
          code?: string | null
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          last_known_cost?: number | null
          lead_time_days?: number | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          name_en?: string | null
          name_ru?: string | null
          price: number
          primary_supplier_id?: string | null
          recommended_package_id?: string | null
          shelf_life?: number | null
          sku?: string | null
          storage_conditions?: string | null
          tags?: string[] | null
          track_stock?: boolean
          unit?: string
          updated_at?: string
          used_in_departments?: string[] | null
          yield_percentage?: number | null
        }
        Update: {
          allow_negative_inventory?: boolean | null
          barcode?: string | null
          base_cost_per_unit?: number
          base_unit?: string
          can_be_sold?: boolean | null
          category?: string
          code?: string | null
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          last_known_cost?: number | null
          lead_time_days?: number | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          name_en?: string | null
          name_ru?: string | null
          price?: number
          primary_supplier_id?: string | null
          recommended_package_id?: string | null
          shelf_life?: number | null
          sku?: string | null
          storage_conditions?: string | null
          tags?: string[] | null
          track_stock?: boolean
          unit?: string
          updated_at?: string
          used_in_departments?: string[] | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_products_category'
            columns: ['category']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          }
        ]
      }
      recipe_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_components: {
        Row: {
          component_id: string
          component_type: string
          id: string
          is_optional: boolean | null
          notes: string | null
          preparation: string | null
          quantity: number
          recipe_id: string
          sort_order: number
          unit: string
        }
        Insert: {
          component_id: string
          component_type: string
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          preparation?: string | null
          quantity: number
          recipe_id: string
          sort_order?: number
          unit: string
        }
        Update: {
          component_id?: string
          component_type?: string
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          preparation?: string | null
          quantity?: number
          recipe_id?: string
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recipe_components_recipe_id_fkey'
            columns: ['recipe_id']
            isOneToOne: false
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          }
        ]
      }
      recipe_steps: {
        Row: {
          duration: number | null
          equipment: string[] | null
          id: string
          instruction: string
          recipe_id: string
          step_number: number
          temperature: number | null
        }
        Insert: {
          duration?: number | null
          equipment?: string[] | null
          id?: string
          instruction: string
          recipe_id: string
          step_number: number
          temperature?: number | null
        }
        Update: {
          duration?: number | null
          equipment?: string[] | null
          id?: string
          instruction?: string
          recipe_id?: string
          step_number?: number
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'recipe_steps_recipe_id_fkey'
            columns: ['recipe_id']
            isOneToOne: false
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          }
        ]
      }
      recipe_write_offs: {
        Row: {
          created_at: string
          decomposed_items: Json
          department: string
          id: string
          menu_item_id: string | null
          operation_type: string
          original_composition: Json
          performed_at: string
          performed_by: string
          portion_size: number
          recipe_id: string | null
          sales_transaction_id: string | null
          sold_quantity: number
          storage_operation_id: string | null
          updated_at: string
          variant_id: string
          write_off_items: Json
        }
        Insert: {
          created_at?: string
          decomposed_items?: Json
          department: string
          id: string
          menu_item_id?: string | null
          operation_type?: string
          original_composition?: Json
          performed_at: string
          performed_by: string
          portion_size: number
          recipe_id?: string | null
          sales_transaction_id?: string | null
          sold_quantity: number
          storage_operation_id?: string | null
          updated_at?: string
          variant_id: string
          write_off_items?: Json
        }
        Update: {
          created_at?: string
          decomposed_items?: Json
          department?: string
          id?: string
          menu_item_id?: string | null
          operation_type?: string
          original_composition?: Json
          performed_at?: string
          performed_by?: string
          portion_size?: number
          recipe_id?: string | null
          sales_transaction_id?: string | null
          sold_quantity?: number
          storage_operation_id?: string | null
          updated_at?: string
          variant_id?: string
          write_off_items?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'recipe_write_offs_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_write_offs_sales_transaction_id_fkey'
            columns: ['sales_transaction_id']
            isOneToOne: false
            referencedRelation: 'sales_transactions'
            referencedColumns: ['id']
          }
        ]
      }
      recipes: {
        Row: {
          category: string
          closed_at: string | null
          code: string
          cook_time: number | null
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          id: string
          is_active: boolean
          legacy_id: string
          name: string
          portion_size: number
          portion_unit: string
          prep_time: number | null
          tags: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          closed_at?: string | null
          code: string
          cook_time?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          legacy_id: string
          name: string
          portion_size: number
          portion_unit: string
          prep_time?: number | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          code?: string
          cook_time?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          legacy_id?: string
          name?: string
          portion_size?: number
          portion_unit?: string
          prep_time?: number | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_recipes_category'
            columns: ['category']
            isOneToOne: false
            referencedRelation: 'recipe_categories'
            referencedColumns: ['id']
          }
        ]
      }
      sales_transactions: {
        Row: {
          actual_cost: Json | null
          bill_id: string
          created_at: string
          decomposition_summary: Json
          department: string
          id: string
          item_id: string
          menu_item_id: string | null
          menu_item_name: string
          order_id: string | null
          payment_id: string | null
          payment_method: string
          preparation_write_off_ids: string[] | null
          processed_by: string
          product_write_off_ids: string[] | null
          profit_calculation: Json
          quantity: number
          recipe_id: string | null
          recipe_write_off_id: string | null
          shift_id: string | null
          sold_at: string
          synced_at: string | null
          synced_to_backoffice: boolean | null
          total_price: number
          unit_price: number
          updated_at: string
          variant_id: string
          variant_name: string
        }
        Insert: {
          actual_cost?: Json | null
          bill_id: string
          created_at?: string
          decomposition_summary: Json
          department: string
          id: string
          item_id: string
          menu_item_id?: string | null
          menu_item_name: string
          order_id?: string | null
          payment_id?: string | null
          payment_method: string
          preparation_write_off_ids?: string[] | null
          processed_by: string
          product_write_off_ids?: string[] | null
          profit_calculation: Json
          quantity: number
          recipe_id?: string | null
          recipe_write_off_id?: string | null
          shift_id?: string | null
          sold_at: string
          synced_at?: string | null
          synced_to_backoffice?: boolean | null
          total_price: number
          unit_price: number
          updated_at?: string
          variant_id: string
          variant_name: string
        }
        Update: {
          actual_cost?: Json | null
          bill_id?: string
          created_at?: string
          decomposition_summary?: Json
          department?: string
          id?: string
          item_id?: string
          menu_item_id?: string | null
          menu_item_name?: string
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string
          preparation_write_off_ids?: string[] | null
          processed_by?: string
          product_write_off_ids?: string[] | null
          profit_calculation?: Json
          quantity?: number
          recipe_id?: string | null
          recipe_write_off_id?: string | null
          shift_id?: string | null
          sold_at?: string
          synced_at?: string | null
          synced_to_backoffice?: boolean | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_sales_transactions_recipe_writeoff'
            columns: ['recipe_write_off_id']
            isOneToOne: false
            referencedRelation: 'recipe_write_offs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_transactions_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_transactions_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_transactions_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          }
        ]
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
      storage_batches: {
        Row: {
          actual_delivery_date: string | null
          affected_recipe_ids: string[] | null
          batch_number: string
          cost_per_unit: number
          created_at: string
          current_quantity: number
          expiry_date: string | null
          id: string
          initial_quantity: number
          is_active: boolean
          is_negative: boolean | null
          item_id: string
          item_type: string
          negative_created_at: string | null
          negative_reason: string | null
          notes: string | null
          planned_delivery_date: string | null
          purchase_order_id: string | null
          receipt_date: string
          reconciled_at: string | null
          source_batch_id: string | null
          source_operation_type: string | null
          source_type: string
          status: string
          supplier_id: string | null
          supplier_name: string | null
          total_value: number
          unit: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          affected_recipe_ids?: string[] | null
          batch_number: string
          cost_per_unit: number
          created_at?: string
          current_quantity: number
          expiry_date?: string | null
          id: string
          initial_quantity: number
          is_active?: boolean
          is_negative?: boolean | null
          item_id: string
          item_type?: string
          negative_created_at?: string | null
          negative_reason?: string | null
          notes?: string | null
          planned_delivery_date?: string | null
          purchase_order_id?: string | null
          receipt_date: string
          reconciled_at?: string | null
          source_batch_id?: string | null
          source_operation_type?: string | null
          source_type: string
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_value: number
          unit: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          affected_recipe_ids?: string[] | null
          batch_number?: string
          cost_per_unit?: number
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          initial_quantity?: number
          is_active?: boolean
          is_negative?: boolean | null
          item_id?: string
          item_type?: string
          negative_created_at?: string | null
          negative_reason?: string | null
          notes?: string | null
          planned_delivery_date?: string | null
          purchase_order_id?: string | null
          receipt_date?: string
          reconciled_at?: string | null
          source_batch_id?: string | null
          source_operation_type?: string | null
          source_type?: string
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_value?: number
          unit?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'storage_batches_source_batch_id_fkey'
            columns: ['source_batch_id']
            isOneToOne: false
            referencedRelation: 'storage_batches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'storage_batches_warehouse_id_fkey'
            columns: ['warehouse_id']
            isOneToOne: false
            referencedRelation: 'warehouses'
            referencedColumns: ['id']
          }
        ]
      }
      storage_operations: {
        Row: {
          correction_details: Json | null
          created_at: string
          created_by: string | null
          department: string
          document_number: string
          id: string
          items: Json
          notes: string | null
          operation_date: string
          operation_type: string
          related_inventory_id: string | null
          related_preparation_operation_id: string | null
          responsible_person: string
          status: string
          total_value: number | null
          updated_at: string
          updated_by: string | null
          warehouse_id: string | null
          write_off_details: Json | null
        }
        Insert: {
          correction_details?: Json | null
          created_at?: string
          created_by?: string | null
          department: string
          document_number: string
          id: string
          items?: Json
          notes?: string | null
          operation_date: string
          operation_type: string
          related_inventory_id?: string | null
          related_preparation_operation_id?: string | null
          responsible_person: string
          status?: string
          total_value?: number | null
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
          write_off_details?: Json | null
        }
        Update: {
          correction_details?: Json | null
          created_at?: string
          created_by?: string | null
          department?: string
          document_number?: string
          id?: string
          items?: Json
          notes?: string | null
          operation_date?: string
          operation_type?: string
          related_inventory_id?: string | null
          related_preparation_operation_id?: string | null
          responsible_person?: string
          status?: string
          total_value?: number | null
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
          write_off_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'storage_operations_related_preparation_operation_id_fkey'
            columns: ['related_preparation_operation_id']
            isOneToOne: false
            referencedRelation: 'preparation_operations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'storage_operations_warehouse_id_fkey'
            columns: ['warehouse_id']
            isOneToOne: false
            referencedRelation: 'warehouses'
            referencedColumns: ['id']
          }
        ]
      }
      supplierstore_order_items: {
        Row: {
          id: string
          is_estimated_price: boolean
          item_id: string
          item_name: string
          last_price_date: string | null
          order_id: string
          ordered_quantity: number
          package_id: string
          package_name: string
          package_price: number
          package_quantity: number
          package_unit: string
          price_per_unit: number
          received_quantity: number | null
          status: string
          total_price: number
          unit: string
        }
        Insert: {
          id: string
          is_estimated_price?: boolean
          item_id: string
          item_name: string
          last_price_date?: string | null
          order_id: string
          ordered_quantity: number
          package_id: string
          package_name: string
          package_price?: number
          package_quantity: number
          package_unit: string
          price_per_unit?: number
          received_quantity?: number | null
          status?: string
          total_price?: number
          unit: string
        }
        Update: {
          id?: string
          is_estimated_price?: boolean
          item_id?: string
          item_name?: string
          last_price_date?: string | null
          order_id?: string
          ordered_quantity?: number
          package_id?: string
          package_name?: string
          package_price?: number
          package_quantity?: number
          package_unit?: string
          price_per_unit?: number
          received_quantity?: number | null
          status?: string
          total_price?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplierstore_order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_orders'
            referencedColumns: ['id']
          }
        ]
      }
      supplierstore_orders: {
        Row: {
          actual_delivered_amount: number | null
          bill_id: string | null
          bill_status: string
          bill_status_calculated_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          has_receipt_discrepancies: boolean | null
          has_shortfall: boolean | null
          id: string
          is_estimated_total: boolean
          notes: string | null
          order_date: string
          order_number: string
          original_total_amount: number | null
          receipt_completed_at: string | null
          receipt_completed_by: string | null
          receipt_discrepancies: Json | null
          receipt_id: string | null
          request_ids: Json | null
          shortfall_amount: number | null
          status: string
          supplier_id: string
          supplier_name: string
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_delivered_amount?: number | null
          bill_id?: string | null
          bill_status?: string
          bill_status_calculated_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          has_receipt_discrepancies?: boolean | null
          has_shortfall?: boolean | null
          id: string
          is_estimated_total?: boolean
          notes?: string | null
          order_date?: string
          order_number: string
          original_total_amount?: number | null
          receipt_completed_at?: string | null
          receipt_completed_by?: string | null
          receipt_discrepancies?: Json | null
          receipt_id?: string | null
          request_ids?: Json | null
          shortfall_amount?: number | null
          status?: string
          supplier_id: string
          supplier_name: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_delivered_amount?: number | null
          bill_id?: string | null
          bill_status?: string
          bill_status_calculated_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          has_receipt_discrepancies?: boolean | null
          has_shortfall?: boolean | null
          id?: string
          is_estimated_total?: boolean
          notes?: string | null
          order_date?: string
          order_number?: string
          original_total_amount?: number | null
          receipt_completed_at?: string | null
          receipt_completed_by?: string | null
          receipt_discrepancies?: Json | null
          receipt_id?: string | null
          request_ids?: Json | null
          shortfall_amount?: number | null
          status?: string
          supplier_id?: string
          supplier_name?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      supplierstore_receipt_items: {
        Row: {
          actual_base_cost: number | null
          actual_price: number | null
          id: string
          item_id: string
          item_name: string
          notes: string | null
          order_item_id: string
          ordered_base_cost: number
          ordered_package_quantity: number
          ordered_price: number
          ordered_quantity: number
          package_id: string
          package_name: string
          package_unit: string
          receipt_id: string
          received_package_quantity: number
          received_quantity: number
          unit: string
        }
        Insert: {
          actual_base_cost?: number | null
          actual_price?: number | null
          id: string
          item_id: string
          item_name: string
          notes?: string | null
          order_item_id: string
          ordered_base_cost: number
          ordered_package_quantity: number
          ordered_price: number
          ordered_quantity: number
          package_id: string
          package_name: string
          package_unit: string
          receipt_id: string
          received_package_quantity: number
          received_quantity: number
          unit: string
        }
        Update: {
          actual_base_cost?: number | null
          actual_price?: number | null
          id?: string
          item_id?: string
          item_name?: string
          notes?: string | null
          order_item_id?: string
          ordered_base_cost?: number
          ordered_package_quantity?: number
          ordered_price?: number
          ordered_quantity?: number
          package_id?: string
          package_name?: string
          package_unit?: string
          receipt_id?: string
          received_package_quantity?: number
          received_quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplierstore_receipt_items_receipt_id_fkey'
            columns: ['receipt_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_receipts'
            referencedColumns: ['id']
          }
        ]
      }
      supplierstore_receipts: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          delivery_date: string
          has_discrepancies: boolean
          id: string
          notes: string | null
          purchase_order_id: string
          receipt_number: string
          received_by: string
          status: string
          storage_operation_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          has_discrepancies?: boolean
          id: string
          notes?: string | null
          purchase_order_id: string
          receipt_number: string
          received_by: string
          status?: string
          storage_operation_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          has_discrepancies?: boolean
          id?: string
          notes?: string | null
          purchase_order_id?: string
          receipt_number?: string
          received_by?: string
          status?: string
          storage_operation_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      supplierstore_request_items: {
        Row: {
          category: string | null
          estimated_price: number | null
          id: string
          item_id: string
          item_name: string
          notes: string | null
          package_id: string | null
          package_name: string | null
          package_quantity: number | null
          priority: string | null
          request_id: string
          requested_quantity: number
          unit: string
        }
        Insert: {
          category?: string | null
          estimated_price?: number | null
          id: string
          item_id: string
          item_name: string
          notes?: string | null
          package_id?: string | null
          package_name?: string | null
          package_quantity?: number | null
          priority?: string | null
          request_id: string
          requested_quantity: number
          unit: string
        }
        Update: {
          category?: string | null
          estimated_price?: number | null
          id?: string
          item_id?: string
          item_name?: string
          notes?: string | null
          package_id?: string | null
          package_name?: string | null
          package_quantity?: number | null
          priority?: string | null
          request_id?: string
          requested_quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplierstore_request_items_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_requests'
            referencedColumns: ['id']
          }
        ]
      }
      supplierstore_requests: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          department: string
          id: string
          notes: string | null
          priority: string
          purchase_order_ids: Json | null
          request_number: string
          requested_by: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department: string
          id: string
          notes?: string | null
          priority?: string
          purchase_order_ids?: Json | null
          request_number: string
          requested_by: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          notes?: string | null
          priority?: string
          purchase_order_ids?: Json | null
          request_number?: string
          requested_by?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
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
      transactions: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          counteragent_id: string | null
          counteragent_name: string | null
          created_at: string
          description: string
          expense_category: Json | null
          id: string
          is_correction: boolean | null
          performed_by: Json
          related_order_ids: string[] | null
          related_payment_id: string | null
          status: string
          transfer_details: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          counteragent_id?: string | null
          counteragent_name?: string | null
          created_at?: string
          description: string
          expense_category?: Json | null
          id: string
          is_correction?: boolean | null
          performed_by: Json
          related_order_ids?: string[] | null
          related_payment_id?: string | null
          status?: string
          transfer_details?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          counteragent_id?: string | null
          counteragent_name?: string | null
          created_at?: string
          description?: string
          expense_category?: Json | null
          id?: string
          is_correction?: boolean | null
          performed_by?: Json
          related_order_ids?: string[] | null
          related_payment_id?: string | null
          status?: string
          transfer_details?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          phone: string | null
          pin_hash: string | null
          preferences: Json | null
          roles: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          phone?: string | null
          pin_hash?: string | null
          preferences?: Json | null
          roles?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          phone?: string | null
          pin_hash?: string | null
          preferences?: Json | null
          roles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_with_pin: {
        Args: { pin_input: string }
        Returns: {
          user_avatar: string
          user_email: string
          user_id: string
          user_name: string
          user_roles: string[]
        }[]
      }
      create_user_with_pin: {
        Args: {
          p_email?: string
          p_name: string
          p_pin: string
          p_roles: string[]
        }
        Returns: string
      }
      generate_preparation_batch_number: { Args: never; Returns: string }
      get_pin_user_credentials: {
        Args: { pin_input: string }
        Returns: {
          user_email: string
          user_id: string
          user_name: string
          user_password: string
          user_roles: string[]
        }[]
      }
      get_product_7day_avg_consumption: {
        Args: { product_id: string }
        Returns: number
      }
      get_product_consumption_by_department: {
        Args: { days_back?: number; product_id: string }
        Returns: {
          avg_daily_consumption: number
          department: string
          operation_count: number
          total_consumed: number
        }[]
      }
      get_products_consumption_stats: {
        Args: { days_back?: number }
        Returns: {
          avg_daily_consumption: number
          last_consumption_date: string
          operation_count: number
          product_id: string
          product_name: string
          total_consumed: number
        }[]
      }
      get_reorder_recommendations: {
        Args: { urgency_filter?: string }
        Returns: {
          avg_daily_consumption: number
          category_id: string
          current_stock: number
          days_until_stockout: number
          lead_time_days: number
          min_stock: number
          primary_supplier_id: string
          product_id: string
          product_name: string
          reason: string
          reorder_point: number
          shelf_life_days: number
          suggested_order_qty: number
          urgency: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      update_user_pin: {
        Args: { p_new_pin: string; p_user_id: string }
        Returns: boolean
      }
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
