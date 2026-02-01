<!-- src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue -->
<!-- Enhanced Product Variance Detail Dialog with formula breakdown and drill-down -->

<template>
  <v-dialog v-model="dialogVisible" max-width="1100" scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <span>Product Variance Detail</span>
          <div v-if="detail" class="text-body-2 text-medium-emphasis">
            {{ detail.product.name }}
            <span v-if="detail.product.code">({{ detail.product.code }})</span>
            <v-chip
              :color="detail.product.department === 'kitchen' ? 'orange' : 'purple'"
              size="x-small"
              variant="tonal"
              class="ml-2"
            >
              {{ detail.product.department === 'kitchen' ? 'Kitchen' : 'Bar' }}
            </v-chip>
          </div>
        </div>
        <v-btn icon variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Loading State -->
      <v-card-text v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="mt-4 text-medium-emphasis">Loading details...</p>
      </v-card-text>

      <!-- Error State -->
      <v-card-text v-else-if="error" class="py-4">
        <v-alert type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-card-text>

      <!-- Content -->
      <v-card-text v-else-if="detail" class="pa-4">
        <!-- Period Info -->
        <div class="text-caption text-medium-emphasis mb-3">
          Period: {{ formatDate(detail.period.dateFrom) }} - {{ formatDate(detail.period.dateTo) }}
        </div>

        <!-- Formula Bar -->
        <v-card variant="outlined" class="mb-4 formula-bar">
          <v-card-text class="pa-3">
            <div class="formula-row">
              <!-- Opening -->
              <div
                class="formula-item"
                :class="{ clickable: detail.opening.quantity > 0 }"
                @click="scrollToSection('opening')"
              >
                <div class="formula-label">Opening</div>
                <div class="formula-value">
                  {{ formatQty(detail.opening.quantity) }} {{ detail.product.unit }}
                </div>
                <div class="formula-amount text-medium-emphasis">
                  {{ formatIDR(detail.opening.amount) }}
                </div>
              </div>

              <div class="formula-operator text-success">+</div>

              <!-- Received -->
              <div class="formula-item clickable text-success" @click="scrollToSection('received')">
                <div class="formula-label">Received</div>
                <div class="formula-value">
                  +{{ formatQty(detail.received.quantity) }} {{ detail.product.unit }}
                </div>
                <div class="formula-amount">{{ formatIDR(detail.received.amount) }}</div>
              </div>

              <div class="formula-operator text-info">-</div>

              <!-- Sales -->
              <div class="formula-item clickable" @click="scrollToSection('sales')">
                <div class="formula-label">Sales</div>
                <div class="formula-value text-info">
                  -{{ formatQty(detail.sales.quantity) }} {{ detail.product.unit }}
                </div>
                <div class="formula-amount text-medium-emphasis">
                  {{ formatIDR(detail.sales.amount) }}
                </div>
              </div>

              <div class="formula-operator text-error">-</div>

              <!-- Loss -->
              <div class="formula-item clickable" @click="scrollToSection('loss')">
                <div class="formula-label">Loss</div>
                <div class="formula-value text-error">
                  -{{ formatQty(Math.abs(detail.loss.quantity)) }} {{ detail.product.unit }}
                </div>
                <div class="formula-amount text-medium-emphasis">
                  {{ formatIDR(detail.loss.amount) }}
                </div>
              </div>

              <div class="formula-operator text-medium-emphasis">vs</div>

              <!-- Closing (Actual) -->
              <div class="formula-item clickable" @click="scrollToSection('closing')">
                <div class="formula-label">Actual</div>
                <div class="formula-value">
                  {{ formatQty(detail.closing.total.quantity) }} {{ detail.product.unit }}
                </div>
                <div class="formula-amount text-medium-emphasis">
                  {{ formatIDR(detail.closing.total.amount) }}
                </div>
              </div>

              <div class="formula-operator">=</div>

              <!-- Variance -->
              <div class="formula-item variance-result" :class="varianceClass">
                <div class="formula-label">Variance</div>
                <div class="formula-value font-weight-bold">
                  {{ detail.variance.quantity > 0 ? '+' : ''
                  }}{{ formatQty(detail.variance.quantity) }} {{ detail.product.unit }}
                </div>
                <div class="formula-amount font-weight-medium">
                  {{ detail.variance.amount > 0 ? '+' : '' }}{{ formatIDR(detail.variance.amount) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Expandable Sections -->
        <v-expansion-panels v-model="expandedPanels" multiple>
          <!-- Opening Stock Section -->
          <v-expansion-panel id="opening" value="opening">
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="grey">mdi-package-variant</v-icon>
                  <span class="font-weight-medium">Opening Stock</span>
                </div>
                <div class="text-right">
                  <span class="text-body-2">
                    {{ formatQty(detail.opening.quantity) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatIDR(detail.opening.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div v-if="detail.opening.snapshot" class="pa-2">
                <v-chip size="small" variant="tonal" color="info" class="mr-2">
                  {{ formatSourceLabel(detail.opening.snapshot.source) }}
                </v-chip>
                <span class="text-body-2">
                  {{ formatDate(detail.opening.snapshot.date) }}
                </span>
                <span
                  v-if="detail.opening.snapshot.documentNumber"
                  class="text-caption text-medium-emphasis ml-2"
                >
                  Doc #{{ detail.opening.snapshot.documentNumber }}
                </span>
              </div>
              <v-alert v-else type="info" variant="tonal" density="compact" class="mt-2">
                No inventory snapshot found for the opening date
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Received Section -->
          <v-expansion-panel id="received" value="received">
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="success">mdi-truck-delivery</v-icon>
                  <span class="font-weight-medium">Received</span>
                  <span
                    v-if="detail.received.totalReceiptsCount > 0"
                    class="text-caption text-medium-emphasis ml-2"
                  >
                    ({{ detail.received.totalReceiptsCount }} receipts)
                  </span>
                </div>
                <div class="text-right">
                  <span class="text-body-2 text-success">
                    +{{ formatQty(detail.received.quantity) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatIDR(detail.received.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-table
                v-if="detail.received.receipts.length > 0"
                density="compact"
                class="elevation-0"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Receipt #</th>
                    <th>Supplier</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Unit Cost</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="receipt in detail.received.receipts" :key="receipt.receiptId">
                    <td>{{ formatDate(receipt.date) }}</td>
                    <td>{{ receipt.receiptNumber }}</td>
                    <td>{{ receipt.supplierName }}</td>
                    <td class="text-right">{{ formatQty(receipt.quantity) }}</td>
                    <td class="text-right">{{ formatIDR(receipt.unitCost) }}</td>
                    <td class="text-right">{{ formatIDR(receipt.totalCost) }}</td>
                  </tr>
                </tbody>
              </v-table>
              <div v-if="detail.received.totalReceiptsCount > 5" class="text-center mt-2">
                <v-btn variant="text" size="small" color="primary">
                  Show {{ detail.received.totalReceiptsCount - 5 }} more receipts
                </v-btn>
              </div>
              <v-alert
                v-if="detail.received.receipts.length === 0"
                type="info"
                variant="tonal"
                density="compact"
              >
                No receipts in this period
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Sales Section -->
          <v-expansion-panel id="sales" value="sales">
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="info">mdi-cart</v-icon>
                  <span class="font-weight-medium">Sales (Theoretical)</span>
                  <span
                    v-if="detail.sales.totalMenuItemsCount > 0"
                    class="text-caption text-medium-emphasis ml-2"
                  >
                    ({{ detail.sales.totalMenuItemsCount }} menu items)
                  </span>
                </div>
                <div class="text-right">
                  <span class="text-body-2 text-info">
                    -{{ formatQty(detail.sales.quantity) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatIDR(detail.sales.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Sales breakdown chips -->
              <div class="d-flex flex-wrap gap-2 mb-3">
                <v-chip size="small" variant="tonal" color="primary">
                  Direct: {{ formatQty(detail.sales.direct?.quantity || 0) }}
                  {{ detail.product.unit }}
                </v-chip>
                <v-chip
                  v-if="detail.sales.viaRecipes?.quantity > 0"
                  size="small"
                  variant="tonal"
                  color="info"
                >
                  Via Recipes: {{ formatQty(detail.sales.viaRecipes.quantity) }}
                  {{ detail.product.unit }}
                </v-chip>
                <v-chip size="small" variant="tonal" color="secondary">
                  Via Preps: {{ formatQty(detail.sales.viaPreparations?.quantity || 0) }}
                  {{ detail.product.unit }}
                </v-chip>
              </div>

              <!-- Menu Items Table -->
              <div v-if="detail.sales.topMenuItems.length > 0" class="mb-3">
                <div class="text-subtitle-2 mb-2">Menu Items Breakdown</div>
                <v-table density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Menu Item</th>
                      <th>Variant</th>
                      <th class="text-right">Sold</th>
                      <th class="text-right">Product Used</th>
                      <th class="text-right">Cost</th>
                      <th v-if="hasViaPreparationItems">Via</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in detail.sales.topMenuItems"
                      :key="item.menuItemId + item.variantName"
                    >
                      <td>{{ item.menuItemName }}</td>
                      <td>{{ item.variantName }}</td>
                      <td class="text-right">{{ formatQty(item.quantitySold) }}</td>
                      <td class="text-right">
                        {{ formatQty(item.productUsed) }} {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(item.productCost) }}</td>
                      <td v-if="hasViaPreparationItems" class="text-caption text-medium-emphasis">
                        {{ item.viaPreparation || '-' }}
                      </td>
                    </tr>
                  </tbody>
                  <!-- Total row -->
                  <tfoot>
                    <tr class="font-weight-medium">
                      <td colspan="2">Total</td>
                      <td class="text-right">{{ formatQty(totalMenuItemsSold) }}</td>
                      <td class="text-right">
                        {{ formatQty(detail.sales.quantity) }} {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(detail.sales.amount) }}</td>
                      <td v-if="hasViaPreparationItems"></td>
                    </tr>
                  </tfoot>
                </v-table>
                <div v-if="detail.sales.totalMenuItemsCount > 5" class="text-center mt-2">
                  <v-btn variant="text" size="small" color="primary">
                    Show {{ detail.sales.totalMenuItemsCount - 5 }} more items
                  </v-btn>
                </div>
              </div>

              <!-- Preparations Table -->
              <div v-if="detail.sales.preparations.length > 0">
                <div class="text-subtitle-2 mb-2">Preparations Produced</div>
                <v-table density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Preparation</th>
                      <th class="text-right">Batches</th>
                      <th class="text-right">Product Used</th>
                      <th class="text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="prep in detail.sales.preparations" :key="prep.preparationId">
                      <td>{{ prep.preparationName }}</td>
                      <td class="text-right">{{ formatQty(prep.batchesProduced) }}</td>
                      <td class="text-right">
                        {{ formatQty(prep.productUsed) }} {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(prep.productCost) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-alert
                v-if="
                  detail.sales.topMenuItems.length === 0 && detail.sales.preparations.length === 0
                "
                type="info"
                variant="tonal"
                density="compact"
              >
                No sales in this period
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Loss Section -->
          <v-expansion-panel id="loss" value="loss">
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
                  <span class="font-weight-medium">Loss</span>
                </div>
                <div class="text-right">
                  <span class="text-body-2 text-error">
                    -{{ formatQty(Math.abs(detail.loss.quantity)) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatIDR(detail.loss.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Write-offs Section (expired, spoiled, other) -->
              <div v-if="writeOffsByReason.length > 0 || writeOffsDetails.length > 0" class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" color="error" class="mr-2">mdi-delete-outline</v-icon>
                  <span class="text-subtitle-2">Write-offs</span>
                  <v-chip size="x-small" variant="tonal" color="error" class="ml-2">
                    {{ formatQty(writeOffsTotals.quantity) }} {{ detail.product.unit }}
                  </v-chip>
                </div>

                <!-- Write-offs by Reason -->
                <v-chip-group v-if="writeOffsByReason.length > 0" class="mb-2">
                  <v-chip
                    v-for="loss in writeOffsByReason"
                    :key="loss.reason"
                    color="error"
                    variant="tonal"
                    size="small"
                  >
                    {{ formatReason(loss.reason) }}: {{ formatQty(loss.quantity) }}
                    {{ detail.product.unit }}
                  </v-chip>
                </v-chip-group>

                <!-- Write-offs Details Table -->
                <v-table v-if="writeOffsDetails.length > 0" density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Amount</th>
                      <th>Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in writeOffsDetails" :key="idx">
                      <td>{{ formatDate(item.date) }}</td>
                      <td>{{ formatReason(item.reason) }}</td>
                      <td class="text-right text-error">{{ formatQty(item.quantity) }}</td>
                      <td class="text-right">{{ formatIDR(item.amount) }}</td>
                      <td class="text-caption">{{ item.batchNumber || '-' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-divider
                v-if="
                  (writeOffsByReason.length > 0 || writeOffsDetails.length > 0) &&
                  (correctionsByReason.length > 0 || correctionsDetails.length > 0)
                "
                class="mb-4"
              />

              <!-- Inventory Corrections Section -->
              <div
                v-if="correctionsByReason.length > 0 || correctionsDetails.length > 0"
                class="mb-4"
              >
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" color="warning" class="mr-2">mdi-swap-horizontal</v-icon>
                  <span class="text-subtitle-2">Inventory Corrections</span>
                  <v-chip size="x-small" variant="tonal" color="warning" class="ml-2">
                    {{ formatQty(correctionsTotals.quantity) }} {{ detail.product.unit }}
                  </v-chip>
                </div>

                <!-- Corrections by Reason -->
                <v-chip-group v-if="correctionsByReason.length > 0" class="mb-2">
                  <v-chip
                    v-for="corr in correctionsByReason"
                    :key="corr.reason"
                    :color="corr.quantity < 0 ? 'error' : 'success'"
                    variant="tonal"
                    size="small"
                  >
                    {{ corr.quantity < 0 ? 'Shortage' : 'Surplus' }}:
                    {{ formatQty(Math.abs(corr.quantity)) }} {{ detail.product.unit }}
                  </v-chip>
                </v-chip-group>

                <!-- Corrections Details Table -->
                <v-table v-if="correctionsDetails.length > 0" density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in correctionsDetails" :key="idx">
                      <td>{{ formatDate(item.date) }}</td>
                      <td>
                        <v-chip
                          size="x-small"
                          :color="item.quantity < 0 ? 'error' : 'success'"
                          variant="tonal"
                        >
                          {{ item.quantity < 0 ? 'Shortage' : 'Surplus' }}
                        </v-chip>
                      </td>
                      <td
                        class="text-right"
                        :class="item.quantity < 0 ? 'text-error' : 'text-success'"
                      >
                        {{ formatQty(item.quantity) }}
                      </td>
                      <td class="text-right">{{ formatIDR(Math.abs(item.amount)) }}</td>
                      <td class="text-caption">{{ item.notes || '-' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-divider v-if="detail.loss.tracedFromPreps.quantity > 0" class="mb-4" />

              <!-- Traced Losses from Preparations -->
              <div v-if="detail.loss.tracedFromPreps.quantity > 0">
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" color="orange" class="mr-2">mdi-food-variant</v-icon>
                  <span class="text-subtitle-2">Traced from Preparations</span>
                  <v-chip size="x-small" variant="tonal" color="orange" class="ml-2">
                    {{ formatQty(detail.loss.tracedFromPreps.quantity) }} {{ detail.product.unit }}
                  </v-chip>
                </div>
                <v-table
                  v-if="detail.loss.tracedFromPreps.preparations.length > 0"
                  density="compact"
                  class="elevation-0"
                >
                  <thead>
                    <tr>
                      <th>Preparation</th>
                      <th class="text-right">Product Lost</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="prep in detail.loss.tracedFromPreps.preparations"
                      :key="prep.preparationName"
                    >
                      <td>{{ prep.preparationName }}</td>
                      <td class="text-right text-error">
                        {{ formatQty(prep.lossQuantity) }} {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(prep.lossAmount) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-alert
                v-if="detail.loss.quantity === 0"
                type="success"
                variant="tonal"
                density="compact"
              >
                No losses in this period
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Closing Stock Section -->
          <v-expansion-panel id="closing" value="closing">
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="grey">mdi-package-variant-closed</v-icon>
                  <span class="font-weight-medium">Closing Stock</span>
                </div>
                <div class="text-right">
                  <span class="text-body-2">
                    {{ formatQty(detail.closing.total.quantity) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatIDR(detail.closing.total.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Summary Chips -->
              <div class="d-flex gap-2 mb-3">
                <v-chip size="small" variant="tonal" color="primary">
                  Raw Stock: {{ formatQty(detail.closing.rawStock.quantity) }}
                  {{ detail.product.unit }}
                </v-chip>
                <v-chip size="small" variant="tonal" color="info">
                  In Preps: {{ formatQty(detail.closing.inPreparations.quantity) }}
                  {{ detail.product.unit }}
                </v-chip>
              </div>

              <!-- Raw Batches -->
              <div v-if="detail.closing.rawStock.batches.length > 0" class="mb-3">
                <div class="text-subtitle-2 mb-2">Active Batches</div>
                <v-table density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Batch #</th>
                      <th>Receipt Date</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Cost/Unit</th>
                      <th class="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="batch in detail.closing.rawStock.batches" :key="batch.batchId">
                      <td class="text-caption">{{ batch.batchNumber }}</td>
                      <td>{{ formatDate(batch.receiptDate) }}</td>
                      <td class="text-right">{{ formatQty(batch.quantity) }}</td>
                      <td class="text-right">{{ formatIDR(batch.costPerUnit) }}</td>
                      <td class="text-right">{{ formatIDR(batch.totalValue) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <!-- In Preparations -->
              <div v-if="detail.closing.inPreparations.preparations.length > 0">
                <div class="text-subtitle-2 mb-2">Frozen in Preparations</div>
                <v-table density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Preparation</th>
                      <th>Batch Date</th>
                      <th class="text-right">Product Qty</th>
                      <th class="text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="prep in detail.closing.inPreparations.preparations"
                      :key="prep.preparationId + prep.batchDate"
                    >
                      <td>{{ prep.preparationName }}</td>
                      <td>{{ formatDate(prep.batchDate) }}</td>
                      <td class="text-right">
                        {{ formatQty(prep.productQuantity) }} {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(prep.productCost) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-alert
                v-if="detail.closing.total.quantity === 0"
                type="warning"
                variant="tonal"
                density="compact"
              >
                No stock remaining
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Variance Section -->
          <v-expansion-panel value="variance">
            <v-expansion-panel-title :class="varianceClass">
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-scale-balance</v-icon>
                  <span class="font-weight-medium">Variance</span>
                  <v-chip :color="varianceChipColor" size="x-small" variant="tonal" class="ml-2">
                    {{ varianceLabel }}
                  </v-chip>
                </div>
                <div class="text-right">
                  <span class="text-body-2 font-weight-bold">
                    {{ detail.variance.quantity > 0 ? '+' : ''
                    }}{{ formatQty(detail.variance.quantity) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption ml-2">
                    {{ detail.variance.amount > 0 ? '+' : ''
                    }}{{ formatIDR(detail.variance.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-alert
                :type="
                  detail.variance.interpretation === 'balanced'
                    ? 'success'
                    : detail.variance.interpretation === 'shortage'
                      ? 'error'
                      : 'warning'
                "
                variant="tonal"
                class="mb-3"
              >
                <template v-if="detail.variance.interpretation === 'balanced'">
                  Stock is balanced. Opening + Received = Sales + Loss + Closing
                </template>
                <template v-else-if="detail.variance.interpretation === 'shortage'">
                  <strong>Shortage detected:</strong>
                  {{ formatQty(detail.variance.quantity) }} {{ detail.product.unit }} more was
                  consumed than recorded.
                </template>
                <template v-else>
                  <strong>Surplus detected:</strong>
                  {{ formatQty(Math.abs(detail.variance.quantity)) }}
                  {{ detail.product.unit }} extra appeared in stock.
                </template>
              </v-alert>

              <div v-if="detail.variance.possibleReasons.length > 0">
                <div class="text-subtitle-2 mb-2">Possible Reasons</div>
                <v-chip-group>
                  <v-chip
                    v-for="reason in detail.variance.possibleReasons"
                    :key="reason"
                    size="small"
                    variant="outlined"
                  >
                    {{ reason }}
                  </v-chip>
                </v-chip-group>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Actual Write-offs Section (Analysis) -->
          <v-expansion-panel
            v-if="detail.actualWriteOffs"
            id="actualWriteOffs"
            value="actualWriteOffs"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="orange">mdi-file-document-edit</v-icon>
                  <span class="font-weight-medium">Actual Write-offs (Analysis)</span>
                  <v-chip
                    v-if="detail.actualWriteOffs.differenceFromTheoretical"
                    :color="writeOffDifferenceColor"
                    size="x-small"
                    variant="tonal"
                    class="ml-2"
                  >
                    {{ writeOffDifferenceLabel }}
                  </v-chip>
                </div>
                <div class="text-right">
                  <span class="text-body-2">
                    {{ formatQty(detail.actualWriteOffs.total.quantity) }} {{ detail.product.unit }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatIDR(detail.actualWriteOffs.total.amount) }}
                  </span>
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Comparison with Theoretical -->
              <v-alert
                v-if="detail.actualWriteOffs.differenceFromTheoretical"
                :type="writeOffDifferenceAlertType"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <strong>Theoretical vs Actual:</strong>
                    {{ formatQty(detail.sales.quantity) }} vs
                    {{ formatQty(detail.actualWriteOffs.total.quantity) }}
                    {{ detail.product.unit }}
                  </div>
                  <div>
                    <strong>Difference:</strong>
                    {{ detail.actualWriteOffs.differenceFromTheoretical.quantity > 0 ? '+' : '' }}
                    {{ formatQty(detail.actualWriteOffs.differenceFromTheoretical.quantity) }}
                    {{ detail.product.unit }}
                  </div>
                </div>
              </v-alert>

              <!-- Write-off breakdown chips -->
              <div class="d-flex gap-2 mb-3 flex-wrap">
                <v-chip size="small" variant="tonal" color="primary">
                  Sales: {{ formatQty(detail.actualWriteOffs.salesConsumption.quantity) }}
                  {{ detail.product.unit }}
                </v-chip>
                <v-chip size="small" variant="tonal" color="secondary">
                  Production: {{ formatQty(detail.actualWriteOffs.productionConsumption.quantity) }}
                  {{ detail.product.unit }}
                </v-chip>
                <v-chip
                  v-if="detail.actualWriteOffs.corrections.quantity !== 0"
                  size="small"
                  variant="tonal"
                  :color="detail.actualWriteOffs.corrections.quantity > 0 ? 'success' : 'error'"
                >
                  Corrections:
                  {{ detail.actualWriteOffs.corrections.quantity > 0 ? '+' : '' }}
                  {{ formatQty(detail.actualWriteOffs.corrections.quantity) }}
                  {{ detail.product.unit }}
                </v-chip>
              </div>

              <!-- Production Consumption Details -->
              <div
                v-if="
                  detail.actualWriteOffs.productionConsumption.details &&
                  detail.actualWriteOffs.productionConsumption.details.length > 0
                "
                class="mb-3"
              >
                <div class="text-subtitle-2 mb-2">Production Write-offs</div>
                <v-table density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in detail.actualWriteOffs.productionConsumption.details"
                      :key="idx"
                    >
                      <td>{{ formatDate(item.date) }}</td>
                      <td class="text-right">
                        {{ formatQty(item.quantity) }} {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(item.amount) }}</td>
                      <td class="text-caption text-truncate" style="max-width: 200px">
                        {{ formatProductionNotes(item.notes) }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <!-- Inventory Corrections Details -->
              <div
                v-if="
                  detail.actualWriteOffs.corrections.details &&
                  detail.actualWriteOffs.corrections.details.length > 0
                "
              >
                <div class="text-subtitle-2 mb-2">Inventory Corrections</div>
                <v-table density="compact" class="elevation-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th class="text-right">Adjustment</th>
                      <th class="text-right">Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in detail.actualWriteOffs.corrections.details"
                      :key="idx"
                    >
                      <td>{{ formatDate(item.date) }}</td>
                      <td
                        class="text-right"
                        :class="item.quantity > 0 ? 'text-success' : 'text-error'"
                      >
                        {{ item.quantity > 0 ? '+' : '' }}{{ formatQty(item.quantity) }}
                        {{ detail.product.unit }}
                      </td>
                      <td class="text-right">{{ formatIDR(item.amount) }}</td>
                      <td class="text-caption text-truncate" style="max-width: 200px">
                        {{ formatCorrectionNotes(item.notes) }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-alert
                v-if="
                  detail.actualWriteOffs.total.quantity === 0 &&
                  detail.actualWriteOffs.corrections.quantity === 0
                "
                type="info"
                variant="tonal"
                density="compact"
              >
                No write-offs in this period
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVarianceReportStore } from '@/stores/analytics/varianceReportStore'
import { formatIDR } from '@/utils/currency'

// Props
const props = defineProps<{
  modelValue: boolean
  productId: string | null
  dateFrom: string
  dateTo: string
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Store
const store = useVarianceReportStore()

// State
const error = ref<string | null>(null)
const expandedPanels = ref<string[]>([])

// Computed
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = computed(() => store.loadingDetailV2)
const detail = computed(() => store.currentDetailV2)

const varianceClass = computed(() => {
  if (!detail.value) return ''
  const interpretation = detail.value.variance.interpretation
  if (interpretation === 'shortage') return 'text-error'
  if (interpretation === 'surplus') return 'text-warning'
  return 'text-success'
})

const varianceChipColor = computed(() => {
  if (!detail.value) return 'grey'
  const interpretation = detail.value.variance.interpretation
  if (interpretation === 'shortage') return 'error'
  if (interpretation === 'surplus') return 'warning'
  return 'success'
})

const varianceLabel = computed(() => {
  if (!detail.value) return ''
  const interpretation = detail.value.variance.interpretation
  if (interpretation === 'shortage') return 'Shortage'
  if (interpretation === 'surplus') return 'Surplus'
  return 'OK'
})

// Check if any menu item has viaPreparation field
const hasViaPreparationItems = computed(() => {
  if (!detail.value?.sales?.topMenuItems) return false
  return detail.value.sales.topMenuItems.some(
    (item: { viaPreparation?: string }) => item.viaPreparation
  )
})

// Calculate total menu items sold
const totalMenuItemsSold = computed(() => {
  if (!detail.value?.sales?.topMenuItems) return 0
  return detail.value.sales.topMenuItems.reduce(
    (sum: number, item: { quantitySold: number }) => sum + item.quantitySold,
    0
  )
})

// Separate write-offs (expired, spoiled, other) from corrections (inventory_adjustment)
const WRITEOFF_REASONS = ['expired', 'spoiled', 'other', 'expiration']
const CORRECTION_REASON = 'inventory_adjustment'

const writeOffsByReason = computed(() => {
  if (!detail.value?.loss?.byReason) return []
  return detail.value.loss.byReason.filter((item: { reason: string }) =>
    WRITEOFF_REASONS.includes(item.reason)
  )
})

const correctionsByReason = computed(() => {
  if (!detail.value?.loss?.byReason) return []
  return detail.value.loss.byReason.filter(
    (item: { reason: string }) => item.reason === CORRECTION_REASON
  )
})

const writeOffsDetails = computed(() => {
  if (!detail.value?.loss?.details) return []
  return detail.value.loss.details.filter((item: { reason: string }) =>
    WRITEOFF_REASONS.includes(item.reason)
  )
})

const correctionsDetails = computed(() => {
  if (!detail.value?.loss?.details) return []
  return detail.value.loss.details.filter(
    (item: { reason: string }) => item.reason === CORRECTION_REASON
  )
})

const writeOffsTotals = computed(() => {
  const qty = writeOffsByReason.value.reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0
  )
  const amount = writeOffsByReason.value.reduce(
    (sum: number, item: { amount: number }) => sum + item.amount,
    0
  )
  return { quantity: qty, amount }
})

const correctionsTotals = computed(() => {
  const qty = correctionsByReason.value.reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0
  )
  const amount = correctionsByReason.value.reduce(
    (sum: number, item: { amount: number }) => sum + item.amount,
    0
  )
  return { quantity: qty, amount }
})

// Actual write-offs comparison
const writeOffDifferenceColor = computed(() => {
  if (!detail.value?.actualWriteOffs?.differenceFromTheoretical) return 'grey'
  const interpretation = detail.value.actualWriteOffs.differenceFromTheoretical.interpretation
  if (interpretation === 'matched') return 'success'
  if (interpretation === 'under_written_off') return 'warning'
  return 'error' // over_written_off
})

const writeOffDifferenceLabel = computed(() => {
  if (!detail.value?.actualWriteOffs?.differenceFromTheoretical) return ''
  const interpretation = detail.value.actualWriteOffs.differenceFromTheoretical.interpretation
  if (interpretation === 'matched') return 'Matched'
  if (interpretation === 'under_written_off') return 'Under written-off'
  return 'Over written-off'
})

const writeOffDifferenceAlertType = computed(() => {
  if (!detail.value?.actualWriteOffs?.differenceFromTheoretical) return 'info'
  const interpretation = detail.value.actualWriteOffs.differenceFromTheoretical.interpretation
  if (interpretation === 'matched') return 'success'
  if (interpretation === 'under_written_off') return 'warning'
  return 'error'
})

// Watch for dialog open
watch(
  () => props.modelValue,
  async newValue => {
    if (newValue && props.productId) {
      error.value = null
      expandedPanels.value = []
      try {
        await store.getProductDetailV2(props.productId, props.dateFrom, props.dateTo)
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load product detail'
      }
    }
  }
)

// Methods
function close() {
  dialogVisible.value = false
}

function scrollToSection(sectionId: string) {
  // Expand the panel if not already expanded
  if (!expandedPanels.value.includes(sectionId)) {
    expandedPanels.value.push(sectionId)
  }
  // Scroll to the section after a short delay
  setTimeout(() => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

function formatQty(value: number): string {
  if (Math.abs(value) < 0.001) return '0'
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    expired: 'Expired',
    spoiled: 'Spoiled',
    expiration: 'Expiration',
    other: 'Other'
  }
  return reasonMap[reason] || reason
}

function formatSourceLabel(source: string): string {
  const sourceMap: Record<string, string> = {
    inventory: 'Inventory Count',
    calculated: 'Calculated',
    shift_close: 'Shift Close',
    manual: 'Manual Entry'
  }
  return sourceMap[source] || source
}

function formatProductionNotes(notes: string): string {
  if (!notes) return '-'
  // Extract preparation name from auto write-off notes
  const match = notes.match(/preparation production: (.+?)(?:\s*\[|$)/)
  return match ? match[1] : notes.substring(0, 50)
}

function formatCorrectionNotes(notes: string): string {
  if (!notes) return '-'
  // Extract diff from correction notes
  const match = notes.match(/Diff ([+-]?\d+)/)
  if (match) {
    const diff = parseInt(match[1])
    return diff > 0 ? `Added ${diff}` : `Removed ${Math.abs(diff)}`
  }
  return notes.substring(0, 50)
}
</script>

<style scoped lang="scss">
.formula-bar {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

.formula-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.formula-item {
  text-align: center;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface), 0.8);
  min-width: 80px;

  &.clickable {
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.1);
    }
  }

  &.variance-result {
    border: 2px solid currentColor;
  }
}

.formula-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 4px;
}

.formula-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.formula-amount {
  font-size: 0.75rem;
}

.formula-operator {
  font-size: 1.25rem;
  font-weight: bold;
  padding: 0 4px;
}

.w-100 {
  width: 100%;
}

.gap-2 {
  gap: 8px;
}
</style>
