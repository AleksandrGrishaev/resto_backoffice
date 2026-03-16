// src/stores/website/websiteService.ts - Supabase CRUD for website homepage

import { supabase } from '@/supabase/client'
import type { HomepageSection, HomepageFeaturedItem } from './types'
import { mapSectionFromDb, mapSectionToDb, mapFeaturedItemFromDb } from './supabaseMappers'

class WebsiteService {
  // =====================================================
  // SECTIONS
  // =====================================================

  async loadSections(): Promise<HomepageSection[]> {
    const { data, error } = await supabase
      .from('website_homepage_sections')
      .select('*, menu_categories(name)')
      .order('slot_position')

    if (error) throw error
    return (data || []).map(mapSectionFromDb)
  }

  async upsertSection(
    section: Partial<HomepageSection> & { slotPosition: number; categoryId: string }
  ): Promise<HomepageSection> {
    const dbRow = {
      ...mapSectionToDb(section),
      ...(section.id ? { id: section.id } : {})
    }

    const { data, error } = await supabase
      .from('website_homepage_sections')
      .upsert(dbRow, { onConflict: 'slot_position' })
      .select('*, menu_categories(name)')
      .single()

    if (error) throw error
    return mapSectionFromDb(data)
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await supabase.from('website_homepage_sections').delete().eq('id', id)

    if (error) throw error
  }

  // =====================================================
  // FEATURED ITEMS
  // =====================================================

  async loadSectionItems(sectionId: string): Promise<HomepageFeaturedItem[]> {
    const { data, error } = await supabase
      .from('website_homepage_items')
      .select('*, menu_items(name, price, image_url, type)')
      .eq('section_id', sectionId)
      .order('sort_order')

    if (error) throw error
    return (data || []).map(mapFeaturedItemFromDb)
  }

  async loadAllItems(): Promise<HomepageFeaturedItem[]> {
    const { data, error } = await supabase
      .from('website_homepage_items')
      .select('*, menu_items(name, price, image_url, type)')
      .order('sort_order')

    if (error) throw error
    return (data || []).map(mapFeaturedItemFromDb)
  }

  async addItem(
    sectionId: string,
    menuItemId: string,
    sortOrder: number
  ): Promise<HomepageFeaturedItem> {
    const { data, error } = await supabase
      .from('website_homepage_items')
      .insert({
        section_id: sectionId,
        menu_item_id: menuItemId,
        sort_order: sortOrder,
        is_active: true
      })
      .select('*, menu_items(name, price, image_url, type)')
      .single()

    if (error) throw error
    return mapFeaturedItemFromDb(data)
  }

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from('website_homepage_items').delete().eq('id', id)

    if (error) throw error
  }

  async reorderItems(items: { id: string; sortOrder: number }[]): Promise<void> {
    for (const item of items) {
      const { error } = await supabase
        .from('website_homepage_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)

      if (error) throw error
    }
  }
}

export const websiteService = new WebsiteService()
