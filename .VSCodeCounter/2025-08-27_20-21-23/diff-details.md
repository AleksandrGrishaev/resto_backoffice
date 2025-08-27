# Diff Details

Date : 2025-08-27 20:21:23

Directory /Users/peaker/dev/kitchen-app/backoffice/src

Total : 36 files, -7234 codes, 164 comments, -537 blanks, all -7607 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files

| filename                                                                                                                                                        | language   |   code | comment | blank |  total |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- | -----: | ------: | ----: | -----: |
| [src/About/Stage_8_Supplier.md](/src/About/Stage_8_Supplier.md)                                                                                                 | Markdown   |    186 |       0 |    72 |    258 |
| [src/stores/shared/mockDataCoordinator.ts](/src/stores/shared/mockDataCoordinator.ts)                                                                           | TypeScript |    474 |      15 |    87 |    576 |
| [src/stores/shared/supplierDefinitions.ts](/src/stores/shared/supplierDefinitions.ts)                                                                           | TypeScript |    436 |      40 |    41 |    517 |
| [src/stores/supplier_2/\_\_tests\_\_/supplierIntegration.test.ts](/src/stores/supplier_2/__tests__/supplierIntegration.test.ts)                                 | TypeScript |    363 |      22 |    55 |    440 |
| [src/stores/supplier_2/composables/useOrderAssistant.ts](/src/stores/supplier_2/composables/useOrderAssistant.ts)                                               | TypeScript |    838 |     105 |   196 |  1,139 |
| [src/stores/supplier_2/composables/usePurchaseOrders.ts](/src/stores/supplier_2/composables/usePurchaseOrders.ts)                                               | TypeScript |     56 |      27 |    29 |    112 |
| [src/stores/supplier_2/composables/useReceipts.ts](/src/stores/supplier_2/composables/useReceipts.ts)                                                           | TypeScript |    181 |       2 |    27 |    210 |
| [src/stores/supplier_2/supplierService.ts](/src/stores/supplier_2/supplierService.ts)                                                                           | TypeScript |    319 |      50 |    68 |    437 |
| [src/stores/supplier_2/supplierStore.ts](/src/stores/supplier_2/supplierStore.ts)                                                                               | TypeScript |    650 |     155 |   186 |    991 |
| [src/stores/supplier_2/types/supplierIntegrationTypes.ts](/src/stores/supplier_2/types/supplierIntegrationTypes.ts)                                             | TypeScript |    163 |      82 |    33 |    278 |
| [src/utils/time.ts](/src/utils/time.ts)                                                                                                                         | TypeScript |    224 |      84 |    35 |    343 |
| [src/views/supplier_2/SupplierView.vue](/src/views/supplier_2/SupplierView.vue)                                                                                 | Vue        |    -10 |       0 |    17 |      7 |
| [src/views/supplier_2/components/orders/BaseSupplierBaskets.vue](/src/views/supplier_2/components/orders/BaseSupplierBaskets.vue)                               | Vue        |    -15 |       7 |     8 |      0 |
| [src/views/supplier_2/components/orders/PurchaseOrderTable.vue](/src/views/supplier_2/components/orders/PurchaseOrderTable.vue)                                 | Vue        |     28 |       0 |     0 |     28 |
| [src/views/supplier_2/components/procurement/ProcurementRequestTable.vue](/src/views/supplier_2/components/procurement/ProcurementRequestTable.vue)             | Vue        |   -156 |      -2 |   -26 |   -184 |
| [src/views/supplier_2/components/procurement/RequestDetailsDialog.vue](/src/views/supplier_2/components/procurement/RequestDetailsDialog.vue)                   | Vue        |    440 |      14 |    61 |    515 |
| [src/views/supplier_2/components/receipts/ReceiptTable.vue](/src/views/supplier_2/components/receipts/ReceiptTable.vue)                                         | Vue        |     21 |       0 |    -1 |     20 |
| [src/views/supplier_2/components/shared/BaseOrderAssistant.vue](/src/views/supplier_2/components/shared/BaseOrderAssistant.vue)                                 | Vue        |   -101 |       4 |   -28 |   -125 |
| [src/views/supplier_back/SupplierView.vue](/src/views/supplier_back/SupplierView.vue)                                                                           | Vue        |   -760 |     -17 |   -92 |   -869 |
| [src/views/supplier_back/components/consolidation/BillsManagementCard.vue](/src/views/supplier_back/components/consolidation/BillsManagementCard.vue)           | Vue        |   -701 |     -13 |   -72 |   -786 |
| [src/views/supplier_back/components/consolidation/ConsolidationPreviewCard.vue](/src/views/supplier_back/components/consolidation/ConsolidationPreviewCard.vue) | Vue        |   -313 |     -11 |   -33 |   -357 |
| [src/views/supplier_back/components/consolidation/NewOrdersTab.vue](/src/views/supplier_back/components/consolidation/NewOrdersTab.vue)                         | Vue        |   -437 |     -17 |   -60 |   -514 |
| [src/views/supplier_back/components/consolidation/RequestSelectionCard.vue](/src/views/supplier_back/components/consolidation/RequestSelectionCard.vue)         | Vue        |   -448 |     -13 |   -55 |   -516 |
| [src/views/supplier_back/components/consolidation/StatusIndicator.vue](/src/views/supplier_back/components/consolidation/StatusIndicator.vue)                   | Vue        |   -210 |      -8 |   -28 |   -246 |
| [src/views/supplier_back/components/consolidation/WorkflowStatusIndicator.vue](/src/views/supplier_back/components/consolidation/WorkflowStatusIndicator.vue)   | Vue        |   -472 |     -10 |   -62 |   -544 |
| [src/views/supplier_back/components/consolidation/index.ts](/src/views/supplier_back/components/consolidation/index.ts)                                         | TypeScript |   -278 |     -96 |   -57 |   -431 |
| [src/views/supplier_back/components/procurement/OrderAssistantDialog.vue](/src/views/supplier_back/components/procurement/OrderAssistantDialog.vue)             | Vue        |   -649 |     -11 |   -86 |   -746 |
| [src/views/supplier_back/components/procurement/ProcurementRequestDialog.vue](/src/views/supplier_back/components/procurement/ProcurementRequestDialog.vue)     | Vue        |   -797 |      -9 |   -94 |   -900 |
| [src/views/supplier_back/components/procurement/ProcurementTable.vue](/src/views/supplier_back/components/procurement/ProcurementTable.vue)                     | Vue        |   -805 |     -20 |  -106 |   -931 |
| [src/views/supplier_back/components/purchase/AcceptanceTable.vue](/src/views/supplier_back/components/purchase/AcceptanceTable.vue)                             | Vue        | -1,151 |     -26 |  -141 | -1,318 |
| [src/views/supplier_back/components/purchase/PurchaseOrderDialog.vue](/src/views/supplier_back/components/purchase/PurchaseOrderDialog.vue)                     | Vue        | -1,021 |     -11 |  -103 | -1,135 |
| [src/views/supplier_back/components/purchase/PurchaseOrderTable.vue](/src/views/supplier_back/components/purchase/PurchaseOrderTable.vue)                       | Vue        | -1,046 |     -23 |  -134 | -1,203 |
| [src/views/supplier_back/components/purchase/ReceiptAcceptanceDialog.vue](/src/views/supplier_back/components/purchase/ReceiptAcceptanceDialog.vue)             | Vue        |   -923 |     -14 |   -98 | -1,035 |
| [src/views/supplier_back/components/supplier/SupplierDialog.vue](/src/views/supplier_back/components/supplier/SupplierDialog.vue)                               | Vue        |   -535 |      -7 |   -62 |   -604 |
| [src/views/supplier_back/components/supplier/SupplierTable.vue](/src/views/supplier_back/components/supplier/SupplierTable.vue)                                 | Vue        |   -557 |     -15 |   -65 |   -637 |
| [src/views/supplier_back/index.ts](/src/views/supplier_back/index.ts)                                                                                           | TypeScript |   -228 |    -120 |   -49 |   -397 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details
