// src/core/changelog/index.ts

export { computeRecipeDiff, computePreparationDiff } from './entityDiff'
export type { FieldChange, ComponentChange, EntityDiff } from './entityDiff'

export { changelogService, setCurrentUserProvider } from './changelogService'
export type { ChangeLogEntry, EntityType, ChangeType } from './changelogService'

export { getFieldLabel, formatFieldValue } from './fieldLabels'
