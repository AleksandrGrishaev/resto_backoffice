// src/firebase/services/payment-method.service.ts
import { BaseService } from '@/firebase/services/base.service'
import type { PaymentMethod } from '@/types/payment'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PaymentMethodService'

export class PaymentMethodService extends BaseService<PaymentMethod> {
  constructor() {
    super('payment-methods')
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Toggling payment method status', { id, isActive })
      await this.update(id, { isActive })
      DebugUtils.info(MODULE_NAME, 'Payment method status updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to toggle payment method status', { error })
      throw error
    }
  }
}

export const paymentMethodService = new PaymentMethodService()
