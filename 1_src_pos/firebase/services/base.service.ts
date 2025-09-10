// src/firebase/services/base.service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type QueryConstraint,
  query
} from 'firebase/firestore'
import { db } from '../config'
import type { BaseEntity } from '@/types/common'
import { DebugUtils } from '@/utils'

export class BaseService<T extends BaseEntity> {
  protected readonly MODULE_NAME: string

  constructor(protected collectionName: string) {
    this.MODULE_NAME = `${collectionName}Service`
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(collection(db, this.collectionName), ...constraints)
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T)
    } catch (error) {
      DebugUtils.error(this.MODULE_NAME, 'Failed to get all documents:', error)
      throw error
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as T) : null
    } catch (error) {
      DebugUtils.error(this.MODULE_NAME, `Failed to get document ${id}:`, error)
      throw error
    }
  }

  async create(data: Omit<T, keyof BaseEntity>): Promise<T> {
    try {
      const docRef = doc(collection(db, this.collectionName))
      const timestamp = new Date().toISOString()

      const docData = {
        ...data,
        id: docRef.id,
        createdAt: timestamp,
        updatedAt: timestamp
      } as DocumentData

      await setDoc(docRef, docData)
      DebugUtils.info(this.MODULE_NAME, 'Document created:', { id: docRef.id })

      return docData as T
    } catch (error) {
      DebugUtils.error(this.MODULE_NAME, 'Failed to create document:', error)
      throw error
    }
  }

  async update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      }

      await updateDoc(docRef, updateData)
      DebugUtils.info(this.MODULE_NAME, 'Document updated:', { id })
    } catch (error) {
      DebugUtils.error(this.MODULE_NAME, `Failed to update document ${id}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      DebugUtils.info(this.MODULE_NAME, 'Document deleted:', { id })
    } catch (error) {
      DebugUtils.error(this.MODULE_NAME, `Failed to delete document ${id}:`, error)
      throw error
    }
  }
}
