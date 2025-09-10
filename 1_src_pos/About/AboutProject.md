# Restaurant Kitchen Management System Documentation

## Project Overview

The project is a Vue.js-based kitchen management system for restaurants, built with TypeScript and modern tooling. It's designed to run on Android devices and manages different aspects of restaurant operations including kitchen, bar, and cashier workflows.

## Core Technical Stack

- **Frontend Framework**: Vue 3.5.12 with TypeScript
- **State Management**: Pinia 2.2.6
- **UI Framework**: Vuetify 3.7.4
- **Build Tool**: Vite 5.4.11
- **Mobile Platform**: Capacitor 6.2.0 for Android deployment
- **Backend Integration**: Firebase
- **Date Handling**: date-fns and date-fns-tz
- **Code Quality**: ESLint, Prettier, Husky, and lint-staged

## Project Structure

```
src/
├── assets/         # Static assets
├── components/     # Reusable Vue components
├── composables/    # Vue composable functions
├── config/         # Application configuration
├── firebase/       # Firebase integration
├── layouts/        # Application layouts
├── plugins/        # Vue plugins
├── router/         # Route definitions and guards
├── services/       # Business logic services
├── stores/         # Pinia state stores
├── theme/         # UI theming and styling
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── views/         # Page components
```

## Key Features

### Authentication System

- Role-based access control (RBAC)
- Supported roles: admin, kitchen, bar, cashier
- PIN-based authentication
- Route protection based on user roles

### Layout System

- AuthLayout: Authentication screens
- MonitorLayout: Kitchen and bar monitoring views
- CashierLayout: Point of sale operations
- BaseLayout: Common layout elements
- EmptyLayout: Minimal layout for specific cases

### Utility Systems

#### Debug Utilities

- Environment-aware logging system
- Log levels: info, warn, error, debug
- Log persistence and export functionality
- Development-only logging

#### Time Utilities

- Timezone handling (Asia/Denpasar)
- Date formatting and parsing
- ISO string conversions
- Day comparisons and boundary calculations

#### Formatting Utilities

- Currency formatting (IDR)
- Date/time formatting in multiple formats
- Consistent date display across the application

## Development Environment

### Key Scripts

```bash
# Development
npm run dev           # Start development server
npm run android:dev   # Build for Android (development)

# Quality Assurance
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run lint:fix     # Fix linting issues

# Build
npm run build        # Production build
```

### Development Tools Configuration

#### TypeScript

- Strict mode enabled
- ESNext target
- Path aliases configured (@/ points to src/)
- Comprehensive type checking enabled

#### Vite

- Hot Module Replacement
- Optimized build configuration
- Asset handling and chunking
- Development server configuration

#### ESLint & Prettier

- Strict TypeScript rules
- Vue.js specific linting
- Automatic formatting on commit

## Firebase Integration

The application uses Firebase for:

- Authentication
- Data storage (Firestore)
- Real-time updates
- Backend services

### Base Service Pattern

The application implements a generic BaseService class for Firebase operations:

- CRUD operations
- Timestamp handling
- Error logging
- Type-safe operations

## Routing System

The application implements a sophisticated routing system with:

- Role-based access control
- Authentication guards
- Nested routes
- Default redirects
- Layout-based routing

## Build and Deployment

The project uses Vite for building and Capacitor for Android deployment:

- Optimized chunk splitting
- Development and production modes
- Android-specific configurations
- Source map generation (development only)

## Security Considerations

- Environment-specific Firebase configurations
- Role-based access control
- Authentication guards on routes
- Sanitized logging
- Development/Production environment separation

# UI/UX Guidelines & Styling System

## User Interface Language

All interface elements, messages, and documentation are written in English to ensure consistency and maintain a professional standard across the application.

## Theme System

### Color Palette

```typescript
primary: '#a395e9' // Main brand color, used for primary actions
secondary: '#bfb5f2' // Supporting color for secondary elements
background: '#141416' // Dark background for main surfaces
surface: '#1a1a1e' // Slightly lighter for cards and elevated surfaces
error: '#ff9676' // Error states and critical messages
success: '#92c9af' // Success states and confirmations
warning: '#ffb076' // Warning states and important notices
```

### Dark Theme Configuration

