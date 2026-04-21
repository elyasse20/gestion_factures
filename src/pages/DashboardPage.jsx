import React, { useEffect, useState } from 'react'
import {
  Card, CardContent, Grid, Stack, Typography,
  CircularProgress, Alert, Box, Divider, Chip, Avatar, LinearProgress
} from '@mui/material'
import {
  ReceiptLong as InvoiceIcon,
  People as ClientsIcon,
  TrendingUp as TrendIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  CheckCircle as PaidIcon,
} from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { firebaseService } from '../services/firebaseService'
import { jsonService } from '../services/jsonService'

// ── Couleurs ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Payée': '#10B981',
  'En attente': '#F59E0B',
  'Rejetée': '#EF4444',
}

// ── Composant KPI Card ─────────────────────────────────────────────────────────
function KpiCard({ label, value, subtitle, icon: Icon, color = '#4F46E5', trend }) {
  return (
    <Card sx={{
      height: '100%',
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
    }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={600} fontSize="0.65rem">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, color: '#111827' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, width: 44, height: 44 }}>
            <Icon sx={{ color, fontSize: 22 }} />
          </Avatar>
        </Stack>
        {trend !== undefined && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(trend, 100)}
              sx={{ height: 4, borderRadius: 2, bgcolor: `${color}20`,
                '& .MuiLinearProgress-bar': { bgcolor: color } }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── Tooltip personnalisé ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 2, p: 1.5, boxShadow: 3, minWidth: 150 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
        {payload.map((p, i) => (
          <Stack key={i} direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="caption" color={p.color}>{p.name}</Typography>
            <Typography variant="caption" fontWeight={600}>{p.value.toFixed ? `${p.value.toFixed(0)} MAD` : p.value}</Typography>
          </Stack>
        ))}
      </Box>
    )
  }
  return null
}

