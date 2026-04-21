import React, { useEffect, useState } from 'react'
import {
  Card, CardContent, Grid, Stack, Typography,
  CircularProgress, Alert, Box, Divider, Chip, Avatar, LinearProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import {
  ReceiptLong as InvoiceIcon,
  People as ClientsIcon,
  Inventory as ArticleIcon,
  TrendingUp as TrendIcon,
  HourglassEmpty as PendingIcon,
  VerifiedUser as ValidIcon,
  Cancel as RejectedIcon,
  Category as CatIcon,
} from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts'
import { firebaseService } from '../../services/firebaseService'
import { jsonService } from '../../services/jsonService'

// ── Couleurs ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Payée':      '#10B981',
  'En attente': '#F59E0B',
  'Rejetée':    '#EF4444',
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, subtitle, icon: Icon, color = '#6366F1', trend }) {
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 2, p: 1.5, boxShadow: 3 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
        {payload.map((p, i) => (
          <Stack key={i} direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="caption" color={p.color}>{p.name}</Typography>
            <Typography variant="caption" fontWeight={600}>
              {typeof p.value === 'number' && p.value > 100 ? `${p.value.toFixed(0)} MAD` : p.value}
            </Typography>
          </Stack>
        ))}
      </Box>
    )
  }
  return null
}

