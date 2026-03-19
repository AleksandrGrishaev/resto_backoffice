<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { generateId } from '@/utils'
import ImageUploader from '@/components/common/ImageUploader.vue'
import type { WebsiteMenuCategory, CreateWebsiteCategoryDto } from '@/stores/websiteMenu'

const props = defineProps<{
  category: WebsiteMenuCategory | null
  store: any
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
  isActive: true
})

const saving = ref(false)
const tempId = ref(generateId())

const imageUploadId = computed(() => props.category?.id || tempId.value)

watch(dialog, open => {
  if (open) {
    if (props.category) {
      form.value = {
        name: props.category.name,
        description: props.category.description || '',
        slug: props.category.slug || '',
        imageUrl: props.category.imageUrl || '',
        isActive: props.category.isActive
      }
    } else {
      tempId.value = generateId()
      form.value = {
        name: '',
        description: '',
        slug: '',
        imageUrl: '',
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
  try {
    const dto: CreateWebsiteCategoryDto = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      slug: form.value.slug.trim() || undefined,
      imageUrl: form.value.imageUrl.trim() || undefined,
      isActive: form.value.isActive
    }

    if (props.category) {
      await props.store.updateCategory(props.category.id, dto)
    } else {
      await props.store.createCategory(dto)
    }

    emit('saved')
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
