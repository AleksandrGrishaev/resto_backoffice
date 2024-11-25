// src/firebase/converters.ts
import {
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
  FirestoreDataConverter
} from 'firebase/firestore'
import { TimeUtils } from '../utils/time'
import type { BaseEntity } from '../types'

type BaseDocumentData = {
  createdAt: string
  updatedAt: string
  closedAt?: string
  [key: string]: unknown
}

// Base converter for all entities with timestamps
export const baseConverter = {
  toFirestore: (data: BaseDocumentData): DocumentData => {
    const { createdAt, updatedAt, closedAt, ...rest } = data
    return {
      ...rest,
      createdAt: TimeUtils.isoToTimestamp(createdAt),
      updatedAt: TimeUtils.isoToTimestamp(updatedAt),
      ...(closedAt && { closedAt: TimeUtils.isoToTimestamp(closedAt) })
    }
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): BaseDocumentData => {
    const data = snapshot.data(options)
    return {
      ...data,
      id: snapshot.id,
      createdAt: TimeUtils.timestampToLocalISO(data.createdAt),
      updatedAt: TimeUtils.timestampToLocalISO(data.updatedAt),
      ...(data.closedAt && {
        closedAt: TimeUtils.timestampToLocalISO(data.closedAt)
      })
    }
  }
}

// Generic createConverter function for future use
export function createConverter<T extends BaseEntity>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T): DocumentData => {
      return baseConverter.toFirestore(data)
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T => {
      return baseConverter.fromFirestore(snapshot, options) as T
    }
  }
}
