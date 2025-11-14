<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Supabase Connection Test</v-card-title>
          <v-card-text>
            <!-- Connection Status -->
            <v-alert :type="connectionStatus.type" class="mb-4">
              {{ connectionStatus.message }}
            </v-alert>

            <!-- Test Actions -->
            <v-row>
              <v-col cols="12" md="4">
                <v-btn block color="primary" :loading="testing" @click="testConnection">
                  Test Connection
                </v-btn>
              </v-col>
              <v-col cols="12" md="4">
                <v-btn block color="secondary" :loading="checking" @click="checkTables">
                  Check Tables
                </v-btn>
              </v-col>
              <v-col cols="12" md="4">
                <v-btn block color="success" :loading="writing" @click="testWrite">
                  Test Write
                </v-btn>
              </v-col>
            </v-row>

            <!-- Results -->
            <v-divider class="my-4" />

            <div v-if="results">
              <h3>Test Results:</h3>

              <!-- Show migration instructions if tables don't exist -->
              <v-alert v-if="results.tablesExist === false" type="warning" class="mt-4">
                <h4>⚠️ Tables Not Created Yet</h4>
                <p class="mt-2">
                  The Supabase connection is working, but the database tables haven't been created
                  yet.
                </p>

                <h5 class="mt-4">Next Steps:</h5>
                <ol class="ml-4">
                  <li>
                    Open Supabase Dashboard:
                    <a :href="results.dashboardUrl" target="_blank" class="text-primary">
                      SQL Editor
                    </a>
                  </li>
                  <li>
                    Copy all SQL from:
                    <code>{{ results.migrationFile }}</code>
                  </li>
                  <li>Paste into SQL Editor</li>
                  <li>
                    Click
                    <strong>Run</strong>
                    (or press Ctrl/Cmd + Enter)
                  </li>
                  <li>Come back here and click "Test Connection" again</li>
                </ol>
              </v-alert>

              <!-- Show table status if checked -->
              <v-alert
                v-if="results.tables"
                :type="results.allTablesExist ? 'success' : 'warning'"
                class="mt-4"
              >
                <h4>📊 Table Status:</h4>
                <ul class="ml-4 mt-2">
                  <li v-for="(exists, table) in results.tables" :key="table">
                    {{ exists ? '✅' : '❌' }} {{ table }}
                  </li>
                </ul>
                <p class="mt-3">
                  <strong>{{ results.recommendation }}</strong>
                </p>
              </v-alert>

              <!-- Raw JSON results -->
              <v-expansion-panels class="mt-4">
                <v-expansion-panel>
                  <v-expansion-panel-title>Show Raw Results</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <pre class="mt-2 pa-2" style="background: #f5f5f5; border-radius: 4px">{{
                      JSON.stringify(results, null, 2)
                    }}</pre>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>

            <div v-if="error" class="mt-4">
              <v-alert type="error">
                <strong>Error:</strong>
                <pre>{{ error }}</pre>
              </v-alert>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase, isSupabaseConfigured, getSupabaseErrorMessage } from '@/supabase'
import { ENV } from '@/config/environment'

const testing = ref(false)
const checking = ref(false)
const writing = ref(false)
const results = ref<any>(null)
const error = ref<string | null>(null)

const connectionStatus = ref({
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  message: 'Not tested yet'
})

async function testConnection() {
  testing.value = true
  error.value = null
  results.value = null

  try {
    // Test 1: Check configuration
    const isConfigured = isSupabaseConfigured()
    if (!isConfigured) {
      throw new Error('Supabase is not configured. Check environment variables.')
    }

    // Test 2: Try a simple query
    const { data, error: queryError } = await supabase
      .from('shifts')
      .select('count', { count: 'exact', head: true })

    // Check for 404 error (table doesn't exist)
    if (queryError) {
      // HTTP 404 means table doesn't exist - migration not run
      if (queryError.code === 'PGRST116' || queryError.message?.includes('does not exist')) {
        connectionStatus.value = {
          type: 'warning',
          message: '⚠️ Connection OK, but tables not created yet'
        }
        results.value = {
          configured: isConfigured,
          url: ENV.supabase.url,
          hasAnonKey: !!ENV.supabase.anonKey,
          tablesExist: false,
          nextStep: 'Run SQL migration in Supabase Dashboard',
          migrationFile: 'src/supabase/migrations/001_initial_schema.sql',
          dashboardUrl: 'https://supabase.com/dashboard/project/fjkfckjpnbcyuknsnchy/sql/new'
        }
        return
      }

      // Other error
      throw queryError
    }

    connectionStatus.value = {
      type: 'success',
      message: '✅ Supabase connection successful! Tables exist.'
    }

    results.value = {
      configured: isConfigured,
      url: ENV.supabase.url,
      hasAnonKey: !!ENV.supabase.anonKey,
      query: 'SELECT count FROM shifts',
      tablesExist: true,
      success: true
    }
  } catch (err: any) {
    connectionStatus.value = {
      type: 'error',
      message: '❌ Connection failed'
    }
    error.value = getSupabaseErrorMessage(err)
    results.value = {
      configured: isSupabaseConfigured(),
      url: ENV.supabase.url,
      error: err.message,
      code: err.code
    }
  } finally {
    testing.value = false
  }
}

