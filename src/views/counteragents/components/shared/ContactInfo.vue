<!-- src/views/counteragents/components/shared/ContactInfo.vue -->
<template>
  <div class="contact-info">
    <h4 class="section-title">
      <v-icon icon="mdi-account-circle" class="me-2" />
      Contact Information
    </h4>

    <div class="contact-grid">
      <!-- Contact Person -->
      <div v-if="counteragent.contactPerson" class="contact-item">
        <v-icon icon="mdi-account" class="contact-icon" />
        <div class="contact-details">
          <div class="contact-label">Contact Person</div>
          <div class="contact-value">{{ counteragent.contactPerson }}</div>
        </div>
      </div>

      <!-- Phone -->
      <div v-if="counteragent.phone" class="contact-item clickable" @click="callPhone">
        <v-icon icon="mdi-phone" class="contact-icon" color="success" />
        <div class="contact-details">
          <div class="contact-label">Phone</div>
          <div class="contact-value">{{ formatPhone(counteragent.phone) }}</div>
        </div>
        <v-btn
          icon="mdi-phone"
          variant="text"
          size="small"
          color="success"
          @click.stop="callPhone"
        />
      </div>

      <!-- Email -->
      <div v-if="counteragent.email" class="contact-item clickable" @click="sendEmail">
        <v-icon icon="mdi-email" class="contact-icon" color="primary" />
        <div class="contact-details">
          <div class="contact-label">Email</div>
          <div class="contact-value">{{ counteragent.email }}</div>
        </div>
        <v-btn
          icon="mdi-email"
          variant="text"
          size="small"
          color="primary"
          @click.stop="sendEmail"
        />
      </div>

      <!-- Address -->
      <div v-if="counteragent.address" class="contact-item clickable" @click="openMaps">
        <v-icon icon="mdi-map-marker" class="contact-icon" color="error" />
        <div class="contact-details">
          <div class="contact-label">Address</div>
          <div class="contact-value">{{ counteragent.address }}</div>
        </div>
        <v-btn icon="mdi-map" variant="text" size="small" color="error" @click.stop="openMaps" />
      </div>

      <!-- Website -->
      <div v-if="counteragent.website" class="contact-item clickable" @click="openWebsite">
        <v-icon icon="mdi-web" class="contact-icon" color="info" />
        <div class="contact-details">
          <div class="contact-label">Website</div>
          <div class="contact-value">{{ formatWebsite(counteragent.website) }}</div>
        </div>
        <v-btn
          icon="mdi-open-in-new"
          variant="text"
          size="small"
          color="info"
          @click.stop="openWebsite"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPhoneNumber } from '@/stores/counteragents'
import type { Counteragent } from '@/stores/counteragents'

interface Props {
  counteragent: Counteragent
}

const props = defineProps<Props>()

// Methods
const formatPhone = (phone: string): string => {
  return formatPhoneNumber(phone)
}

const formatWebsite = (website: string): string => {
  return website.replace(/^https?:\/\//, '')
}

const callPhone = () => {
  if (props.counteragent.phone) {
    window.open(`tel:${props.counteragent.phone}`)
  }
}

const sendEmail = () => {
  if (props.counteragent.email) {
    window.open(`mailto:${props.counteragent.email}`)
  }
}

const openMaps = () => {
  if (props.counteragent.address) {
    const encodedAddress = encodeURIComponent(props.counteragent.address)
    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank')
  }
}

const openWebsite = () => {
  if (props.counteragent.website) {
    const url = props.counteragent.website.startsWith('http')
      ? props.counteragent.website
      : `https://${props.counteragent.website}`
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.contact-info {
  background: rgb(var(--v-theme-surface));
  border: 1px solid #333;
  padding: 16px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.contact-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid #333;
  transition: border-color 0.2s;
}

.contact-item.clickable {
  cursor: pointer;
}

.contact-item.clickable:hover {
  border-color: #1976d2;
}

.contact-icon {
  flex-shrink: 0;
}

.contact-details {
  flex: 1;
  min-width: 0;
}

.contact-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.contact-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  word-break: break-word;
}

@media (max-width: 600px) {
  .contact-item {
    padding: 12px 8px;
  }
}
</style>
