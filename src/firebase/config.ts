// src/firebase/config.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { DebugUtils } from '../utils/debugger'
import { Firestore } from 'firebase/firestore'

const MODULE_NAME = 'FirebaseConfig'

function validateEnvVariables() {
  const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID']

  const missing = required.filter(key => !import.meta.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

validateEnvVariables()

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

let app
export let db: Firestore

try {
  DebugUtils.info(MODULE_NAME, 'Initializing Firebase with config:', firebaseConfig)

  app = initializeApp(firebaseConfig)
  db = getFirestore(app)

  DebugUtils.info(MODULE_NAME, 'Firebase initialized successfully')
} catch (error) {
  DebugUtils.error(MODULE_NAME, 'Failed to initialize Firebase:', error)
  throw error
}

export { app }
