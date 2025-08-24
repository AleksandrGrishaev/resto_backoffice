# Diff Details

Date : 2025-08-24 09:13:03

Directory /Users/peaker/dev/kitchen-app/backoffice/src

Total : 34 files, 7172 codes, 753 comments, 1161 blanks, all 9086 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files

| filename                                                                                                                              | language   |  code | comment | blank | total |
| :------------------------------------------------------------------------------------------------------------------------------------ | :--------- | ----: | ------: | ----: | ----: |
| [src/components/navigation/DebugStoresBadge.vue](/src/components/navigation/DebugStoresBadge.vue)                                     | Vue        |    54 |       1 |    13 |    68 |
| [src/components/navigation/NavigationMenu.vue](/src/components/navigation/NavigationMenu.vue)                                         | Vue        |    47 |      31 |     6 |    84 |
| [src/core/appInitializer.ts](/src/core/appInitializer.ts)                                                                             | TypeScript |    53 |       6 |    16 |    75 |
| [src/core/appInitializerTests.ts](/src/core/appInitializerTests.ts)                                                                   | TypeScript |   469 |      88 |   100 |   657 |
| [src/router/index.ts](/src/router/index.ts)                                                                                           | TypeScript |    25 |       4 |     2 |    31 |
| [src/stores/debug/composables/useDebugFormatting.ts](/src/stores/debug/composables/useDebugFormatting.ts)                             | TypeScript |   276 |     107 |    52 |   435 |
| [src/stores/debug/composables/useDebugHistory_back.ts](/src/stores/debug/composables/useDebugHistory_back.ts)                         | TypeScript |   479 |      70 |    90 |   639 |
| [src/stores/debug/composables/useDebugStores.ts](/src/stores/debug/composables/useDebugStores.ts)                                     | TypeScript |   213 |     105 |    53 |   371 |
| [src/stores/debug/composables/useEnhancedHistory.ts](/src/stores/debug/composables/useEnhancedHistory.ts)                             | TypeScript |   384 |      70 |    73 |   527 |
| [src/stores/debug/debugService.ts](/src/stores/debug/debugService.ts)                                                                 | TypeScript | 1,123 |      81 |   152 | 1,356 |
| [src/stores/debug/debugStore.ts](/src/stores/debug/debugStore.ts)                                                                     | TypeScript |   412 |     106 |    91 |   609 |
| [src/stores/debug/index.ts](/src/stores/debug/index.ts)                                                                               | TypeScript |    23 |       6 |     6 |    35 |
| [src/stores/debug/types.ts](/src/stores/debug/types.ts)                                                                               | TypeScript |   220 |      18 |    29 |   267 |
| [src/stores/storage/composables/useWriteOff.ts](/src/stores/storage/composables/useWriteOff.ts)                                       | TypeScript |    75 |      16 |    21 |   112 |
| [src/stores/storage/storageService.ts](/src/stores/storage/storageService.ts)                                                         | TypeScript |     3 |       4 |     3 |    10 |
| [src/stores/storage/storageStore.ts](/src/stores/storage/storageStore.ts)                                                             | TypeScript |   -32 |     -15 |   -22 |   -69 |
| [src/stores/storage/types.ts](/src/stores/storage/types.ts)                                                                           | TypeScript |   110 |     -31 |   -17 |    62 |
| [src/views/debug/DebugView.vue](/src/views/debug/DebugView.vue)                                                                       | Vue        |   505 |      28 |    64 |   597 |
| [src/views/debug/components/EnhancedHistoryEntry.vue](/src/views/debug/components/EnhancedHistoryEntry.vue)                           | Vue        |   428 |      15 |    61 |   504 |
| [src/views/debug/components/EnhancedHistoryView.vue](/src/views/debug/components/EnhancedHistoryView.vue)                             | Vue        |   348 |      12 |    46 |   406 |
| [src/views/debug/components/HistoryEntryDetails.vue](/src/views/debug/components/HistoryEntryDetails.vue)                             | Vue        |   145 |       4 |    14 |   163 |
| [src/views/debug/components/JsonNavigator.vue](/src/views/debug/components/JsonNavigator.vue)                                         | Vue        |   477 |       9 |    78 |   564 |
| [src/views/debug/components/JsonTreeNode.vue](/src/views/debug/components/JsonTreeNode.vue)                                           | Vue        |   425 |      14 |    89 |   528 |
| [src/views/storage/StorageView-copy.vue](/src/views/storage/StorageView-copy.vue)                                                     | Vue        |  -517 |     -16 |   -71 |  -604 |
| [src/views/storage/StorageView.vue](/src/views/storage/StorageView.vue)                                                               | Vue        |  -111 |      -8 |   -40 |  -159 |
| [src/views/storage/components/dialogs/WriteOffDialog.vue](/src/views/storage/components/dialogs/WriteOffDialog.vue)                   | Vue        |  -392 |     -16 |   -56 |  -464 |
| [src/views/storage/components/tabs/StorageAnalyticsTab.vue](/src/views/storage/components/tabs/StorageAnalyticsTab.vue)               | Vue        |    -1 |      -5 |    -4 |   -10 |
| [src/views/storage/components/widgets/QuickWriteOffButton.vue](/src/views/storage/components/widgets/QuickWriteOffButton.vue)         | Vue        |  -334 |     -13 |   -53 |  -400 |
| [src/views/storage/components/writeoff/ProductCard.vue](/src/views/storage/components/writeoff/ProductCard.vue)                       | Vue        |   265 |       9 |    50 |   324 |
| [src/views/storage/components/writeoff/ProductListRow.vue](/src/views/storage/components/writeoff/ProductListRow.vue)                 | Vue        |   215 |       8 |    44 |   267 |
| [src/views/storage/components/writeoff/ProductSelectorWidget.vue](/src/views/storage/components/writeoff/ProductSelectorWidget.vue)   | Vue        |   714 |      11 |   111 |   836 |
| [src/views/storage/components/writeoff/WriteOffDialog.vue](/src/views/storage/components/writeoff/WriteOffDialog.vue)                 | Vue        |   513 |      21 |    69 |   603 |
| [src/views/storage/components/writeoff/WriteOffQuantityDialog.vue](/src/views/storage/components/writeoff/WriteOffQuantityDialog.vue) | Vue        |   477 |       8 |    75 |   560 |
| [src/views/storage/components/writeoff/WriteOffWidget.vue](/src/views/storage/components/writeoff/WriteOffWidget.vue)                 | Vue        |    81 |       5 |    16 |   102 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details