// ── Dashboard Utilisateur ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [invoices, setInvoices]   = useState([])
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [inv, cli] = await Promise.all([
          firebaseService.listFactures(),
          firebaseService.listClients(),
        ])
        inv.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
        setInvoices(inv)
        setClients(cli)
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
  if (error)   return <Alert severity="error">{error}</Alert>

  // ── Calculs KPI ──────────────────────────────────────────────────────────────
  const total        = invoices.length
  const paid         = invoices.filter(i => i.statut === 'Payée')
  const pending      = invoices.filter(i => i.statut === 'En attente')
  const rejected     = invoices.filter(i => i.statut === 'Rejetée')
  const totalTTC     = invoices.reduce((s, i) => s + (i.total_ttc || 0), 0)
  const encaisse     = paid.reduce((s, i) => s + (i.total_ttc || 0), 0)
  const tauxPaiement = total ? Math.round((paid.length / total) * 100) : 0

  // ── Données Graphiques ───────────────────────────────────────────────────────
  const pieData = [
    { name: 'Payée',      value: paid.length },
    { name: 'En attente', value: pending.length },
    { name: 'Rejetée',    value: rejected.length },
  ].filter(d => d.value > 0)

  // Évolution mensuelle
  const monthlyMap = {}
  invoices.forEach(inv => {
    if (!inv.date_creation) return
    const d = new Date(inv.date_creation)
    const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { name: key, total: 0, paye: 0, count: 0 }
    monthlyMap[key].total += inv.total_ttc || 0
    if (inv.statut === 'Payée') monthlyMap[key].paye += inv.total_ttc || 0
    monthlyMap[key].count++
  })
  const monthlyData = Object.values(monthlyMap).slice(-6) // 6 derniers mois

  // Top 5 clients par CA
  const clientMap = {}
  invoices.forEach(inv => {
    const cli = clients.find(c => c.id === inv.client_id)
    const nom = cli?.nom || 'Inconnu'
    if (!clientMap[nom]) clientMap[nom] = 0
    clientMap[nom] += inv.total_ttc || 0
  })
  const topClients = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, ca]) => ({ name, ca }))

  return (
    <Stack spacing={3}>
      {/* ── En-tête ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700}>Tableau de Bord</Typography>
          <Typography variant="body2" color="text.secondary">Vue d'ensemble de vos factures</Typography>
        </Box>
        <Chip label={`${total} facture${total > 1 ? 's' : ''}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
      </Stack>

      {/* ── KPIs ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Total Factures" value={total} subtitle={`${clients.length} clients actifs`}
            icon={InvoiceIcon} color="#4F46E5" trend={tauxPaiement} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="CA Total TTC" value={`${totalTTC.toFixed(2)} MAD`}
            subtitle={`Encaissé : ${encaisse.toFixed(2)} MAD`}
            icon={TrendIcon} color="#10B981" trend={total ? Math.round((encaisse / totalTTC) * 100) : 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Taux de Paiement" value={`${tauxPaiement}%`}
            subtitle={`${paid.length} payée${paid.length > 1 ? 's' : ''} / ${total}`}
            icon={PaidIcon} color="#0EA5E9" trend={tauxPaiement} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Clients" value={clients.length} subtitle="Clients enregistrés"
            icon={ClientsIcon} color="#8B5CF6" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="En Attente" value={pending.length}
            subtitle={`${pending.reduce((s, i) => s + (i.total_ttc || 0), 0).toFixed(0)} MAD à encaisser`}
            icon={PendingIcon} color="#F59E0B" trend={total ? Math.round((pending.length / total) * 100) : 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Rejetées" value={rejected.length}
            subtitle={`${total ? ((rejected.length / total) * 100).toFixed(1) : 0}% du total`}
            icon={RejectedIcon} color="#EF4444" />
        </Grid>
      </Grid>

      {/* ── Graphiques 2x2 ── */}
      <Grid container spacing={3}>

        {/* 1. Évolution mensuelle */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Évolution CA</Typography>
              <Box sx={{ height: 280 }}>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="total" name="CA Total" fill="#4F46E5" radius={[3,3,0,0]} />
                      <Bar dataKey="paye"  name="Encaissé"  fill="#10B981" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">Aucune donnée</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. Répartition par statut */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Répartition Statuts</Typography>
              <Box sx={{ height: 280 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62}
                        paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6B7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">Aucune donnée</Typography>
                  </Stack>
                )}
              </Box>
              {/* Légende */}
              <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
                {pieData.map(d => (
                  <Stack key={d.name} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[d.name] }} />
                    <Typography variant="caption">{d.name}</Typography>
                    <Typography variant="caption" fontWeight={700}>({d.value})</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Top Clients */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Top Clients</Typography>
              <Box sx={{ height: 280 }}>
                {topClients.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClients} layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={80} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="ca" name="CA TTC" fill="#8B5CF6" radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">Aucun client</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Dernières Factures */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Dernières Factures</Typography>
              <Stack spacing={2} divider={<Divider />}>
                {invoices.slice(0, 5).map(inv => {
                  const cli = clients.find(c => c.id === inv.client_id)
                  return (
                    <Stack key={inv.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{inv.numero}</Typography>
                        <Typography variant="body2" color="text.secondary">{cli?.nom || '—'}</Typography>
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Typography variant="body1" fontWeight={700}>
                          {(inv.total_ttc || 0).toFixed(2)} MAD
                        </Typography>
                        <Box sx={{
                          px: 1, py: 0.2, borderRadius: 1,
                          bgcolor: `${STATUS_COLORS[inv.statut] || '#6B7280'}20`,
                          color: STATUS_COLORS[inv.statut] || '#6B7280',
                          fontSize: '0.75rem', fontWeight: 700
                        }}>
                          {inv.statut || '—'}
                        </Box>
                      </Stack>
                    </Stack>
                  )
                })}
                {invoices.length === 0 && (
                  <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2 }}>
                    Aucune facture
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Stack>
  )
}
