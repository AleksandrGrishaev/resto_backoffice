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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      channel_menu_items: {
        Row: {
          channel_id: string
          created_at: string | null
          external_category_id: string | null
          external_id: string | null
          id: string
          is_available: boolean | null
          last_synced_at: string | null
          menu_item_id: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          external_category_id?: string | null
          external_id?: string | null
          id?: string
          is_available?: boolean | null
          last_synced_at?: string | null
          menu_item_id: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          external_category_id?: string | null
          external_id?: string | null
          id?: string
          is_available?: boolean | null
          last_synced_at?: string | null
          menu_item_id?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'channel_menu_items_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'sales_channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_menu_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_menu_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'v_menu_with_cost'
            referencedColumns: ['id']
          }
        ]
      }
      channel_payment_methods: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          payment_method_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          payment_method_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_payment_methods_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'sales_channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_payment_methods_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          }
        ]
      }
      channel_prices: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          menu_item_id: string
          price: number
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_item_id: string
          price: number
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_item_id?: string
          price?: number
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_prices_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'sales_channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_prices_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_prices_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'v_menu_with_cost'
            referencedColumns: ['id']
          }
        ]
      }
      channel_taxes: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          tax_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          tax_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          tax_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_taxes_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'sales_channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_taxes_tax_id_fkey'
            columns: ['tax_id']
            isOneToOne: false
            referencedRelation: 'taxes'
            referencedColumns: ['id']
          }
        ]
      }
      content_translations: {
        Row: {
          description: string | null
          entity_id: string
          entity_type: string
          is_auto: boolean | null
          locale: string
          name: string | null
          source_hash: string | null
          translated_at: string | null
        }
        Insert: {
          description?: string | null
          entity_id: string
          entity_type: string
          is_auto?: boolean | null
          locale: string
          name?: string | null
          source_hash?: string | null
          translated_at?: string | null
        }
        Update: {
          description?: string | null
          entity_id?: string
          entity_type?: string
          is_auto?: boolean | null
          locale?: string
          name?: string | null
          source_hash?: string | null
          translated_at?: string | null
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
          display_name: string
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
          display_name: string
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
          display_name?: string
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
      customer_identities: {
        Row: {
          auth_user_id: string
          created_at: string
          customer_id: string
          id: string
          provider: string
          provider_email: string | null
          provider_uid: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          customer_id: string
          id?: string
          provider: string
          provider_email?: string | null
          provider_uid?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          provider?: string
          provider_email?: string | null
          provider_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customer_identities_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          }
        ]
      }
      customers: {
        Row: {
          average_check: number
          created_at: string
          created_by: string
          disable_loyalty_accrual: boolean
          discount_note: string | null
          email: string | null
          first_visit_at: string | null
          id: string
          last_visit_at: string | null
          loyalty_balance: number
          merged_into: string | null
          name: string
          notes: string | null
          personal_discount: number
          phone: string | null
          spent_90d: number
          status: string
          telegram_id: string | null
          telegram_username: string | null
          tier: string
          tier_updated_at: string | null
          token: string
          total_spent: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          average_check?: number
          created_at?: string
          created_by?: string
          disable_loyalty_accrual?: boolean
          discount_note?: string | null
          email?: string | null
          first_visit_at?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_balance?: number
          merged_into?: string | null
          name: string
          notes?: string | null
          personal_discount?: number
          phone?: string | null
          spent_90d?: number
          status?: string
          telegram_id?: string | null
          telegram_username?: string | null
          tier?: string
          tier_updated_at?: string | null
          token?: string
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Update: {
          average_check?: number
          created_at?: string
          created_by?: string
          disable_loyalty_accrual?: boolean
          discount_note?: string | null
          email?: string | null
          first_visit_at?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_balance?: number
          merged_into?: string | null
          name?: string
          notes?: string | null
          personal_discount?: number
          phone?: string | null
          spent_90d?: number
          status?: string
          telegram_id?: string | null
          telegram_username?: string | null
          tier?: string
          tier_updated_at?: string | null
          token?: string
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customers_merged_into_fkey'
            columns: ['merged_into']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          }
        ]
      }
      delete_procurement_requests: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          id: string
          items: Json
          notes: string | null
          priority: string
          purchase_order_ids: string[] | null
          request_number: string
          requested_by: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          id: string
          items?: Json
          notes?: string | null
          priority?: string
          purchase_order_ids?: string[] | null
          request_number: string
          requested_by: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          items?: Json
          notes?: string | null
          priority?: string
          purchase_order_ids?: string[] | null
          request_number?: string
          requested_by?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      delete_purchase_orders: {
        Row: {
          actual_delivered_amount: number | null
          bill_id: string | null
          bill_status: string
          bill_status_calculated_at: string | null
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          has_receipt_discrepancies: boolean | null
          has_shortfall: boolean | null
          id: string
          is_estimated_total: boolean
          items: Json
          notes: string | null
          order_date: string
          order_number: string
          original_total_amount: number | null
          receipt_completed_at: string | null
          receipt_completed_by: string | null
          receipt_discrepancies: Json | null
          receipt_id: string | null
          request_ids: string[] | null
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
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          has_receipt_discrepancies?: boolean | null
          has_shortfall?: boolean | null
          id: string
          is_estimated_total?: boolean
          items?: Json
          notes?: string | null
          order_date: string
          order_number: string
          original_total_amount?: number | null
          receipt_completed_at?: string | null
          receipt_completed_by?: string | null
          receipt_discrepancies?: Json | null
          receipt_id?: string | null
          request_ids?: string[] | null
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
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          has_receipt_discrepancies?: boolean | null
          has_shortfall?: boolean | null
          id?: string
          is_estimated_total?: boolean
          items?: Json
          notes?: string | null
          order_date?: string
          order_number?: string
          original_total_amount?: number | null
          receipt_completed_at?: string | null
          receipt_completed_by?: string | null
          receipt_discrepancies?: Json | null
          receipt_id?: string | null
          request_ids?: string[] | null
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
      delete_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_date: string
          has_discrepancies: boolean
          id: string
          items: Json
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
          created_at?: string
          created_by?: string | null
          delivery_date: string
          has_discrepancies?: boolean
          id: string
          items?: Json
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
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          has_discrepancies?: boolean
          id?: string
          items?: Json
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
      discount_events: {
        Row: {
          allocation_details: Json | null
          applied_at: string
          applied_by: string | null
          approved_at: string | null
          approved_by: string | null
          bill_id: string | null
          created_at: string
          deleted_at: string | null
          discount_amount: number
          discount_type: string
          final_amount: number
          id: string
          item_id: string | null
          notes: string | null
          order_id: string
          original_amount: number
          reason: string
          shift_id: string | null
          stamp_card_id: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          allocation_details?: Json | null
          applied_at?: string
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bill_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount_amount: number
          discount_type: string
          final_amount: number
          id?: string
          item_id?: string | null
          notes?: string | null
          order_id: string
          original_amount: number
          reason: string
          shift_id?: string | null
          stamp_card_id?: string | null
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          allocation_details?: Json | null
          applied_at?: string
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bill_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount_amount?: number
          discount_type?: string
          final_amount?: number
          id?: string
          item_id?: string | null
          notes?: string | null
          order_id?: string
          original_amount?: number
          reason?: string
          shift_id?: string | null
          stamp_card_id?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'discount_events_applied_by_fkey'
            columns: ['applied_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_events_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_events_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_events_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_events_stamp_card_id_fkey'
            columns: ['stamp_card_id']
            isOneToOne: false
            referencedRelation: 'stamp_cards'
            referencedColumns: ['id']
          }
        ]
      }
      entity_change_log: {
        Row: {
          change_type: string
          changed_by: string | null
          changed_by_name: string
          changes: Json
          created_at: string
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          changed_by_name?: string
          changes?: Json
          created_at?: string
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          changed_by_name?: string
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      expense_invoice_links: {
        Row: {
          balance_adjustment_amount: number | null
          created_at: string
          expense_id: string
          id: string
          invoice_id: string
          invoice_number: string
          is_active: boolean
          linked_amount: number
          linked_at: string
          linked_by: Json
          shift_id: string
          unlink_reason: string | null
          unlinked_at: string | null
          unlinked_by: Json | null
        }
        Insert: {
          balance_adjustment_amount?: number | null
          created_at?: string
          expense_id: string
          id?: string
          invoice_id: string
          invoice_number: string
          is_active?: boolean
          linked_amount: number
          linked_at?: string
          linked_by: Json
          shift_id: string
          unlink_reason?: string | null
          unlinked_at?: string | null
          unlinked_by?: Json | null
        }
        Update: {
          balance_adjustment_amount?: number | null
          created_at?: string
          expense_id?: string
          id?: string
          invoice_id?: string
          invoice_number?: string
          is_active?: boolean
          linked_amount?: number
          linked_at?: string
          linked_by?: Json
          shift_id?: string
          unlink_reason?: string | null
          unlinked_at?: string | null
          unlinked_by?: Json | null
        }
        Relationships: []
      }
      gobiz_config: {
        Row: {
          access_token: string | null
          client_id: string
          client_secret: string
          created_at: string | null
          environment: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_error_at: string | null
          outlet_id: string | null
          outlet_name: string | null
          partner_id: string | null
          refresh_token: string | null
          settings: Json | null
          token_expires_at: string | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          client_id: string
          client_secret: string
          created_at?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_error_at?: string | null
          outlet_id?: string | null
          outlet_name?: string | null
          partner_id?: string | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string
          client_secret?: string
          created_at?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_error_at?: string | null
          outlet_id?: string | null
          outlet_name?: string | null
          partner_id?: string | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
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
      inventory_quick_lists: {
        Row: {
          created_at: string
          department: string
          id: string
          item_ids: string[]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          item_ids?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          item_ids?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_snapshots: {
        Row: {
          average_cost: number
          created_at: string | null
          department: string | null
          id: string
          item_id: string
          item_type: string
          quantity: number
          snapshot_date: string
          source: string
          source_document_id: string | null
          total_cost: number
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          average_cost?: number
          created_at?: string | null
          department?: string | null
          id?: string
          item_id: string
          item_type?: string
          quantity: number
          snapshot_date: string
          source: string
          source_document_id?: string | null
          total_cost?: number
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          average_cost?: number
          created_at?: string | null
          department?: string | null
          id?: string
          item_id?: string
          item_type?: string
          quantity?: number
          snapshot_date?: string
          source?: string
          source_document_id?: string | null
          total_cost?: number
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kitchen_bar_kpi: {
        Row: {
          created_at: string
          department: string
          id: string
          late_completions: number
          on_time_completions: number
          period_date: string
          production_details: Json | null
          production_quantity_total: number
          production_value_total: number
          productions_completed: number
          staff_id: string
          staff_name: string
          updated_at: string
          writeoff_details: Json | null
          writeoff_value_kpi_affecting: number
          writeoff_value_non_kpi: number
          writeoffs_kpi_affecting: number
          writeoffs_non_kpi: number
        }
        Insert: {
          created_at?: string
          department?: string
          id?: string
          late_completions?: number
          on_time_completions?: number
          period_date: string
          production_details?: Json | null
          production_quantity_total?: number
          production_value_total?: number
          productions_completed?: number
          staff_id: string
          staff_name: string
          updated_at?: string
          writeoff_details?: Json | null
          writeoff_value_kpi_affecting?: number
          writeoff_value_non_kpi?: number
          writeoffs_kpi_affecting?: number
          writeoffs_non_kpi?: number
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          late_completions?: number
          on_time_completions?: number
          period_date?: string
          production_details?: Json | null
          production_quantity_total?: number
          production_value_total?: number
          productions_completed?: number
          staff_id?: string
          staff_name?: string
          updated_at?: string
          writeoff_details?: Json | null
          writeoff_value_kpi_affecting?: number
          writeoff_value_non_kpi?: number
          writeoffs_kpi_affecting?: number
          writeoffs_non_kpi?: number
        }
        Relationships: []
      }
      kpi_settings: {
        Row: {
          excluded_reasons: Json
          id: string
          targets: Json
          updated_at: string | null
        }
        Insert: {
          excluded_reasons?: Json
          id?: string
          targets?: Json
          updated_at?: string | null
        }
        Update: {
          excluded_reasons?: Json
          id?: string
          targets?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string | null
          expires_at: string
          id: string
          order_id: string | null
          remaining: number
          source: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description?: string | null
          expires_at: string
          id?: string
          order_id?: string | null
          remaining: number
          source: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          expires_at?: string
          id?: string
          order_id?: string | null
          remaining?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: 'loyalty_points_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'loyalty_points_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
      loyalty_settings: {
        Row: {
          conversion_bonus_pct: number
          id: string
          is_active: boolean
          max_tier_degradation: number
          points_lifetime_days: number
          singleton_key: boolean
          stamp_lifetime_days: number
          stamp_rewards: Json
          stamp_threshold: number
          stamps_per_cycle: number
          tier_window_days: number
          tiers: Json
          updated_at: string
        }
        Insert: {
          conversion_bonus_pct?: number
          id?: string
          is_active?: boolean
          max_tier_degradation?: number
          points_lifetime_days?: number
          singleton_key?: boolean
          stamp_lifetime_days?: number
          stamp_rewards?: Json
          stamp_threshold?: number
          stamps_per_cycle?: number
          tier_window_days?: number
          tiers?: Json
          updated_at?: string
        }
        Update: {
          conversion_bonus_pct?: number
          id?: string
          is_active?: boolean
          max_tier_degradation?: number
          points_lifetime_days?: number
          singleton_key?: boolean
          stamp_lifetime_days?: number
          stamp_rewards?: Json
          stamp_threshold?: number
          stamps_per_cycle?: number
          tier_window_days?: number
          tiers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          performed_by: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          performed_by?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          performed_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'loyalty_transactions_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'loyalty_transactions_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
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
      menu_collection_items: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          menu_item_id: string
          notes: string | null
          sort_order: number | null
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          menu_item_id: string
          notes?: string | null
          sort_order?: number | null
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          menu_item_id?: string
          notes?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_collection_items_collection_id_fkey'
            columns: ['collection_id']
            isOneToOne: false
            referencedRelation: 'menu_collections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'menu_collection_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'menu_collection_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'v_menu_with_cost'
            referencedColumns: ['id']
          }
        ]
      }
      menu_collections: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          type?: string
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
          last_edited_at: string | null
          modifier_groups: Json | null
          name: string
          name_en: string | null
          price: number
          sort_order: number | null
          status: string
          templates: Json | null
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
          last_edited_at?: string | null
          modifier_groups?: Json | null
          name: string
          name_en?: string | null
          price?: number
          sort_order?: number | null
          status?: string
          templates?: Json | null
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
          last_edited_at?: string | null
          modifier_groups?: Json | null
          name?: string
          name_en?: string | null
          price?: number
          sort_order?: number | null
          status?: string
          templates?: Json | null
          type?: string | null
          updated_at?: string | null
          variants?: Json | null
        }
        Relationships: []
      }
      operations_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          bill_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shift_id: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          bill_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          shift_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          bill_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shift_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'operations_alerts_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'operations_alerts_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          }
        ]
      }
      order_counters: {
        Row: {
          counter_date: string
          id: string
          last_number: number
          updated_at: string | null
        }
        Insert: {
          counter_date: string
          id?: string
          last_number?: number
          updated_at?: string | null
        }
        Update: {
          counter_date?: string
          id?: string
          last_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          bill_id: string
          bill_number: string | null
          cached_actual_cost: Json | null
          cancellation_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cooking_started_at: string | null
          created_at: string | null
          department: string | null
          discounts: Json | null
          draft_at: string | null
          id: string
          kitchen_notes: string | null
          menu_item_id: string
          menu_item_name: string
          modifiers_total: number | null
          order_id: string
          paid_by_payment_ids: string[] | null
          payment_status: string | null
          quantity: number
          ready_at: string | null
          recipe_writeoff_id: string | null
          selected_modifiers: Json | null
          sent_to_kitchen_at: string | null
          served_at: string | null
          status: string
          total_price: number
          unit_price: number
          updated_at: string | null
          variant_id: string | null
          variant_name: string | null
          write_off_at: string | null
          write_off_operation_id: string | null
          write_off_status: string | null
          write_off_triggered_by: string | null
        }
        Insert: {
          bill_id: string
          bill_number?: string | null
          cached_actual_cost?: Json | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cooking_started_at?: string | null
          created_at?: string | null
          department?: string | null
          discounts?: Json | null
          draft_at?: string | null
          id?: string
          kitchen_notes?: string | null
          menu_item_id: string
          menu_item_name: string
          modifiers_total?: number | null
          order_id: string
          paid_by_payment_ids?: string[] | null
          payment_status?: string | null
          quantity?: number
          ready_at?: string | null
          recipe_writeoff_id?: string | null
          selected_modifiers?: Json | null
          sent_to_kitchen_at?: string | null
          served_at?: string | null
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string | null
          variant_id?: string | null
          variant_name?: string | null
          write_off_at?: string | null
          write_off_operation_id?: string | null
          write_off_status?: string | null
          write_off_triggered_by?: string | null
        }
        Update: {
          bill_id?: string
          bill_number?: string | null
          cached_actual_cost?: Json | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cooking_started_at?: string | null
          created_at?: string | null
          department?: string | null
          discounts?: Json | null
          draft_at?: string | null
          id?: string
          kitchen_notes?: string | null
          menu_item_id?: string
          menu_item_name?: string
          modifiers_total?: number | null
          order_id?: string
          paid_by_payment_ids?: string[] | null
          payment_status?: string | null
          quantity?: number
          ready_at?: string | null
          recipe_writeoff_id?: string | null
          selected_modifiers?: Json | null
          sent_to_kitchen_at?: string | null
          served_at?: string | null
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
          variant_id?: string | null
          variant_name?: string | null
          write_off_at?: string | null
          write_off_operation_id?: string | null
          write_off_status?: string | null
          write_off_triggered_by?: string | null
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
          actual_revenue: number | null
          bills: Json | null
          cancellation_reason: string | null
          cancellation_requested_at: string | null
          cancellation_resolved_at: string | null
          cancellation_resolved_by: string | null
          channel_code: string | null
          channel_id: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          discount_amount: number | null
          estimated_ready_time: string | null
          external_order_id: string | null
          external_status: string | null
          final_amount: number | null
          fulfillment_method: string | null
          guest_count: number | null
          id: string
          notes: string | null
          offline_created: boolean | null
          order_number: string
          paid_amount: number | null
          paid_at: string | null
          payment_ids: string[] | null
          payment_method: string | null
          payment_status: string
          pickup_time: string | null
          planned_revenue: number | null
          revenue_breakdown: Json | null
          shift_id: string | null
          source: string | null
          stamp_card_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          table_number: string | null
          tax: number
          tax_amount: number | null
          total: number
          total_amount: number | null
          total_collected: number | null
          type: string
          updated_at: string
          waiter_name: string | null
        }
        Insert: {
          actual_ready_time?: string | null
          actual_revenue?: number | null
          bills?: Json | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          cancellation_resolved_at?: string | null
          cancellation_resolved_by?: string | null
          channel_code?: string | null
          channel_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          discount_amount?: number | null
          estimated_ready_time?: string | null
          external_order_id?: string | null
          external_status?: string | null
          final_amount?: number | null
          fulfillment_method?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          offline_created?: boolean | null
          order_number: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_ids?: string[] | null
          payment_method?: string | null
          payment_status?: string
          pickup_time?: string | null
          planned_revenue?: number | null
          revenue_breakdown?: Json | null
          shift_id?: string | null
          source?: string | null
          stamp_card_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: string | null
          tax?: number
          tax_amount?: number | null
          total?: number
          total_amount?: number | null
          total_collected?: number | null
          type: string
          updated_at?: string
          waiter_name?: string | null
        }
        Update: {
          actual_ready_time?: string | null
          actual_revenue?: number | null
          bills?: Json | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          cancellation_resolved_at?: string | null
          cancellation_resolved_by?: string | null
          channel_code?: string | null
          channel_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          discount_amount?: number | null
          estimated_ready_time?: string | null
          external_order_id?: string | null
          external_status?: string | null
          final_amount?: number | null
          fulfillment_method?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          offline_created?: boolean | null
          order_number?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_ids?: string[] | null
          payment_method?: string | null
          payment_status?: string
          pickup_time?: string | null
          planned_revenue?: number | null
          revenue_breakdown?: Json | null
          shift_id?: string | null
          source?: string | null
          stamp_card_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: string | null
          tax?: number
          tax_amount?: number | null
          total?: number
          total_amount?: number | null
          total_collected?: number | null
          type?: string
          updated_at?: string
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'sales_channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_stamp_card_id_fkey'
            columns: ['stamp_card_id']
            isOneToOne: false
            referencedRelation: 'stamp_cards'
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
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_id: string | null
          code: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          icon_color: string | null
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
          icon_color?: string | null
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
          icon_color?: string | null
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
          customer_id: string | null
          customer_name: string | null
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
          customer_id?: string | null
          customer_name?: string | null
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
          customer_id?: string | null
          customer_name?: string | null
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
        Relationships: []
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
          source: string | null
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
          source?: string | null
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
          source?: string | null
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
          portion_quantity: number | null
          portion_size: number | null
          portion_type: string | null
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
          portion_quantity?: number | null
          portion_size?: number | null
          portion_type?: string | null
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
          portion_quantity?: number | null
          portion_size?: number | null
          portion_type?: string | null
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
          ingredient_id: string
          notes: string | null
          preparation_id: string
          quantity: number
          sort_order: number
          type: string
          unit: string
          use_yield_percentage: boolean | null
        }
        Insert: {
          id?: string
          ingredient_id: string
          notes?: string | null
          preparation_id: string
          quantity: number
          sort_order?: number
          type?: string
          unit: string
          use_yield_percentage?: boolean | null
        }
        Update: {
          id?: string
          ingredient_id?: string
          notes?: string | null
          preparation_id?: string
          quantity?: number
          sort_order?: number
          type?: string
          unit?: string
          use_yield_percentage?: boolean | null
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
          avg_daily_usage: number | null
          closed_at: string | null
          code: string | null
          cost_per_portion: number | null
          created_at: string
          created_by: string | null
          daily_target_quantity: number | null
          department: string
          description: string | null
          id: string
          instructions: string | null
          is_active: boolean
          last_edited_at: string | null
          last_known_cost: number | null
          min_stock_threshold: number | null
          name: string
          output_quantity: number
          output_unit: string
          portion_size: number | null
          portion_type: string | null
          preparation_time: number
          production_slot: string | null
          shelf_life: number
          status: string
          storage_location: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_negative_inventory?: boolean | null
          avg_daily_usage?: number | null
          closed_at?: string | null
          code?: string | null
          cost_per_portion?: number | null
          created_at?: string
          created_by?: string | null
          daily_target_quantity?: number | null
          department?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          last_edited_at?: string | null
          last_known_cost?: number | null
          min_stock_threshold?: number | null
          name: string
          output_quantity: number
          output_unit: string
          portion_size?: number | null
          portion_type?: string | null
          preparation_time: number
          production_slot?: string | null
          shelf_life?: number
          status?: string
          storage_location?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_negative_inventory?: boolean | null
          avg_daily_usage?: number | null
          closed_at?: string | null
          code?: string | null
          cost_per_portion?: number | null
          created_at?: string
          created_by?: string | null
          daily_target_quantity?: number | null
          department?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          last_edited_at?: string | null
          last_known_cost?: number | null
          min_stock_threshold?: number | null
          name?: string
          output_quantity?: number
          output_unit?: string
          portion_size?: number | null
          portion_type?: string | null
          preparation_time?: number
          production_slot?: string | null
          shelf_life?: number
          status?: string
          storage_location?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      printer_settings: {
        Row: {
          auto_print_cash_receipt: boolean | null
          created_at: string | null
          footer_message: string | null
          id: string
          restaurant_address: string | null
          restaurant_name: string
          restaurant_phone: string | null
          updated_at: string | null
        }
        Insert: {
          auto_print_cash_receipt?: boolean | null
          created_at?: string | null
          footer_message?: string | null
          id?: string
          restaurant_address?: string | null
          restaurant_name?: string
          restaurant_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_print_cash_receipt?: boolean | null
          created_at?: string | null
          footer_message?: string | null
          id?: string
          restaurant_address?: string | null
          restaurant_name?: string
          restaurant_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      production_schedule: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          completed_quantity: number | null
          created_at: string
          current_stock_at_generation: number | null
          department: string
          id: string
          preparation_batch_id: string | null
          preparation_id: string
          preparation_name: string
          priority: number
          production_slot: string
          recommendation_reason: string | null
          schedule_date: string
          status: string
          sync_error: string | null
          sync_status: string
          synced_at: string | null
          target_quantity: number
          target_unit: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          completed_quantity?: number | null
          created_at?: string
          current_stock_at_generation?: number | null
          department?: string
          id?: string
          preparation_batch_id?: string | null
          preparation_id: string
          preparation_name: string
          priority?: number
          production_slot?: string
          recommendation_reason?: string | null
          schedule_date: string
          status?: string
          sync_error?: string | null
          sync_status?: string
          synced_at?: string | null
          target_quantity: number
          target_unit: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          completed_quantity?: number | null
          created_at?: string
          current_stock_at_generation?: number | null
          department?: string
          id?: string
          preparation_batch_id?: string | null
          preparation_id?: string
          preparation_name?: string
          priority?: number
          production_slot?: string
          recommendation_reason?: string | null
          schedule_date?: string
          status?: string
          sync_error?: string | null
          sync_status?: string
          synced_at?: string | null
          target_quantity?: number
          target_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'production_schedule_preparation_id_fkey'
            columns: ['preparation_id']
            isOneToOne: false
            referencedRelation: 'preparations'
            referencedColumns: ['id']
          }
        ]
      }
      products: {
        Row: {
          allow_negative_inventory: boolean | null
          avg_daily_usage: number | null
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
          last_counted_at: string | null
          last_edited_at: string | null
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
          status: string
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
          avg_daily_usage?: number | null
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
          last_counted_at?: string | null
          last_edited_at?: string | null
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
          status?: string
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
          avg_daily_usage?: number | null
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
          last_counted_at?: string | null
          last_edited_at?: string | null
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
          status?: string
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
          use_yield_percentage: boolean | null
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
          use_yield_percentage?: boolean | null
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
          use_yield_percentage?: boolean | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      recipes: {
        Row: {
          category: string
          closed_at: string | null
          code: string | null
          cook_time: number | null
          cost: number | null
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          difficulty: string
          id: string
          is_active: boolean
          last_edited_at: string | null
          legacy_id: string
          name: string
          portion_size: number
          portion_unit: string
          prep_time: number | null
          status: string
          tags: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          closed_at?: string | null
          code?: string | null
          cook_time?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          last_edited_at?: string | null
          legacy_id: string
          name: string
          portion_size: number
          portion_unit: string
          prep_time?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          code?: string | null
          cook_time?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          last_edited_at?: string | null
          legacy_id?: string
          name?: string
          portion_size?: number
          portion_unit?: string
          prep_time?: number | null
          status?: string
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
      sales_channels: {
        Row: {
          code: string
          commission_percent: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          linked_channel_id: string | null
          name: string
          settings: Json | null
          sort_order: number | null
          tax_mode: string
          tax_percent: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          commission_percent?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_channel_id?: string | null
          name: string
          settings?: Json | null
          sort_order?: number | null
          tax_mode?: string
          tax_percent?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          commission_percent?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_channel_id?: string | null
          name?: string
          settings?: Json | null
          sort_order?: number | null
          tax_mode?: string
          tax_percent?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sales_channels_linked_channel_id_fkey'
            columns: ['linked_channel_id']
            isOneToOne: false
            referencedRelation: 'sales_channels'
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
          government_tax_amount: number | null
          government_tax_rate: number | null
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
          service_tax_amount: number | null
          service_tax_rate: number | null
          shift_id: string | null
          sold_at: string
          synced_at: string | null
          synced_to_backoffice: boolean | null
          total_price: number
          total_tax_amount: number | null
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
          government_tax_amount?: number | null
          government_tax_rate?: number | null
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
          service_tax_amount?: number | null
          service_tax_rate?: number | null
          shift_id?: string | null
          sold_at: string
          synced_at?: string | null
          synced_to_backoffice?: boolean | null
          total_price: number
          total_tax_amount?: number | null
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
          government_tax_amount?: number | null
          government_tax_rate?: number | null
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
          service_tax_amount?: number | null
          service_tax_rate?: number | null
          shift_id?: string | null
          sold_at?: string
          synced_at?: string | null
          synced_to_backoffice?: boolean | null
          total_price?: number
          total_tax_amount?: number | null
          unit_price?: number
          updated_at?: string
          variant_id?: string
          variant_name?: string
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
          transfer_operations: Json | null
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
          transfer_operations?: Json | null
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
          transfer_operations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      stamp_cards: {
        Row: {
          card_number: string
          converted_at: string | null
          created_at: string
          customer_id: string | null
          cycle: number
          id: string
          status: string
        }
        Insert: {
          card_number: string
          converted_at?: string | null
          created_at?: string
          customer_id?: string | null
          cycle?: number
          id?: string
          status?: string
        }
        Update: {
          card_number?: string
          converted_at?: string | null
          created_at?: string
          customer_id?: string | null
          cycle?: number
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stamp_cards_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          }
        ]
      }
      stamp_entries: {
        Row: {
          card_id: string
          created_at: string
          cycle: number
          expires_at: string
          id: string
          order_amount: number
          order_id: string | null
          stamps: number
        }
        Insert: {
          card_id: string
          created_at?: string
          cycle?: number
          expires_at: string
          id?: string
          order_amount: number
          order_id?: string | null
          stamps: number
        }
        Update: {
          card_id?: string
          created_at?: string
          cycle?: number
          expires_at?: string
          id?: string
          order_amount?: number
          order_id?: string | null
          stamps?: number
        }
        Relationships: [
          {
            foreignKeyName: 'stamp_entries_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'stamp_cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stamp_entries_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          }
        ]
      }
      stamp_reward_redemptions: {
        Row: {
          actual_discount: number
          card_id: string
          category: string
          category_ids: Json
          created_at: string
          cycle: number
          discount_event_id: string | null
          id: string
          max_discount: number
          order_id: string | null
          payment_id: string | null
          reward_tier: number
          stamps_at_redemption: number
        }
        Insert: {
          actual_discount: number
          card_id: string
          category: string
          category_ids?: Json
          created_at?: string
          cycle?: number
          discount_event_id?: string | null
          id?: string
          max_discount: number
          order_id?: string | null
          payment_id?: string | null
          reward_tier: number
          stamps_at_redemption: number
        }
        Update: {
          actual_discount?: number
          card_id?: string
          category?: string
          category_ids?: Json
          created_at?: string
          cycle?: number
          discount_event_id?: string | null
          id?: string
          max_discount?: number
          order_id?: string | null
          payment_id?: string | null
          reward_tier?: number
          stamps_at_redemption?: number
        }
        Relationships: [
          {
            foreignKeyName: 'stamp_reward_redemptions_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'stamp_cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stamp_reward_redemptions_discount_event_id_fkey'
            columns: ['discount_event_id']
            isOneToOne: false
            referencedRelation: 'discount_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stamp_reward_redemptions_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stamp_reward_redemptions_payment_id_fkey'
            columns: ['payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          }
        ]
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
          storage_operation_id: string | null
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
          storage_operation_id?: string | null
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
          storage_operation_id?: string | null
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
            foreignKeyName: 'storage_batches_storage_operation_id_fkey'
            columns: ['storage_operation_id']
            isOneToOne: false
            referencedRelation: 'storage_operations'
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
            foreignKeyName: 'fk_order_items_order_id'
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
          sent_date: string | null
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
          sent_date?: string | null
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
          sent_date?: string | null
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
      supplierstore_receipt_corrections: {
        Row: {
          batch_adjustments: Json | null
          corrected_by: string | null
          correction_number: string
          correction_type: string
          created_at: string
          financial_impact: number | null
          id: string
          item_corrections: Json | null
          new_supplier_id: string | null
          new_supplier_name: string | null
          new_total_amount: number | null
          old_supplier_id: string | null
          old_supplier_name: string | null
          old_total_amount: number | null
          order_id: string
          reason: string
          receipt_id: string
          status: string
          storage_operation_id: string | null
          updated_at: string
        }
        Insert: {
          batch_adjustments?: Json | null
          corrected_by?: string | null
          correction_number: string
          correction_type: string
          created_at?: string
          financial_impact?: number | null
          id: string
          item_corrections?: Json | null
          new_supplier_id?: string | null
          new_supplier_name?: string | null
          new_total_amount?: number | null
          old_supplier_id?: string | null
          old_supplier_name?: string | null
          old_total_amount?: number | null
          order_id: string
          reason: string
          receipt_id: string
          status?: string
          storage_operation_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_adjustments?: Json | null
          corrected_by?: string | null
          correction_number?: string
          correction_type?: string
          created_at?: string
          financial_impact?: number | null
          id?: string
          item_corrections?: Json | null
          new_supplier_id?: string | null
          new_supplier_name?: string | null
          new_total_amount?: number | null
          old_supplier_id?: string | null
          old_supplier_name?: string | null
          old_total_amount?: number | null
          order_id?: string
          reason?: string
          receipt_id?: string
          status?: string
          storage_operation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplierstore_receipt_corrections_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplierstore_receipt_corrections_receipt_id_fkey'
            columns: ['receipt_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_receipts'
            referencedColumns: ['id']
          }
        ]
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
            foreignKeyName: 'fk_receipt_items_order_item_id'
            columns: ['order_item_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_order_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_receipt_items_receipt_id'
            columns: ['receipt_id']
            isOneToOne: false
            referencedRelation: 'supplierstore_receipts'
            referencedColumns: ['id']
          }
        ]
      }
      supplierstore_receipts: {
        Row: {
          arrival_adjustment_applied: boolean | null
          arrival_adjustment_details: Json | null
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
          tax_amount: number | null
          tax_percentage: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          arrival_adjustment_applied?: boolean | null
          arrival_adjustment_details?: Json | null
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
          tax_amount?: number | null
          tax_percentage?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          arrival_adjustment_applied?: boolean | null
          arrival_adjustment_details?: Json | null
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
          tax_amount?: number | null
          tax_percentage?: number | null
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
            foreignKeyName: 'fk_request_items_request_id'
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
          sort_order: number | null
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
          sort_order?: number | null
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
          sort_order?: number | null
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      taxes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          percentage: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          percentage?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          percentage?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_auth_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          status: string
          telegram_first_name: string | null
          telegram_id: number | null
          telegram_last_name: string | null
          telegram_username: string | null
          used_at: string | null
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          used_at?: string | null
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          used_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          channel_code: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_opex: boolean | null
          is_system: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          channel_code?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_opex?: boolean | null
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          channel_code?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_opex?: boolean | null
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transaction_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'transaction_categories'
            referencedColumns: ['id']
          }
        ]
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
      website_homepage_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          menu_item_id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_item_id: string
          section_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_item_id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'website_homepage_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'website_homepage_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'v_menu_with_cost'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'website_homepage_items_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'website_homepage_sections'
            referencedColumns: ['id']
          }
        ]
      }
      website_homepage_sections: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          max_items: number
          slot_position: number
          title: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_items?: number
          slot_position: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_items?: number
          slot_position?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'website_homepage_sections_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          }
        ]
      }
      website_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      v_channel_profitability: {
        Row: {
          channel: string | null
          commission: number | null
          food_cost: number | null
          food_cost_pct: number | null
          items_sold: number | null
          marketing_cost: number | null
          net_margin_pct: number | null
          net_profit: number | null
          orders_count: number | null
          period: string | null
          revenue_gross: number | null
          revenue_net: number | null
          tax_collected: number | null
          total_discounts: number | null
        }
        Relationships: []
      }
      v_daily_sales: {
        Row: {
          card_total: number | null
          cash_total: number | null
          channel: string | null
          gross_revenue: number | null
          net_revenue: number | null
          order_type: string | null
          qr_total: number | null
          sale_date: string | null
          total_discounts: number | null
          total_items_sold: number | null
          total_orders: number | null
          total_tax: number | null
        }
        Relationships: []
      }
      v_food_cost_report: {
        Row: {
          avg_food_cost: number | null
          avg_margin_pct: number | null
          avg_selling_price: number | null
          department: string | null
          food_cost_pct_gross: number | null
          food_cost_pct_net: number | null
          menu_item_id: string | null
          menu_item_name: string | null
          sale_date: string | null
          times_sold: number | null
          total_discounts: number | null
          total_food_cost: number | null
          total_profit: number | null
          total_quantity: number | null
          total_revenue_gross: number | null
          total_revenue_net: number | null
        }
        Relationships: []
      }
      v_menu_with_cost: {
        Row: {
          category: string | null
          channel_prices: Json | null
          department: string | null
          estimated_cost: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          portion_size: number | null
          portion_unit: string | null
          price: number | null
          recipe_cost: number | null
          recipe_id: string | null
          variants: Json | null
        }
        Relationships: []
      }
      v_recipe_details: {
        Row: {
          component_type: string | null
          department: string | null
          estimated_cost: number | null
          ingredient_base_unit: string | null
          ingredient_cost_per_unit: number | null
          ingredient_name: string | null
          portion_size: number | null
          portion_unit: string | null
          quantity: number | null
          recipe_id: string | null
          recipe_name: string | null
          unit: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_stamps: {
        Args: {
          p_card_number: string
          p_order_amount?: number
          p_order_id?: string
        }
        Returns: Json
      }
      add_to_online_order: {
        Args: { p_items: Json; p_order_id: string }
        Returns: Json
      }
      ai_readonly_query: {
        Args: { max_rows?: number; sql_query: string }
        Returns: Json
      }
      allocate_batch_fifo: {
        Args: { p_fallback_cost?: number; p_items: Json }
        Returns: Json
      }
      allocate_preparation_fifo: {
        Args: {
          p_fallback_cost?: number
          p_preparation_id: string
          p_quantity: number
        }
        Returns: Json
      }
      allocate_product_fifo: {
        Args: {
          p_fallback_cost?: number
          p_product_id: string
          p_quantity: number
        }
        Returns: Json
      }
      apply_cashback: {
        Args: {
          p_customer_id: string
          p_order_amount?: number
          p_order_id?: string
        }
        Returns: Json
      }
      apply_receipt_correction: {
        Args: {
          p_corrected_by?: string
          p_correction_type: string
          p_item_corrections?: Json
          p_new_supplier_id?: string
          p_new_supplier_name?: string
          p_order_id: string
          p_reason: string
          p_receipt_id: string
        }
        Returns: Json
      }
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
      batch_process_negative_batches: {
        Args: {
          p_shortages: Database['public']['CompositeTypes']['shortage_item'][]
        }
        Returns: Database['public']['CompositeTypes']['shortage_result'][]
      }
      batch_update_storage_batches: {
        Args: {
          p_updates: Database['public']['CompositeTypes']['batch_update_item'][]
        }
        Returns: Database['public']['CompositeTypes']['batch_update_result'][]
      }
      calc_prep_decomposition_factors: {
        Args: { p_product_id: string }
        Returns: {
          factor: number
          preparation_id: string
          preparation_name: string
          product_qty_per_batch: number
          total_output_qty: number
        }[]
      }
      calc_product_inpreps: {
        Args: { p_product_id: string }
        Returns: {
          amount: number
          qty: number
        }[]
      }
      calc_product_loss_decomposed: {
        Args: { p_end_date: string; p_product_id: string; p_start_date: string }
        Returns: {
          corrections_gain_qty: number
          corrections_loss_qty: number
          direct_loss_qty: number
          from_preps_loss_qty: number
          total_loss_qty: number
        }[]
      }
      calc_product_opening: {
        Args: { p_product_id: string; p_start_date: string }
        Returns: {
          adjustments_amount: number
          adjustments_qty: number
          opening_amount: number
          opening_qty: number
          snapshot_created_at: string
          snapshot_date: string
          snapshot_source: string
        }[]
      }
      calc_product_theoretical_sales: {
        Args: { p_end_date: string; p_product_id: string; p_start_date: string }
        Returns: {
          direct_qty: number
          total_qty: number
          via_preps_qty: number
          via_recipes_qty: number
        }[]
      }
      calc_product_writeoffs_decomposed: {
        Args: { p_end_date: string; p_product_id: string; p_start_date: string }
        Returns: {
          direct_qty: number
          from_preps_qty: number
          total_qty: number
        }[]
      }
      cancel_online_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: Json
      }
      check_duplicate_payment: {
        Args: { p_amount: number; p_counteragent_id: string; p_date?: string }
        Returns: {
          is_duplicate: boolean
          payment_created_at: string
          payment_id: string
        }[]
      }
      complete_production_schedule_task: {
        Args: {
          p_batch_id?: string
          p_completed_by: string
          p_completed_by_name: string
          p_completed_quantity: number
          p_task_id: string
        }
        Returns: {
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          completed_quantity: number | null
          created_at: string
          current_stock_at_generation: number | null
          department: string
          id: string
          preparation_batch_id: string | null
          preparation_id: string
          preparation_name: string
          priority: number
          production_slot: string
          recommendation_reason: string | null
          schedule_date: string
          status: string
          sync_error: string | null
          sync_status: string
          synced_at: string | null
          target_quantity: number
          target_unit: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'production_schedule'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_receipt_full: {
        Args: {
          p_delivery_date: string
          p_order_id: string
          p_receipt_id: string
          p_received_items: Json
          p_supplier_id: string
          p_supplier_name: string
          p_total_amount: number
          p_warehouse_id: string
        }
        Returns: Json
      }
      convert_entity_type: {
        Args: {
          p_entity_id: string
          p_from_type: string
          p_new_fields?: Json
          p_to_type: string
        }
        Returns: Json
      }
      convert_stamp_card: {
        Args: { p_card_number: string; p_customer_id: string }
        Returns: Json
      }
      create_online_order: { Args: { p_data: Json }; Returns: Json }
      create_quick_receipt_complete: {
        Args: {
          p_delivery_date: string
          p_items: Json
          p_notes: string
          p_supplier_id: string
          p_supplier_name: string
          p_tax_amount?: number
          p_tax_percentage?: number
          p_update_prices?: boolean
        }
        Returns: Json
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
      decrement_batch_quantity: {
        Args: { p_batch_id: string; p_quantity: number }
        Returns: undefined
      }
      decrement_storage_batch_quantity: {
        Args: { p_batch_id: string; p_quantity: number }
        Returns: undefined
      }
      expire_points: { Args: never; Returns: Json }
      find_reconcilable_products: {
        Args: { p_product_ids: string[] }
        Returns: {
          product_id: string
        }[]
      }
      get_available_invoices_for_linking: {
        Args: { p_counteragent_id: string }
        Returns: {
          already_linked_amount: number
          created_at: string
          invoice_id: string
          order_number: string
          remaining_amount: number
          status: string
          supplier_id: string
          supplier_name: string
          total_amount: number
        }[]
      }
      get_cogs_by_date_range: {
        Args: {
          p_department?: string
          p_end_date: string
          p_excluded_reasons?: Json
          p_start_date: string
        }
        Returns: Json
      }
      get_customer_cabinet: { Args: { p_token: string }; Returns: Json }
      get_kitchen_time_kpi_detail: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_department?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          cooking_seconds: number
          department: string
          draft_seconds: number
          exceeded_plan: boolean
          item_id: string
          order_id: string
          order_number: string
          product_name: string
          ready_at: string
          total_seconds: number
          waiting_seconds: number
        }[]
      }
      get_kitchen_time_kpi_summary: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_department?: string
        }
        Returns: {
          avg_cooking_seconds: number
          avg_total_seconds: number
          avg_waiting_seconds: number
          department: string
          items_completed: number
          items_exceeded_plan: number
          period_date: string
        }[]
      }
      get_kitchen_time_kpi_today: {
        Args: { p_department?: string }
        Returns: {
          avg_cooking_seconds: number
          avg_total_seconds: number
          avg_waiting_seconds: number
          department: string
          exceeded_rate: number
          items_completed: number
          items_exceeded_plan: number
        }[]
      }
      get_loyalty_settings: { Args: never; Returns: Json }
      get_my_cashback_history: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_my_customer_profile: { Args: never; Returns: Json }
      get_my_orders: { Args: never; Returns: Json }
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
      get_product_variance_details: {
        Args: { p_end_date: string; p_product_id: string; p_start_date: string }
        Returns: Json
      }
      get_product_variance_details_v2: {
        Args: { p_end_date: string; p_product_id: string; p_start_date: string }
        Returns: Json
      }
      get_product_variance_details_v3: {
        Args: { p_end_date: string; p_product_id: string; p_start_date: string }
        Returns: Json
      }
      get_product_variance_report: {
        Args: {
          p_department?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_product_variance_report_v2: {
        Args: {
          p_department?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_product_variance_report_v3: {
        Args: {
          p_department?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_product_variance_report_v4: {
        Args: {
          p_department?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_production_schedule: {
        Args: { p_date: string; p_department: string }
        Returns: {
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          completed_quantity: number | null
          created_at: string
          current_stock_at_generation: number | null
          department: string
          id: string
          preparation_batch_id: string | null
          preparation_id: string
          preparation_name: string
          priority: number
          production_slot: string
          recommendation_reason: string | null
          schedule_date: string
          status: string
          sync_error: string | null
          sync_status: string
          synced_at: string | null
          target_quantity: number
          target_unit: string
          updated_at: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'production_schedule'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_products_consumption_stats: {
        Args: { days_back?: number }
        Returns: {
          avg_daily_consumption: number
          consumption_days: number
          product_id: string
          total_consumption: number
        }[]
      }
      get_recipes_using_recipe: {
        Args: { target_recipe_id: string }
        Returns: {
          component_quantity: number
          component_unit: string
          recipe_code: string
          recipe_id: string
          recipe_name: string
        }[]
      }
      get_stamp_card_info: { Args: { p_card_number: string }; Returns: Json }
      get_unlinked_expenses: {
        Args: { p_counteragent_id?: string }
        Returns: {
          amount: number
          counteragent_id: string
          counteragent_name: string
          created_at: string
          expense_id: string
          expense_type: string
          notes: string
          shift_id: string
          shift_number: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      list_stamp_cards: { Args: never; Returns: Json[] }
      recalculate_consumption_stats: {
        Args: {
          p_lookback_days?: number
          p_reorder_days?: number
          p_safety_factor?: number
        }
        Returns: Json
      }
      recalculate_tiers: { Args: never; Returns: Json }
      redeem_points: {
        Args: { p_amount?: number; p_customer_id: string; p_order_id?: string }
        Returns: Json
      }
      resolve_cancellation_request: {
        Args: { p_action: string; p_order_id: string }
        Returns: Json
      }
      send_purchase_order_to_supplier: {
        Args: {
          p_order_id: string
          p_sent_date: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      update_customer_stats: {
        Args: {
          p_customer_id: string
          p_order_amount?: number
          p_order_id?: string
        }
        Returns: Json
      }
      update_my_customer_profile: {
        Args: { p_name?: string; p_phone?: string }
        Returns: Json
      }
      update_online_order: {
        Args: { p_items: Json; p_order_id: string }
        Returns: Json
      }
      update_user_pin: {
        Args: { p_new_pin: string; p_user_id: string }
        Returns: boolean
      }
      upsert_kitchen_kpi: {
        Args: {
          p_add_late?: number
          p_add_on_time?: number
          p_add_production_quantity?: number
          p_add_production_value?: number
          p_add_productions?: number
          p_add_writeoff_value_kpi?: number
          p_add_writeoff_value_non_kpi?: number
          p_add_writeoffs_kpi?: number
          p_add_writeoffs_non_kpi?: number
          p_department: string
          p_period_date: string
          p_production_detail?: Json
          p_staff_id: string
          p_staff_name: string
          p_writeoff_detail?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      batch_update_item: {
        batch_id: string | null
        quantity_to_subtract: number | null
      }
      batch_update_result: {
        batch_id: string | null
        new_quantity: number | null
        new_status: string | null
        success: boolean | null
        error: string | null
      }
      shortage_item: {
        product_id: string | null
        warehouse_id: string | null
        shortage_quantity: number | null
        unit: string | null
        reason: string | null
        source_operation_type: string | null
      }
      shortage_result: {
        product_id: string | null
        batch_id: string | null
        batch_number: string | null
        quantity: number | null
        cost_per_unit: number | null
        total_cost: number | null
        is_new: boolean | null
        error: string | null
      }
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
