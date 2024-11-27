// src/components/accounts/list/AccountListToolbar.vue
<template>
  <div class="account-list-toolbar">
    <div class="d-flex align-center gap-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="emit('create-operation', 'income')">
        Приход
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi-minus" @click="emit('create-operation', 'expense')">
        Расход
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-bank-transfer"
        @click="emit('create-operation', 'transfer')"
      >
        Перевод
      </v-btn>
    </div>

    <v-spacer />

    <div class="d-flex align-center gap-4">
      <v-text-field
        v-model="search"
        append-inner-icon="mdi-magnify"
        label="Поиск"
        single-line
        hide-details
        density="compact"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OperationType } from '@/types/transaction'

const search = ref('')

const emit = defineEmits<{
  'create-operation': [type: OperationType]
}>()
</script>

<style lang="scss" scoped>
.account-list-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: 8px;
}

.gap-4 {
  gap: 16px;
}
</style>
