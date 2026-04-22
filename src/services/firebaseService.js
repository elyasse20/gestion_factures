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

// Délai par défaut pour éviter les "promesses bloquées" si:
// - databaseURL est incorrecte
// - règles Firebase bloquent la lecture/écriture
// - connexion lente
const DEFAULT_TIMEOUT_MS = 8000

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, label = 'opération Firebase') {
  let t
  const timeout = new Promise((_, reject) => {
    // Le message oriente le debug vers URL + rules (cas le plus fréquent côté Realtime DB).
    t = setTimeout(() => reject(new Error(`Timeout (${ms}ms) pendant ${label}. Vérifiez votre Realtime Database URL et vos règles.`)), ms)
  })
  // `Promise.race` permet de rejeter si l'opération dépasse `ms`.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

function getFirebaseConfig() {
  // Configuration injectée par Vite (.env -> import.meta.env).
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

  // Si une config minimale manque, on considère Firebase "désactivé".
  if (!cfg.apiKey || !cfg.databaseURL || !cfg.projectId) return null
  return cfg
}

function ensureApp() {
  const cfg = getFirebaseConfig()
  // Le reste de l'app peut catcher et basculer en mode mock (AuthContext).
  if (!cfg) return null
  // Évite de ré-initialiser Firebase à chaque import/hot reload.
  if (getApps().length) return getApps()[0]
  return initializeApp(cfg)
}

function ensureDb() {
  const app = ensureApp()
  // Erreur "humaine": guide directement vers la config .env.
  if (!app) throw new Error('Firebase non configuré. Renseignez VITE_FIREBASE_* dans .env')
  return getDatabase(app)
}

async function readList(path) {
  const db = ensureDb()
  // `child(ref(db), path)` lit un "nœud" complet (liste) dans Realtime Database.
  const snap = await withTimeout(get(child(ref(db), path)), DEFAULT_TIMEOUT_MS, `lecture "${path}"`)
  const val = snap.val() || {}
  // Realtime DB renvoie { id: data } -> on aplatit en [{ id, ...data }].
  return Object.entries(val).map(([id, data]) => ({ id, ...data }))
}

export const getFirebaseAuth = () => {
  const app = ensureApp()
  if (!app) throw new Error('Firebase non configuré')
  return getAuth(app)
}

export const firebaseService = {
  // ── Clients ───────────────────────────────────────────────────────────────
  listClients: () => readList('clients'),
  createClient: async (data) => {
    const db = ensureDb()
    // `push` génère une clé unique côté serveur (pattern liste).
    const newRef = push(ref(db, 'clients'))
    await withTimeout(set(newRef, data), DEFAULT_TIMEOUT_MS, 'création client')
    return { id: newRef.key, ...data }
  },
  updateClient: async (id, data) => {
    const db = ensureDb()
    // `update` patch partiel: utile pour ne pas écraser le nœud entier.
    await withTimeout(update(ref(db, `clients/${id}`), data), DEFAULT_TIMEOUT_MS, 'mise à jour client')
    return { id, ...data }
  },
  deleteClient: async (id) => {
    const db = ensureDb()
    await withTimeout(remove(ref(db, `clients/${id}`)), DEFAULT_TIMEOUT_MS, 'suppression client')
    return true
  },

  // ── Factures ──────────────────────────────────────────────────────────────
  listFactures: async (role, userId) => {
    // Admin: pas de filtrage; on lit toute la collection.
    if (role === 'admin' || !userId) {
      return readList('factures')
    }
    const db = ensureDb()
    // Agent: requête indexée sur `agent_id` (nécessite `.indexOn: ["agent_id"]` dans les rules).
    const q = query(ref(db, 'factures'), orderByChild('agent_id'), equalTo(userId))
    const snap = await withTimeout(get(q), DEFAULT_TIMEOUT_MS, `lecture factures agent=${userId}`)
    const val = snap.val() || {}
    return Object.entries(val).map(([id, data]) => ({ id, ...data }))
  },
  createFacture: async (data) => {
    const db = ensureDb()
    // Pattern liste: `push` pour générer une clé unique.
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

