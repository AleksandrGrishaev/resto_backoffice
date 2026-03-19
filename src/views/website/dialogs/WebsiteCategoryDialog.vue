<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { generateId } from '@/utils'
import ImageUploader from '@/components/common/ImageUploader.vue'
import type { WebsiteMenuCategory, CreateWebsiteCategoryDto } from '@/stores/websiteMenu'

const props = defineProps<{
  category: WebsiteMenuCategory | null
  store: any
  groups: WebsiteMenuCategory[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const dialog = defineModel<boolean>()

const form = ref({
  name: '',
  description: '',
  slug: '',
  imageUrl: '',
  parentId: null as string | null,
  isActive: true
})

const saving = ref(false)
const errorMessage = ref('')
const tempId = ref(generateId())

const imageUploadId = computed(() => props.category?.id || tempId.value)

// Group options for the select (exclude self and own children to prevent cycles)
const groupOptions = computed(() =>
  props.groups.filter(g => g.id !== props.category?.id).map(g => ({ title: g.name, value: g.id }))
)

watch(dialog, open => {
  if (open) {
    errorMessage.value = ''
    if (props.category) {
      form.value = {
        name: props.category.name,
        description: props.category.description || '',
        slug: props.category.slug || '',
        imageUrl: props.category.imageUrl || '',
        parentId: props.category.parentId || null,
        isActive: props.category.isActive
      }
    } else {
      tempId.value = generateId()
      form.value = {
        name: '',
        description: '',
        slug: '',
        imageUrl: '',
        parentId: null,
        isActive: true
      }
    }
  }
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function autoSlug() {
  if (!props.category && form.value.name && !form.value.slug) {
    form.value.slug = generateSlug(form.value.name)
  }
}

function handleImageUpdate(url: string) {
  form.value.imageUrl = url
}

async function save() {
  if (!form.value.name.trim()) return

  saving.value = true
  errorMessage.value = ''
  try {
    const dto: CreateWebsiteCategoryDto = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      slug: form.value.slug.trim() || undefined,
      imageUrl: form.value.imageUrl.trim() || undefined,
      parentId: form.value.parentId || null,
      isActive: form.value.isActive
    }

    if (props.category) {
      await props.store.updateCategory(props.category.id, dto)
    } else {
      const result = await props.store.createCategory(dto)
      if (!result) {
        errorMessage.value = 'Category with this slug already exists. Try a different name.'
        return
      }
    }

    emit('saved')
  } catch {
    errorMessage.value = 'Failed to save category. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="500" persistent>
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ category ? 'Edit Category' : 'New Category' }}
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- Image uploader -->
        <div class="d-flex justify-center mb-4">
          <image-uploader
            :model-value="form.imageUrl"
            :item-id="imageUploadId"
            :item-name="form.name || 'category'"
            subfolder="website-categories"
            @update:model-value="handleImageUpdate"
          />
        </div>

        <v-text-field
          v-model="form.name"
          label="Name"
          variant="outlined"
          density="compact"
          class="mb-3"
          @blur="autoSlug"
        />

        <v-text-field
          v-model="form.slug"
          label="URL Slug"
          variant="outlined"
          density="compact"
          class="mb-3"
          hint="Auto-generated from name"
          persistent-hint
        />

        <!-- Group selector -->
        <v-select
          v-model="form.parentId"
          :items="groupOptions"
          label="Group"
          variant="outlined"
          density="compact"
          clearable
          class="mb-3"
          placeholder="No group (top-level)"
        />

        <v-textarea
          v-model="form.description"
          label="Description"
          variant="outlined"
          density="compact"
          rows="2"
          class="mb-3"
        />

        <v-switch
          v-model="form.isActive"
          label="Active"
          color="primary"
          density="compact"
          hide-details
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="dialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!form.name.trim()"
          @click="save"
        >
          {{ category ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
