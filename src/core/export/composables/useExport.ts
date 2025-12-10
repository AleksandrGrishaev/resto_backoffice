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
  MenuItemExportData,
  CombinationsExportData,
  CombinationsExportOptions,
  MenuDetailedExportData
} from '../types'
import MenuExportTemplate from '../templates/MenuExportTemplate.vue'
import RecipeExportTemplate from '../templates/RecipeExportTemplate.vue'
import PreparationExportTemplate from '../templates/PreparationExportTemplate.vue'
import MenuItemExportTemplate from '../templates/MenuItemExportTemplate.vue'
import CombinationsExportTemplate from '../templates/CombinationsExportTemplate.vue'
import MenuDetailedExportTemplate from '../templates/MenuDetailedExportTemplate.vue'

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
    // Using absolute positioning instead of fixed to avoid html2canvas issues
    const wrapper = document.createElement('div')
    wrapper.style.position = 'absolute'
    wrapper.style.left = '0'
    wrapper.style.top = '0'
    wrapper.style.width = '100%'
    wrapper.style.minHeight = '100vh'
    wrapper.style.overflow = 'visible'
    wrapper.style.background = 'white'
    wrapper.style.zIndex = '99999'
    document.body.appendChild(wrapper)
    // Scroll to top to ensure content is visible
    window.scrollTo(0, 0)

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

      // Wait for render - need more time for complex components with nested data
      // Multiple nextTick calls to ensure full component tree is rendered
      await nextTick()
      await nextTick()
      await nextTick()
      // Additional timeout for complex nested components
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Force a reflow to ensure all content is rendered
      void container.offsetHeight

      // Debug: Check if content has actual dimensions
      const contentHeight = container.scrollHeight
      const contentWidth = container.scrollWidth
      console.log(`[Export] Container dimensions: ${contentWidth}x${contentHeight}`)

      if (contentHeight === 0 || contentWidth === 0) {
        console.error('[Export] Container has zero dimensions - content may not have rendered')
      }

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

  /**
   * Export menu item combinations to PDF
   * Shows all modifier combinations with costs and recipes
   */
  async function exportMenuItemCombinations(
    data: CombinationsExportData,
    options: CombinationsExportOptions = {}
  ): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      // Generate filename from item name (sanitized)
      const sanitizedName = data.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const filename =
        options.filename || exportService.generateFilename(`combinations_${sanitizedName}`)

      // Use landscape orientation for better table display
      await renderAndExport(CombinationsExportTemplate, data, {
        ...options,
        filename,
        orientation: options.orientation || 'landscape'
      })
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export multiple menu items with detailed recipe information
   * Used for bulk menu export with "Include recipe details" option
   */
  async function exportMenuDetailed(
    data: MenuDetailedExportData,
    options: ExportOptions = {}
  ): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      const filename = options.filename || exportService.generateFilename('menu_detailed')
      await renderAndExport(MenuDetailedExportTemplate, data, {
        ...options,
        filename,
        orientation: options.orientation || 'portrait'
      })
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Export failed'
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Generic PDF export for any template
   * Use this for custom templates like inventory sheets
   */
  async function generatePDF<T>(
    template: object,
    data: T,
    options: ExportOptions = {}
  ): Promise<void> {
    isExporting.value = true
    exportError.value = null

    try {
      const filename = options.filename || exportService.generateFilename('document')
      await renderAndExport(template, data, { ...options, filename })
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
    exportMenuItem,
    exportMenuItemCombinations,
    exportMenuDetailed,
    generatePDF
  }
}
