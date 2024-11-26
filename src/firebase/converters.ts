// src/firebase/converters.ts
import {
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
  FirestoreDataConverter
} from 'firebase/firestore'
import { TimeUtils } from '@/utils'
import type { BaseEntity } from '@/types/common'

interface BaseDocumentData extends Record<string, unknown> {
  createdAt: string
  updatedAt: string
  closedAt?: string
}

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

export function createConverter<
  T extends BaseEntity & Record<string, unknown>
>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => baseConverter.toFirestore(data as BaseDocumentData),
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) =>
      baseConverter.fromFirestore(snapshot, options) as T
  }
}
