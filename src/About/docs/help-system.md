# Help System - Documentation Guide

This document describes how to create and maintain user documentation for the Kitchen App using the built-in Help system.

## Overview

The Help system (`/help`) provides interactive documentation with screenshots for all app sections:

- **Kitchen** - Kitchen Monitor, Preparation, KPI
- **POS** - Point of Sale (coming soon)
- **Backoffice** - Management interface (coming soon)

## Architecture

```
src/help/
├── router.ts                    # Route definitions
├── HelpLayout.vue               # Main layout with sidebar navigation
├── HelpHomeView.vue             # Landing page (/help)
├── kitchen/
│   ├── KitchenHelpView.vue      # Section overview (/help/kitchen)
│   └── guides/
│       └── MonitorGuide.vue     # Individual guide (/help/kitchen/monitor)
├── pos/
│   ├── PosHelpView.vue          # Section overview (/help/pos)
│   └── guides/
│       └── [future guides]
├── backoffice/
│   ├── BackofficeHelpView.vue   # Section overview (/help/backoffice)
│   └── guides/
│       └── [future guides]
└── assets/
    └── screenshots/
        ├── kitchen/             # Kitchen screenshots
        ├── pos/                 # POS screenshots
        └── backoffice/          # Backoffice screenshots
```

## Creating Screenshots with Playwright

### Prerequisites

- Dev server running (`pnpm dev`)
- Playwright MCP connected

### Step-by-step Process

#### 1. Start the dev server

```bash
pnpm dev
```

#### 2. Navigate and capture screenshots

Using Playwright MCP tools:

```typescript
// Navigate to the page
mcp__playwright__browser_navigate({ url: 'http://localhost:5176/kitchen' })

// Wait for page to load
mcp__playwright__browser_wait_for({ time: 3 })

// Take screenshot
mcp__playwright__browser_take_screenshot({
  filename: 'src/help/assets/screenshots/kitchen/01_orders_screen.png'
})
```

#### 3. Screenshot naming convention

```
[NN]_[section]_[description].png

Examples:
01_login_kitchen_tab.png
02_kitchen_main_orders.png
03_kitchen_preparation.png
04_kitchen_kpi.png
```

## Creating a New Guide

### 1. Create the guide component

Create a new file in `src/help/[section]/guides/[GuideName].vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'

// Import screenshots
import screenshot1 from '../../assets/screenshots/[section]/01_screenshot.png'
import screenshot2 from '../../assets/screenshots/[section]/02_screenshot.png'

const activeSection = ref('section1')

const sections = [
  { id: 'section1', title: 'Section 1', icon: 'mdi-icon' },
  { id: 'section2', title: 'Section 2', icon: 'mdi-icon' }
]

function scrollToSection(sectionId: string) {
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="guide">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" :to="{ name: 'help-[section]' }" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Guide Title</h1>
        <p class="text-body-2 text-medium-emphasis">Guide description</p>
      </div>
    </div>

    <!-- Quick Navigation -->
    <v-card class="mb-6" variant="outlined">
      <v-card-text class="pa-2">
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="section in sections"
            :key="section.id"
            :prepend-icon="section.icon"
            :variant="activeSection === section.id ? 'flat' : 'outlined'"
            :color="activeSection === section.id ? 'primary' : undefined"
            @click="scrollToSection(section.id)"
          >
            {{ section.title }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Section -->
    <section id="section1" class="guide-section">
      <div class="section-header">
        <v-icon color="primary" class="mr-2">mdi-numeric-1-circle</v-icon>
        <h2 class="text-h5 font-weight-bold">Section Title</h2>
      </div>

      <v-card class="screenshot-card mb-4">
        <v-img :src="screenshot1" max-height="500" contain class="bg-grey-darken-4" />
      </v-card>

      <v-card variant="tonal" color="primary" class="mb-6">
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Steps:</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item prepend-icon="mdi-numeric-1-circle-outline">
              <v-list-item-title>Step 1 description</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-numeric-2-circle-outline">
              <v-list-item-title>Step 2 description</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </section>

    <v-divider class="my-6" />

    <!-- More sections... -->
  </div>
</template>

<style scoped lang="scss">
.guide {
  max-width: 900px;
}

.guide-section {
  scroll-margin-top: 80px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.screenshot-card {
  overflow: hidden;
  border-radius: 8px;
}
</style>
```

