<!-- src/views/admin/loyalty/LoyaltySettingsScreen.vue -->
<!-- Unified Loyalty admin with tabs: Settings, Stamp Cards, Customers -->
<template>
  <div class="loyalty-screen">
    <!-- Header with tabs -->
    <div class="loyalty-header px-4 pt-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <h2 class="text-h5">Loyalty Program</h2>
        <div class="d-flex gap-2">
          <v-btn
            v-if="activeTab === 'settings'"
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!hasChanges"
            @click="saveSettings"
          >
            Save Changes
          </v-btn>
        </div>
      </div>

      <v-tabs v-model="activeTab" density="compact">
        <v-tab value="settings">
          <v-icon start size="18">mdi-cog</v-icon>
          Settings
        </v-tab>
        <v-tab value="cards">
          <v-icon start size="18">mdi-stamper</v-icon>
          Stamp Cards
          <v-badge
            v-if="stampCards.length"
            :content="stampCards.length"
            color="amber"
            inline
            class="ml-1"
          />
        </v-tab>
        <v-tab value="customers">
          <v-icon start size="18">mdi-account-group</v-icon>
          Customers
          <v-badge
            v-if="customersStore.customers.length"
            :content="customersStore.customers.length"
            color="primary"
            inline
            class="ml-1"
          />
        </v-tab>
        <v-tab value="history">
          <v-icon start size="18">mdi-history</v-icon>
          History
        </v-tab>
      </v-tabs>
    </div>

    <v-divider />

    <!-- Tab content -->
    <div class="loyalty-content pa-4">
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate />
      </div>

      <template v-else>
        <!-- ===================== SETTINGS TAB ===================== -->
        <div v-show="activeTab === 'settings'">
          <template v-if="form">
            <v-row>
              <!-- Block 1: Stamp Cards -->
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title class="bg-amber-lighten-5">
                    <v-icon class="mr-2" color="amber-darken-2">mdi-stamper</v-icon>
                    Stamp Cards
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <v-text-field
                      v-model.number="form.stampsPerCycle"
                      label="Stamps per cycle"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="How many stamps to complete one cycle"
                      persistent-hint
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.stampThreshold"
                      label="Stamp threshold (IDR)"
                      type="number"
                      :min="1000"
                      variant="outlined"
                      density="compact"
                      hint="Minimum order amount for 1 stamp"
                      persistent-hint
                      prefix="Rp"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.stampLifetimeDays"
                      label="Stamp lifetime (days)"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="Days before stamps expire"
                      persistent-hint
                      class="mb-3"
                    />

                    <!-- Stamp Rewards -->
                    <div class="text-subtitle-2 mb-2">Stamp Rewards</div>
                    <div
                      v-for="(reward, i) in form.stampRewards"
                      :key="i"
                      class="reward-row mb-3 pa-2 rounded"
                      style="border: 1px solid rgba(var(--v-theme-on-surface), 0.12)"
                    >
                      <div class="d-flex gap-2 mb-2 align-center">
                        <v-text-field
                          v-model.number="reward.stamps"
                          label="Stamps"
                          type="number"
                          variant="outlined"
                          density="compact"
                          hide-details
                          style="max-width: 80px"
                        />
                        <v-text-field
                          v-model="reward.category"
                          label="Label"
                          variant="outlined"
                          density="compact"
                          hide-details
                          class="flex-grow-1"
                          placeholder="e.g. drinks, breakfast, any"
                        />
                        <v-text-field
                          v-model.number="reward.maxDiscount"
                          label="Max discount"
                          type="number"
                          variant="outlined"
                          density="compact"
                          hide-details
                          prefix="Rp"
                          style="max-width: 140px"
                        />
                        <v-btn
                          icon
                          size="small"
                          variant="text"
                          color="error"
                          @click="form.stampRewards.splice(i, 1)"
                        >
                          <v-icon size="18">mdi-close</v-icon>
                        </v-btn>
                      </div>
                      <v-select
                        v-model="reward.categoryIds"
                        :items="menuCategoryItems"
                        label="Menu categories (empty = any item)"
                        variant="outlined"
                        density="compact"
                        hide-details
                        multiple
                        chips
                        closable-chips
                        clearable
                      />
                    </div>
                    <v-btn
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-plus"
                      @click="
                        form.stampRewards.push({
                          stamps: 0,
                          category: '',
                          categoryIds: [],
                          maxDiscount: 0,
                          redeemed: false
                        })
                      "
                    >
                      Add Reward
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Block 2: Digital Points & Tiers -->
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="mb-4">
                  <v-card-title class="bg-deep-purple-lighten-5">
                    <v-icon class="mr-2" color="deep-purple">mdi-wallet</v-icon>
                    Digital Points
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <v-text-field
                      v-model.number="form.pointsLifetimeDays"
                      label="Points lifetime (days)"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="Days before points expire"
                      persistent-hint
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.tierWindowDays"
                      label="Tier window (days)"
                      type="number"
                      :min="7"
                      :max="365"
                      variant="outlined"
                      density="compact"
                      hint="Spending within this period determines the customer's tier level"
                      persistent-hint
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.maxTierDegradation"
                      label="Max tier degradation"
                      type="number"
                      :min="0"
                      :max="3"
                      variant="outlined"
                      density="compact"
                      hint="Max levels a customer can drop per check"
                      persistent-hint
                    />
                  </v-card-text>
                </v-card>

                <!-- Tiers -->
                <v-card variant="outlined">
                  <v-card-title class="bg-blue-lighten-5">
                    <v-icon class="mr-2" color="blue">mdi-trophy</v-icon>
                    Tier Configuration
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <div
                      v-for="(tier, i) in form.tiers"
                      :key="i"
                      class="d-flex gap-2 mb-2 align-center"
                    >
                      <v-text-field
                        v-model="tier.name"
                        label="Tier name"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="flex-grow-1"
                      />
                      <v-text-field
                        v-model.number="tier.cashbackPct"
                        label="Cashback %"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        suffix="%"
                        style="max-width: 100px"
                      />
                      <v-text-field
                        v-model.number="tier.spendingThreshold"
                        label="Spend threshold"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        prefix="Rp"
                        style="max-width: 160px"
                      />
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="error"
                        @click="form.tiers.splice(i, 1)"
                      >
                        <v-icon size="18">mdi-close</v-icon>
                      </v-btn>
                    </div>
                    <v-btn
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-plus"
                      @click="form.tiers.push({ name: '', cashbackPct: 5, spendingThreshold: 0 })"
                    >
                      Add Tier
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Active toggle -->
            <v-card variant="outlined" class="mt-4">
              <v-card-text>
                <v-switch
                  v-model="form.isActive"
                  label="Loyalty program active"
                  color="success"
                  hide-details
                />
              </v-card-text>
            </v-card>
          </template>

          <v-alert v-else type="warning" variant="tonal" class="mt-4">
            No loyalty settings found. The settings row may not have been initialized in the
            database.
          </v-alert>
        </div>

        <!-- ===================== STAMP CARDS TAB ===================== -->
        <div v-show="activeTab === 'cards'">
          <!-- Stats -->
          <v-row class="mb-4" dense>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold">{{ stampCards.length }}</div>
                <div class="text-caption text-medium-emphasis">Total Cards</div>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold text-success">{{ activeCards }}</div>
                <div class="text-caption text-medium-emphasis">Active</div>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold text-deep-purple">{{ convertedCards }}</div>
                <div class="text-caption text-medium-emphasis">Converted</div>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold text-amber-darken-2">{{ linkedCards }}</div>
                <div class="text-caption text-medium-emphasis">Linked to Customer</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Filter + New Card button -->
          <div class="d-flex gap-2 mb-3 align-center">
            <v-text-field
              v-model="cardSearch"
              placeholder="Search card number..."
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              style="max-width: 240px"
            />
            <v-select
              v-model="cardStatusFilter"
              :items="cardStatusOptions"
              label="Status"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 160px"
            />
            <v-spacer />
            <v-btn color="primary" variant="flat" :loading="creatingCard" @click="handleCreateCard">
              <v-icon start>mdi-plus</v-icon>
              New Card
            </v-btn>
          </div>

          <!-- Cards table -->
          <v-card variant="outlined">
            <v-data-table
              :headers="cardHeaders"
              :items="filteredCards"
              :loading="loadingCards"
              :items-per-page="20"
              density="compact"
              hover
              @click:row="(_: Event, row: any) => openCardDetail(row.item)"
            >
              <template #[`item.cardNumber`]="{ item }">
                <span class="font-weight-medium">#{{ item.cardNumber }}</span>
              </template>

              <template #[`item.stamps`]="{ item }">
                <div class="d-flex align-center gap-1">
                  <v-icon size="14" color="amber-darken-2">mdi-stamper</v-icon>
                  {{ item.stamps }}/{{ form?.stampsPerCycle || 15 }}
                </div>
              </template>

              <template #[`item.status`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="
                    item.status === 'active'
                      ? 'success'
                      : item.status === 'converted'
                        ? 'deep-purple'
                        : 'grey'
                  "
                  variant="tonal"
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <template #[`item.customerName`]="{ item }">
                <span v-if="item.customerName">{{ item.customerName }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template #[`item.lastStampAt`]="{ item }">
                {{ item.lastStampAt ? formatRelative(item.lastStampAt) : 'Never' }}
              </template>

              <template #[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
            </v-data-table>
          </v-card>
        </div>

        <!-- ========== Stamp Card Edit Dialog ========== -->
        <v-dialog v-model="showCardDetail" max-width="480" scrollable>
          <v-card v-if="selectedCard">
            <v-card-title
              class="d-flex align-center justify-space-between bg-amber-darken-2 text-white"
            >
              <span>Card #{{ selectedCard.cardNumber }}</span>
              <v-chip
                :color="
                  selectedCard.status === 'active'
                    ? 'success'
                    : selectedCard.status === 'converted'
                      ? 'deep-purple'
                      : 'grey'
                "
                variant="flat"
                size="small"
              >
                {{ selectedCard.status }}
              </v-chip>
            </v-card-title>

            <v-card-text class="pt-4">
              <!-- Read-only info -->
              <div class="d-flex justify-space-between text-body-2 mb-3">
                <span class="text-medium-emphasis">Created</span>
                <span>{{ formatDate(selectedCard.createdAt) }}</span>
              </div>
              <div class="d-flex justify-space-between text-body-2 mb-4">
                <span class="text-medium-emphasis">Last Stamp</span>
                <span>
                  {{
                    selectedCard.lastStampAt ? formatRelative(selectedCard.lastStampAt) : 'Never'
                  }}
                </span>
              </div>

              <v-divider class="mb-4" />

              <!-- Editable fields -->
              <v-select
                v-model="cardForm.status"
                :items="cardStatusOptions"
                label="Status"
                density="compact"
                variant="outlined"
                class="mb-3"
              />

              <v-text-field
                v-model.number="cardForm.stamps"
                label="Stamps"
                type="number"
                :min="0"
                :max="form?.stampsPerCycle || 15"
                density="compact"
                variant="outlined"
                :hint="`Max: ${form?.stampsPerCycle || 15} per cycle`"
                persistent-hint
                class="mb-3"
              />

              <v-text-field
                v-model.number="cardForm.cycle"
                label="Cycle"
                type="number"
                :min="1"
                density="compact"
                variant="outlined"
                class="mb-3"
              />

              <v-autocomplete
                v-model="cardForm.customerId"
                :items="customerOptions"
                item-title="name"
                item-value="id"
                label="Linked Customer"
                density="compact"
                variant="outlined"
                clearable
                class="mb-3"
              />

              <!-- Error -->
              <v-alert v-if="cardSaveError" type="error" density="compact" class="mb-3">
                {{ cardSaveError }}
              </v-alert>
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <v-btn color="error" variant="text" :loading="cardDeleting" @click="handleDeleteCard">
                Delete
              </v-btn>
              <v-spacer />
              <v-btn variant="text" @click="showCardDetail = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="cardSaving" @click="handleSaveCard">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- ===================== CUSTOMERS TAB ===================== -->
        <div v-show="activeTab === 'customers'">
          <!-- Stats -->
          <v-row class="mb-4" dense>
            <v-col v-for="stat in customerStats" :key="stat.label" cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold" :class="stat.color">{{ stat.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Search, filter & create -->
          <div class="d-flex gap-2 mb-3">
            <v-text-field
              v-model="customerSearch"
              placeholder="Search name, phone or telegram..."
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              style="max-width: 280px"
            />
            <v-select
              v-model="customerLevelFilter"
              :items="levelFilterOptions"
              label="Level"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 160px"
            />
            <v-select
              v-model="customerStatusFilter"
              :items="['active', 'blocked']"
              label="Status"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 140px"
            />
            <v-spacer />
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-plus"
              @click="openCreateCustomer"
            >
              New Customer
            </v-btn>
          </div>

          <!-- Table -->
          <v-card variant="outlined">
            <v-data-table
              :headers="customerHeaders"
              :items="filteredCustomers"
              :loading="loadingCustomers"
              :items-per-page="20"
              density="compact"
              hover
              @click:row="(_: Event, row: any) => openCustomerDetail(row.item)"
            >
              <template #[`item.level`]="{ item }">
                <v-chip
                  v-if="item.personalDiscount > 0"
                  size="small"
                  color="orange"
                  variant="flat"
                  class="text-white"
                >
                  {{ item.personalDiscount }}%
                </v-chip>
                <v-chip
                  v-else-if="item.loyaltyProgram === 'stamps'"
                  size="small"
                  color="amber-darken-1"
                  variant="flat"
                  class="text-white"
                >
                  STAMPS
                </v-chip>
                <v-chip
                  v-else
                  size="small"
                  :color="getTierColor(item.tier)"
                  variant="flat"
                  class="text-white"
                >
                  {{ item.tier.toUpperCase() }}
                </v-chip>
              </template>
              <template #[`item.loyaltyBalance`]="{ item }">
                <template v-if="item.personalDiscount > 0">-</template>
                <template v-else-if="item.loyaltyProgram === 'stamps'">
                  {{ customerStampsMap[item.id] ?? 0 }} /
                  {{ loyaltyStore.settings?.stampsPerCycle ?? 15 }}
                </template>
                <template v-else>{{ formatIDR(item.loyaltyBalance) }}</template>
              </template>
              <template #[`item.totalSpent`]="{ item }">
                {{ formatIDR(item.totalSpent) }}
              </template>
              <template #[`item.averageCheck`]="{ item }">
                {{ item.averageCheck ? formatIDR(item.averageCheck) : '-' }}
              </template>
              <template #[`item.createdAt`]="{ item }">
                {{ item.createdAt ? formatDate(item.createdAt) : '-' }}
              </template>
              <template #[`item.lastVisitAt`]="{ item }">
                {{ item.lastVisitAt ? formatRelative(item.lastVisitAt) : 'Never' }}
              </template>
              <template #[`item.status`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="item.status === 'active' ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ item.status }}
                </v-chip>
              </template>
            </v-data-table>
          </v-card>

          <!-- ===== Customer Detail / Edit Dialog ===== -->
          <v-dialog v-model="showCustomerDetail" max-width="650" scrollable>
            <v-card v-if="selectedCustomer">
              <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
                <span>{{ customerEditing ? 'Edit Customer' : selectedCustomer.name }}</span>
                <div class="d-flex align-center gap-1">
                  <v-chip
                    :color="getTierColor(selectedCustomer.tier)"
                    variant="flat"
                    class="text-white"
                    size="small"
                  >
                    {{ selectedCustomer.tier.toUpperCase() }}
                  </v-chip>
                  <v-chip
                    :color="selectedCustomer.status === 'active' ? 'success' : 'error'"
                    variant="flat"
                    size="small"
                  >
                    {{ selectedCustomer.status }}
                  </v-chip>
                </div>
              </v-card-title>

              <v-card-text class="pt-4" style="max-height: 70vh">
                <!-- ---- View Mode ---- -->
                <template v-if="!customerEditing">
                  <v-row dense>
                    <v-col cols="6">
                      <div class="text-caption text-medium-emphasis">Balance</div>
                      <div class="text-h6">{{ formatIDR(selectedCustomer.loyaltyBalance) }}</div>
                    </v-col>
                    <v-col cols="6">
                      <div class="text-caption text-medium-emphasis">Total Spent</div>
                      <div class="text-h6">{{ formatIDR(selectedCustomer.totalSpent) }}</div>
                    </v-col>
                    <v-col cols="6">
                      <div class="text-caption text-medium-emphasis">Visits</div>
                      <div class="text-h6">{{ selectedCustomer.totalVisits }}</div>
                    </v-col>
                    <v-col cols="6">
                      <div class="text-caption text-medium-emphasis">Avg Check</div>
                      <div class="text-h6">
                        {{
                          selectedCustomer.averageCheck
                            ? formatIDR(selectedCustomer.averageCheck)
                            : '-'
                        }}
                      </div>
                    </v-col>
                  </v-row>

                  <v-divider class="my-3" />

                  <v-row dense>
                    <v-col cols="6">
                      <div class="text-caption text-medium-emphasis">Phone</div>
                      <div class="text-body-1">{{ selectedCustomer.phone || '-' }}</div>
                    </v-col>
                    <v-col cols="6">
                      <div class="text-caption text-medium-emphasis">Telegram</div>
                      <div class="text-body-1">
                        {{
                          selectedCustomer.telegramUsername
                            ? '@' + selectedCustomer.telegramUsername
                            : '-'
                        }}
                      </div>
                    </v-col>
                  </v-row>

                  <!-- Personal Discount -->
                  <v-divider class="my-3" />
                  <div class="text-subtitle-2 mb-1">Personal Discount</div>
                  <div
                    v-if="selectedCustomer.personalDiscount > 0"
                    class="d-flex align-center gap-2 mb-1"
                  >
                    <v-chip color="orange" variant="tonal" size="small">
                      {{ selectedCustomer.personalDiscount }}%
                    </v-chip>
                    <span v-if="selectedCustomer.discountNote" class="text-body-2">
                      {{ selectedCustomer.discountNote }}
                    </span>
                    <v-chip
                      v-if="selectedCustomer.disableLoyaltyAccrual"
                      size="x-small"
                      color="grey"
                      variant="tonal"
                    >
                      No accrual
                    </v-chip>
                  </div>
                  <div v-else class="text-body-2 text-medium-emphasis">No personal discount</div>

                  <v-divider class="my-3" />

                  <div class="text-caption text-medium-emphasis mb-1">Token</div>
                  <div class="text-body-2 font-weight-mono mb-3">
                    {{ maskToken(selectedCustomer.token) }}
                  </div>

                  <!-- Transactions -->
                  <v-divider class="my-3" />
                  <div class="text-subtitle-2 mb-2">Recent Transactions</div>
                  <div v-if="loadingTx" class="text-center py-2">
                    <v-progress-circular indeterminate size="24" />
                  </div>
                  <v-list
                    v-else-if="customerTxs.length > 0"
                    density="compact"
                    class="transaction-list"
                  >
                    <v-list-item v-for="tx in customerTxs" :key="tx.id" class="px-0">
                      <template #prepend>
                        <v-icon
                          size="18"
                          :color="tx.amount >= 0 ? 'success' : 'error'"
                          class="mr-2"
                        >
                          {{ tx.amount >= 0 ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
                        </v-icon>
                      </template>
                      <v-list-item-title class="text-body-2">
                        {{ tx.type }} — {{ formatIDR(Math.abs(tx.amount)) }}
                      </v-list-item-title>
                      <v-list-item-subtitle class="text-caption">
                        {{ tx.description || '' }} | Balance: {{ formatIDR(tx.balanceAfter) }}
                      </v-list-item-subtitle>
                      <template #append>
                        <span class="text-caption text-medium-emphasis">
                          {{ formatRelative(tx.createdAt) }}
                        </span>
                      </template>
                    </v-list-item>
                  </v-list>
                  <div v-else class="text-body-2 text-medium-emphasis">No transactions yet</div>
                </template>

                <!-- ---- Edit Mode ---- -->
                <template v-else>
                  <v-text-field
                    v-model="custForm.name"
                    label="Name *"
                    density="compact"
                    variant="outlined"
                    class="mb-3"
                  />
                  <v-row dense class="mb-3">
                    <v-col cols="4">
                      <v-select
                        v-model="custForm.phoneCode"
                        :items="phoneCodes"
                        density="compact"
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="8">
                      <v-text-field
                        v-model="custForm.phoneNumber"
                        label="Phone"
                        density="compact"
                        variant="outlined"
                        hide-details
                        inputmode="tel"
                      />
                    </v-col>
                  </v-row>
                  <v-text-field
                    v-model="custForm.telegramUsername"
                    label="Telegram username"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="mb-3"
                  />
                  <v-text-field
                    v-model="custForm.notes"
                    label="Notes"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="mb-3"
                  />
                  <v-select
                    v-model="custForm.tier"
                    :items="tierOptions"
                    label="Tier"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="mb-3"
                  />

                  <v-divider class="my-3" />
                  <div class="text-subtitle-2 mb-2">Loyalty</div>
                  <v-row dense class="mb-2">
                    <v-col cols="4">
                      <v-select
                        v-model="custForm.loyaltyProgram"
                        :items="['stamps', 'cashback']"
                        label="Program"
                        density="compact"
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field
                        v-model.number="custForm.loyaltyBalance"
                        type="number"
                        label="Cashback Balance"
                        density="compact"
                        variant="outlined"
                        hide-details
                        prefix="Rp"
                      />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field
                        v-model.number="custForm.stamps"
                        type="number"
                        label="Stamps"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :min="0"
                      />
                    </v-col>
                  </v-row>
                  <v-text-field
                    v-model="custForm.balanceAdjustReason"
                    label="Adjustment reason (required if balance changed)"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="mb-3"
                    :rules="balanceChanged ? [v => !!v?.trim() || 'Reason required'] : []"
                  />

                  <v-divider class="my-3" />
                  <div class="text-subtitle-2 mb-2">Personal Discount</div>
                  <v-row dense class="mb-2">
                    <v-col cols="4">
                      <v-text-field
                        v-model.number="custForm.personalDiscount"
                        type="number"
                        label="Discount %"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :min="0"
                        :max="100"
                        suffix="%"
                      />
                    </v-col>
                    <v-col cols="5">
                      <v-text-field
                        v-model="custForm.discountNote"
                        label="Note (e.g. Founder)"
                        density="compact"
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="3" class="d-flex align-center">
                      <v-checkbox
                        v-model="custForm.disableLoyaltyAccrual"
                        label="No accrual"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                  </v-row>

                  <v-alert
                    v-if="custSaveError"
                    type="error"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    {{ custSaveError }}
                  </v-alert>
                </template>
              </v-card-text>

              <v-card-actions class="px-4 pb-3">
                <template v-if="!customerEditing">
                  <v-btn
                    variant="tonal"
                    :color="selectedCustomer.status === 'active' ? 'error' : 'success'"
                    size="small"
                    :loading="togglingStatus"
                    @click="toggleCustomerStatus"
                  >
                    {{ selectedCustomer.status === 'active' ? 'Deactivate' : 'Activate' }}
                  </v-btn>
                  <v-btn
                    variant="tonal"
                    color="warning"
                    size="small"
                    prepend-icon="mdi-merge"
                    class="ml-2"
                    @click="openMergeDialog"
                  >
                    Merge Into...
                  </v-btn>
                  <v-spacer />
                  <v-btn variant="outlined" prepend-icon="mdi-pencil" @click="startCustomerEdit">
                    Edit
                  </v-btn>
                  <v-btn variant="text" @click="showCustomerDetail = false">Close</v-btn>
                </template>
                <template v-else>
                  <v-spacer />
                  <v-btn variant="text" @click="customerEditing = false">Cancel</v-btn>
                  <v-btn
                    color="primary"
                    variant="flat"
                    :loading="custSaving"
                    :disabled="!custForm.name?.trim()"
                    @click="saveCustomerEdit"
                  >
                    Save
                  </v-btn>
                </template>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- ===== Merge Customer Dialog ===== -->
          <v-dialog v-model="showMergeDialog" max-width="700">
            <v-card>
              <v-card-title class="bg-warning">
                Merge Customer
                <span v-if="mergeStep === 'resolve'" class="text-body-2 ml-2">
                  — Resolve Conflicts
                </span>
              </v-card-title>
              <v-card-text class="pt-4">
                <!-- Step 1: Select target -->
                <template v-if="mergeStep === 'select'">
                  <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                    All orders, transactions, loyalty points, and identities will be transferred to
                    the target. This action cannot be undone.
                  </v-alert>

                  <div class="text-body-2 mb-2">
                    Source:
                    <strong>{{ mergeSource?.name }}</strong>
                  </div>

                  <v-autocomplete
                    v-model="mergeTargetId"
                    :items="mergeTargetOptions"
                    item-title="label"
                    item-value="id"
                    label="Merge into (target customer)..."
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="mb-3"
                  />

                  <div
                    v-if="mergeTargetCustomer"
                    class="pa-3 rounded bg-grey-darken-3 text-body-2 mb-3"
                  >
                    <div>
                      Balance:
                      <strong>{{ formatIDR(mergeTargetCustomer.loyaltyBalance) }}</strong>
                    </div>
                    <div>
                      Visits:
                      <strong>{{ mergeTargetCustomer.totalVisits }}</strong>
                    </div>
                    <div>
                      Total Spent:
                      <strong>{{ formatIDR(mergeTargetCustomer.totalSpent) }}</strong>
                    </div>
                  </div>
                </template>

                <!-- Step 2: Resolve conflicts -->
                <template v-if="mergeStep === 'resolve'">
                  <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                    Both customers have different values for these fields. Choose which to keep.
                  </v-alert>

                  <v-table density="compact" class="merge-conflicts-table">
                    <thead>
                      <tr>
                        <th style="width: 130px">Field</th>
                        <th>
                          <v-icon size="14" class="mr-1">mdi-arrow-right-bold</v-icon>
                          {{ mergeSource?.name }}
                          <span class="text-caption text-medium-emphasis ml-1">(source)</span>
                        </th>
                        <th>
                          <v-icon size="14" class="mr-1">mdi-bullseye-arrow</v-icon>
                          {{ mergeTargetCustomer?.name }}
                          <span class="text-caption text-medium-emphasis ml-1">(target)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="c in mergeConflicts" :key="c.field.key">
                        <td class="text-body-2 font-weight-medium">{{ c.field.label }}</td>
                        <td
                          class="merge-cell"
                          :class="{
                            'merge-cell--selected': mergeChoices[c.field.key] === 'source'
                          }"
                          style="cursor: pointer"
                          @click="mergeChoices[c.field.key] = 'source'"
                        >
                          <div class="d-flex align-center gap-1">
                            <v-icon
                              size="18"
                              :color="mergeChoices[c.field.key] === 'source' ? 'warning' : 'grey'"
                            >
                              {{
                                mergeChoices[c.field.key] === 'source'
                                  ? 'mdi-radiobox-marked'
                                  : 'mdi-radiobox-blank'
                              }}
                            </v-icon>
                            <span class="text-body-2">
                              {{ c.field.format ? c.field.format(c.sourceValue) : c.sourceValue }}
                            </span>
                          </div>
                        </td>
                        <td
                          class="merge-cell"
                          :class="{
                            'merge-cell--selected': mergeChoices[c.field.key] === 'target'
                          }"
                          style="cursor: pointer"
                          @click="mergeChoices[c.field.key] = 'target'"
                        >
                          <div class="d-flex align-center gap-1">
                            <v-icon
                              size="18"
                              :color="mergeChoices[c.field.key] === 'target' ? 'warning' : 'grey'"
                            >
                              {{
                                mergeChoices[c.field.key] === 'target'
                                  ? 'mdi-radiobox-marked'
                                  : 'mdi-radiobox-blank'
                              }}
                            </v-icon>
                            <span class="text-body-2">
                              {{ c.field.format ? c.field.format(c.targetValue) : c.targetValue }}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </template>

                <v-alert
                  v-if="mergeError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                >
                  {{ mergeError }}
                </v-alert>
              </v-card-text>
              <v-card-actions class="px-4 pb-4">
                <v-btn v-if="mergeStep === 'resolve'" variant="text" @click="mergeStep = 'select'">
                  Back
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="showMergeDialog = false">Cancel</v-btn>
                <v-btn
                  v-if="mergeStep === 'select'"
                  color="warning"
                  variant="flat"
                  :disabled="!mergeTargetId"
                  @click="proceedToResolve"
                >
                  Next
                </v-btn>
                <v-btn
                  v-if="mergeStep === 'resolve'"
                  color="warning"
                  variant="flat"
                  prepend-icon="mdi-merge"
                  :loading="merging"
                  @click="executeMerge"
                >
                  Merge
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- ===== Create Customer Dialog ===== -->
          <v-dialog v-model="showCreateCustomerDialog" max-width="500">
            <v-card>
              <v-card-title class="bg-primary text-white">New Customer</v-card-title>
              <v-card-text class="pt-4">
                <v-text-field
                  v-model="custForm.name"
                  label="Name *"
                  density="compact"
                  variant="outlined"
                  class="mb-3"
                />
                <v-row dense class="mb-3">
                  <v-col cols="4">
                    <v-select
                      v-model="custForm.phoneCode"
                      :items="phoneCodes"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="8">
                    <v-text-field
                      v-model="custForm.phoneNumber"
                      label="Phone"
                      density="compact"
                      variant="outlined"
                      hide-details
                      inputmode="tel"
                    />
                  </v-col>
                </v-row>
                <v-text-field
                  v-model="custForm.telegramUsername"
                  label="Telegram username"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="mb-3"
                />
                <v-text-field
                  v-model="custForm.notes"
                  label="Notes"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="mb-3"
                />

                <v-divider class="my-3" />
                <div class="text-subtitle-2 mb-2">Personal Discount (optional)</div>
                <v-row dense class="mb-2">
                  <v-col cols="4">
                    <v-text-field
                      v-model.number="custForm.personalDiscount"
                      type="number"
                      label="Discount %"
                      density="compact"
                      variant="outlined"
                      hide-details
                      :min="0"
                      :max="100"
                      suffix="%"
                    />
                  </v-col>
                  <v-col cols="5">
                    <v-text-field
                      v-model="custForm.discountNote"
                      label="Note (e.g. Founder)"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="3" class="d-flex align-center">
                    <v-checkbox
                      v-model="custForm.disableLoyaltyAccrual"
                      label="No accrual"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                </v-row>

                <v-alert
                  v-if="custSaveError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                >
                  {{ custSaveError }}
                </v-alert>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="showCreateCustomerDialog = false">Cancel</v-btn>
                <v-btn
                  color="primary"
                  variant="flat"
                  :loading="custSaving"
                  :disabled="!custForm.name?.trim()"
                  @click="createNewCustomer"
                >
                  Create
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>

        <!-- ===================== HISTORY TAB ===================== -->
        <div v-show="activeTab === 'history'">
          <div class="d-flex gap-2 mb-3">
            <v-text-field
              v-model="historySearch"
              placeholder="Search customer name..."
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              style="max-width: 250px"
            />
            <v-select
              v-model="historyTypeFilter"
              :items="transactionTypes"
              label="Type"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 160px"
            />
            <v-spacer />
            <v-btn
              variant="outlined"
              prepend-icon="mdi-refresh"
              size="small"
              :loading="loadingHistory"
              @click="loadHistory"
            >
              Refresh
            </v-btn>
          </div>

          <v-card variant="outlined">
            <v-data-table
              :headers="historyHeaders"
              :items="filteredHistory"
              :loading="loadingHistory"
              :items-per-page="50"
              density="compact"
              hover
            >
              <template #[`item.type`]="{ item }">
                <v-chip size="x-small" :color="txTypeColor(item.type)" variant="tonal">
                  {{ item.type }}
                </v-chip>
              </template>
              <template #[`item.amount`]="{ item }">
                <span :class="item.amount >= 0 ? 'text-success' : 'text-error'">
                  {{ item.amount >= 0 ? '+' : '' }}{{ formatIDR(item.amount) }}
                </span>
              </template>
              <template #[`item.balanceAfter`]="{ item }">
                {{ formatIDR(item.balanceAfter) }}
              </template>
              <template #[`item.createdAt`]="{ item }">
                {{ formatDateTime(item.createdAt) }}
              </template>
            </v-data-table>
          </v-card>
        </div>
      </template>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useLoyaltyStore } from '@/stores/loyalty'