The application uses a dark theme by default, optimized for kitchen and restaurant environments where reduced eye strain during long hours is crucial.

## Layout & Spacing

### Key Dimensions

- Header Height: 44px
- Footer Height: 44px
- Button Height: 44px
- List Item Height: 44px (minimum)
- Border Radius: 8px
- Base Spacing Unit: 8px

### CSS Variables

```css
--app-header-height: 44px --app-footer-height: 44px --app-border-radius: 8px --app-spacing-unit: 8px;
```

## Component Styling Defaults

### Button Configuration

```typescript
VBtn: {
  variant: 'elevated',
  height: 44
}
```

### Text Fields

```typescript
VTextField: {
  variant: 'outlined'
}
```

### Cards

```typescript
VCard: {
  elevation: 0 // Flat design preference
}
```

## Typography

### Font Stack

```css
system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif
```

### Text Rendering

- Antialiased text rendering enabled
- Optimized for readability on digital displays

## Z-Index Layer Management

```css
--app-z-drawer: 1000 // Navigation drawers
  --app-z-navbar: 1100 // Navigation bars
  --app-z-modal: 1200 // Modal dialogs
  --app-z-toast: 1300 // Toast notifications;;
```

## Utility Classes

### Height Management

```css
.app-full-height {
  height: calc(100vh - var(--app-header-height));
}
```

### Scrollbar Styling

```css
.app-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--app-primary) transparent;
}
```

## Vuetify Integration

### Icon System

- Material Design Icons (MDI) as default icon set
- Custom icon aliases supported
- Consistent 24px icon size

### Component Defaults

All Vuetify components are configured with consistent defaults to maintain UI coherence:

- Consistent heights (44px)
- Outlined variant for input fields
- Elevated variant for buttons
- Flat cards (no elevation)
- Rounded list items

## Responsive Design

### Breakpoints

Following Vuetify's standard breakpoint system:

- xs: < 600px
- sm: 600px > < 960px
- md: 960px > < 1264px
- lg: 1264px > < 1904px
- xl: > 1904px

### Mobile-First Approach

- Touch-friendly target sizes (minimum 44px)
- Optimized for Android tablets and devices
- Consistent spacing and padding for touch interactions

## Performance Considerations

### CSS Optimizations

- CSS Custom Properties for dynamic theming
- Minimal use of complex selectors
- Efficient reuse of utility classes
- Hardware acceleration for animations

### Loading States

- Consistent loading indicators
- Skeleton loaders for content
- Smooth transitions between states

## Accessibility Features

### Color Contrast

- High contrast dark theme
- Sufficient color contrast ratios
- Visual feedback for interactive elements

### Touch Targets

- Adequate sizing for touch interactions
- Clear visual feedback on interaction
- Consistent spacing between interactive elements

## Best Practices

1. Use CSS variables for theme values
2. Maintain consistent component spacing
3. Follow established component patterns
4. Use utility classes for common patterns
5. Maintain responsive design principles
6. Keep accessibility in mind
7. Use English for all UI elements

This styling system ensures a consistent, professional, and user-friendly interface across the application while maintaining high performance and accessibility standards.

# Routing System Documentation

## Overview

The application implements a role-based routing system using Vue Router with authentication protection and role-based access control (RBAC). The system manages navigation between different areas of the application based on user roles and authentication status.

## Route Structure

```
/ (Root)
├── /auth
│   └── /login             # Login page
├── /monitor               # Protected monitor section
│   ├── /kitchen          # Kitchen monitoring view
│   └── /bar              # Bar monitoring view
└── /cashier              # Protected cashier section
    └── /                 # Cashier dashboard
```

## Layouts

The application uses different layouts for different sections:

- **AuthLayout**: Used for authentication-related pages
- **MonitorLayout**: Used for kitchen and bar monitoring views
- **CashierLayout**: Used for cashier operations
- **BaseLayout**: Base layout template

## Role-Based Access

### Available Roles

- `admin`: Full access to all areas
- `kitchen`: Access to kitchen monitoring
- `bar`: Access to bar and kitchen monitoring
- `cashier`: Access to cashier operations

### Route Access Matrix

```typescript
{
  'kitchen': ['kitchen', 'bar', 'admin'],
  'bar': ['bar', 'admin'],
  'cashier': ['cashier', 'admin']
}
```

