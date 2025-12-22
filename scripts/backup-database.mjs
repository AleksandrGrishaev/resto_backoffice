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
 * The script creates a timestamped backup in ./backups/ folder
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

// Configuration
// Session pooler (IPv4 compatible) - required for networks without IPv6
const CONFIG = {
  projectRef: 'bkntdcvzatawencxghob',
  host: 'aws-1-ap-southeast-2.pooler.supabase.com', // Session pooler
  port: 5432,
  database: 'postgres',
  user: 'postgres.bkntdcvzatawencxghob', // Pooler requires project_ref in username
  backupDir: join(ROOT_DIR, 'backups')
}

// Load password from environment or .env.backup file
function getPassword() {
  // 1. Check environment variable
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD
  }

  // 2. Check .env.backup file
  const envBackupPath = join(ROOT_DIR, '.env.backup')
  if (existsSync(envBackupPath)) {
    const content = readFileSync(envBackupPath, 'utf-8')
    const match = content.match(/DB_PASSWORD=(.+)/)
    if (match) {
      return match[1].trim()
    }
  }

  // 3. Check .env.seed.production file
  const envSeedPath = join(ROOT_DIR, '.env.seed.production')
  if (existsSync(envSeedPath)) {
    const content = readFileSync(envSeedPath, 'utf-8')
    // Look for password in connection string or separate variable
    const passwordMatch = content.match(/DB_PASSWORD=(.+)/)
    if (passwordMatch) {
      return passwordMatch[1].trim()
    }
    // Try to extract from SUPABASE_DB_URL if present
    const urlMatch = content.match(/postgresql:\/\/[^:]+:([^@]+)@/)
    if (urlMatch) {
      return urlMatch[1]
    }
  }

  return null
}

// pg_dump paths to check (Homebrew on macOS, then system PATH)
const PG_DUMP_PATHS = [
  '/opt/homebrew/opt/libpq/bin/pg_dump', // Homebrew ARM Mac
  '/usr/local/opt/libpq/bin/pg_dump', // Homebrew Intel Mac
  'pg_dump' // System PATH
]

function findPgDump() {
  for (const pgDumpPath of PG_DUMP_PATHS) {
    try {
      execSync(`${pgDumpPath} --version`, { stdio: 'pipe' })
      return pgDumpPath
    } catch {
      continue
    }
  }
  return null
}

