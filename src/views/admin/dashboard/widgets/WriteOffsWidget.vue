<!-- src/views/admin/dashboard/widgets/WriteOffsWidget.vue -->
<template>
  <WidgetCard title="Write-offs" icon="mdi-delete-sweep" size="medium" :loading="loading">
    <div v-if="writeOffs.total === 0" class="no-data">No write-offs</div>
    <div v-else class="writeoffs-content">
      <div class="total-row">
        <span class="total-label">Total</span>
        <span class="total-value">{{ writeOffs.total }}</span>
      </div>

      <div v-if="writeOffs.byType.length" class="section">
        <div class="section-label">By Type</div>
        <div v-for="item in writeOffs.byType" :key="item.type" class="row">
          <span class="row-label">{{ formatType(item.type) }}</span>
          <div class="row-bar-wrap">
            <div class="row-bar" :style="{ width: `${(item.count / writeOffs.total) * 100}%` }" />
          </div>
          <span class="row-count">{{ item.count }}</span>
        </div>
      </div>

      <div v-if="writeOffs.byDepartment.length" class="section">
        <div class="section-label">By Department</div>
        <div v-for="item in writeOffs.byDepartment" :key="item.department" class="row">
          <span class="row-label">{{ capitalize(item.department) }}</span>
          <div class="row-bar-wrap">
            <div
              class="row-bar dept-bar"
              :style="{ width: `${(item.count / writeOffs.total) * 100}%` }"
            />
          </div>
          <span class="row-count">{{ item.count }}</span>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import type { WriteOffSummary } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

defineProps<{
  writeOffs: WriteOffSummary
  loading: boolean
}>()

function formatType(type: string): string {
  const map: Record<string, string> = {
    sale: 'Sales',
    manual: 'Manual',
    production: 'Production',
    unknown: 'Unknown'
  }
  return map[type] || capitalize(type)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<style scoped lang="scss">
.writeoffs-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.total-label {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.6;
}

.total-value {
  font-size: 20px;
  font-weight: 700;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.4;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-label {
  font-size: 12px;
  width: 80px;
  flex-shrink: 0;
  opacity: 0.7;
}

.row-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.row-bar {
  height: 100%;
  border-radius: 3px;
  background: #ff9676;
  transition: width 0.3s ease;
}

.dept-bar {
  background: #76b0ff;
}

.row-count {
  font-size: 12px;
  font-weight: 600;
  width: 30px;
  text-align: right;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  opacity: 0.4;
  font-size: 13px;
}
</style>
