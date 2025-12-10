#!/usr/bin/env node
/**
 * Database Restore Script for Supabase DEV
 *
 * Restores a backup from prod to dev database.
 *
 * Usage:
 *   pnpm restore:dev                           # Uses latest backup
 *   pnpm restore:dev prod_2025-12-09T15-53-46  # Uses specific backup
 *
 * Requirements:
 *   - Create .env.restore.dev with DB_PASSWORD for dev database
 *   - psql must be installed (comes with PostgreSQL)
 *
 * WARNING: This will DROP and recreate the public schema in dev!
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

// DEV Database Configuration
const CONFIG = {
  projectRef: 'fjkfckjpnbcyuknsnchy',
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.fjkfckjpnbcyuknsnchy',
  backupDir: join(ROOT_DIR, 'backups')
}

// Load password from .env.restore.dev
function getPassword() {
  // 1. Check environment variable
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD
  }

  // 2. Check .env.restore.dev file
  const envRestorePath = join(ROOT_DIR, '.env.restore.dev')
  if (existsSync(envRestorePath)) {
    const content = readFileSync(envRestorePath, 'utf-8')
    const match = content.match(/DB_PASSWORD=(.+)/)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

// psql paths to check (Homebrew on macOS, then system PATH)
const PSQL_PATHS = [
  '/opt/homebrew/opt/libpq/bin/psql', // Homebrew ARM Mac
  '/usr/local/opt/libpq/bin/psql', // Homebrew Intel Mac
  'psql' // System PATH
]

function findPsql() {
  for (const psqlPath of PSQL_PATHS) {
    try {
      execSync(`${psqlPath} --version`, { stdio: 'pipe' })
      return psqlPath
    } catch {
      continue
    }
  }
  return null
}

// Find latest backup folder
function findLatestBackup() {
  if (!existsSync(CONFIG.backupDir)) {
    return null
  }

  const folders = readdirSync(CONFIG.backupDir)
    .filter(f => f.startsWith('prod_'))
    .filter(f => statSync(join(CONFIG.backupDir, f)).isDirectory())
    .sort()
    .reverse()

  return folders.length > 0 ? folders[0] : null
}

// List available backups
function listBackups() {
  if (!existsSync(CONFIG.backupDir)) {
    return []
  }

  return readdirSync(CONFIG.backupDir)
    .filter(f => f.startsWith('prod_'))
    .filter(f => statSync(join(CONFIG.backupDir, f)).isDirectory())
    .sort()
    .reverse()
}

function restoreDatabase() {
  console.log('\n========================================')
  console.log('  Supabase DEV Database Restore')
  console.log('========================================\n')

  // Find psql
  const psqlPath = findPsql()
  if (!psqlPath) {
    console.error('ERROR: psql not found!')
    console.log('\nInstall PostgreSQL to get psql:')
    console.log('  macOS: brew install libpq')
    console.log('  Ubuntu: sudo apt install postgresql-client')
    process.exit(1)
  }
  console.log(`Using: ${psqlPath}`)

  // Get password
  const password = getPassword()
  if (!password) {
    console.error('ERROR: Database password not found!')
    console.log('\nCreate .env.restore.dev file with:')
    console.log('  DB_PASSWORD=your_dev_database_password')
    console.log('\nOr set environment variable:')
    console.log('  DB_PASSWORD=xxx pnpm restore:dev')
    process.exit(1)
  }

  // Get backup folder from args or use latest
  let backupName = process.argv[2]

  if (!backupName) {
    backupName = findLatestBackup()
    if (!backupName) {
      console.error('ERROR: No backups found!')
      console.log('\nRun backup first: pnpm backup:prod')
      process.exit(1)
    }
    console.log(`Using latest backup: ${backupName}`)
  } else {
    console.log(`Using specified backup: ${backupName}`)
  }

  const backupPath = join(CONFIG.backupDir, backupName)
  const backupFile = join(backupPath, 'backup.sql')

  if (!existsSync(backupFile)) {
    console.error(`ERROR: Backup file not found: ${backupFile}`)
    console.log('\nAvailable backups:')
    listBackups().forEach(b => console.log(`  - ${b}`))
    process.exit(1)
  }

  // Show backup info
  const metadataFile = join(backupPath, 'metadata.json')
  if (existsSync(metadataFile)) {
    const metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'))
    console.log(`\nBackup info:`)
    console.log(`  Source: ${metadata.projectRef} (${metadata.host})`)
    console.log(`  Created: ${metadata.timestamp}`)
  }

  console.log(`\nTarget: DEV database (${CONFIG.projectRef})`)
  console.log('')

  // Build connection string
  const connectionString = `postgresql://${CONFIG.user}:${password}@${CONFIG.host}:${CONFIG.port}/${CONFIG.database}`

  // Step 1: Clean backup file (remove \restrict line if present)
  console.log('Step 1: Preparing backup file...')
  let backupContent = readFileSync(backupFile, 'utf-8')

  // Remove \restrict line that can cause issues
  if (backupContent.includes('\\restrict')) {
    backupContent = backupContent.replace(/^\\restrict.*$/gm, '-- restrict removed for restore')
    console.log('  Removed \\restrict directive')
  }

  // Write cleaned backup to temp file
  const tempBackupFile = join(backupPath, 'backup_clean.sql')
  writeFileSync(tempBackupFile, backupContent)
  console.log('  Prepared clean backup file')

  // Step 2: Drop and recreate public schema
  console.log('\nStep 2: Cleaning DEV database (DROP public schema)...')

  const cleanupSQL = `
-- Drop public schema (this removes all tables, functions, etc.)
DROP SCHEMA IF EXISTS public CASCADE;

-- Recreate public schema
CREATE SCHEMA public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
`

  const cleanupResult = spawnSync(psqlPath, [connectionString, '-c', cleanupSQL], {
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf-8'
  })

  if (cleanupResult.status !== 0) {
    console.error('ERROR: Failed to clean database!')
    console.error(cleanupResult.stderr)
    process.exit(1)
  }
  console.log('  Public schema dropped and recreated')

  // Step 3: Restore backup
  console.log('\nStep 3: Restoring backup...')

  const restoreResult = spawnSync(psqlPath, [connectionString, '-f', tempBackupFile], {
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large backups
  })

  // psql may return warnings that are OK, check for actual errors
  if (restoreResult.status !== 0) {
    console.error('WARNING: Restore completed with errors')
    if (restoreResult.stderr) {
      // Filter out common non-critical warnings
      const errors = restoreResult.stderr
        .split('\n')
        .filter(line => !line.includes('already exists'))
        .filter(line => !line.includes('NOTICE:'))
        .filter(line => line.trim())

      if (errors.length > 0) {
        console.error('\nErrors:')
        errors.slice(0, 10).forEach(e => console.error(`  ${e}`))
        if (errors.length > 10) {
          console.error(`  ... and ${errors.length - 10} more`)
        }
      }
    }
  } else {
    console.log('  Backup restored successfully!')
  }

  // Step 4: Reload PostgREST schema cache
  console.log('\nStep 4: Reloading PostgREST schema cache...')

  const reloadResult = spawnSync(
    psqlPath,
    [connectionString, '-c', "NOTIFY pgrst, 'reload schema';"],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (reloadResult.status === 0) {
    console.log('  Schema cache reloaded')
  }

  // Step 5: Verify restore
  console.log('\nStep 5: Verifying restore...')

  const verifyResult = spawnSync(
    psqlPath,
    [
      connectionString,
      '-c',
      `
      SELECT
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as functions
    `
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }
  )

  if (verifyResult.status === 0) {
    console.log('  Database stats:')
    console.log(verifyResult.stdout)
  }

  // Cleanup temp file
  try {
    unlinkSync(tempBackupFile)
  } catch {
    // ignore
  }

  // Summary
  console.log('========================================')
  console.log('  Restore Complete!')
  console.log('========================================')
  console.log(`\nRestored: ${backupName} -> DEV (${CONFIG.projectRef})`)
  console.log('')
}

// Run
restoreDatabase()
