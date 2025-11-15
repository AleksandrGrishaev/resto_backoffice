// Generated TypeScript types from Supabase schema
// Department field added to menu_items

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      menu_items: {
        Row: {
          id: string
          name: string
          category_id: string | null
          department: string | null // 'kitchen' | 'bar'
          // ... other fields
        }
      }
      // ... other tables
    }
  }
}
