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
  query,
  orderByChild,
  equalTo,
} from 'firebase/database'

const DEFAULT_TIMEOUT_MS = 8000

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, label = 'opération Firebase') {
  let t
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timeout (${ms}ms) pendant ${label}. Vérifiez votre Realtime Database URL et vos règles.`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

function getFirebaseConfig() {
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
  const snap = await withTimeout(get(child(ref(db), path)), DEFAULT_TIMEOUT_MS, `lecture "${path}"`)
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
    await withTimeout(set(newRef, data), DEFAULT_TIMEOUT_MS, 'création client')
    return { id: newRef.key, ...data }
  },
  updateClient: async (id, data) => {
    const db = ensureDb()
    await withTimeout(update(ref(db, `clients/${id}`), data), DEFAULT_TIMEOUT_MS, 'mise à jour client')
    return { id, ...data }
  },
  deleteClient: async (id) => {
    const db = ensureDb()
    await withTimeout(remove(ref(db, `clients/${id}`)), DEFAULT_TIMEOUT_MS, 'suppression client')
    return true
  },

  listFactures: async (role, userId) => {
    if (role === 'admin' || !userId) {
      return readList('factures')
    }
    const db = ensureDb()
    const q = query(ref(db, 'factures'), orderByChild('agent_id'), equalTo(userId))
    const snap = await withTimeout(get(q), DEFAULT_TIMEOUT_MS, `lecture factures agent=${userId}`)
    const val = snap.val() || {}
    return Object.entries(val).map(([id, data]) => ({ id, ...data }))
  },
  createFacture: async (data) => {
    const db = ensureDb()
    const newRef = push(ref(db, 'factures'))
    await withTimeout(set(newRef, data), DEFAULT_TIMEOUT_MS, 'création facture')
    return { id: newRef.key, ...data }
  },
  updateFacture: async (id, data) => {
    const db = ensureDb()
    await withTimeout(update(ref(db, `factures/${id}`), data), DEFAULT_TIMEOUT_MS, 'mise à jour facture')
    return { id, ...data }
  },
  deleteFacture: async (id) => {
    const db = ensureDb()
    await withTimeout(remove(ref(db, `factures/${id}`)), DEFAULT_TIMEOUT_MS, 'suppression facture')
    return true
  },
}

