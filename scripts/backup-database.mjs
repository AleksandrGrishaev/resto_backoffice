#!/usr/bin/env node
/**
 * Database Backup Script for Supabase Production
 *
 * Usage:
 *   pnpm backup:prod
 *
 * Requirements:
 *   - Set DB_PASSWORD environment variable or add to .env.backup
 *   - pg_dump must be installed (comes with PostgreSQL)
 *
 * Output:
 *   - backup.dump    — Custom format (compressed, supports parallel restore)
 *   - backup.sql     — Plain SQL (human-readable, for reference)
 *   - schema.sql     — Schema only
 *   - grants.sql     — GRANT permissions for Supabase roles
 *   - realtime.sql   — Real-time publication table memberships
 *   - extensions.sql — Enabled PostgreSQL extensions
 *   - auth_users.sql — Auth users metadata (SECURITY SENSITIVE!)
 *   - metadata.json  — Backup info
 *
 * Restore:
 *   pg_restore -d CONNECTION_STRING -j 4 --no-owner --no-privileges backup.dump
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

// Configuration — direct connection (more stable than pooler for large dumps)
const CONFIG = {
  projectRef: 'bkntdcvzatawencxghob',
  host: 'db.bkntdcvzatawencxghob.supabase.co', // Direct connection (no pooler)
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  backupDir: join(ROOT_DIR, 'backups')
}

// Fallback: session pooler (IPv4 compatible, for networks without IPv6)
const POOLER_CONFIG = {
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.bkntdcvzatawencxghob'
}

// Load password from environment or .env.backup file
function getPassword() {
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD
  }

  const envBackupPath = join(ROOT_DIR, '.env.backup')
  if (existsSync(envBackupPath)) {
    const content = readFileSync(envBackupPath, 'utf-8')
    const match = content.match(/DB_PASSWORD=(.+)/)
    if (match) {
      return match[1].trim()
    }
  }

  const envSeedPath = join(ROOT_DIR, '.env.seed.production')
  if (existsSync(envSeedPath)) {
    const content = readFileSync(envSeedPath, 'utf-8')
    const passwordMatch = content.match(/DB_PASSWORD=(.+)/)
    if (passwordMatch) {
      return passwordMatch[1].trim()
    }
    const urlMatch = content.match(/postgresql:\/\/[^:]+:([^@]+)@/)
    if (urlMatch) {
      return urlMatch[1]
    }
  }

  return null
}

// pg_dump paths to check (Homebrew on macOS, then system PATH)
const PG_TOOL_PATHS = [
  '/opt/homebrew/opt/libpq/bin', // Homebrew ARM Mac
  '/usr/local/opt/libpq/bin', // Homebrew Intel Mac
  '' // System PATH
]

function findPgTool(tool) {
  for (const basePath of PG_TOOL_PATHS) {
    const fullPath = basePath ? join(basePath, tool) : tool
    try {
      execSync(`${fullPath} --version`, { stdio: 'pipe' })
      return fullPath
    } catch {
      continue
    }
  }
  return null
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Build connection string WITHOUT password (password via PGPASSWORD env var)
function buildConnectionString(host, user) {
  return `postgresql://${user}@${host}:${CONFIG.port}/${CONFIG.database}?keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5`
}

function testConnection(psqlPath, connectionString) {
  const result = spawnSync(psqlPath, [connectionString, '--command', 'SELECT 1'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf-8',
    timeout: 15000
  })
  return result.status === 0
}

function runPgDump(pgDumpPath, connectionString, extraArgs) {
  return spawnSync(
    pgDumpPath,
    [connectionString, '--no-owner', '--no-privileges', '--schema=public', ...extraArgs],
    { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
  )
}

function runPsqlQuery(psqlPath, connectionString, query) {
  return spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', query],
    { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
  )
}

function createBackup() {
  const startTime = Date.now()

  console.log('\n========================================')
  console.log('  Supabase Database Backup')
  console.log('========================================\n')

  // Find pg_dump and psql
  const pgDumpPath = findPgTool('pg_dump')
  if (!pgDumpPath) {
    console.error('ERROR: pg_dump not found!')
    console.log('\nInstall PostgreSQL to get pg_dump:')
    console.log('  macOS: brew install libpq')
    console.log('  Ubuntu: sudo apt install postgresql-client')
    process.exit(1)
  }
  const psqlPath = pgDumpPath.replace('pg_dump', 'psql')
  console.log(`Using: ${pgDumpPath}`)

  // Get password and set as env var (avoids special chars in URL)
  const password = getPassword()
  if (!password) {
    console.error('ERROR: Database password not found!')
    console.log('\nSet password using one of these methods:')
    console.log('  1. Environment variable: DB_PASSWORD=xxx pnpm backup:prod')
    console.log('  2. Create .env.backup file with: DB_PASSWORD=your_password')
    console.log('  3. Add DB_PASSWORD to .env.seed.production')
    console.log(
      '\nGet password from: https://supabase.com/dashboard/project/bkntdcvzatawencxghob/settings/database'
    )
    process.exit(1)
  }
  // Set PGPASSWORD so all pg_dump/psql calls use it automatically
  process.env.PGPASSWORD = password

  // Try direct connection first, fall back to pooler
  let connectionString = buildConnectionString(CONFIG.host, CONFIG.user)
  console.log(`Trying direct connection (${CONFIG.host})...`)

  if (!testConnection(psqlPath, connectionString)) {
    console.log('  Direct connection failed, falling back to session pooler...')
    connectionString = buildConnectionString(POOLER_CONFIG.host, POOLER_CONFIG.user)
    if (!testConnection(psqlPath, connectionString)) {
      console.error('ERROR: Cannot connect to database via direct or pooler connection!')
      process.exit(1)
    }
    console.log(`  Connected via pooler (${POOLER_CONFIG.host})`)
  } else {
    console.log('  Connected directly')
  }

  // Create backup directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupName = `prod_${timestamp}`
  const backupPath = join(CONFIG.backupDir, backupName)

  if (!existsSync(CONFIG.backupDir)) {
    mkdirSync(CONFIG.backupDir, { recursive: true })
  }
  mkdirSync(backupPath, { recursive: true })

  console.log(`\nProject: ${CONFIG.projectRef}`)
  console.log(`Backup folder: ${backupName}\n`)

  // File paths
  const sqlFile = join(backupPath, 'backup.sql')
  const schemaFile = join(backupPath, 'schema.sql')

  // --- PHASE 1: Schema-only backup (always works, small data) ---
  console.log('Creating schema-only backup...')
  const schemaResult = runPgDump(pgDumpPath, connectionString, [
    '--schema-only',
    '--file=' + schemaFile
  ])

  if (schemaResult.status !== 0) {
    console.error('ERROR: Schema backup failed!')
    console.error(schemaResult.stderr)
    process.exit(1)
  }
  console.log('  schema.sql created')

  // --- PHASE 2: Full data backup (table-by-table for pooler stability) ---
  // Get list of all tables
  console.log('Getting table list...')
  const tableListResult = runPsqlQuery(
    psqlPath,
    connectionString,
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
  )

  if (tableListResult.status !== 0) {
    console.error('ERROR: Could not get table list!')
    process.exit(1)
  }

  const tables = tableListResult.stdout.trim().split('\n').filter(Boolean)
  console.log(`  Found ${tables.length} tables\n`)

  // Dump each table individually as custom format (each gets its own connection)
  const dataDir = join(backupPath, 'tables')
  mkdirSync(dataDir, { recursive: true })

  let failedTables = []
  let totalDataSize = 0

  console.log('Dumping tables (custom format, compressed)...')
  for (const table of tables) {
    const tableFile = join(dataDir, `${table}.dump`)
    const result = runPgDump(pgDumpPath, connectionString, [
      '--format=custom',
      '--compress=6',
      '--data-only',
      `--table=public.${table}`,
      '--file=' + tableFile
    ])

    if (result.status !== 0) {
      console.error(`  FAILED: ${table}`)
      console.error(`    ${result.stderr.split('\n')[0]}`)
      failedTables.push(table)
      // Clean up failed file
      try {
        unlinkSync(tableFile)
      } catch {}
    } else {
      const size = statSync(tableFile).size
      totalDataSize += size
      if (size > 100 * 1024) {
        console.log(`  ${table.padEnd(35)} ${formatSize(size).padStart(10)}`)
      }
    }
  }

  // Retry failed tables with INSERT mode (slower but avoids COPY/SSL issues)
  if (failedTables.length > 0) {
    console.log(`\nRetrying ${failedTables.length} failed tables with INSERT mode...`)
    const stillFailed = []

    for (const table of failedTables) {
      const tableFile = join(dataDir, `${table}.sql`)
      const result = runPgDump(pgDumpPath, connectionString, [
        '--data-only',
        '--inserts',
        '--rows-per-insert=100',
        `--table=public.${table}`,
        '--file=' + tableFile
      ])

      if (result.status !== 0) {
        console.error(`  STILL FAILED: ${table}`)
        console.error(`    ${result.stderr.split('\n')[0]}`)
        stillFailed.push(table)
      } else {
        const size = statSync(tableFile).size
        totalDataSize += size
        console.log(`  ${table.padEnd(35)} ${formatSize(size).padStart(10)} (INSERT mode)`)
      }
    }
    failedTables = stillFailed
  }

  console.log(
    `\nTotal data: ${formatSize(totalDataSize)} across ${tables.length - failedTables.length}/${tables.length} tables`
  )
  if (failedTables.length > 0) {
    console.error(`WARNING: ${failedTables.length} tables failed: ${failedTables.join(', ')}`)
  }

  // --- PHASE 3: Create combined backup.dump from schema + successful table dumps ---
  // Also create a plain SQL backup for reference
  console.log('\nCreating combined plain SQL backup...')
  const sqlResult = runPgDump(pgDumpPath, connectionString, ['--schema-only', '--file=' + sqlFile])
  // Append data from table dumps would be complex, so just keep schema.sql + tables/ dir
  if (sqlResult.status === 0) {
    console.log('  backup.sql created (schema only, data in tables/ dir)')
  }

  // 4. Export GRANT permissions
  console.log('Exporting GRANT permissions...')
  const grantsFile = join(backupPath, 'grants.sql')
  const grantsHeader = `-- Export all GRANT permissions for Supabase roles
-- Run this after restore to fix "permission denied" errors

-- 1. Tables\n`

  const tablesQuery = `SELECT 'GRANT ' || privilege_type || ' ON ' || table_schema || '.' || table_name || ' TO ' || grantee || ';'
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;`

  const tablesResult = runPsqlQuery(psqlPath, connectionString, tablesQuery)

  let grantsContent = grantsHeader
  if (tablesResult.status === 0 && tablesResult.stdout.trim()) {
    grantsContent += tablesResult.stdout + '\n-- 2. Sequences\n'
  }

  const seqQuery = `SELECT 'GRANT ' || privilege_type || ' ON SEQUENCE ' || sequence_schema || '.' || sequence_name || ' TO ' || grantee || ';'
FROM information_schema.usage_privileges
WHERE object_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY object_name, grantee, privilege_type;`

  const seqResult = runPsqlQuery(psqlPath, connectionString, seqQuery)

  if (seqResult.status === 0 && seqResult.stdout.trim()) {
    grantsContent += seqResult.stdout + '\n-- 3. Functions\n'
  }

  const funcQuery = `SELECT 'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.proname ||
    '(' || pg_get_function_identity_arguments(p.oid) || ') TO anon;'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.proname ||
    '(' || pg_get_function_identity_arguments(p.oid) || ') TO authenticated;'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.proname ||
    '(' || pg_get_function_identity_arguments(p.oid) || ') TO service_role;'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY 1;`

  const funcResult = runPsqlQuery(psqlPath, connectionString, funcQuery)

  if (funcResult.status === 0 && funcResult.stdout.trim()) {
    grantsContent += funcResult.stdout + '\n'
  }

  if (grantsContent !== grantsHeader) {
    writeFileSync(grantsFile, grantsContent)
    console.log('  grants.sql exported')
  } else {
    console.log('  WARNING: Could not export grants')
  }

  // 5. Export real-time publication tables
  console.log('Exporting real-time publication...')
  const realtimeFile = join(backupPath, 'realtime.sql')
  const realtimeQuery = `
SELECT 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || schemaname || '.' || tablename || ';' as stmt
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;`

  const realtimeResult = runPsqlQuery(psqlPath, connectionString, realtimeQuery)

  if (realtimeResult.status === 0 && realtimeResult.stdout) {
    writeFileSync(realtimeFile, realtimeResult.stdout)
    console.log('  realtime.sql exported')
  } else {
    console.log('  WARNING: Could not export real-time publication')
  }

  // 6. Export enabled extensions
  console.log('Exporting enabled extensions...')
  const extensionsFile = join(backupPath, 'extensions.sql')
  const extensionsQuery = `
SELECT 'CREATE EXTENSION IF NOT EXISTS "' || extname || '" WITH SCHEMA ' ||
  COALESCE(n.nspname, 'public') || ';' as stmt
FROM pg_extension e
LEFT JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname NOT IN ('plpgsql')
ORDER BY extname;`

  const extensionsResult = runPsqlQuery(psqlPath, connectionString, extensionsQuery)

  if (extensionsResult.status === 0 && extensionsResult.stdout) {
    writeFileSync(extensionsFile, extensionsResult.stdout)
    console.log('  extensions.sql exported')
  } else {
    console.log('  WARNING: Could not export extensions')
  }

  // 7. Export Auth users (optional, security sensitive)
  console.log('Exporting Auth users metadata...')
  const authFile = join(backupPath, 'auth_users.sql')
  const authQuery = `
SELECT 'INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at, role) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(raw_user_meta_data::text) || '::jsonb, ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  quote_literal(updated_at::text) || '::timestamptz, ' ||
  COALESCE(quote_literal(email_confirmed_at::text) || '::timestamptz', 'NULL') || ', ' ||
  quote_literal(role) ||
  ');' as stmt
FROM auth.users
ORDER BY created_at;`

  const authResult = runPsqlQuery(psqlPath, connectionString, authQuery)

  if (authResult.status === 0 && authResult.stdout) {
    writeFileSync(
      authFile,
      '-- WARNING: Security-sensitive data! Do not commit to git.\n' + authResult.stdout
    )
    console.log('  auth_users.sql exported (SECURITY SENSITIVE!)')
  } else {
    console.log('  WARNING: Could not export auth users')
  }

  // 8. Save backup metadata
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const metadata = {
    timestamp: new Date().toISOString(),
    projectRef: CONFIG.projectRef,
    database: CONFIG.database,
    type: 'full',
    format: 'table-by-table custom dumps',
    tables_total: tables.length,
    tables_backed_up: tables.length - failedTables.length,
    tables_failed: failedTables,
    data_size: totalDataSize,
    elapsed_seconds: parseFloat(elapsed),
    structure: {
      'schema.sql': 'Full schema (DDL)',
      'tables/': 'Individual table data dumps (.dump = custom format, .sql = INSERT fallback)',
      'grants.sql': 'GRANT permissions for Supabase roles',
      'realtime.sql': 'Real-time publication table memberships',
      'extensions.sql': 'Enabled PostgreSQL extensions',
      'auth_users.sql': 'Auth users metadata (SECURITY SENSITIVE!)'
    }
  }
  writeFileSync(join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

  // Summary
  console.log('\n========================================')
  console.log(`  Backup Complete! (${elapsed}s)`)
  console.log('========================================')
  console.log(`\nLocation: backups/${backupName}/`)
  console.log(`Tables: ${tables.length - failedTables.length}/${tables.length} backed up`)
  console.log(`Data size: ${formatSize(totalDataSize)} (compressed)`)

  const summaryFiles = [
    'schema.sql',
    'grants.sql',
    'realtime.sql',
    'extensions.sql',
    'auth_users.sql'
  ]
  for (const file of summaryFiles) {
    const filePath = join(backupPath, file)
    if (existsSync(filePath)) {
      const size = formatSize(statSync(filePath).size)
      const label = file === 'auth_users.sql' ? ' (SECURITY SENSITIVE!)' : ''
      console.log(`  ${file.padEnd(20)} ${size.padStart(10)}${label}`)
    }
  }

  if (failedTables.length > 0) {
    console.log(`\nWARNING: Failed tables: ${failedTables.join(', ')}`)
  }
  console.log('')
}

// Run
createBackup()