function createBackup() {
  console.log('\n========================================')
  console.log('  Supabase Database Backup')
  console.log('========================================\n')

  // Find pg_dump
  const pgDumpPath = findPgDump()
  if (!pgDumpPath) {
    console.error('ERROR: pg_dump not found!')
    console.log('\nInstall PostgreSQL to get pg_dump:')
    console.log('  macOS: brew install libpq')
    console.log('  Ubuntu: sudo apt install postgresql-client')
    process.exit(1)
  }
  console.log(`Using: ${pgDumpPath}`)

  // Get password
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

  // Create backup directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupName = `prod_${timestamp}`
  const backupPath = join(CONFIG.backupDir, backupName)

  if (!existsSync(CONFIG.backupDir)) {
    mkdirSync(CONFIG.backupDir, { recursive: true })
  }
  mkdirSync(backupPath, { recursive: true })

  console.log(`Project: ${CONFIG.projectRef}`)
  console.log(`Backup folder: ${backupName}`)
  console.log('')

  // Build connection string
  const connectionString = `postgresql://${CONFIG.user}:${password}@${CONFIG.host}:${CONFIG.port}/${CONFIG.database}`

  // Backup options
  const sqlFile = join(backupPath, 'backup.sql')
  const schemaFile = join(backupPath, 'schema.sql')

  // 1. Full backup (schema + data)
  console.log('Creating full backup (schema + data)...')
  const fullBackupResult = spawnSync(
    pgDumpPath,
    [connectionString, '--no-owner', '--no-privileges', '--schema=public', '--file=' + sqlFile],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (fullBackupResult.status !== 0) {
    console.error('ERROR: Full backup failed!')
    console.error(fullBackupResult.stderr)
    process.exit(1)
  }
  console.log('  Full backup created: backup.sql')

  // 2. Schema only backup
  console.log('Creating schema-only backup...')
  const schemaResult = spawnSync(
    pgDumpPath,
    [
      connectionString,
      '--no-owner',
      '--no-privileges',
      '--schema=public',
      '--schema-only',
      '--file=' + schemaFile
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (schemaResult.status !== 0) {
    console.error('WARNING: Schema backup failed!')
    console.error(schemaResult.stderr)
  } else {
    console.log('  Schema backup created: schema.sql')
  }

  // 3. Export GRANT permissions
  console.log('Exporting GRANT permissions...')
  const grantsFile = join(backupPath, 'grants.sql')
  const grantsHeader = `-- Export all GRANT permissions for Supabase roles
-- Run this after restore to fix "permission denied" errors

-- 1. Tables\n`

  const psqlPath = pgDumpPath.replace('pg_dump', 'psql')

  // Query 1: Tables
  const tablesQuery = `SELECT 'GRANT ' || privilege_type || ' ON ' || table_schema || '.' || table_name || ' TO ' || grantee || ';'
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;`

  const tablesResult = spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', tablesQuery],
    { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
  )

  let grantsContent = grantsHeader
  if (tablesResult.status === 0 && tablesResult.stdout.trim()) {
    grantsContent += tablesResult.stdout + '\n-- 2. Sequences\n'
  }

  // Query 2: Sequences
  const seqQuery = `SELECT 'GRANT ' || privilege_type || ' ON SEQUENCE ' || sequence_schema || '.' || sequence_name || ' TO ' || grantee || ';'
FROM information_schema.usage_privileges
WHERE object_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY object_name, grantee, privilege_type;`

  const seqResult = spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', seqQuery],
    { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
  )

  if (seqResult.status === 0 && seqResult.stdout.trim()) {
    grantsContent += seqResult.stdout + '\n-- 3. Functions\n'
  }

  // Query 3: Functions
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

  const funcResult = spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', funcQuery],
    { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
  )

  if (funcResult.status === 0 && funcResult.stdout.trim()) {
    grantsContent += funcResult.stdout + '\n'
  }

  // Write grants file
  if (grantsContent !== grantsHeader) {
    writeFileSync(grantsFile, grantsContent)
    console.log('  Grants exported: grants.sql')
  } else {
    console.log('  WARNING: Could not export grants')
  }

  // 4. Export real-time publication tables
  console.log('Exporting real-time publication...')
  const realtimeFile = join(backupPath, 'realtime.sql')
  const realtimeQuery = `
-- Export real-time publication table memberships
SELECT 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || schemaname || '.' || tablename || ';' as stmt
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
`
  const realtimeResult = spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', realtimeQuery],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (realtimeResult.status === 0 && realtimeResult.stdout) {
    writeFileSync(realtimeFile, realtimeResult.stdout)
    console.log('  Real-time publication exported: realtime.sql')
  } else {
    console.log('  WARNING: Could not export real-time publication')
  }

  // 5. Export enabled extensions
  console.log('Exporting enabled extensions...')
  const extensionsFile = join(backupPath, 'extensions.sql')
  const extensionsQuery = `
-- Export enabled extensions
SELECT 'CREATE EXTENSION IF NOT EXISTS "' || extname || '" WITH SCHEMA ' ||
  COALESCE(n.nspname, 'public') || ';' as stmt
FROM pg_extension e
LEFT JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname NOT IN ('plpgsql')  -- Skip built-in extensions
ORDER BY extname;
`
  const extensionsResult = spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', extensionsQuery],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (extensionsResult.status === 0 && extensionsResult.stdout) {
    writeFileSync(extensionsFile, extensionsResult.stdout)
    console.log('  Extensions exported: extensions.sql')
  } else {
    console.log('  WARNING: Could not export extensions')
  }

  // 6. Export Auth users (optional, security sensitive)
  console.log('Exporting Auth users metadata...')
  const authFile = join(backupPath, 'auth_users.sql')
  const authQuery = `
-- Export Auth users (metadata only, no passwords)
-- WARNING: This is security-sensitive data!
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
ORDER BY created_at;
`
  const authResult = spawnSync(
    psqlPath,
    [connectionString, '--tuples-only', '--no-align', '--command', authQuery],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (authResult.status === 0 && authResult.stdout) {
    writeFileSync(
      authFile,
      '-- WARNING: Security-sensitive data! Do not commit to git.\n' + authResult.stdout
    )
    console.log('  Auth users exported: auth_users.sql (SECURITY SENSITIVE!)')
  } else {
    console.log('  WARNING: Could not export auth users')
  }

  // 7. Save backup metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    projectRef: CONFIG.projectRef,
    host: CONFIG.host,
    database: CONFIG.database,
    type: 'full',
    files: [
      'backup.sql',
      'schema.sql',
      'grants.sql',
      'realtime.sql',
      'extensions.sql',
      'auth_users.sql'
    ]
  }
  writeFileSync(join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

  // Summary
  console.log('\n========================================')
  console.log('  Backup Complete!')
  console.log('========================================')
  console.log(`\nLocation: backups/${backupName}/`)
  console.log('Files:')
  console.log('  - backup.sql      (full backup with data)')
  console.log('  - schema.sql      (schema only)')
  console.log('  - grants.sql      (GRANT permissions for Supabase roles)')
  console.log('  - realtime.sql    (real-time publication tables)')
  console.log('  - extensions.sql  (enabled PostgreSQL extensions)')
  console.log('  - auth_users.sql  (Auth users metadata - SECURITY SENSITIVE!)')
  console.log('  - metadata.json   (backup info)')
  console.log('')

  // Show file sizes
  try {
    const stats = execSync(`ls -lh "${backupPath}"`, { encoding: 'utf-8' })
    console.log('File sizes:')
    console.log(stats)
  } catch {
    // ignore
  }
}

// Run
createBackup()
