/**
 * Export Composable
 * Provides PDF export functionality for Menu, Recipes, Preparations, and Single Menu Items
 */

import { ref, nextTick, createApp, h } from 'vue'
import { exportService } from '../ExportService'
import type {
  ExportOptions,
  MenuExportData,
  RecipeExportData,
  PreparationExportData,
  MenuItemExportData
} from '../types'
import MenuExportTemplate from '../templates/MenuExportTemplate.vue'
import RecipeExportTemplate from '../templates/RecipeExportTemplate.vue'
import PreparationExportTemplate from '../templates/PreparationExportTemplate.vue'
import MenuItemExportTemplate from '../templates/MenuItemExportTemplate.vue'

export function useExport() {
  const isExporting = ref(false)
  const exportError = ref<string | null>(null)

  /**
   * Render Vue component to DOM and export as PDF
   */
  async function renderAndExport<T>(
    component: unknown,
    data: T,
    options: ExportOptions
  ): Promise<void> {
    // A4 dimensions at 96dpi with margins accounted for
    // Portrait: 210mm - 20mm margins = 190mm ≈ 720px
    // Landscape: 297mm - 10mm margins = 287mm ≈ 1085px
    const isLandscape = options.orientation === 'landscape'
    const containerWidth = isLandscape ? '1085px' : '720px'

    // Create wrapper that will be temporarily visible
    const wrapper = document.createElement('div')
    wrapper.style.position = 'fixed'
    wrapper.style.left = '0'
    wrapper.style.top = '0'
    wrapper.style.width = '100vw'
    wrapper.style.height = '100vh'
    wrapper.style.overflow = 'auto'
    wrapper.style.background = 'white'
    wrapper.style.zIndex = '99999'
    document.body.appendChild(wrapper)

    // Create actual content container
    const container = document.createElement('div')
    container.style.width = containerWidth
    container.style.margin = '0 auto'
    container.style.padding = '20px'
    container.style.background = 'white'
    wrapper.appendChild(container)

    let app: ReturnType<typeof createApp> | null = null

    try {
      // Mount Vue component
      app = createApp({
        render: () => h(component as object, { data, options })
      })
      app.mount(container)

      // Wait for render - need more time for complex components
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      // Generate PDF from the container
      await exportService.generatePdf(container, options)
    } finally {
      // Cleanup
      if (app) {
        app.unmount()
      }
      document.body.removeChild(wrapper)
    }
  }

  /**
   * Export menu to PDF
   */
  async function exportMenu(data: MenuExportData, options: ExportOptions = {}): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      const filename = options.filename || exportService.generateFilename('menu')
      await renderAndExport(MenuExportTemplate, data, { ...options, filename })
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export recipes to PDF
   */
  async function exportRecipes(data: RecipeExportData, options: ExportOptions = {}): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      const filename = options.filename || exportService.generateFilename('recipes')
      await renderAndExport(RecipeExportTemplate, data, { ...options, filename })
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export preparations to PDF
   */
  async function exportPreparations(
    data: PreparationExportData,
    options: ExportOptions = {}
  ): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      const filename = options.filename || exportService.generateFilename('preparations')
      await renderAndExport(PreparationExportTemplate, data, {
        ...options,
        filename
      })
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export single menu item to PDF
   */
  async function exportMenuItem(
    data: MenuItemExportData,
    options: ExportOptions = {}
  ): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      // Generate filename from item name (sanitized)
      const sanitizedName = data.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const filename =
        options.filename || exportService.generateFilename(`menu_item_${sanitizedName}`)
      await renderAndExport(MenuItemExportTemplate, data, {
        ...options,
        filename
      })
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  return {
    isExporting,
    exportError,
    exportMenu,
    exportRecipes,
    exportPreparations,
    exportMenuItem
  }
}
