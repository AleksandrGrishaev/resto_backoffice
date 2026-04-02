<!-- src/views/admin/dashboard/widgets/DepartmentSalesWidget.vue -->
<template>
  <WidgetCard title="Sales by Department" icon="mdi-domain" size="medium" :loading="loading">
    <div v-if="departmentSales.length" class="dept-content">
      <div v-for="dept in departmentSales" :key="dept.department" class="dept-row">
        <div class="dept-header">
          <v-icon size="16" :color="getDeptColor(dept.department)">
            {{ getDeptIcon(dept.department) }}
          </v-icon>
          <span class="dept-name">{{ capitalize(dept.department) }}</span>
          <span class="dept-items">{{ dept.itemsSold }} items</span>
        </div>
        <div class="dept-bar-wrap">
          <div
            class="dept-bar"
            :style="{
              width: `${(dept.revenue / maxRevenue) * 100}%`,
              background: getDeptColor(dept.department)
            }"
          />
        </div>
        <div class="dept-revenue">{{ formatIDR(dept.revenue) }}</div>
      </div>
    </div>
    <div v-else class="no-data">No sales data</div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils'
import type { DepartmentSale } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

const props = defineProps<{
  departmentSales: DepartmentSale[]
  loading: boolean
}>()

const maxRevenue = computed(() => Math.max(...props.departmentSales.map(d => d.revenue), 1))

function getDeptIcon(dept: string): string {
  const map: Record<string, string> = {
    kitchen: 'mdi-chef-hat',
    bar: 'mdi-glass-cocktail',
    other: 'mdi-dots-horizontal'
  }
  return map[dept] || 'mdi-store'
}

function getDeptColor(dept: string): string {
  const map: Record<string, string> = {
    kitchen: '#ff9676',
    bar: '#76b0ff',
    other: '#92c9af'
  }
  return map[dept] || '#a395e9'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<style scoped lang="scss">
.dept-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dept-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dept-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-name {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
}

.dept-items {
  font-size: 11px;
  opacity: 0.4;
}

.dept-bar-wrap {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.dept-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.dept-revenue {
  font-size: 15px;
  font-weight: 700;
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
