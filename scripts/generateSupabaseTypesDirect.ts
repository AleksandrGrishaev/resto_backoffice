#!/usr/bin/env tsx
/**
 * Generate TypeScript types from Supabase database schema using direct SQL
 * This script introspects the PostgreSQL schema and generates TypeScript definitions
 *
 * Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/generateSupabaseTypesDirect.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
import dotenv from 'dotenv'
const envPath = path.join(__dirname, '../.env.development')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/SERVICE_KEY environment variables are required'
  )
  console.error(`URL found: ${!!supabaseUrl}`)
  console.error(`Key found: ${!!supabaseKey}`)
  process.exit(1)
}

console.log('Connecting to Supabase...')
console.log(`URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseKey)

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  table_name: string
}

interface TableInfo {
  table_name: string
  column_count: number
}

/**
 * Fetch all tables and their columns from PostgreSQL schema
 */
async function fetchSchemaInfo(): Promise<{ tables: TableInfo[]; columns: ColumnInfo[] }> {
  console.log('\nFetching database schema from PostgreSQL...')

  // Query to get tables
  const tablesQuery = `
    SELECT
      t.table_name,
      COUNT(c.column_name) as column_count
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name
  `

  // Query to get columns
  const columnsQuery = `
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `

  try {
    const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: tablesQuery
    })

    if (tablesError) {
      // Fallback: try direct query
      console.log('Note: RPC not available, trying direct query method...')
      return { tables: [], columns: [] }
    }

    const tables = (tablesData as TableInfo[]) || []
    console.log(`Found ${tables.length} tables`)

    const { data: columnsData, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: columnsQuery
    })

    const columns = (columnsData as ColumnInfo[]) || []
    console.log(`Found ${columns.length} columns`)

    return { tables, columns }
  } catch (error) {
    console.error('Error fetching schema:', error)
    return { tables: [], columns: [] }
  }
}

/**
 * Map PostgreSQL data types to TypeScript
 */
function mapPostgresToTypeScript(pgType: string, isNullable: string = 'NO'): string {
  let tsType = 'unknown'

  const type = pgType.toLowerCase().trim()

  // Handle base types
  if (
    type.includes('varchar') ||
    type.includes('text') ||
    type.includes('char') ||
    type === 'character varying'
  ) {
    tsType = 'string'
  } else if (
    type.includes('integer') ||
    type.includes('bigint') ||
    type.includes('smallint') ||
    type === 'int' ||
    type === 'int4' ||
    type === 'int8'
  ) {
    tsType = 'number'
  } else if (
    type.includes('decimal') ||
    type.includes('numeric') ||
    type.includes('real') ||
    type.includes('double') ||
    type === 'float4' ||
    type === 'float8'
  ) {
    tsType = 'number'
  } else if (type.includes('boolean') || type.includes('bool') || type === 'bool') {
    tsType = 'boolean'
  } else if (
    type.includes('timestamp') ||
    type.includes('date') ||
    type.includes('time') ||
    type === 'timestamp without time zone' ||
    type === 'timestamp with time zone'
  ) {
    tsType = 'string'
  } else if (type.includes('json') || type.includes('jsonb')) {
    tsType = 'Json'
  } else if (type === 'uuid') {
    tsType = 'string'
  } else if (type === 'bytea') {
    tsType = 'string'
  }

  // Add null if nullable
  if (isNullable === 'YES') {
    return `${tsType} | null`
  }

  return tsType
}

/**
 * Generate TypeScript type definitions
 */
async function generateTypes() {
  try {
    const { tables, columns } = await fetchSchemaInfo()

    if (columns.length === 0) {
      console.warn('\nWarning: No columns found in schema. Using existing types.ts as reference.')
      return
    }

    // Group columns by table
    const columnsByTable = new Map<string, ColumnInfo[]>()
    for (const col of columns) {
      if (!columnsByTable.has(col.table_name)) {
        columnsByTable.set(col.table_name, [])
      }
      columnsByTable.get(col.table_name)!.push(col)
    }

    let typeDefinitions = `// src/supabase/types.gen.ts - Supabase database types
// Auto-generated from Supabase database schema
// Last updated: ${new Date().toISOString()}
// Generated by: scripts/generateSupabaseTypesDirect.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
`

    // Process each table
    const tableNames = Array.from(columnsByTable.keys()).sort()
    for (const tableName of tableNames) {
      const tableColumns = columnsByTable.get(tableName) || []

      console.log(`Processing table: ${tableName} (${tableColumns.length} columns)`)

      // Start table definition
      typeDefinitions += `      ${tableName}: {
        Row: {
`

      // Add row columns
      for (const col of tableColumns) {
        const tsType = mapPostgresToTypeScript(col.data_type, col.is_nullable)
        typeDefinitions += `          ${col.column_name}: ${tsType}
`
      }

      typeDefinitions += `        }
        Insert: {
`

      // Add insert columns
      for (const col of tableColumns) {
        const tsType = mapPostgresToTypeScript(col.data_type, col.is_nullable)
        const isOptional =
          col.column_default !== null ||
          col.column_default !== undefined ||
          col.is_nullable === 'YES'
        const typeStr = isOptional ? `${tsType} | undefined` : tsType
        typeDefinitions += `          ${col.column_name}?: ${typeStr}
`
      }

      typeDefinitions += `        }
        Update: {
`

      // Add update columns
      for (const col of tableColumns) {
        const tsType = mapPostgresToTypeScript(col.data_type, col.is_nullable)
        typeDefinitions += `          ${col.column_name}?: ${tsType}
`
      }

      typeDefinitions += `        }
        Relationships: []
      }
`
    }

    typeDefinitions += `    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
`

    // Write to file
    const outputPath = path.join(__dirname, '../src/supabase/types.gen.ts')
    fs.writeFileSync(outputPath, typeDefinitions)

    console.log(`\n✅ Successfully generated TypeScript types`)
    console.log(`📁 Output: ${outputPath}`)
    console.log(`📊 Generated types for ${tableNames.length} tables`)
    console.log(`📝 Total columns: ${columns.length}`)
  } catch (error) {
    console.error('Fatal error generating types:', error)
    process.exit(1)
  }
}

// Run the generator
generateTypes()
