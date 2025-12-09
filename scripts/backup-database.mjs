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

  // 3. Save backup metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    projectRef: CONFIG.projectRef,
    host: CONFIG.host,
    database: CONFIG.database,
    type: 'full',
    files: ['backup.sql', 'schema.sql']
  }
  writeFileSync(join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

  // Summary
  console.log('\n========================================')
  console.log('  Backup Complete!')
  console.log('========================================')
  console.log(`\nLocation: backups/${backupName}/`)
  console.log('Files:')
  console.log('  - backup.sql    (full backup with data)')
  console.log('  - schema.sql    (schema only)')
  console.log('  - metadata.json (backup info)')
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