import { loyaltyService } from '@/stores/loyalty/loyaltyService'
import { useCustomersStore } from '@/stores/customers'
import { useMenuStore } from '@/stores/menu'
import type {
  StampReward,
  TierConfig,
  StampCardListItem,
  LoyaltyTransaction
} from '@/stores/loyalty'
import type { Customer } from '@/stores/customers'
import {
  detectConflicts,
  buildOverrides,
  type ConflictItem
} from '@/stores/customers/mergeConflicts'
import { supabase } from '@/supabase/client'
import { formatIDR, TimeUtils } from '@/utils'
import { usePhoneCodes, buildFullPhone } from '@/composables/usePhoneCodes'

const loyaltyStore = useLoyaltyStore()
const customersStore = useCustomersStore()
const menuStore = useMenuStore()
const { phoneCodes } = usePhoneCodes()

// Menu categories for reward category picker
const menuCategoryItems = computed(() =>
  menuStore.categories.map(c => ({ title: c.name, value: c.id }))
)

// =============================================
// SHARED STATE
// =============================================

const activeTab = ref<'settings' | 'cards' | 'customers' | 'history'>('settings')
const loading = ref(true)
const saving = ref(false)
const snackbar = reactive({ show: false, message: '', color: 'success' })

// Reload fresh data when switching tabs
watch(activeTab, async tab => {
  if (tab === 'customers') {
    await customersStore.reload()
    loadCustomerStamps()
  }
  if (tab === 'cards') loadCards()
  if (tab === 'history' && !historyLoaded.value) loadHistory()
})

