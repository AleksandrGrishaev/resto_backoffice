<script setup lang="ts">
/**
 * Base layout for PDF exports
 * A4 Portrait format, plain text styling
 */

defineProps<{
  title: string
  date: string
}>()
</script>

<template>
  <div class="export-layout">
    <header class="export-header">
      <h1 class="export-title">{{ title }}</h1>
      <p class="export-date">{{ date }}</p>
    </header>

    <main class="export-content">
      <slot />
    </main>

    <footer class="export-footer">
      <p>Generated on {{ date }}</p>
    </footer>
  </div>
</template>

<style scoped>
.export-layout {
  font-family: Arial, sans-serif;
  font-size: 12px;
  line-height: 1.4;
  color: #000;
  background: #fff;
  padding: 10mm;
  box-sizing: border-box;
}

.export-header {
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.export-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 4px 0;
}

.export-date {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.export-content {
  min-height: 200mm;
}

.export-footer {
  border-top: 1px solid #ccc;
  padding-top: 8px;
  margin-top: 16px;
  font-size: 10px;
  color: #999;
  text-align: center;
}
</style>