### 2. Register the route

Add to `src/help/router.ts`:

```typescript
const NewGuide = () => import('./[section]/guides/NewGuide.vue')

// In helpRoutes children:
{
  path: '[section]/new-guide',
  name: 'help-[section]-new-guide',
  component: NewGuide,
  meta: {
    title: 'New Guide Title',
    section: '[section]',
  },
}
```

### 3. Add to section overview

Update `src/help/[section]/[Section]HelpView.vue`:

```typescript
const guides = [
  {
    id: 'new-guide',
    title: 'New Guide Title',
    description: 'Guide description',
    icon: 'mdi-icon',
    route: 'help-[section]-new-guide',
    tags: ['Tag1', 'Tag2']
  }
]
```

## UI Components Reference

### Screenshot Card

```vue
<v-card class="screenshot-card mb-4">
  <v-img :src="screenshotImage" max-height="500" contain class="bg-grey-darken-4" />
</v-card>
```

### Steps List

```vue
<v-card variant="tonal" color="primary">
  <v-card-text>
    <h3 class="text-subtitle-1 font-weight-bold mb-3">Steps:</h3>
    <v-list density="compact" bg-color="transparent">
      <v-list-item prepend-icon="mdi-numeric-1-circle-outline">
        <v-list-item-title>Step description</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card-text>
</v-card>
```

### Expandable Panels

```vue
<v-expansion-panels variant="accordion">
  <v-expansion-panel title="Panel Title">
    <v-expansion-panel-text>
      Panel content
    </v-expansion-panel-text>
  </v-expansion-panel>
</v-expansion-panels>
```

### Info Alert

```vue
<v-alert type="info" variant="tonal" density="compact">
  <strong>Tip:</strong> Alert message
</v-alert>
```

### Table

```vue
<v-table density="compact">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Label</strong></td>
      <td>Value</td>
    </tr>
  </tbody>
</v-table>
```

## Color Scheme

Use different tonal colors for different sections:

| Section     | Color              |
| ----------- | ------------------ |
| Login       | `primary` (purple) |
| Orders      | `orange`           |
| Preparation | `green`            |
| KPI         | `blue`             |
| Warnings    | `error` (red)      |
| Tips        | `info`             |

## Best Practices

1. **Screenshot Quality**

   - Use consistent window size (1280x800 recommended)
   - Capture relevant UI state (data loaded, active elements)
   - Avoid capturing sensitive data

2. **Content Structure**

   - Start with overview/purpose
   - Break into logical sections
   - Use numbered steps for actions
   - Include tips and warnings

3. **Navigation**

   - Always provide back link to section
   - Add quick navigation chips at top
   - Link to related guides

4. **Accessibility**
   - Use semantic headings (h1, h2, h3)
   - Provide alt text context via descriptions
   - Ensure color contrast

## Workflow Summary

```
1. Start dev server
2. Navigate to feature in browser (via Playwright)
3. Take screenshots with meaningful names
4. Create guide component with screenshots
5. Register route in router.ts
6. Add guide to section overview
7. Test navigation and display
8. Build to verify no errors
```

## Quick Reference: Playwright Commands

```typescript
// Navigate
mcp__playwright__browser_navigate({ url: 'http://localhost:5176/[path]' })

// Wait for load
mcp__playwright__browser_wait_for({ time: 3 })

// Get page state
mcp__playwright__browser_snapshot()

// Click element
mcp__playwright__browser_click({ element: 'description', ref: 'eXX' })

// Type text
mcp__playwright__browser_type({ element: 'input', ref: 'eXX', text: 'value' })

// Take screenshot
mcp__playwright__browser_take_screenshot({
  filename: 'path/to/screenshot.png'
})
```

---

_Last updated: December 2024_