// =============================================
// SETTINGS TAB
// =============================================

interface FormData {
  stampsPerCycle: number
  stampThreshold: number
  stampLifetimeDays: number
  stampRewards: StampReward[]
  pointsLifetimeDays: number
  tierWindowDays: number
  maxTierDegradation: number
  tiers: TierConfig[]
  isActive: boolean
}

const form = ref<FormData | null>(null)
const original = ref<string>('')

const hasChanges = computed(() => {
  if (!form.value) return false
  return JSON.stringify(form.value) !== original.value
})

async function saveSettings() {
  if (!form.value) return
  saving.value = true

  try {
    await loyaltyStore.updateSettings(form.value)
    original.value = JSON.stringify(form.value)
    snackbar.message = 'Settings saved'
    snackbar.color = 'success'
    snackbar.show = true
  } catch {
    snackbar.message = 'Failed to save settings'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

// =============================================
// STAMP CARDS TAB
// =============================================

const stampCards = ref<StampCardListItem[]>([])
const loadingCards = ref(false)
const cardSearch = ref('')
const cardStatusFilter = ref<string | null>(null)
const cardStatusOptions = ['active', 'converted', 'expired']

const cardHeaders = [
  { title: 'Card #', key: 'cardNumber', sortable: true },
  { title: 'Stamps', key: 'stamps', sortable: true },
  { title: 'Cycle', key: 'cycle', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Customer', key: 'customerName', sortable: true },
  { title: 'Last Stamp', key: 'lastStampAt', sortable: true },
  { title: 'Created', key: 'createdAt', sortable: true }
]

const activeCards = computed(() => stampCards.value.filter(c => c.status === 'active').length)
const convertedCards = computed(() => stampCards.value.filter(c => c.status === 'converted').length)
const linkedCards = computed(() => stampCards.value.filter(c => c.customerId).length)

const filteredCards = computed(() => {
  let list = stampCards.value
  if (cardSearch.value) {
    const q = cardSearch.value.toLowerCase()
    list = list.filter(
      c => c.cardNumber.includes(q) || (c.customerName && c.customerName.toLowerCase().includes(q))
    )
  }
  if (cardStatusFilter.value) {
    list = list.filter(c => c.status === cardStatusFilter.value)
  }
  return list
})

const showCardDetail = ref(false)
const selectedCard = ref<StampCardListItem | null>(null)
const creatingCard = ref(false)
const cardSaving = ref(false)
const cardDeleting = ref(false)
const cardSaveError = ref('')
const cardForm = ref({
  status: 'active',
  stamps: 0,
  cycle: 1,
  customerId: null as string | null
})

const customerOptions = computed(() =>
  customersStore.activeCustomers.map(c => ({ id: c.id, name: c.name }))
)

function openCardDetail(card: StampCardListItem) {
  selectedCard.value = card
  cardForm.value = {
    status: card.status,
    stamps: card.stamps,
    cycle: card.cycle,
    customerId: card.customerId
  }
  cardSaveError.value = ''
  showCardDetail.value = true
}

async function handleCreateCard() {
  creatingCard.value = true
  try {
    await loyaltyStore.issueNewCard()
    await loadCards()
  } catch (err) {
    console.error('Failed to create card:', err)
  } finally {
    creatingCard.value = false
  }
}

async function handleSaveCard() {
  if (!selectedCard.value) return
  cardSaving.value = true
  cardSaveError.value = ''
  try {
    await loyaltyStore.updateCard(selectedCard.value.id, {
      status: cardForm.value.status,
      stamps: cardForm.value.stamps,
      cycle: cardForm.value.cycle,
      customer_id: cardForm.value.customerId
    })
    showCardDetail.value = false
    await loadCards()
  } catch (err) {
    cardSaveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    cardSaving.value = false
  }
}

async function handleDeleteCard() {
  if (!selectedCard.value) return
  cardDeleting.value = true
  try {
    await loyaltyStore.deleteCard(selectedCard.value.id)
    showCardDetail.value = false
    await loadCards()
  } catch (err) {
    cardSaveError.value = err instanceof Error ? err.message : 'Failed to delete'
  } finally {
    cardDeleting.value = false
  }
}

async function loadCards() {
  loadingCards.value = true
  try {
    stampCards.value = await loyaltyStore.listCards()
  } catch (err) {
    console.error('Failed to load stamp cards:', err)
  } finally {
    loadingCards.value = false
  }
}

// =============================================
// CUSTOMERS TAB
// =============================================

const loadingCustomers = ref(false)
const customerStampsMap = ref<Record<string, number>>({})
const customerSearch = ref('')
const customerLevelFilter = ref<string | null>(null)
const customerStatusFilter = ref<string | null>(null)
const levelFilterOptions = ['stamps', 'member', 'regular', 'vip', 'discount']
const showCustomerDetail = ref(false)
const showCreateCustomerDialog = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const customerTxs = ref<LoyaltyTransaction[]>([])
const loadingTx = ref(false)
const customerEditing = ref(false)
const custSaving = ref(false)
const custSaveError = ref('')
const togglingStatus = ref(false)

const tierOptions = ['member', 'regular', 'vip']

// Shared form for create & edit
const custForm = ref({
  name: '',
  phoneCode: '+62',
  phoneNumber: '',
  telegramUsername: '',
  notes: '',
  tier: 'member' as string,
  loyaltyProgram: 'stamps' as string,
  loyaltyBalance: 0,
  originalBalance: 0,
  stamps: 0,
  originalStamps: 0,
  activeCardId: null as string | null,
  balanceAdjustReason: '',
  personalDiscount: 0,
  discountNote: '',
  disableLoyaltyAccrual: false
})

const balanceChanged = computed(
  () => custForm.value.loyaltyBalance !== custForm.value.originalBalance
)

const customerHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Level', key: 'level', sortable: true },
  { title: 'Balance', key: 'loyaltyBalance', sortable: true },
  { title: 'Total Spent', key: 'totalSpent', sortable: true },
  { title: 'Visits', key: 'totalVisits', sortable: true },
  { title: 'Avg Check', key: 'averageCheck', sortable: true },
  { title: 'Registered', key: 'createdAt', sortable: true },
  { title: 'Last Visit', key: 'lastVisitAt', sortable: true },
  { title: 'Status', key: 'status', sortable: true }
]

async function loadCustomerStamps() {
  try {
    const { data } = await supabase
      .from('stamp_cards')
      .select('customer_id, stamp_entries(stamps)')
      .eq('status', 'active')
      .not('customer_id', 'is', null)
    if (data) {
      const map: Record<string, number> = {}
      for (const card of data) {
        if (card.customer_id) {
          map[card.customer_id] = ((card as any).stamp_entries || []).reduce(
            (sum: number, e: any) => sum + (e.stamps || 0),
            0
          )
        }
      }
      customerStampsMap.value = map
    }
  } catch {
    // Non-critical
  }
}

function getLevel(c: Customer): string {
  if (c.personalDiscount > 0) return `discount_${c.personalDiscount}`
  if (c.loyaltyProgram === 'stamps') return 'stamps'
  return c.tier
}

const filteredCustomers = computed(() => {
  let list = customersStore.customers
  if (customerSearch.value) {
    const q = customerSearch.value.toLowerCase()
    list = list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    )
  }
  if (customerLevelFilter.value) {
    const f = customerLevelFilter.value
    if (f === 'stamps')
      list = list.filter(c => c.loyaltyProgram === 'stamps' && !c.personalDiscount)
    else if (f === 'discount') list = list.filter(c => c.personalDiscount > 0)
    else
      list = list.filter(
        c => c.tier === f && c.loyaltyProgram === 'cashback' && !c.personalDiscount
      )
  }
  if (customerStatusFilter.value) {
    list = list.filter(c => c.status === customerStatusFilter.value)
  }
  return list.map(c => ({ ...c, level: getLevel(c) }))
})

const customerStats = computed(() => {
  const all = customersStore.customers
  const active = all.filter(c => c.status === 'active')
  return [
    { label: 'Total Customers', value: all.length, color: '' },
    { label: 'Active', value: active.length, color: 'text-success' },
    { label: 'VIP', value: all.filter(c => c.tier === 'vip').length, color: 'text-deep-purple' },
    {
      label: 'Total Balance',
      value: formatIDR(active.reduce((sum, c) => sum + c.loyaltyBalance, 0)),
      color: 'text-primary'
    }
  ]
})

// Phone code parsing helper
function parsePhone(phone: string | null): { code: string; number: string } {
  if (!phone) return { code: '+62', number: '' }
  const sorted = [...phoneCodes].sort((a, b) => b.value.length - a.value.length)
  for (const pc of sorted) {
    if (phone.startsWith(pc.value)) {
      return { code: pc.value, number: phone.slice(pc.value.length) }
    }
  }
  return { code: '+62', number: phone }
}

function resetCustForm() {
  custForm.value = {
    name: '',
    phoneCode: '+62',
    phoneNumber: '',
    telegramUsername: '',
    notes: '',
    tier: 'member',
    loyaltyProgram: 'stamps',
    loyaltyBalance: 0,
    originalBalance: 0,
    stamps: 0,
    originalStamps: 0,
    activeCardId: null,
    balanceAdjustReason: '',
    personalDiscount: 0,
    discountNote: '',
    disableLoyaltyAccrual: false
  }
  custSaveError.value = ''
}

// ---- Open detail (view mode) ----
async function openCustomerDetail(customer: Customer) {
  selectedCustomer.value = customer
  customerEditing.value = false
  custSaveError.value = ''
  showCustomerDetail.value = true
  loadingTx.value = true

  try {
    // Refresh + load transactions in parallel
    const [, txs] = await Promise.all([
      customersStore.refreshCustomer(customer.id).then(() => {
        selectedCustomer.value = customersStore.getById(customer.id) || customer
      }),
      loyaltyStore.getTransactions(customer.id, 20)
    ])
    customerTxs.value = txs
  } catch {
    customerTxs.value = []
  } finally {
    loadingTx.value = false
  }
}

// ---- Edit mode ----
async function startCustomerEdit() {
  if (!selectedCustomer.value) return
  const c = selectedCustomer.value
  const parsed = parsePhone(c.phone)

  // Get current stamps from active card via service
  let currentStamps = 0
  let activeCardId: string | null = null
  try {
    const cardInfo = await loyaltyStore.getActiveCardByCustomerId(c.id)
    if (cardInfo) {
      currentStamps = cardInfo.stamps
      activeCardId = cardInfo.cardId
    }
  } catch {
    // No active card
  }

  custForm.value = {
    name: c.name,
    phoneCode: parsed.code,
    phoneNumber: parsed.number,
    telegramUsername: c.telegramUsername || '',
    notes: c.notes || '',
    tier: c.tier,
    loyaltyProgram: c.loyaltyProgram || 'stamps',
    loyaltyBalance: c.loyaltyBalance || 0,
    originalBalance: c.loyaltyBalance || 0,
    stamps: currentStamps,
    originalStamps: currentStamps,
    activeCardId,
    balanceAdjustReason: '',
    personalDiscount: c.personalDiscount || 0,
    discountNote: c.discountNote || '',
    disableLoyaltyAccrual: c.disableLoyaltyAccrual || false
  }
  custSaveError.value = ''
  customerEditing.value = true
}

async function saveCustomerEdit() {
  if (!selectedCustomer.value || !custForm.value.name.trim()) return

  // Validate: balance change requires reason
  const balanceDiff = custForm.value.loyaltyBalance - custForm.value.originalBalance
  if (balanceDiff !== 0 && !custForm.value.balanceAdjustReason.trim()) {
    custSaveError.value = 'Adjustment reason is required when changing balance'
    return
  }

  custSaving.value = true
  custSaveError.value = ''

  try {
    const fullPhone = buildFullPhone(custForm.value.phoneCode, custForm.value.phoneNumber)
    const updated = await customersStore.updateCustomer(selectedCustomer.value.id, {
      name: custForm.value.name.trim(),
      phone: fullPhone || null,
      telegramUsername: custForm.value.telegramUsername.trim() || null,
      notes: custForm.value.notes.trim() || null,
      tier: custForm.value.tier,
      loyaltyProgram: custForm.value.loyaltyProgram,
      personalDiscount: Math.max(0, Math.min(100, custForm.value.personalDiscount || 0)),
      discountNote: custForm.value.discountNote.trim() || null,
      disableLoyaltyAccrual: custForm.value.disableLoyaltyAccrual
    } as Partial<Customer>)

    // Handle balance adjustment (creates audit trail via loyalty_transactions)
    if (balanceDiff !== 0) {
      await loyaltyService.adjustBalance(
        selectedCustomer.value.id,
        balanceDiff,
        custForm.value.balanceAdjustReason.trim()
      )
    }

    // Handle stamps change (use cached card ID from startCustomerEdit)
    const stampsDiff = custForm.value.stamps - custForm.value.originalStamps
    if (stampsDiff !== 0 && custForm.value.activeCardId) {
      await loyaltyStore.updateCard(custForm.value.activeCardId, { stamps: custForm.value.stamps })
    }

    selectedCustomer.value = updated
    // Refresh to get updated balance
    await customersStore.refreshCustomer(selectedCustomer.value.id)
    selectedCustomer.value = customersStore.getById(selectedCustomer.value.id) || updated
    customerEditing.value = false
    snackbar.message = 'Customer updated'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    custSaveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    custSaving.value = false
  }
}

// ---- Toggle status ----
async function toggleCustomerStatus() {
  if (!selectedCustomer.value) return
  togglingStatus.value = true
  try {
    const newStatus = selectedCustomer.value.status === 'active' ? 'blocked' : 'active'
    const updated = await customersStore.updateCustomer(selectedCustomer.value.id, {
      status: newStatus
    } as Partial<Customer>)
    selectedCustomer.value = updated
    snackbar.message = `Customer ${newStatus === 'active' ? 'activated' : 'deactivated'}`
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    console.error('Failed to toggle status:', err)
  } finally {
    togglingStatus.value = false
  }
}

// ---- Create customer ----
function openCreateCustomer() {
  resetCustForm()
  showCreateCustomerDialog.value = true
}

async function createNewCustomer() {
  if (!custForm.value.name.trim()) return
  custSaving.value = true
  custSaveError.value = ''

  try {
    const fullPhone = buildFullPhone(custForm.value.phoneCode, custForm.value.phoneNumber)
    await customersStore.createCustomer({
      name: custForm.value.name.trim(),
      phone: fullPhone || null,
      telegramUsername: custForm.value.telegramUsername.trim() || null,
      notes: custForm.value.notes.trim() || null,
      personalDiscount: Math.max(0, Math.min(100, custForm.value.personalDiscount || 0)),
      discountNote: custForm.value.discountNote.trim() || null,
      disableLoyaltyAccrual: custForm.value.disableLoyaltyAccrual
    } as Partial<Customer>)
    showCreateCustomerDialog.value = false
    snackbar.message = 'Customer created'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    custSaveError.value = err instanceof Error ? err.message : 'Failed to create customer'
  } finally {
    custSaving.value = false
  }
}

// =============================================
// MERGE CUSTOMER
// =============================================

const showMergeDialog = ref(false)
const mergeStep = ref<'select' | 'resolve'>('select')
const mergeSource = ref<Customer | null>(null)
const mergeTargetId = ref<string | null>(null)
const merging = ref(false)
const mergeError = ref('')
const mergeConflicts = ref<ConflictItem[]>([])
const mergeChoices = ref<Record<string, 'source' | 'target'>>({})

const mergeTargetOptions = computed(() => {
  if (!mergeSource.value) return []
  return customersStore.customers
    .filter(c => c.id !== mergeSource.value!.id && c.status === 'active')
    .map(c => ({
      id: c.id,
      label: `${c.name}${c.phone ? ' · ' + c.phone : ''}${c.telegramUsername ? ' · @' + c.telegramUsername : ''}`
    }))
})

const mergeTargetCustomer = computed(() => {
  if (!mergeTargetId.value) return null
  return customersStore.getById(mergeTargetId.value)
})

function openMergeDialog() {
  mergeSource.value = selectedCustomer.value
  mergeTargetId.value = null
  mergeError.value = ''
  mergeStep.value = 'select'
  mergeConflicts.value = []
  mergeChoices.value = {}
  showMergeDialog.value = true
}

function proceedToResolve() {
  if (!mergeSource.value || !mergeTargetCustomer.value) return
  const conflicts = detectConflicts(mergeSource.value, mergeTargetCustomer.value)
  if (conflicts.length === 0) {
    executeMerge()
    return
  }
  mergeConflicts.value = conflicts
  // Default all choices to 'target'
  mergeChoices.value = Object.fromEntries(conflicts.map(c => [c.field.key, 'target' as const]))
  mergeStep.value = 'resolve'
}

async function executeMerge() {
  if (!mergeSource.value || !mergeTargetId.value) return
  merging.value = true
  mergeError.value = ''

  try {
    const overrides = buildOverrides(mergeChoices.value, mergeSource.value)
    await customersStore.mergeCustomers(mergeSource.value.id, mergeTargetId.value, overrides)
    showMergeDialog.value = false
    showCustomerDetail.value = false
    snackbar.message = 'Customer merged successfully'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    mergeError.value = err instanceof Error ? err.message : 'Merge failed'
  } finally {
    merging.value = false
  }
}

// =============================================
// HISTORY TAB
// =============================================

type HistoryTransaction = LoyaltyTransaction & { customerName?: string; performedBy?: string }

const historyTransactions = ref<HistoryTransaction[]>([])
const historyLoaded = ref(false)
const loadingHistory = ref(false)
const historySearch = ref('')
const historyTypeFilter = ref<string | null>(null)
const transactionTypes = ['cashback', 'redemption', 'conversion', 'adjustment', 'expiration']

const historyHeaders = [
  { title: 'Date', key: 'createdAt', sortable: true },
  { title: 'Customer', key: 'customerName', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Amount', key: 'amount', sortable: true },
  { title: 'Balance After', key: 'balanceAfter', sortable: true },
  { title: 'Description', key: 'description', sortable: false }
]

const filteredHistory = computed(() => {
  let list = historyTransactions.value
  if (historySearch.value) {
    const q = historySearch.value.toLowerCase()
    list = list.filter(t => t.customerName?.toLowerCase().includes(q))
  }
  if (historyTypeFilter.value) {
    list = list.filter(t => t.type === historyTypeFilter.value)
  }
  return list
})

async function loadHistory() {
  loadingHistory.value = true
  try {
    historyTransactions.value = await loyaltyService.getAllTransactions(500)
    historyLoaded.value = true
  } catch (err) {
    console.error('Failed to load history:', err)
  } finally {
    loadingHistory.value = false
  }
}

function txTypeColor(type: string): string {
  switch (type) {
    case 'cashback':
      return 'success'
    case 'redemption':
      return 'error'
    case 'conversion':
      return 'purple'
    case 'adjustment':
      return 'warning'
    case 'expiration':
      return 'grey'
    default:
      return 'grey'
  }
}

function formatDateTime(date: string): string {
  return TimeUtils.formatDateTimeForDisplay(date)
}

// =============================================
// SHARED HELPERS
// =============================================

function getTierColor(tier: string): string {
  switch (tier) {
    case 'vip':
      return 'deep-purple'
    case 'regular':
      return 'blue'
    default:
      return 'grey'
  }
}

function formatRelative(date: string): string {
  return TimeUtils.getRelativeTime(date)
}

function formatDate(date: string): string {
  return TimeUtils.formatDateForDisplay(date)
}

function maskToken(token?: string): string {
  if (!token) return '-'
  if (token.length <= 4) return token
  return '****' + token.slice(-4)
}

// =============================================
// INITIALIZATION
// =============================================

onMounted(async () => {
  try {
    if (!loyaltyStore.initialized) await loyaltyStore.initialize()
    await customersStore.reload()

    // Load settings form
    const s = loyaltyStore.settings
    if (s) {
      form.value = {
        stampsPerCycle: s.stampsPerCycle,
        stampThreshold: s.stampThreshold,
        stampLifetimeDays: s.stampLifetimeDays,
        stampRewards: [
          ...s.stampRewards.map(r => ({ ...r, categoryIds: [...(r.categoryIds || [])] }))
        ],
        pointsLifetimeDays: s.pointsLifetimeDays,
        tierWindowDays: s.tierWindowDays,
        maxTierDegradation: s.maxTierDegradation,
        tiers: [...s.tiers.map(t => ({ ...t }))],
        isActive: s.isActive
      }
      original.value = JSON.stringify(form.value)
    }

    // Load stamp cards + customer stamps in parallel
    await Promise.all([loadCards(), loadCustomerStamps()])
  } catch (err) {
    snackbar.message = 'Failed to load loyalty data'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.loyalty-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loyalty-header {
  flex-shrink: 0;
}

.loyalty-content {
  flex: 1;
  overflow-y: auto;
}

.transaction-list {
  max-height: 250px;
  overflow-y: auto;
}

.merge-cell {
  transition: background-color 0.15s;
  border-radius: 4px;
}

.merge-cell--selected {
  background-color: rgba(255, 152, 0, 0.12);
}
</style>
