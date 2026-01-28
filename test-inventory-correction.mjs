// Test script for inventory correction with negative stock
// Run with: node test-inventory-correction.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fjkfckjpnbcyuknsnchy.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqa2Zja2pwbmJjeXVrbnNuY2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NTUzNzMsImV4cCI6MjA1MTIzMTM3M30.VR_wYxM52rS8gR_SFepqfLo5_0KeY-B6pM7-2eQ2Q0E'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🧪 Testing Inventory Correction with Negative Stock\n')

// Test Case 1: Check current negative batches
async function testCase1_CheckNegativeBatches() {
  console.log('📊 Test Case 1: Check current negative batches')

  const { data, error } = await supabase
    .from('preparation_batches')
    .select(
      `
      id,
      batch_number,
      preparation_id,
      preparations (name, output_unit),
      current_quantity,
      is_negative,
      status,
      reconciled_at
    `
    )
    .eq('is_negative', true)
    .is('reconciled_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log(`✅ Found ${data.length} unreconciled negative batches:\n`)
  data.forEach((batch, idx) => {
    console.log(`${idx + 1}. ${batch.preparations.name}:`)
    console.log(`   Batch: ${batch.batch_number}`)
    console.log(`   Balance: ${batch.current_quantity} ${batch.preparations.output_unit}`)
    console.log(`   Status: ${batch.status}`)
    console.log()
  })

  return data
}

// Test Case 2: Calculate system balance for a preparation
async function testCase2_CalculateBalance(preparationId) {
  console.log('📊 Test Case 2: Calculate system balance')

  const { data: batches, error } = await supabase
    .from('preparation_batches')
    .select('current_quantity, is_negative, reconciled_at')
    .eq('preparation_id', preparationId)
    .eq('is_active', true)

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  // Calculate balance (exclude reconciled negative batches)
  const balance = batches
    .filter(b => !b.reconciled_at) // Exclude reconciled
    .reduce((sum, b) => sum + parseFloat(b.current_quantity), 0)

  const activeBatches = batches.filter(b => !b.reconciled_at && !b.is_negative)
  const negativeBatches = batches.filter(b => !b.reconciled_at && b.is_negative)

  console.log(`✅ System Balance: ${balance.toFixed(2)} gr`)
  console.log(`   Active batches: ${activeBatches.length}`)
  console.log(`   Negative batches: ${negativeBatches.length}`)
  console.log()

  return { balance, activeBatches, negativeBatches }
}

// Test Case 3: Create inventory document
async function testCase3_CreateInventory(preparationId, prepName, systemQty, actualQty) {
  console.log('📊 Test Case 3: Create inventory document')
  console.log(`   Preparation: ${prepName}`)
  console.log(`   System Qty: ${systemQty} gr`)
  console.log(`   Actual Qty: ${actualQty} gr`)
  console.log(`   Difference: ${(actualQty - systemQty).toFixed(2)} gr`)
  console.log()

  const inventoryDoc = {
    document_number: `INV-TEST-${Date.now()}`,
    inventory_date: new Date().toISOString(),
    department: 'kitchen',
    responsible_person: 'Test User',
    counted_by: 'Test User',
    status: 'draft',
    total_items: 1,
    total_discrepancies: systemQty !== actualQty ? 1 : 0,
    total_value_difference: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: inv, error: invError } = await supabase
    .from('preparation_inventory_documents')
    .insert(inventoryDoc)
    .select()
    .single()

  if (invError) {
    console.error('❌ Error creating inventory:', invError.message)
    return null
  }

  console.log(`✅ Inventory document created: ${inv.document_number}`)

  // Create inventory item
  const inventoryItem = {
    inventory_id: inv.id,
    preparation_id: preparationId,
    preparation_name: prepName,
    system_quantity: systemQty,
    actual_quantity: actualQty,
    difference: actualQty - systemQty,
    unit: 'gr',
    average_cost: 46.67,
    value_difference: (actualQty - systemQty) * 46.67,
    confirmed: true,
    counted_by: 'Test User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: item, error: itemError } = await supabase
    .from('preparation_inventory_items')
    .insert(inventoryItem)
    .select()
    .single()

  if (itemError) {
    console.error('❌ Error creating inventory item:', itemError.message)
    return null
  }

  console.log(`✅ Inventory item created`)
  console.log()

  return { inventory: inv, item }
}

// Test Case 4: Check operations created
async function testCase4_CheckOperations(inventoryId) {
  console.log('📊 Test Case 4: Check operations created')

  const { data, error } = await supabase
    .from('preparation_operations')
    .select(
      `
      id,
      operation_type,
      document_number,
      total_value,
      items,
      correction_details,
      related_storage_operation_ids,
      notes
    `
    )
    .eq('related_inventory_id', inventoryId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log(`✅ Found ${data.length} operations:\n`)
  data.forEach((op, idx) => {
    console.log(`${idx + 1}. ${op.operation_type.toUpperCase()} - ${op.document_number}`)
    console.log(`   Total Value: Rp ${op.total_value?.toLocaleString() || 0}`)
    console.log(`   Items: ${op.items?.length || 0}`)
    if (op.correction_details) {
      console.log(`   Correction Reason: ${op.correction_details.reason}`)
    }
    if (op.related_storage_operation_ids?.length > 0) {
      console.log(`   Linked Storage Operations: ${op.related_storage_operation_ids.length}`)
    }
    console.log(`   Notes: ${op.notes || 'N/A'}`)
    console.log()
  })

  return data
}

// Test Case 5: Check batches after correction
async function testCase5_CheckBatchesAfter(preparationId) {
  console.log('📊 Test Case 5: Check batches after correction')

  const { data: batches, error } = await supabase
    .from('preparation_batches')
    .select('batch_number, current_quantity, source_type, is_negative, reconciled_at, status')
    .eq('preparation_id', preparationId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log(`✅ Recent batches:\n`)
  batches.forEach((batch, idx) => {
    const reconciledFlag = batch.reconciled_at ? '🔒' : batch.is_negative ? '⚠️' : '✅'
    console.log(`${idx + 1}. ${reconciledFlag} ${batch.batch_number}`)
    console.log(`   Quantity: ${batch.current_quantity} gr`)
    console.log(`   Source: ${batch.source_type}`)
    console.log(`   Status: ${batch.status}`)
    if (batch.is_negative) {
      console.log(`   Negative: ${batch.is_negative ? 'Yes' : 'No'}`)
      console.log(
        `   Reconciled: ${batch.reconciled_at ? new Date(batch.reconciled_at).toLocaleString() : 'No'}`
      )
    }
    console.log()
  })

  return batches
}

// Test Case 6: Check storage write-offs
async function testCase6_CheckStorageWriteOffs(storageOpIds) {
  if (!storageOpIds || storageOpIds.length === 0) {
    console.log('⚠️ Test Case 6: No storage write-offs to check')
    return null
  }

  console.log('📊 Test Case 6: Check storage write-offs (raw material deductions)')

  const { data, error } = await supabase
    .from('storage_operations')
    .select(
      `
      id,
      operation_type,
      document_number,
      total_value,
      items,
      write_off_details
    `
    )
    .in('id', storageOpIds)

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log(`✅ Found ${data.length} storage write-offs:\n`)
  data.forEach((op, idx) => {
    console.log(`${idx + 1}. ${op.operation_type.toUpperCase()} - ${op.document_number}`)
    console.log(`   Total Value: Rp ${op.total_value?.toLocaleString() || 0}`)
    console.log(`   Items Written Off: ${op.items?.length || 0}`)
    if (op.write_off_details) {
      console.log(`   Reason: ${op.write_off_details.reason}`)
    }
    if (op.items) {
      op.items.forEach(item => {
        console.log(`      - ${item.itemName}: ${item.quantity} ${item.unit}`)
      })
    }
    console.log()
  })

  return data
}

// Main test runner
async function runTests() {
  try {
    // Step 1: Check current negative batches
    const negativeBatches = await testCase1_CheckNegativeBatches()
    if (!negativeBatches || negativeBatches.length === 0) {
      console.log('⚠️ No negative batches found for testing')
      return
    }

    // Use Avocado cleaned (-270 gr)
    const testPrep = negativeBatches.find(b => b.preparations.name === 'Avocado cleaned')
    if (!testPrep) {
      console.log('⚠️ Avocado cleaned not found in negative batches')
      return
    }

    const prepId = testPrep.preparation_id
    const prepName = testPrep.preparations.name

    console.log(`\n🎯 Testing with: ${prepName}\n`)
    console.log('='.repeat(60))
    console.log()

    // Step 2: Calculate current balance
    const balanceInfo = await testCase2_CalculateBalance(prepId)
    const systemQty = balanceInfo.balance

    // Step 3: Create inventory with actualQty = 0 (zero out negative)
    const actualQty = 0
    const inventoryData = await testCase3_CreateInventory(prepId, prepName, systemQty, actualQty)

    if (!inventoryData) {
      console.log('❌ Failed to create inventory')
      return
    }

    console.log('⏳ Waiting for finalization (this would happen via UI)...')
    console.log('⚠️  NOTE: Finalization must be triggered via UI or direct service call')
    console.log()
    console.log('📋 To finalize this inventory, you can:')
    console.log(`   1. Open UI and navigate to Kitchen Inventory`)
    console.log(`   2. Find inventory: ${inventoryData.inventory.document_number}`)
    console.log(`   3. Click "Finalize"`)
    console.log()
    console.log('OR use this SQL to check status:')
    console.log(
      `   SELECT * FROM preparation_inventory_documents WHERE id = '${inventoryData.inventory.id}';`
    )
    console.log()

    // Step 4 & 5 would be run after finalization
    console.log('💡 After finalization, run these checks:')
    console.log(`   - Check operations: testCase4_CheckOperations('${inventoryData.inventory.id}')`)
    console.log(`   - Check batches: testCase5_CheckBatchesAfter('${prepId}')`)
    console.log()
  } catch (error) {
    console.error('💥 Test failed:', error.message)
    console.error(error)
  }
}

// Run tests
runTests()
