import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'

// USER pages
import ClientsPage from './pages/ClientsPage.jsx'
import InvoicesPage from './pages/InvoicesPage.jsx'
import InvoiceCreatePage from './pages/InvoiceCreatePage.jsx'

// ADMIN pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminParamsPage from './pages/admin/AdminParamsPage.jsx'
import AdminValidationPage from './pages/admin/AdminValidationPage.jsx'

import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

export default function App() {
  return (
    // `AuthProvider` rend user/role/login/logout disponibles partout.
    <AuthProvider>
      <Routes>
        {/* Page publique */}
        <Route path="/login" element={<LoginPage />} />

        {/* ═══════════════════════════════════════ */}
        {/* ESPACE USER (Comptable / Agent)         */}
        {/* ═══════════════════════════════════════ */}
        <Route
          path="/"
          element={
            // Toutes les routes sous "/" exigent une session.
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Accès à "/" => redirection vers le dashboard. */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          {/* 1. Dashboard personnel */}
          {/* NB: actuellement, `AdminDashboardPage` sert aussi de dashboard "user". */}
          <Route path="dashboard" element={<AdminDashboardPage />} />
          {/* 2. Gestion des clients */}
          <Route path="clients" element={<ClientsPage />} />
          {/* 3. Historique & suivi factures */}
          <Route path="factures" element={<InvoicesPage />} />
          {/* 4. Création de facture */}
          <Route path="factures/nouvelle" element={<InvoiceCreatePage />} />
        </Route>

        {/* ═══════════════════════════════════════ */}
        {/* ESPACE ADMIN                            */}
        {/* ═══════════════════════════════════════ */}
        <Route
          path="/admin"
          element={
            // Routes admin: nécessite rôle `admin` (sinon redirection).
            <ProtectedRoute role="admin">
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Accès à "/admin" => dashboard admin. */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          {/* 1. Tableau de bord analytique */}
          <Route path="dashboard" element={<AdminDashboardPage />} />
          {/* 2. Validation des factures */}
          <Route path="factures" element={<AdminValidationPage />} />
          {/* 3. Gestion paramètres (articles, catégories) */}
          <Route path="parametres" element={<AdminParamsPage />} />
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
