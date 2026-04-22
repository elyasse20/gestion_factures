import React from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { useAuth } from '../../contexts/AuthContext.jsx'

function NavButton({ to, label }) {
  const location = useLocation()
  // "actif" si on est exactement sur la route ou dans un sous-chemin (ex: /factures/nouvelle).
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
  return (
    <Button
      component={RouterLink}
      to={to}
      sx={{
        // Styles différents pour rendre l'onglet actif plus visible.
        textTransform: 'none',
        fontWeight: active ? 700 : 500,
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? 'rgba(79,70,229,0.08)' : 'transparent',
        borderRadius: '8px',
        px: 2,
        '&:hover': { bgcolor: 'rgba(79,70,229,0.06)', color: 'primary.main' }
      }}
    >
      {label}
    </Button>
  )
}

export default function AppLayout() {
  // Données d'auth pour afficher l'email, le rôle et permettre la déconnexion.
  const { user, role, logout } = useAuth()
  const isAdmin = role === 'admin'

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontFamily: '"Outfit", sans-serif', fontWeight: 700, color: 'text.primary' }}
          >
            💼 Gestion des Factures
          </Typography>

          {isAdmin ? (
            // Navigation ADMIN
            <>
              <NavButton to="/dashboard" label="📊 Dashboard Admin" />
              <NavButton to="/admin/factures" label="🔍 Valider Factures" />
              <NavButton to="/admin/parametres" label="⚙️ Paramètres" />
            </>
          ) : (
            // Navigation USER
            <>
              <NavButton to="/dashboard" label="🏠 Dashboard" />
              <NavButton to="/clients" label="👥 Clients" />
              <NavButton to="/factures" label="📄 Factures" />
            </>
          )}

          <Chip
            // Indication rapide du rôle actif (utile en mode mock dev).
            label={isAdmin ? '🔐 Admin' : '👤 Agent'}
            size="small"
            color={isAdmin ? 'secondary' : 'default'}
            sx={{ mx: 1, fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}
          />
          <Typography variant="body2" sx={{ opacity: 0.7, fontSize: '0.75rem' }}>
            {user?.email ?? 'connecté'}
          </Typography>
          <Button
            // `logout` gère Firebase Auth + fallback mock (voir AuthContext).
            onClick={logout}
            size="small"
            sx={{ textTransform: 'none', ml: 1, color: 'error.main', borderColor: 'error.light', border: '1px solid' }}
          >
            Déconnexion
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        {/* Point d'insertion React Router: rend la page courante dans le layout. */}
        <Outlet />
      </Container>
    </Box>
  )
}
