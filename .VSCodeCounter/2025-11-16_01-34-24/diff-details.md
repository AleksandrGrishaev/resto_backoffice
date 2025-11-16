# Diff Details

Date : 2025-11-16 01:34:24

Directory /Users/peaker/dev/kitchen-app/backoffice/src

Total : 118 files, 16003 codes, 1434 comments, 3298 blanks, all 20735 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files

| filename                                                                                                                                        | language   |  code | comment | blank | total |
| :---------------------------------------------------------------------------------------------------------------------------------------------- | :--------- | ----: | ------: | ----: | ----: |
| [src/About/POS/SPRINT_4_POS_SHIFT_SYNC.md](/src/About/POS/SPRINT_4_POS_SHIFT_SYNC.md)                                                           | Markdown   |   413 |       0 |   164 |   577 |
| [src/About/POS/Sprint3.md](/src/About/POS/Sprint3.md)                                                                                           | Markdown   |   459 |       0 |   155 |   614 |
| [src/About/SupabaseGlobalTodo.md](/src/About/SupabaseGlobalTodo.md)                                                                             | Markdown   |   849 |       0 |   181 | 1,030 |
| [src/About/backlog.md](/src/About/backlog.md)                                                                                                   | Markdown   |     0 |       0 |     1 |     1 |
| [src/About/kitchen/sprint1.md](/src/About/kitchen/sprint1.md)                                                                                   | Markdown   |   856 |       0 |   235 | 1,091 |
| [src/About/todo.md](/src/About/todo.md)                                                                                                         | Markdown   | 1,624 |       0 |   522 | 2,146 |
| [src/components/navigation/NavigationMenu.vue](/src/components/navigation/NavigationMenu.vue)                                                   | Vue        |    22 |       2 |     2 |    26 |
| [src/config/environment.ts](/src/config/environment.ts)                                                                                         | TypeScript |    19 |       5 |     3 |    27 |
| [src/core/appInitializer.ts](/src/core/appInitializer.ts)                                                                                       | TypeScript |     3 |       0 |     0 |     3 |
| [src/core/initialization/DevInitializationStrategy.ts](/src/core/initialization/DevInitializationStrategy.ts)                                   | TypeScript |    30 |       1 |     8 |    39 |
| [src/core/initialization/ProductionInitializationStrategy.ts](/src/core/initialization/ProductionInitializationStrategy.ts)                     | TypeScript |    30 |       2 |     8 |    40 |
| [src/core/initialization/dependencies.ts](/src/core/initialization/dependencies.ts)                                                             | TypeScript |     5 |       4 |     2 |    11 |
| [src/core/initialization/types.ts](/src/core/initialization/types.ts)                                                                           | TypeScript |     1 |       0 |     0 |     1 |
| [src/core/sync/SyncService.ts](/src/core/sync/SyncService.ts)                                                                                   | TypeScript |   366 |      42 |    82 |   490 |
| [src/core/sync/adapters/ShiftSyncAdapter.ts](/src/core/sync/adapters/ShiftSyncAdapter.ts)                                                       | TypeScript |   188 |      33 |    47 |   268 |
| [src/core/sync/migrations/migrateLegacyShiftQueue.ts](/src/core/sync/migrations/migrateLegacyShiftQueue.ts)                                     | TypeScript |    61 |      17 |    18 |    96 |
| [src/core/sync/storage/ApiSyncStorage.ts](/src/core/sync/storage/ApiSyncStorage.ts)                                                             | TypeScript |    89 |       8 |    18 |   115 |
| [src/core/sync/storage/LocalStorageSyncStorage.ts](/src/core/sync/storage/LocalStorageSyncStorage.ts)                                           | TypeScript |    73 |      10 |    14 |    97 |
| [src/core/sync/storage/index.ts](/src/core/sync/storage/index.ts)                                                                               | TypeScript |     2 |       3 |     2 |     7 |
| [src/core/sync/types.ts](/src/core/sync/types.ts)                                                                                               | TypeScript |   114 |      71 |    41 |   226 |
| [src/core/users.ts](/src/core/users.ts)                                                                                                         | TypeScript |     9 |       0 |     0 |     9 |
| [src/firebase/config.ts](/src/firebase/config.ts)                                                                                               | TypeScript |   -33 |      -1 |   -11 |   -45 |
| [src/firebase/converters.ts](/src/firebase/converters.ts)                                                                                       | TypeScript |   -45 |      -1 |    -4 |   -50 |
| [src/firebase/services/base.service.ts](/src/firebase/services/base.service.ts)                                                                 | TypeScript |   -81 |      -1 |   -10 |   -92 |
| [src/layouts/KitchenLayout.vue](/src/layouts/KitchenLayout.vue)                                                                                 | Vue        |    91 |       3 |    16 |   110 |
| [src/router/index.ts](/src/router/index.ts)                                                                                                     | TypeScript |    47 |       3 |     3 |    53 |
| [src/scripts/migrateMenuToSupabase.ts](/src/scripts/migrateMenuToSupabase.ts)                                                                   | TypeScript |    89 |      17 |    32 |   138 |
| [src/services/auth.service.ts](/src/services/auth.service.ts)                                                                                   | TypeScript |   -80 |      -2 |   -18 |  -100 |
| [src/services/index.ts](/src/services/index.ts)                                                                                                 | TypeScript |    -1 |       0 |    -1 |    -2 |
| [src/services/payment-method.service.ts](/src/services/payment-method.service.ts)                                                               | TypeScript |    26 |       4 |     9 |    39 |
| [src/services/tax.service.ts](/src/services/tax.service.ts)                                                                                     | TypeScript |    26 |       4 |     9 |    39 |
| [src/stores/account/mock.ts](/src/stores/account/mock.ts)                                                                                       | TypeScript |    26 |       2 |     2 |    30 |
| [src/stores/account/service.ts](/src/stores/account/service.ts)                                                                                 | TypeScript |    14 |       3 |     1 |    18 |
| [src/stores/account/store.ts](/src/stores/account/store.ts)                                                                                     | TypeScript |   135 |      29 |    28 |   192 |
| [src/stores/account/types.ts](/src/stores/account/types.ts)                                                                                     | TypeScript |     7 |       4 |     2 |    13 |
| [src/stores/kitchen/composables/index.ts](/src/stores/kitchen/composables/index.ts)                                                             | TypeScript |     4 |       1 |     1 |     6 |
| [src/stores/kitchen/composables/useKitchenDishes.ts](/src/stores/kitchen/composables/useKitchenDishes.ts)                                       | TypeScript |   142 |      55 |    30 |   227 |
| [src/stores/kitchen/composables/useKitchenOrders.ts](/src/stores/kitchen/composables/useKitchenOrders.ts)                                       | TypeScript |    70 |      35 |    14 |   119 |
| [src/stores/kitchen/composables/useKitchenStatus.ts](/src/stores/kitchen/composables/useKitchenStatus.ts)                                       | TypeScript |    79 |      23 |     8 |   110 |
| [src/stores/kitchen/index.ts](/src/stores/kitchen/index.ts)                                                                                     | TypeScript |   115 |      18 |    25 |   158 |
| [src/stores/kitchen/kitchenService.ts](/src/stores/kitchen/kitchenService.ts)                                                                   | TypeScript |   142 |      38 |    30 |   210 |
| [src/stores/kitchen/mocks/kitchenMockData.ts](/src/stores/kitchen/mocks/kitchenMockData.ts)                                                     | TypeScript |   197 |      19 |    19 |   235 |
| [src/stores/kitchen/useKitchenRealtime.ts](/src/stores/kitchen/useKitchenRealtime.ts)                                                           | TypeScript |    81 |      19 |    13 |   113 |
| [src/stores/menu/index.ts](/src/stores/menu/index.ts)                                                                                           | TypeScript |    23 |       2 |     0 |    25 |
| [src/stores/menu/menuMock.ts](/src/stores/menu/menuMock.ts)                                                                                     | TypeScript |   338 |       7 |     7 |   352 |
| [src/stores/menu/menuService.ts](/src/stores/menu/menuService.ts)                                                                               | TypeScript |   124 |      16 |    19 |   159 |
| [src/stores/menu/menuStore.ts](/src/stores/menu/menuStore.ts)                                                                                   | TypeScript |    34 |       7 |     8 |    49 |
| [src/stores/menu/supabaseMappers.ts](/src/stores/menu/supabaseMappers.ts)                                                                       | TypeScript |   114 |      85 |    36 |   235 |
| [src/stores/menu/types.ts](/src/stores/menu/types.ts)                                                                                           | TypeScript |   127 |      17 |    30 |   174 |
| [src/stores/pos/index.ts](/src/stores/pos/index.ts)                                                                                             | TypeScript |    36 |      11 |    11 |    58 |
| [src/stores/pos/orders/composables/index.ts](/src/stores/pos/orders/composables/index.ts)                                                       | TypeScript |     2 |       1 |     1 |     4 |
| [src/stores/pos/orders/composables/useKitchenDecomposition.ts](/src/stores/pos/orders/composables/useKitchenDecomposition.ts)                   | TypeScript |   329 |      60 |    59 |   448 |
| [src/stores/pos/orders/ordersStore.ts](/src/stores/pos/orders/ordersStore.ts)                                                                   | TypeScript |     3 |       1 |     1 |     5 |
| [src/stores/pos/orders/services.ts](/src/stores/pos/orders/services.ts)                                                                         | TypeScript |    60 |      23 |    14 |    97 |
| [src/stores/pos/orders/supabaseMappers.ts](/src/stores/pos/orders/supabaseMappers.ts)                                                           | TypeScript |   220 |      70 |    55 |   345 |
| [src/stores/pos/orders/useOrdersRealtime.ts](/src/stores/pos/orders/useOrdersRealtime.ts)                                                       | TypeScript |    76 |      17 |    14 |   107 |
| [src/stores/pos/payments/paymentsStore.ts](/src/stores/pos/payments/paymentsStore.ts)                                                           | TypeScript |     1 |       1 |     1 |     3 |
| [src/stores/pos/payments/services.ts](/src/stores/pos/payments/services.ts)                                                                     | TypeScript |    40 |      15 |     9 |    64 |
| [src/stores/pos/payments/supabaseMappers.ts](/src/stores/pos/payments/supabaseMappers.ts)                                                       | TypeScript |    72 |      31 |    23 |   126 |
| [src/stores/pos/service/DepartmentNotificationService.ts](/src/stores/pos/service/DepartmentNotificationService.ts)                             | TypeScript |    -3 |       2 |     0 |    -1 |
| [src/stores/pos/shifts/mock.ts](/src/stores/pos/shifts/mock.ts)                                                                                 | TypeScript |    94 |      14 |    10 |   118 |
| [src/stores/pos/shifts/services.ts](/src/stores/pos/shifts/services.ts)                                                                         | TypeScript |   180 |      58 |    39 |   277 |
| [src/stores/pos/shifts/shiftsStore.ts](/src/stores/pos/shifts/shiftsStore.ts)                                                                   | TypeScript |   456 |      98 |    91 |   645 |
| [src/stores/pos/shifts/supabaseMappers.ts](/src/stores/pos/shifts/supabaseMappers.ts)                                                           | TypeScript |   171 |      28 |    26 |   225 |
| [src/stores/pos/shifts/types.ts](/src/stores/pos/shifts/types.ts)                                                                               | TypeScript |    72 |      37 |    18 |   127 |
| [src/stores/pos/tables/composables/useTables.ts](/src/stores/pos/tables/composables/useTables.ts)                                               | TypeScript |    -6 |       1 |    -1 |    -6 |
| [src/stores/pos/tables/services.ts](/src/stores/pos/tables/services.ts)                                                                         | TypeScript |    40 |       7 |     6 |    53 |
| [src/stores/pos/tables/supabaseMappers.ts](/src/stores/pos/tables/supabaseMappers.ts)                                                           | TypeScript |    47 |      18 |     8 |    73 |
| [src/stores/pos/tables/tablesStore.ts](/src/stores/pos/tables/tablesStore.ts)                                                                   | TypeScript |  -178 |      -3 |    -1 |  -182 |
| [src/stores/pos/types.ts](/src/stores/pos/types.ts)                                                                                             | TypeScript |     3 |       2 |     4 |     9 |
| [src/stores/productsStore/productsService.ts](/src/stores/productsStore/productsService.ts)                                                     | TypeScript |   -21 |     -33 |     3 |   -51 |
| [src/stores/recipes/recipesMock.ts](/src/stores/recipes/recipesMock.ts)                                                                         | TypeScript |    36 |       1 |     1 |    38 |
| [src/stores/shared/productDefinitions.ts](/src/stores/shared/productDefinitions.ts)                                                             | TypeScript |   240 |      10 |    49 |   299 |
| [src/supabase/README.md](/src/supabase/README.md)                                                                                               | Markdown   |   198 |       0 |    94 |   292 |
| [src/supabase/client.ts](/src/supabase/client.ts)                                                                                               | TypeScript |    37 |      23 |    12 |    72 |
| [src/supabase/config.ts](/src/supabase/config.ts)                                                                                               | TypeScript |    44 |      18 |     7 |    69 |
| [src/supabase/index.ts](/src/supabase/index.ts)                                                                                                 | TypeScript |    16 |       1 |     2 |    19 |
| [src/supabase/migrations/001_initial_schema.sql](/src/supabase/migrations/001_initial_schema.sql)                                               | MS SQL     |   195 |      67 |    63 |   325 |
| [src/supabase/migrations/002_add_missing_shift_fields.sql](/src/supabase/migrations/002_add_missing_shift_fields.sql)                           | MS SQL     |    29 |       7 |     6 |    42 |
| [src/supabase/migrations/003_update_orders_payments_schema.sql](/src/supabase/migrations/003_update_orders_payments_schema.sql)                 | MS SQL     |    88 |      32 |    21 |   141 |
| [src/supabase/migrations/004_create_menu_tables.sql](/src/supabase/migrations/004_create_menu_tables.sql)                                       | MS SQL     |    52 |      37 |    27 |   116 |
| [src/supabase/types.gen.ts](/src/supabase/types.gen.ts)                                                                                         | TypeScript |    15 |       4 |     3 |    22 |
| [src/supabase/types.ts](/src/supabase/types.ts)                                                                                                 | TypeScript |   683 |      12 |    18 |   713 |
| [src/utils/time.ts](/src/utils/time.ts)                                                                                                         | TypeScript |    -7 |       0 |    -2 |    -9 |
| [src/views/accounts/AccountDetailView.vue](/src/views/accounts/AccountDetailView.vue)                                                           | Vue        |    23 |       1 |     3 |    27 |
| [src/views/accounts/components/detail/PendingPaymentsSection.vue](/src/views/accounts/components/detail/PendingPaymentsSection.vue)             | Vue        |   159 |       0 |    17 |   176 |
| [src/views/accounts/components/list/PaymentConfirmationDialog.vue](/src/views/accounts/components/list/PaymentConfirmationDialog.vue)           | Vue        |    10 |       0 |     2 |    12 |
| [src/views/backoffice/sales/ShiftHistoryView.vue](/src/views/backoffice/sales/ShiftHistoryView.vue)                                             | Vue        |   302 |      12 |    39 |   353 |
| [src/views/debug/SupabaseTestView.vue](/src/views/debug/SupabaseTestView.vue)                                                                   | Vue        |   294 |       6 |    36 |   336 |
| [src/views/debug/SyncMonitorView.vue](/src/views/debug/SyncMonitorView.vue)                                                                     | Vue        |   834 |      23 |    77 |   934 |
| [src/views/kitchen/KitchenMainView.vue](/src/views/kitchen/KitchenMainView.vue)                                                                 | Vue        |   188 |       9 |    34 |   231 |
| [src/views/kitchen/components/KitchenNavigationMenu.vue](/src/views/kitchen/components/KitchenNavigationMenu.vue)                               | Vue        |   194 |       1 |    37 |   232 |
| [src/views/kitchen/components/KitchenSidebar.vue](/src/views/kitchen/components/KitchenSidebar.vue)                                             | Vue        |   145 |       5 |    30 |   180 |
| [src/views/kitchen/orders/OrdersScreen.vue](/src/views/kitchen/orders/OrdersScreen.vue)                                                         | Vue        |   307 |       7 |    52 |   366 |
| [src/views/kitchen/orders/components/DishCard.vue](/src/views/kitchen/orders/components/DishCard.vue)                                           | Vue        |   328 |       6 |    56 |   390 |
| [src/views/kitchen/orders/components/NewOrderNotification.vue](/src/views/kitchen/orders/components/NewOrderNotification.vue)                   | Vue        |   169 |       1 |    28 |   198 |
| [src/views/kitchen/orders/components/OrderCard.vue](/src/views/kitchen/orders/components/OrderCard.vue)                                         | Vue        |   205 |       4 |    43 |   252 |
| [src/views/kitchen/orders/components/StatusButton.vue](/src/views/kitchen/orders/components/StatusButton.vue)                                   | Vue        |    92 |       1 |    21 |   114 |
| [src/views/kitchen/preparation/PreparationScreen.vue](/src/views/kitchen/preparation/PreparationScreen.vue)                                     | Vue        |    96 |       7 |    15 |   118 |
| [src/views/menu/MenuView.vue](/src/views/menu/MenuView.vue)                                                                                     | Vue        |    22 |       1 |     2 |    25 |
| [src/views/menu/components/DishTypeSelectionDialog.vue](/src/views/menu/components/DishTypeSelectionDialog.vue)                                 | Vue        |   102 |       3 |    16 |   121 |
| [src/views/menu/components/MenuItemDialog.vue](/src/views/menu/components/MenuItemDialog.vue)                                                   | Vue        |   180 |       6 |    12 |   198 |
| [src/views/menu/components/MenuItemVariant.vue](/src/views/menu/components/MenuItemVariant.vue)                                                 | Vue        |     2 |       1 |     2 |     5 |
| [src/views/pos/PosMainView.vue](/src/views/pos/PosMainView.vue)                                                                                 | Vue        |     7 |       0 |     0 |     7 |
| [src/views/pos/menu/MenuSection.vue](/src/views/pos/menu/MenuSection.vue)                                                                       | Vue        |    49 |       1 |     8 |    58 |
| [src/views/pos/menu/components/CategoryCard.vue](/src/views/pos/menu/components/CategoryCard.vue)                                               | Vue        |    -2 |       0 |     0 |    -2 |
| [src/views/pos/menu/dialogs/CustomizationDialog.vue](/src/views/pos/menu/dialogs/CustomizationDialog.vue)                                       | Vue        |   398 |      12 |    62 |   472 |
| [src/views/pos/shifts/ShiftManagementView.vue](/src/views/pos/shifts/ShiftManagementView.vue)                                                   | Vue        |   208 |      11 |    34 |   253 |
| [src/views/pos/shifts/components/PendingSupplierPaymentsList.vue](/src/views/pos/shifts/components/PendingSupplierPaymentsList.vue)             | Vue        |    93 |       1 |    12 |   106 |
| [src/views/pos/shifts/components/ShiftExpensesList.vue](/src/views/pos/shifts/components/ShiftExpensesList.vue)                                 | Vue        |   103 |       4 |    14 |   121 |
| [src/views/pos/shifts/components/ShiftTransfersList.vue](/src/views/pos/shifts/components/ShiftTransfersList.vue)                               | Vue        |    71 |       1 |    13 |    85 |
| [src/views/pos/shifts/dialogs/EndShiftDialog.vue](/src/views/pos/shifts/dialogs/EndShiftDialog.vue)                                             | Vue        |    75 |       0 |     9 |    84 |
| [src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue](/src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue)                             | Vue        |   257 |      11 |    32 |   300 |
| [src/views/pos/shifts/dialogs/StartShiftDialog.vue](/src/views/pos/shifts/dialogs/StartShiftDialog.vue)                                         | Vue        |    68 |       2 |    10 |    80 |
| [src/views/pos/shifts/dialogs/SupplierPaymentConfirmDialog.vue](/src/views/pos/shifts/dialogs/SupplierPaymentConfirmDialog.vue)                 | Vue        |   351 |      10 |    53 |   414 |
| [src/views/pos/tables/TablesSidebar.vue](/src/views/pos/tables/TablesSidebar.vue)                                                               | Vue        |   -10 |       0 |    -1 |   -11 |
| [src/views/recipes/components/widgets/ModifiersEditorWidget.vue](/src/views/recipes/components/widgets/ModifiersEditorWidget.vue)               | Vue        |   337 |      12 |    28 |   377 |
| [src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue](/src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue) | Vue        |     2 |       0 |     9 |    11 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details
