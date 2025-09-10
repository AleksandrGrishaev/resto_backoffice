<!-- src/views/pos/PosMainView.vue -->
<template>
  <PosTemplate>
    <div class="pos-main-view">
      <!-- Основной контент -->
      <div class="pos-content">
        <div class="pos-welcome">
          <v-icon size="120" color="primary" class="pos-icon mb-6">mdi-cash-register</v-icon>

          <h1 class="pos-greeting">Привет я POS</h1>

          <p class="pos-subtitle">Система кассовых операций</p>

          <v-divider class="my-6" />

          <div class="pos-user-welcome">
            <v-chip color="success" variant="tonal" size="large" class="mb-4">
              <v-icon start>mdi-account-circle</v-icon>
              Добро пожаловать в POS!
            </v-chip>
          </div>
        </div>
      </div>

      <!-- Нижняя панель с действиями -->
      <div class="pos-actions">
        <v-card color="grey-darken-3" flat class="pos-actions-card">
          <v-card-text class="pos-actions-content">
            <!-- TODO: Здесь будут основные действия POS -->
            <div class="pos-placeholder">
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-construction</v-icon>
              <p class="text-grey-lighten-1">POS функционал в разработке</p>
            </div>

            <!-- Кнопка Logout -->
            <div class="pos-logout-section">
              <LogoutButton variant="full" size="large" />
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </PosTemplate>
</template>

<script setup lang="ts">
import PosTemplate from '@/components/templates/PosTemplate.vue'
import LogoutButton from '@/components/atoms/buttons/LogoutButton.vue'
</script>

<style lang="scss" scoped>
// ===== POS MAIN VIEW STYLES =====

.pos-main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: calc(100vh - 64px - 48px); // header + footer
}

// ===== ОСНОВНОЙ КОНТЕНТ =====

.pos-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.pos-welcome {
  text-align: center;
  max-width: 600px;

  .pos-icon {
    opacity: 0.9;
  }

  .pos-greeting {
    font-size: 3rem;
    font-weight: 700;
    color: white;
    margin-bottom: 16px;
    line-height: 1.2;
  }

  .pos-subtitle {
    font-size: 1.25rem;
    color: #b0b0b0;
    margin-bottom: 24px;
  }

  .pos-user-welcome {
    .v-chip {
      font-size: 1.1rem;
      padding: 16px 24px;
      height: auto;
    }
  }
}

// ===== ПАНЕЛЬ ДЕЙСТВИЙ =====

.pos-actions {
  flex-shrink: 0;
  padding: 16px;
}

.pos-actions-card {
  border-radius: 16px;

  .pos-actions-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 24px;
  }
}

.pos-placeholder {
  text-align: center;

  p {
    font-size: 1rem;
    margin: 0;
  }
}

.pos-logout-section {
  display: flex;
  justify-content: center;
  width: 100%;

  // Стилизация для кнопки Logout
  :deep(.logout-button) {
    min-width: 200px;
    height: 56px;
    font-size: 1.1rem;
  }
}

// ===== RESPONSIVE =====

@media (max-width: 768px) {
  .pos-greeting {
    font-size: 2.5rem !important;
  }

  .pos-subtitle {
    font-size: 1.1rem !important;
  }

  .pos-content {
    padding: 24px 16px;
  }

  .pos-actions {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .pos-greeting {
    font-size: 2rem !important;
  }

  .pos-icon {
    transform: scale(0.8);
  }
}

// ===== TOUCH OPTIMIZATIONS =====

@media (hover: none) and (pointer: coarse) {
  // Оптимизации для touch устройств
  .pos-welcome {
    .v-chip {
      min-height: 48px;
    }
  }

  .pos-actions-content {
    padding: 32px 24px;
  }
}

// TODO: Добавить анимации появления элементов
// TODO: Добавить поддержку темной темы переключения
// TODO: Оптимизировать для landscape ориентации
</style>
