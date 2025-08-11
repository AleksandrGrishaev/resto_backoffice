#!/bin/bash
# fix_import_syntax.sh - Исправление синтаксических ошибок в импортах

echo "🔧 Fixing import syntax errors..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================
# Исправление ошибок с лишними кавычками в импортах
# =============================================

echo -e "\n${YELLOW}Fixing formatIDR import syntax errors...${NC}"

# Список файлов с ошибками
files_to_fix=(
    "src/components/accounts/detail/AccountOperations.vue"
    "src/components/accounts/dialogs/OperationDialog.vue"
    "src/components/accounts/list/AccountList.vue"
    "src/components/accounts/list/PaymentConfirmationDialog.vue"
    "src/components/accounts/list/PendingPaymentsWidget.vue"
    "src/components/navigation/NavigationAccounts.vue"
    "src/views/accounts/AccountDetailView.vue"
    "src/views/recipes/components/widgets/RecipeCostPreviewWidget.vue"
)

# Исправляем синтаксис импортов
for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing: $file"

        # Исправляем импорт formatIDR с лишней кавычкой
        sed -i.bak 's/import { formatIDR } from "@\/utils\/currency"'"'"'/import { formatIDR } from "@\/utils\/currency"/g' "$file"

        # Исправляем импорт convertToBaseUnits с лишней кавычкой
        sed -i.bak 's/import { convertToBaseUnits } from "@\/composables\/useMeasurementUnits"'"'"'/import { convertToBaseUnits } from "@\/composables\/useMeasurementUnits"/g' "$file"

        echo -e "${GREEN}✅ Fixed: $file${NC}"
    else
        echo -e "${RED}⚠️  File not found: $file${NC}"
    fi
done

# =============================================
# Исправление конкретных проблем в файлах
# =============================================

echo -e "\n${YELLOW}Fixing specific file issues...${NC}"

# Исправляем useMeasurementUnits.ts - убираем неиспользуемый импорт
if [ -f "src/composables/useMeasurementUnits.ts" ]; then
    echo "Fixing useMeasurementUnits.ts unused import..."
    sed -i.bak 's/getUnitsByType,//g' "src/composables/useMeasurementUnits.ts"
    echo -e "${GREEN}✅ Fixed unused import in useMeasurementUnits.ts${NC}"
fi

# =============================================
# Очистка backup файлов
# =============================================

echo -e "\n${YELLOW}Cleaning up backup files...${NC}"
find src/ -name "*.bak" -type f -delete
echo -e "${GREEN}✅ Backup files cleaned${NC}"

# =============================================
# Проверка результатов
# =============================================

echo -e "\n${YELLOW}Validating fixes...${NC}"

# Проверяем что нет больше синтаксических ошибок
syntax_errors=$(grep -r 'import.*"'"'"'' src/ --include="*.vue" --include="*.ts" || true)

if [ -z "$syntax_errors" ]; then
    echo -e "${GREEN}✅ All syntax errors fixed!${NC}"
else
    echo -e "${RED}⚠️  Remaining syntax errors:${NC}"
    echo "$syntax_errors"
fi

# Проверяем что линтер доволен
echo -e "\n${YELLOW}Running ESLint check...${NC}"
if command -v npm &> /dev/null; then
    if npm run lint > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ESLint check passed${NC}"
    else
        echo -e "${RED}⚠️  ESLint still has issues${NC}"
        echo "Run: npm run lint to see details"
    fi
else
    echo -e "${YELLOW}⚠️  npm not available for linting check${NC}"
fi

echo -e "\n${GREEN}🎉 Import syntax fix completed!${NC}"
