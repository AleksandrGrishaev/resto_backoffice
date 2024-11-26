// src/firebase/services/base.service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  QueryConstraint
} from 'firebase/firestore'
import { db } from '../config'
import { BaseEntity } from '../../types'
import { DebugUtils } from '../../utils/debugger'

export class BaseService<T extends BaseEntity> {
  protected collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  protected getCollection() {
    return collection(db, this.collectionName)
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(this.getCollection(), ...constraints)
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T)
    } catch (error) {
      DebugUtils.error(this.collectionName, 'Error getting all documents:', error)
      throw error
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(this.getCollection(), id)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as T) : null
    } catch (error) {
      DebugUtils.error(this.collectionName, `Error getting document ${id}:`, error)
      throw error
    }
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = doc(this.getCollection())
      const timestamp = new Date().toISOString()
      const docData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      await setDoc(docRef, docData)
      return { id: docRef.id, ...docData } as T
    } catch (error) {
      DebugUtils.error(this.collectionName, 'Error creating document:', error)
      throw error
    }
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(this.getCollection(), id)
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      }
      await updateDoc(docRef, updateData)
    } catch (error) {
      DebugUtils.error(this.collectionName, `Error updating document ${id}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollection(), id)
      await deleteDoc(docRef)
    } catch (error) {
      DebugUtils.error(this.collectionName, `Error deleting document ${id}:`, error)
      throw error
    }
  }
}
