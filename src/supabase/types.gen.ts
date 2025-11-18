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
      products: {
        Row: {
          barcode: string | null
          base_cost_per_unit: number
          base_unit: string
          can_be_sold: boolean | null
          category: string
          cost: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
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
          barcode?: string | null
          base_cost_per_unit: number
          base_unit: string
          can_be_sold?: boolean | null
          category: string
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
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
          barcode?: string | null
          base_cost_per_unit?: number
          base_unit?: string
          can_be_sold?: boolean | null
          category?: string
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
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
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
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
