import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getFirebaseAuth } from '../services/firebaseService'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('user') // user | admin
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const auth = getFirebaseAuth()
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser({ uid: currentUser.uid, email: currentUser.email })
          setRole(currentUser.email?.toLowerCase().includes('admin') ? 'admin' : 'user')
        } else {
          setUser(null)
          setRole('user')
        }
        setLoading(false)
      })
      return () => unsubscribe()
    } catch {
      // Fallback au mock si Firebase non configuré
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
    if (!email || !password) throw new Error('Email et mot de passe requis')
    
    try {
      const auth = getFirebaseAuth()
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      if (e.message === 'Firebase non configuré' || e.code === 'auth/api-key-not-valid' || (e.message && e.message.includes('api-key-not-valid'))) {
         const nextRole = email.toLowerCase().includes('admin') ? 'admin' : 'user'
         const nextUser = { uid: email, email }
         setUser(nextUser)
         setRole(nextRole)
         localStorage.setItem('gdf_auth_mock', JSON.stringify({ user: nextUser, role: nextRole }))
      } else {
         throw e
      }
    }
  }

  const logout = async () => {
    try {
       const auth = getFirebaseAuth()
       await signOut(auth)
    } catch (e) {
      if (e.message === 'Firebase non configuré' || e.code === 'auth/api-key-not-valid' || (e.message && e.message.includes('api-key-not-valid'))) {
        setUser(null)
        setRole('user')
        localStorage.removeItem('gdf_auth_mock')
      } else {
        throw e
      }
    }
  }

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
