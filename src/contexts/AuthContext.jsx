import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getFirebaseAuth } from '../services/firebaseService'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// Contexte global d'authentification.
// - Source principale: Firebase Auth (si configuré).
// - Mode fallback: "mock" stocké dans localStorage, utile en dev sans Firebase.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Utilisateur courant (ou null si déconnecté).
  const [user, setUser] = useState(null)
  // Rôle applicatif dérivé (simple): admin si l'email contient "admin".
  const [role, setRole] = useState('user') // user | admin
  // Tant que l'état d'auth n'est pas déterminé, on bloque les routes protégées.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      // Branche "réelle": écoute de Firebase Auth (session persistée).
      const auth = getFirebaseAuth()
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          // On ne garde que les champs utiles côté UI.
          setUser({ uid: currentUser.uid, email: currentUser.email })
          // Convention de démo: email incluant "admin" => rôle admin.
          setRole(currentUser.email?.toLowerCase().includes('admin') ? 'admin' : 'user')
        } else {
          setUser(null)
          setRole('user')
        }
        // L'app peut enfin décider: afficher la page demandée ou rediriger.
        setLoading(false)
      })
      return () => unsubscribe()
    } catch {
      // Si Firebase n'est pas configuré (ou échoue), on tente de réutiliser le mock local.
      const raw = localStorage.getItem('gdf_auth_mock')
      if (raw) {
        const parsed = JSON.parse(raw)
        setUser(parsed.user)
        setRole(parsed.role)
      }
      setLoading(false)
    }
  }, [])

  const login = async ({ email, password }) => {
    // Validation minimale: évite des appels inutiles et rend l'erreur plus claire.
    if (!email || !password) throw new Error('Email et mot de passe requis')
    
    try {
      // Auth "réelle" via Firebase.
      const auth = getFirebaseAuth()
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      // Mode fallback: si Firebase n'est pas utilisable, on simule une session locale.
      if (e.message === 'Firebase non configuré' || e.code === 'auth/api-key-not-valid' || (e.message && e.message.includes('api-key-not-valid'))) {
         const nextRole = email.toLowerCase().includes('admin') ? 'admin' : 'user'
         const nextUser = { uid: email, email }
         setUser(nextUser)
         setRole(nextRole)
         // Persistance pour survivre aux refresh en dev.
         localStorage.setItem('gdf_auth_mock', JSON.stringify({ user: nextUser, role: nextRole }))
      } else {
         throw e
      }
    }
  }

  const logout = async () => {
    try {
       // Déconnexion "réelle" Firebase.
       const auth = getFirebaseAuth()
       await signOut(auth)
    } catch (e) {
      // Déconnexion fallback: purge le mock local.
      if (e.message === 'Firebase non configuré' || e.code === 'auth/api-key-not-valid' || (e.message && e.message.includes('api-key-not-valid'))) {
        setUser(null)
        setRole('user')
        localStorage.removeItem('gdf_auth_mock')
      } else {
        throw e
      }
    }
  }

  // Valeur memoïzée: évite de re-render tous les consommateurs si rien ne change.
  const value = useMemo(
    () => ({ user, role, loading, login, logout }),
    [user, role, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