## Authentication Guard

The `authGuard` middleware handles route protection with the following logic:

```typescript
async function authGuard(to, from, next) {
  // 1. Check if route requires authentication
  // 2. Verify authentication status
  // 3. Validate user roles
  // 4. Allow or redirect
}
```

### Guard Features

1. **Authentication Check**

   ```typescript
   if (!authStore.state.isAuthenticated) {
     next({ name: 'login', query: { redirect: to.fullPath } })
   }
   ```

2. **Role Validation**

   ```typescript
   if (to.meta.roles) {
     if (!userRoles.some(role => to.meta.roles?.includes(role))) {
       next({ name: 'login' })
     }
   }
   ```

3. **Redirect Handling**
   - Saves attempted route for post-login redirect
   - Handles unauthorized access attempts

## Route Meta Fields

Routes are configured with meta fields for access control:

```typescript
{
  meta: {
    requiresAuth: boolean,
    roles?: string[]
  }
}
```

## Login Flow

1. User enters PIN at `/auth/login`
2. On successful authentication:
   - Cashiers → `/cashier`
   - Bar staff → `/monitor/bar`
   - Kitchen staff → `/monitor/kitchen`
   - Admins → `/monitor/kitchen`

## Error Handling

The routing system includes comprehensive error handling:

```typescript
try {
  // Route guard logic
} catch (error) {
  DebugUtils.error(MODULE_NAME, 'Navigation guard error:', error)
  next({ name: 'login' })
}
```

## Navigation Guards

### Global Guards

```typescript
router.beforeEach(async (to, from, next) => {
  // 1. Check authentication requirement
  // 2. Handle authenticated users at login page
  // 3. Validate role access
  // 4. Allow navigation
})
```

### Route-Specific Guards

Some routes have additional protection through meta fields:

```typescript
{
  path: '/monitor',
  meta: {
    requiresAuth: true,
    roles: ['kitchen', 'bar', 'admin']
  }
}
```

## Best Practices

1. **Route Names**

   - Use consistent naming convention
   - Always reference routes by name, not path

   ```typescript
   router.push({ name: 'kitchen' }) // Good
   router.push('/monitor/kitchen') // Avoid
   ```

2. **Role Checking**

   ```typescript
   userRoles.some(role => to.meta.roles?.includes(role))
   ```

3. **Error Logging**

   - All navigation errors are logged via DebugUtils
   - Includes detailed context for debugging

4. **Fallback Routes**
   ```typescript
   {
     path: '/:pathMatch(.*)*',
     redirect: '/auth/login'
   }
   ```

## Development Guidelines

1. **Adding New Routes**

   ```typescript
   {
     path: '/new-route',
     name: 'newRoute',
     component: NewComponent,
     meta: {
       requiresAuth: true,
       roles: ['admin']
     }
   }
   ```

2. **Layout Assignment**

   - Assign appropriate layout component
   - Consider nested routes for related views

3. **Role Configuration**

   - Define minimum required roles
   - Consider role hierarchy
   - Document role requirements

4. **Testing Routes**

   - Test authentication requirements
   - Verify role-based access
   - Check redirect behavior
   - Validate guard behavior

   # Utils and Composables Documentation

## Utils System

### Debug Utils (`debugger.ts`)

A comprehensive logging system for development purposes.

```typescript
class DebugUtils {
  static info(module: string, message: string, data?: LogData)
  static warn(module: string, message: string, data?: LogData)
  static error(module: string, message: string, data?: LogData)
  static debug(module: string, message: string, data?: LogData)
}
```

#### Features:

- Environment-aware logging (development only)
- Log levels: info, warn, error, debug
- Timestamp tracking
- Log persistence (max 1000 entries)
- JSON log export functionality
- Data sanitization
- Module-based logging

#### Usage Example:

```typescript
DebugUtils.info('AuthModule', 'User logged in', { userId: '123' })
DebugUtils.error('PaymentModule', 'Transaction failed', error)
```

### Time Utils (`time.ts`)

Time manipulation and formatting utilities with timezone support.

#### Key Features:

- Timezone handling (Asia/Denpasar)
- Firebase Timestamp conversions
- ISO string operations
- Date comparisons and boundaries

