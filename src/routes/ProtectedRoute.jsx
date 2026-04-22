import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ProtectedRoute({ children, role: requiredRole }) {
  // `loading` sert à éviter un "flash" (redirection) tant que la session n'est pas résolue.
  const { user, role, loading } = useAuth()
  // On mémorise la route demandée pour éventuellement y revenir après login.
  const location = useLocation()

  if (loading) {
    // UX: écran d'attente pendant la résolution Firebase/mock.
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    // Non authentifié: redirection vers login en gardant la provenance.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredRole && role !== requiredRole) {
    // Auth OK mais rôle insuffisant: on renvoie vers un écran autorisé.
    return <Navigate to="/dashboard" replace />
  }

  // Auth OK + rôle OK: on rend la page protégée.
  return children
}