async function checkTables() {
  checking.value = true
  error.value = null
  results.value = null

  try {
    // Check each table individually
    const tablesToCheck = ['shifts', 'orders', 'payments', 'products', 'tables']
    const tableStatus: Record<string, boolean> = {}

    for (const table of tablesToCheck) {
      const { error: queryError } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })

      // Table exists if no error or error is not "table doesn't exist"
      tableStatus[table] =
        !queryError ||
        (!queryError.message?.includes('does not exist') && queryError.code !== 'PGRST116')
    }

    const allTablesExist = Object.values(tableStatus).every(exists => exists)

    connectionStatus.value = {
      type: allTablesExist ? 'success' : 'warning',
      message: allTablesExist ? '✅ All tables exist' : '⚠️ Some tables are missing'
    }

    results.value = {
      tables: tableStatus,
      allTablesExist,
      recommendation: allTablesExist
        ? 'All tables are ready! You can start using Supabase.'
        : 'Run SQL migration in Supabase Dashboard to create missing tables.',
      dashboardUrl: 'https://supabase.com/dashboard/project/fjkfckjpnbcyuknsnchy/sql/new',
      migrationFile: 'src/supabase/migrations/001_initial_schema.sql'
    }
  } catch (err: any) {
    connectionStatus.value = {
      type: 'error',
      message: '❌ Failed to check tables'
    }
    error.value = getSupabaseErrorMessage(err)
    results.value = {
      error: err.message,
      code: err.code
    }
  } finally {
    checking.value = false
  }
}

async function testWrite() {
  writing.value = true
  error.value = null
  results.value = null

  try {
    // Try to insert a test product
    const testProduct = {
      name: 'Test Product',
      category: 'test',
      price: 10.0,
      unit: 'pcs',
      is_active: true
    }

    const { data, error: insertError } = await supabase
      .from('products')
      .insert(testProduct)
      .select()
      .single()

    if (insertError) {
      // Check if it's RLS policy error
      if (insertError.code === '42501' || insertError.message?.includes('policy')) {
        connectionStatus.value = {
          type: 'error',
          message: '❌ RLS policy blocks INSERT - need Service Key'
        }
        results.value = {
          canRead: true,
          canWrite: false,
          rlsEnabled: true,
          recommendation:
            'Add VITE_SUPABASE_SERVICE_KEY to .env.development and set VITE_SUPABASE_USE_SERVICE_KEY=true',
          error: insertError.message,
          code: insertError.code
        }
        return
      }

      throw insertError
    }

    // Success - delete test product
    if (data?.id) {
      await supabase.from('products').delete().eq('id', data.id)
    }

    connectionStatus.value = {
      type: 'success',
      message: '✅ Write test successful! (INSERT + DELETE works)'
    }

    results.value = {
      canRead: true,
      canWrite: true,
      testProduct: data,
      recommendation: 'All operations work! You can start integrating data.'
    }
  } catch (err: any) {
    connectionStatus.value = {
      type: 'error',
      message: '❌ Write test failed'
    }
    error.value = getSupabaseErrorMessage(err)
    results.value = {
      error: err.message,
      code: err.code
    }
  } finally {
    writing.value = false
  }
}

onMounted(async () => {
  // Auto-test on mount
  await testConnection()
})
</script>

<style scoped>
pre {
  overflow-x: auto;
  font-size: 12px;
}
</style>
