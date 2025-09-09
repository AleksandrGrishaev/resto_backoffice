<!-- src/components/organisms/LazyList.vue -->
<template>
  <div class="lazy-list">
    <!-- Header slot -->
    <div v-if="$slots.header" class="lazy-list-header">
      <slot name="header" :meta="meta" :loading="isInitialLoading" :refresh="refresh" />
    </div>

    <!-- Filters slot -->
    <div v-if="$slots.filters" class="lazy-list-filters">
      <slot
        name="filters"
        :filters="filters"
        :update-filters="updateFilters"
        :loading="isInitialLoading"
      />
    </div>

    <!-- Content area -->
    <div class="lazy-list-content">
      <!-- Initial loading -->
      <div v-if="isInitialLoading" class="lazy-list-loading">
        <slot name="loading">
          <div class="default-loading">
            <v-progress-circular indeterminate :size="loadingSize" />
            <div v-if="loadingText" class="loading-text">{{ loadingText }}</div>
          </div>
        </slot>
      </div>

      <!-- Empty state -->
      <div v-else-if="isEmpty" class="lazy-list-empty">
        <slot name="empty">
          <div class="default-empty">
            <v-icon :size="emptyIconSize" color="grey-lighten-1">
              {{ emptyIcon }}
            </v-icon>
            <h4>{{ emptyTitle }}</h4>
            <p v-if="emptyDescription">{{ emptyDescription }}</p>
            <v-btn v-if="showRetryOnEmpty" variant="outlined" color="primary" @click="refresh">
              <v-icon>mdi-refresh</v-icon>
              Try Again
            </v-btn>
          </div>
        </slot>
      </div>

      <!-- Items list -->
      <div v-else class="lazy-list-items">
        <!-- Items content -->
        <div class="items-container">
          <template v-for="(item, index) in items" :key="getItemKey(item, index)">
            <slot
              name="item"
              :item="item"
              :index="index"
              :is-first="index === 0"
              :is-last="index === items.length - 1"
            />
          </template>
        </div>

        <!-- Load more section -->
        <div v-if="meta.hasMore && !hideLoadMore" class="lazy-list-load-more">
          <slot name="load-more" :load-more="loadMore" :loading="isLoadingMore">
            <v-btn
              :loading="isLoadingMore"
              :disabled="isLoadingMore"
              variant="outlined"
              color="primary"
              block
              @click="loadMore"
            >
              <v-icon>mdi-chevron-down</v-icon>
              {{ loadMoreText }}
            </v-btn>
          </slot>
        </div>

        <!-- Loading more indicator -->
        <div v-if="isLoadingMore" class="lazy-list-loading-more">
          <slot name="loading-more">
            <v-progress-linear indeterminate color="primary" />
            <div class="loading-more-text">{{ loadingMoreText }}</div>
          </slot>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="state.error" class="lazy-list-error">
        <slot name="error" :error="state.error" :retry="refresh" :clear-error="clearError">
          <v-alert type="error" class="mb-4">
            {{ state.error }}
            <template #append>
              <v-btn variant="text" size="small" @click="refresh">Retry</v-btn>
            </template>
          </v-alert>
        </slot>
      </div>
    </div>

    <!-- Footer slot -->
    <div v-if="$slots.footer" class="lazy-list-footer">
      <slot name="footer" :meta="meta" :loading="isLoadingMore" :load-more="loadMore" />
    </div>

    <!-- Pagination info (optional) -->
    <div v-if="showPaginationInfo && hasData" class="lazy-list-pagination-info">
      <slot name="pagination-info" :meta="meta">
        <v-chip variant="outlined" size="small">
          {{ meta.currentCount }} of {{ meta.total }}{{ meta.total === 0 ? '+' : '' }} items
        </v-chip>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TItem, TFilters">
import { computed } from 'vue'
import type { LazyLoadingState, LazyLoadingMeta } from '@/composables/useLazyLoading'

interface Props {
  // Required lazy loading data
  state: LazyLoadingState
  items: TItem[]
  filters: TFilters
  meta: LazyLoadingMeta
  isInitialLoading: boolean
  isLoadingMore: boolean
  isEmpty: boolean
  hasData: boolean

  // Required methods
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  updateFilters: (filters: Partial<TFilters>) => void
  clearError: () => void

  // Customization props
  itemKey?: string | ((item: TItem, index: number) => string | number)

  // Loading customization
  loadingText?: string
  loadingSize?: string | number
  loadingMoreText?: string
  loadMoreText?: string

  // Empty state customization
  emptyIcon?: string
  emptyIconSize?: string | number
  emptyTitle?: string
  emptyDescription?: string
  showRetryOnEmpty?: boolean

  // UI options
  hideLoadMore?: boolean
  showPaginationInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  itemKey: 'id',
  loadingText: 'Loading...',
  loadingSize: 32,
  loadingMoreText: 'Loading more...',
  loadMoreText: 'Load More',
  emptyIcon: 'mdi-inbox-outline',
  emptyIconSize: 64,
  emptyTitle: 'No items found',
  emptyDescription: '',
  showRetryOnEmpty: false,
  hideLoadMore: false,
  showPaginationInfo: true
})

// Methods
function getItemKey(item: TItem, index: number): string | number {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item, index)
  }

  if (typeof props.itemKey === 'string') {
    return (item as any)[props.itemKey] ?? index
  }

  return index
}
</script>

<style lang="scss" scoped>
.lazy-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lazy-list-header,
.lazy-list-filters,
.lazy-list-footer {
  flex-shrink: 0;
}

.lazy-list-content {
  flex: 1;
  min-height: 0; // Important for flex scrolling
}

.lazy-list-loading,
.lazy-list-empty,
.lazy-list-error {
  padding: 32px 16px;
  text-align: center;
}

.default-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .loading-text {
    color: rgb(var(--v-theme-on-surface-variant));
  }
}

.default-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: rgb(var(--v-theme-on-surface-variant));

  h4 {
    margin: 0;
    font-weight: 500;
  }

  p {
    margin: 0;
    opacity: 0.7;
  }
}

.lazy-list-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.items-container {
  display: flex;
  flex-direction: column;
  gap: inherit;
}

.lazy-list-load-more {
  margin-top: 16px;
}

.lazy-list-loading-more {
  margin-top: 12px;
  padding: 8px 0;

  .loading-more-text {
    text-align: center;
    margin-top: 8px;
    font-size: 0.875rem;
    color: rgb(var(--v-theme-on-surface-variant));
  }
}

.lazy-list-pagination-info {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.lazy-list-error {
  padding: 16px 0;
}

// Responsive adjustments
@media (max-width: 600px) {
  .lazy-list {
    gap: 12px;
  }

  .lazy-list-loading,
  .lazy-list-empty {
    padding: 24px 12px;
  }

  .default-empty {
    gap: 12px;

    h4 {
      font-size: 1.1rem;
    }
  }
}
</style>