// ── Admin Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [invoices,   setInvoices]   = useState([])
  const [clients,    setClients]    = useState([])
  const [articles,   setArticles]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [inv, cli, art, cat] = await Promise.all([
          firebaseService.listFactures(),
          firebaseService.listClients(),
          jsonService.listArticles(),
          jsonService.listCategories(),
        ])
        inv.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
        setInvoices(inv)
        setClients(cli)
        setArticles(art)
        setCategories(cat)
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
  if (error)   return <Alert severity="error">{error}</Alert>

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const paid         = invoices.filter(i => i.statut === 'Payée')
  const pending      = invoices.filter(i => i.statut === 'En attente')
  const rejected     = invoices.filter(i => i.statut === 'Rejetée')
  const unvalidated  = invoices.filter(i => !i.validated_by_admin && i.statut !== 'Rejetée')
  const totalTTC     = invoices.reduce((s, i) => s + (i.total_ttc || 0), 0)
  const encaisse     = paid.reduce((s, i) => s + (i.total_ttc || 0), 0)
  const avgTTC       = invoices.length ? totalTTC / invoices.length : 0
  const tauxPaiement = invoices.length ? Math.round((paid.length / invoices.length) * 100) : 0
  const tauxRejet    = invoices.length ? ((rejected.length / invoices.length) * 100).toFixed(1) : 0

  // ── Évolution mensuelle ───────────────────────────────────────────────────────
  const monthlyMap = {}
  invoices.forEach(inv => {
    if (!inv.date_creation) return
    const d = new Date(inv.date_creation)
    const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { name: key, ca: 0, paye: 0, nb: 0 }
    monthlyMap[key].ca   += inv.total_ttc || 0
    if (inv.statut === 'Payée') monthlyMap[key].paye += inv.total_ttc || 0
    monthlyMap[key].nb++
  })
  const monthlyData = Object.values(monthlyMap).slice(-8)

  // ── Top clients par CA ───────────────────────────────────────────────────────
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

  // ── Pie statuts ───────────────────────────────────────────────────────────────
  const pieData = [
    { name: 'Payée',      value: paid.length },
    { name: 'En attente', value: pending.length },
    { name: 'Rejetée',    value: rejected.length },
  ].filter(d => d.value > 0)

  // ── Articles par catégorie ────────────────────────────────────────────────────
  const catStats = categories.map(cat => ({
    name: cat.nom,
    articles: articles.filter(a => Number(a.categorie_id) === Number(cat.id)).length,
  })).filter(c => c.articles > 0)

  return (
    <Stack spacing={3}>
      {/* ── En-tête ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700}>Admin · Vue Globale</Typography>
          <Typography variant="body2" color="text.secondary">
            Tableau de bord administrateur — toutes les données agrégées
          </Typography>
        </Box>
        <Chip
          label={`${unvalidated.length} validation${unvalidated.length > 1 ? 's' : ''} requise${unvalidated.length > 1 ? 's' : ''}`}
          color={unvalidated.length > 0 ? 'warning' : 'success'}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {/* ── KPIs : ligne 1 ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Volume Global TTC" value={`${totalTTC.toFixed(0)} MAD`}
            subtitle={`Encaissé : ${encaisse.toFixed(0)} MAD`}
            icon={TrendIcon} color="#6366F1" trend={tauxPaiement} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Factures Totales" value={invoices.length}
            subtitle={`Moy. ${avgTTC.toFixed(0)} MAD / facture`}
            icon={InvoiceIcon} color="#0EA5E9" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Clients" value={clients.length}
            subtitle={`${topClients[0]?.name || '—'} en tête`}
            icon={ClientsIcon} color="#8B5CF6" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Validations Requises" value={unvalidated.length}
            subtitle={`${pending.length} en attente`}
            icon={ValidIcon} color="#F59E0B"
            trend={invoices.length ? Math.round((unvalidated.length / invoices.length) * 100) : 0} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Taux de Paiement" value={`${tauxPaiement}%`}
            subtitle={`${paid.length} factures payées`}
            icon={PendingIcon} color="#10B981" trend={tauxPaiement} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Taux de Rejet" value={`${tauxRejet}%`}
            subtitle={`${rejected.length} rejetées`}
            icon={RejectedIcon} color="#EF4444"
            trend={Number(tauxRejet)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Articles" value={articles.length}
            subtitle={`${categories.length} catégories`}
            icon={ArticleIcon} color="#06B6D4" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="CA Non Encaissé" value={`${(totalTTC - encaisse).toFixed(0)} MAD`}
            subtitle={`${pending.length} factures en attente`}
            icon={CatIcon} color="#EC4899"
            trend={totalTTC ? Math.round(((totalTTC - encaisse) / totalTTC) * 100) : 0} />
        </Grid>
      </Grid>

      {/* ── Graphiques ── */}
      <Grid container spacing={2.5}>
        {/* Évolution CA (Line+Area) */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Évolution du Chiffre d'Affaires
              </Typography>
              <Box sx={{ height: 300 }}>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPaye" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="ca"   name="CA Total"    stroke="#6366F1" strokeWidth={2.5} fill="url(#gradCA)" />
                      <Area type="monotone" dataKey="paye" name="CA Encaissé" stroke="#10B981" strokeWidth={2.5} fill="url(#gradPaye)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography color="text.secondary">Aucune donnée mensuelle</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pie statuts */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Répartition Statuts</Typography>
              <Box sx={{ height: 200 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                        paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6B7280'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography color="text.secondary">Aucune donnée</Typography>
                  </Stack>
                )}
              </Box>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {pieData.map(d => (
                  <Stack key={d.name} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[d.name] }} />
                      <Typography variant="caption">{d.name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" fontWeight={700}>{d.value}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({invoices.length ? ((d.value / invoices.length) * 100).toFixed(0) : 0}%)
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Graphiques ligne 2 ── */}
      <Grid container spacing={2.5}>
        {/* Top clients */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Top Clients par CA</Typography>
              <Box sx={{ height: 220 }}>
                {topClients.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClients} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={80} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="ca" name="CA TTC" fill="#6366F1" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography color="text.secondary">Aucun client</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Articles par catégorie */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Articles / Catégorie</Typography>
              <Box sx={{ height: 220 }}>
                {catStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catStats} margin={{ top: 5, right: 5, left: -20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="articles" name="Articles" fill="#0EA5E9" radius={[4,4,0,0]} />
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

        {/* Factures récentes */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Factures Récentes</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>N°</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }} align="right">TTC</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }} align="center">Statut</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.slice(0, 6).map(inv => {
                      const cli = clients.find(c => c.id === inv.client_id)
                      return (
                        <TableRow key={inv.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{inv.numero}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{cli?.nom || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }} align="right">
                            {(inv.total_ttc || 0).toFixed(0)}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{
                              display: 'inline-block', px: 0.8, py: 0.2, borderRadius: 1,
                              bgcolor: `${STATUS_COLORS[inv.statut] || '#6B7280'}20`,
                              color: STATUS_COLORS[inv.statut] || '#6B7280',
                              fontSize: '0.62rem', fontWeight: 700
                            }}>
                              {inv.statut || '—'}
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="caption" color="text.secondary">Aucune facture</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
