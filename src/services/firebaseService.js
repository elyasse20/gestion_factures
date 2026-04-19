import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getDatabase,
  push,
  ref,
  remove,
  set,
  get,
  child,
  update,
} from 'firebase/database'

function getFirebaseConfig() {
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  if (!cfg.apiKey || !cfg.databaseURL || !cfg.projectId) return null
  return cfg
}

function ensureApp() {
  const cfg = getFirebaseConfig()
  if (!cfg) return null
  if (getApps().length) return getApps()[0]
  return initializeApp(cfg)
}

function ensureDb() {
  const app = ensureApp()
  if (!app) throw new Error('Firebase non configuré. Renseignez VITE_FIREBASE_* dans .env')
  return getDatabase(app)
}

async function readList(path) {
  const db = ensureDb()
  const snap = await get(child(ref(db), path))
  const val = snap.val() || {}
  return Object.entries(val).map(([id, data]) => ({ id, ...data }))
}

export const getFirebaseAuth = () => {
  const app = ensureApp()
  if (!app) throw new Error('Firebase non configuré')
  return getAuth(app)
}

export const firebaseService = {
  listClients: () => readList('clients'),
  createClient: async (data) => {
    const db = ensureDb()
    const newRef = push(ref(db, 'clients'))
    await set(newRef, data)
    return { id: newRef.key, ...data }
  },
  updateClient: async (id, data) => {
    const db = ensureDb()
    await update(ref(db, `clients/${id}`), data)
    return { id, ...data }
  },
  deleteClient: async (id) => {
    const db = ensureDb()
    await remove(ref(db, `clients/${id}`))
    return true
  },

  listFactures: () => readList('factures'),
  createFacture: async (data) => {
    const db = ensureDb()
    const newRef = push(ref(db, 'factures'))
    await set(newRef, data)
    return { id: newRef.key, ...data }
  },
  updateFacture: async (id, data) => {
    const db = ensureDb()
    await update(ref(db, `factures/${id}`), data)
    return { id, ...data }
  },
  deleteFacture: async (id) => {
    const db = ensureDb()
    await remove(ref(db, `factures/${id}`))
    return true
  },
}