```typescript
class TimeUtils {
  static getCurrentLocalISO(): string
  static formatDateToDisplay(date: string | Date, format?: string): string
  static isSameDay(date1: string | Date, date2: string | Date): boolean
  static getStartOfDay(date: string | Date): string
  static getEndOfDay(date: string | Date): string
}
```

### Formatter Utils (`formatter.ts`)

Standardized formatting utilities for dates and currency.

```typescript
export function formatAmount(amount: number): string
export function formatDateTime(date: string | Date): string
export function formatFullDateTime(date: string | Date): string
```

#### Currency Formatting:

- Currency: IDR (Indonesian Rupiah)
- Locale: ru-RU
- Includes proper grouping and decimal handling

#### Date Formatting Options:

- `formatDateTime`: Time with seconds (HH:mm:ss)
- `formatDate`: Date only (yyyy-MM-dd)
- `formatFullDateTime`: Full date and time (yyyy-MM-dd HH:mm:ss)
- `formatTimeOnly`: Time only (HH:mm)
- `formatDateMonthYear`: Month and year (MMMM yyyy)
- `formatDayMonth`: Day and month (dd MMM)

## Composables

### useDialogForm

A form management composable for dialog-based forms.

```typescript
const { form, loading, formState, formData, isFormValid, resetForm, handleSubmit, handleCancel } =
  useDialogForm<T>({
    moduleName: string,
    initialData: T,
    onSubmit: (data: T) => Promise<void>
  })
```

#### Features:

- Form state management
- Loading state handling
- Validation tracking
- Error handling
- Form reset capability
- Typescript support with generics

#### Usage Example:

```typescript
const { formData, handleSubmit, loading } = useDialogForm({
  moduleName: 'UserForm',
  initialData: { name: '', email: '' },
  onSubmit: async data => {
    await saveUser(data)
  }
})
```

### useVuetifyBreakpoints

Responsive design utility composable.

```typescript
const {
  isMobile,
  isTablet,
  isDesktop,
  screenWidth,
  isXs,
  isSm,
  isMd,
  isLg,
  isXl,
  isSmallScreen,
  isLargeScreen,
  isMediumScreen
} = useVuetifyBreakpoints()
```

#### Breakpoint Categories:

- Basic States:

  - `isMobile`: Mobile devices
  - `isTablet`: Tablet devices
  - `isDesktop`: Desktop screens

- Exact Breakpoints:

  - `isXs`: Extra small screens
  - `isSm`: Small screens
  - `isMd`: Medium screens
  - `isLg`: Large screens
  - `isXl`: Extra large screens

- Composite States:
  - `isSmallScreen`: Small screens and down
  - `isLargeScreen`: Large screens and up
  - `isMediumScreen`: Medium screens only

#### Usage Example:

```typescript
const { isMobile, isDesktop } = useVuetifyBreakpoints()

// In template
<template>
  <div v-if="isMobile">
    <MobileLayout />
  </div>
  <div v-else-if="isDesktop">
    <DesktopLayout />
  </div>
</template>
```

## Firebase Converters

### Base Converter

d
Handles Firebase Timestamp conversions for common fields.

```typescript
export const baseConverter = {
  toFirestore: (data: BaseDocumentData): DocumentData
  fromFirestore: (snapshot: QueryDocumentSnapshot): BaseDocumentData
}
```

#### Features:

- Automatic timestamp conversion
- ID handling
- Type-safe conversions
- Created/Updated/Closed date handling

#### Usage Example:

```typescript
const converter = createConverter<UserDocument>()
const userRef = collection(db, 'users').withConverter(converter)
```

## Best Practices

1. **Logging**

   - Use appropriate log levels
   - Include relevant context data
   - Keep module names consistent

2. **Date Handling**

   - Always use TimeUtils for timezone operations
   - Handle date parsing errors
   - Use consistent date formats

3. **Form Management**

   - Initialize forms with proper types
   - Handle loading states
   - Implement proper error handling
   - Reset forms after submission

4. **Responsive Design**

   - Use breakpoint composables consistently
   - Consider all screen sizes
   - Test responsive behavior

5. **Firebase Data**
   - Use type-safe converters
   - Handle timestamp conversions properly
   - Include error handling
