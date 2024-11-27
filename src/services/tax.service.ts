// src/firebase/services/tax.service.ts
import { BaseService } from '@/firebase/services/base.service'
import type { Tax } from '@/types/tax'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'TaxService'

export class TaxService extends BaseService<Tax> {
  constructor() {
    super('taxes')
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Toggling tax status', { id, isActive })
      await this.update(id, { isActive })
      DebugUtils.info(MODULE_NAME, 'Tax status updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to toggle tax status', { error })
      throw error
    }
  }
}

export const taxService = new TaxService()
