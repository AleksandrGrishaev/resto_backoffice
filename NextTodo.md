# Sprint: Replacement Modifiers A Target Component

## 040G0

0AH8@8BL A8AB5<C <>48D8:0B>@>2 4;O ?>445@6:8 70<5=K 8=3@5485=B>2 2 @5F5?B5.

**59A:** Cappuccino A 2K1>@>< <>;>:0 - @5F5?B ?>;=K9 A <>;>:><, ?@8 70:075 <>6=> 70<5=8BL =0 0;LB5@=0B82C A 4>?;0B>9.

## 1@0B=0O A>2<5AB8<>ABL

- **addon** - 4>102;O5B composition (157 87<5=5=89)
- **removal** - C40;O5B (157 87<5=5=89)
- **replacement** - @0AH8@O5BAO:
  - A;8 `targetComponent` C:070= � 70<5=O5B :><?>=5=B @5F5?B0
  - A;8 =5 C:070= � @01>B05B :0: addon (>1@0B=0O A>2<5AB8<>ABL)

---

## 50;870F8O

### Phase 1: Types (`src/stores/menu/types.ts`)

- [ ] >1028BL `TargetComponent` interface
- [ ] 0AH8@8BL `ModifierGroup` ?>;5< `targetComponent`
- [ ] 0AH8@8BL `SelectedModifier` ?>;O<8 `groupType`, `targetComponent`, `isDefault`

```typescript
export interface TargetComponent {
  sourceType: 'variant' | 'recipe'
  recipeId?: string
  componentId: string
  componentType: 'product' | 'recipe' | 'preparation'
  componentName: string
}
```

### Phase 2: UI - Modifier Editor

- [ ] `ModifiersEditorWidget.vue` - UI 4;O 2K1>@0 target component
- [ ] `MenuItemDialog.vue` - C1@0BL canBeSold D8;LB@ 4;O modifier composition
- [ ] 5@54020BL variant composition 2 ModifiersEditorWidget

### Phase 3: UI - POS Customization

- [ ] `CustomizationDialog.vue` - ?5@54020BL `groupType`, `targetComponent`, `isDefault` 2 SelectedModifier

### Phase 4: Decomposition

- [ ] `useKitchenDecomposition.ts` - ;>38:0 70<5=K :><?>=5=B>2
- [ ] `useDecomposition.ts` - ;>38:0 70<5=K 4;O A?8A0=8O

### Phase 5: "5AB8@>20=85

- [ ] !>740BL B5AB>2K9 @5F5?B Cappuccino A <>;>:><
- [ ] 0AB@>8BL replacement modifier A target component
- [ ] @>25@8BL decomposition A 70<5=>9

---

## @8B8G5A:85 D09;K

| $09;                                                              | 7<5=5=8O                                |
| ----------------------------------------------------------------- | --------------------------------------- |
| `src/stores/menu/types.ts`                                        | TargetComponent, @0AH8@5=85 8=B5@D59A>2 |
| `src/views/menu/components/widgets/ModifiersEditorWidget.vue`     | UI 2K1>@0 target                        |
| `src/views/menu/components/MenuItemDialog.vue`                    | #1@0BL canBeSold D8;LB@                 |
| `src/views/pos/menu/dialogs/CustomizationDialog.vue`              | 5@54020BL =>2K5 ?>;O                    |
| `src/stores/pos/orders/composables/useKitchenDecomposition.ts`    | >38:0 70<5=K                            |
| `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts` | >38:0 70<5=K                            |

---

## 0;840F8O

- @8 A>E@0=5=88 menu item: ?@>25@OBL GB> 4;O replacement 3@C?? C:070= targetComponent
- @8 decomposition: 5A;8 target =5 =0945= � fallback :0: addon
