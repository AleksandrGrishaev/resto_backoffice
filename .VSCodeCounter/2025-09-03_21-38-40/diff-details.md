# Diff Details

Date : 2025-09-03 21:38:40

Directory /Users/peaker/dev/kitchen-app/backoffice/src

Total : 79 files, 7167 codes, 296 comments, 1473 blanks, all 8936 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files

| filename                                                                                                                                            | language   | code | comment | blank | total |
| :-------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- | ---: | ------: | ----: | ----: |
| [src/About/About.md](/src/About/About.md)                                                                                                           | Markdown   |  -22 |       0 |    -6 |   -28 |
| [src/About/Base/About.md](/src/About/Base/About.md)                                                                                                 | Markdown   |   23 |       0 |     7 |    30 |
| [src/About/Base/MeasurementUnits.md](/src/About/Base/MeasurementUnits.md)                                                                           | Markdown   |  724 |       0 |   228 |   952 |
| [src/About/Base/Style.md](/src/About/Base/Style.md)                                                                                                 | Markdown   |   96 |       0 |    31 |   127 |
| [src/About/Stage_9_batche.md](/src/About/Stage_9_batche.md)                                                                                         | Markdown   |  925 |       0 |   215 | 1,140 |
| [src/About/Style.md](/src/About/Style.md)                                                                                                           | Markdown   |  -96 |       0 |   -31 |  -127 |
| [src/components/accounts/detail/AccountOperations.vue](/src/components/accounts/detail/AccountOperations.vue)                                       | Vue        | -173 |       0 |   -20 |  -193 |
| [src/components/accounts/detail/AccountOperationsFilter.vue](/src/components/accounts/detail/AccountOperationsFilter.vue)                           | Vue        | -121 |       0 |   -21 |  -142 |
| [src/components/accounts/dialogs/AccountDialog.vue](/src/components/accounts/dialogs/AccountDialog.vue)                                             | Vue        | -173 |       0 |   -19 |  -192 |
| [src/components/accounts/dialogs/CorrectionDialog.vue](/src/components/accounts/dialogs/CorrectionDialog.vue)                                       | Vue        | -153 |      -4 |   -20 |  -177 |
| [src/components/accounts/dialogs/OperationDialog.vue](/src/components/accounts/dialogs/OperationDialog.vue)                                         | Vue        | -179 |      -2 |   -20 |  -201 |
| [src/components/accounts/dialogs/TransferDialog.vue](/src/components/accounts/dialogs/TransferDialog.vue)                                           | Vue        | -114 |       0 |    -9 |  -123 |
| [src/components/accounts/list/AccountList.vue](/src/components/accounts/list/AccountList.vue)                                                       | Vue        | -195 |      -3 |   -25 |  -223 |
| [src/components/accounts/list/AccountListToolbar.vue](/src/components/accounts/list/AccountListToolbar.vue)                                         | Vue        |  -46 |       0 |    -8 |   -54 |
| [src/components/accounts/list/PaymentConfirmationDialog.vue](/src/components/accounts/list/PaymentConfirmationDialog.vue)                           | Vue        | -270 |      -4 |   -37 |  -311 |
| [src/components/accounts/list/PendingPaymentsWidget.vue](/src/components/accounts/list/PendingPaymentsWidget.vue)                                   | Vue        | -196 |      -5 |   -33 |  -234 |
| [src/stores/account/index.ts](/src/stores/account/index.ts)                                                                                         | TypeScript |    3 |       0 |     0 |     3 |
| [src/stores/account/service.ts](/src/stores/account/service.ts)                                                                                     | TypeScript |   41 |       3 |     8 |    52 |
| [src/stores/account/store.ts](/src/stores/account/store.ts)                                                                                         | TypeScript |  114 |      14 |    22 |   150 |
| [src/stores/account/types.ts](/src/stores/account/types.ts)                                                                                         | TypeScript |   30 |       4 |     2 |    36 |
| [src/stores/shared/index.ts](/src/stores/shared/index.ts)                                                                                           | TypeScript |   23 |       9 |     8 |    40 |
| [src/stores/shared/mockDataCoordinator.ts](/src/stores/shared/mockDataCoordinator.ts)                                                               | TypeScript | -401 |     -34 |   -89 |  -524 |
| [src/stores/shared/storageDefinitions.ts](/src/stores/shared/storageDefinitions.ts)                                                                 | TypeScript |  577 |     130 |   134 |   841 |
| [src/stores/shared/supplierDefinitions.ts](/src/stores/shared/supplierDefinitions.ts)                                                               | TypeScript |  263 |      24 |    26 |   313 |
| [src/stores/storage/composables/useWriteOff.ts](/src/stores/storage/composables/useWriteOff.ts)                                                     | TypeScript |   17 |      11 |     6 |    34 |
| [src/stores/storage/index.ts](/src/stores/storage/index.ts)                                                                                         | TypeScript |   -3 |      -1 |    -1 |    -5 |
| [src/stores/storage/storageMock.ts](/src/stores/storage/storageMock.ts)                                                                             | TypeScript | -561 |     -32 |   -46 |  -639 |
| [src/stores/storage/storageService.ts](/src/stores/storage/storageService.ts)                                                                       | TypeScript |  113 |      25 |    23 |   161 |
| [src/stores/storage/storageStore.ts](/src/stores/storage/storageStore.ts)                                                                           | TypeScript |  164 |      -6 |    43 |   201 |
| [src/stores/storage/types.ts](/src/stores/storage/types.ts)                                                                                         | TypeScript |   25 |       0 |     6 |    31 |
| [src/stores/supplier_2/composables/useOrderAssistant.ts](/src/stores/supplier_2/composables/useOrderAssistant.ts)                                   | TypeScript | -584 |     -45 |  -128 |  -757 |
| [src/stores/supplier_2/composables/usePurchaseOrders.ts](/src/stores/supplier_2/composables/usePurchaseOrders.ts)                                   | TypeScript |  194 |      28 |    36 |   258 |
| [src/stores/supplier_2/composables/useReceipts.ts](/src/stores/supplier_2/composables/useReceipts.ts)                                               | TypeScript |   11 |       8 |     2 |    21 |
| [src/stores/supplier_2/index.ts](/src/stores/supplier_2/index.ts)                                                                                   | TypeScript |  -18 |      -3 |    -2 |   -23 |
| [src/stores/supplier_2/integrations/accountIntegration.ts](/src/stores/supplier_2/integrations/accountIntegration.ts)                               | TypeScript |  225 |      23 |    46 |   294 |
| [src/stores/supplier_2/integrations/index.ts](/src/stores/supplier_2/integrations/index.ts)                                                         | TypeScript |   17 |      15 |     9 |    41 |
| [src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts](/src/stores/supplier_2/integrations/plannedDeliveryIntegration.ts)               | TypeScript |  167 |      84 |    44 |   295 |
| [src/stores/supplier_2/integrations/storageIntegration.ts](/src/stores/supplier_2/integrations/storageIntegration.ts)                               | TypeScript |  428 |      53 |    99 |   580 |
| [src/stores/supplier_2/mock/supplierMock.ts](/src/stores/supplier_2/mock/supplierMock.ts)                                                           | TypeScript | -360 |     -32 |   -83 |  -475 |
| [src/stores/supplier_2/supplierService.ts](/src/stores/supplier_2/supplierService.ts)                                                               | TypeScript |   71 |     -29 |     2 |    44 |
| [src/stores/supplier_2/supplierStore.ts](/src/stores/supplier_2/supplierStore.ts)                                                                   | TypeScript |  151 |    -142 |    -5 |     4 |
| [src/stores/supplier_2/types.ts](/src/stores/supplier_2/types.ts)                                                                                   | TypeScript |    9 |       2 |     1 |    12 |
| [src/utils/index.ts](/src/utils/index.ts)                                                                                                           | TypeScript |    1 |       0 |     0 |     1 |
| [src/utils/quantityFormatter.ts](/src/utils/quantityFormatter.ts)                                                                                   | TypeScript |  181 |      52 |    43 |   276 |
| [src/utils/time.ts](/src/utils/time.ts)                                                                                                             | TypeScript |   20 |       6 |     3 |    29 |
| [src/views/accounts/AccountDetailView.vue](/src/views/accounts/AccountDetailView.vue)                                                               | Vue        |    1 |       0 |     0 |     1 |
| [src/views/accounts/AccountListView.vue](/src/views/accounts/AccountListView.vue)                                                                   | Vue        |    0 |       0 |    -1 |    -1 |
| [src/views/accounts/components/detail/AccountOperations.vue](/src/views/accounts/components/detail/AccountOperations.vue)                           | Vue        |  173 |       0 |    20 |   193 |
| [src/views/accounts/components/detail/AccountOperationsFilter.vue](/src/views/accounts/components/detail/AccountOperationsFilter.vue)               | Vue        |  121 |       0 |    21 |   142 |
| [src/views/accounts/components/dialogs/AccountDialog.vue](/src/views/accounts/components/dialogs/AccountDialog.vue)                                 | Vue        |  173 |       0 |    19 |   192 |
| [src/views/accounts/components/dialogs/CorrectionDialog.vue](/src/views/accounts/components/dialogs/CorrectionDialog.vue)                           | Vue        |  153 |       4 |    20 |   177 |
| [src/views/accounts/components/dialogs/OperationDialog.vue](/src/views/accounts/components/dialogs/OperationDialog.vue)                             | Vue        |  179 |       2 |    20 |   201 |
| [src/views/accounts/components/dialogs/PaymentDialog.vue](/src/views/accounts/components/dialogs/PaymentDialog.vue)                                 | Vue        |  650 |      20 |    86 |   756 |
| [src/views/accounts/components/dialogs/TransferDialog.vue](/src/views/accounts/components/dialogs/TransferDialog.vue)                               | Vue        |  114 |       0 |     9 |   123 |
| [src/views/accounts/components/list/AccountList.vue](/src/views/accounts/components/list/AccountList.vue)                                           | Vue        |  195 |       3 |    25 |   223 |
| [src/views/accounts/components/list/AccountListToolbar.vue](/src/views/accounts/components/list/AccountListToolbar.vue)                             | Vue        |   46 |       0 |     8 |    54 |
| [src/views/accounts/components/list/PaymentConfirmationDialog.vue](/src/views/accounts/components/list/PaymentConfirmationDialog.vue)               | Vue        |  270 |       4 |    37 |   311 |
| [src/views/accounts/components/list/PendingPaymentsWidget.vue](/src/views/accounts/components/list/PendingPaymentsWidget.vue)                       | Vue        |  196 |       5 |    33 |   234 |
| [src/views/storage/StorageView.vue](/src/views/storage/StorageView.vue)                                                                             | Vue        |  -81 |       1 |    -3 |   -83 |
| [src/views/storage/components/InventoryDialog.vue](/src/views/storage/components/InventoryDialog.vue)                                               | Vue        |  148 |       0 |    19 |   167 |
| [src/views/storage/components/ItemDetailsDialog.vue](/src/views/storage/components/ItemDetailsDialog.vue)                                           | Vue        |   22 |       2 |    15 |    39 |
| [src/views/storage/components/StorageStockTable.vue](/src/views/storage/components/StorageStockTable.vue)                                           | Vue        |  122 |       4 |    26 |   152 |
| [src/views/storage/components/writeoff/ProductSelectorWidget.vue](/src/views/storage/components/writeoff/ProductSelectorWidget.vue)                 | Vue        |   64 |       1 |     5 |    70 |
| [src/views/storage/components/writeoff/WriteOffQuantityDialog.vue](/src/views/storage/components/writeoff/WriteOffQuantityDialog.vue)               | Vue        |   26 |       0 |     2 |    28 |
| [src/views/supplier_2/SupplierView.vue](/src/views/supplier_2/SupplierView.vue)                                                                     | Vue        |  426 |       8 |    94 |   528 |
| [src/views/supplier_2/components/orders/BillCard.vue](/src/views/supplier_2/components/orders/BillCard.vue)                                         | Vue        |  243 |       7 |    36 |   286 |
| [src/views/supplier_2/components/orders/BillStatus.vue](/src/views/supplier_2/components/orders/BillStatus.vue)                                     | Vue        |  102 |       6 |    17 |   125 |
| [src/views/supplier_2/components/orders/PurchaseOrderDetailsDialog.vue](/src/views/supplier_2/components/orders/PurchaseOrderDetailsDialog.vue)     | Vue        |  379 |       6 |    66 |   451 |
| [src/views/supplier_2/components/orders/PurchaseOrderEditDialog.vue](/src/views/supplier_2/components/orders/PurchaseOrderEditDialog.vue)           | Vue        |  503 |      14 |    72 |   589 |
| [src/views/supplier_2/components/orders/PurchaseOrderPayment.vue](/src/views/supplier_2/components/orders/PurchaseOrderPayment.vue)                 | Vue        |  401 |      11 |    59 |   471 |
| [src/views/supplier_2/components/orders/PurchaseOrderTable.vue](/src/views/supplier_2/components/orders/PurchaseOrderTable.vue)                     | Vue        | -258 |     -14 |   -22 |  -294 |
| [src/views/supplier_2/components/orders/ShortfallAlert.vue](/src/views/supplier_2/components/orders/ShortfallAlert.vue)                             | Vue        |   96 |       2 |    17 |   115 |
| [src/views/supplier_2/components/procurement/AddItemDialog.vue](/src/views/supplier_2/components/procurement/AddItemDialog.vue)                     | Vue        |  517 |       8 |    77 |   602 |
| [src/views/supplier_2/components/procurement/ProcurementRequestTable.vue](/src/views/supplier_2/components/procurement/ProcurementRequestTable.vue) | Vue        |   10 |       0 |     6 |    16 |
| [src/views/supplier_2/components/procurement/RequestDetailsDialog.vue](/src/views/supplier_2/components/procurement/RequestDetailsDialog.vue)       | Vue        |   78 |       0 |    18 |    96 |
| [src/views/supplier_2/components/procurement/RequestEditDialog.vue](/src/views/supplier_2/components/procurement/RequestEditDialog.vue)             | Vue        |  434 |      19 |    71 |   524 |
| [src/views/supplier_2/components/receipts/BaseReceiptDialog.vue](/src/views/supplier_2/components/receipts/BaseReceiptDialog.vue)                   | Vue        | -103 |       0 |   -11 |  -114 |
| [src/views/supplier_2/components/shared/BaseOrderAssistant.vue](/src/views/supplier_2/components/shared/BaseOrderAssistant.vue)                     | Vue        |  430 |      20 |    92 |   542 |
| [src/views/supplier_2/components/shared/SuggestionItemCard.vue](/src/views/supplier_2/components/shared/SuggestionItemCard.vue)                     | Vue        |  389 |      14 |    79 |   482 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details
