import React, { useEffect, useState } from 'react'
import {
  Card, CardContent, Grid, Stack, Typography,
  CircularProgress, Alert, Box, Divider, Chip, Avatar, LinearProgress,
  ToggleButton, ToggleButtonGroup, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Tooltip as MuiTooltip
} from '@mui/material'
import {
  ReceiptLong as InvoiceIcon,
  People as ClientsIcon,
  TrendingUp as TrendIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  CheckCircle as PaidIcon,
  PictureAsPdf as PdfIcon,
  Article as ArticleIcon,
} from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { firebaseService } from '../../services/firebaseService'
import { jsonService } from '../../services/jsonService'
import { generateInvoicePDF } from '../../utils/pdfGenerator'
import { useAuth } from '../../contexts/AuthContext'

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
export default function AdminDashboardPage() {
  const { user, role } = useAuth()
  const [invoices, setInvoices]   = useState([])
  const [clients, setClients]     = useState([])
  const [paramsDb, setParamsDb]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [articles, setArticles]   = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError]         = useState(null)
  const [period, setPeriod]       = useState('30d') // 7d | 30d | 12m | all
  const [status, setStatus]       = useState('all') // all | Payée | En attente | Rejetée

  useEffect(() => {
    async function load() {
      try {
        const [inv, cli, pars, arts, cats] = await Promise.all([
          firebaseService.listFactures(role, user?.uid),
          firebaseService.listClients(),
          jsonService.getParams().catch(() => null),
          jsonService.listArticles().catch(() => []),
          jsonService.listCategories().catch(() => []),
        ])
        inv.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
        setInvoices(inv)
        setClients(cli)
        setParamsDb(pars)
        setArticles(arts || [])
        setCategories(cats || [])
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const now = Date.now()
  const periodStart = (() => {
    switch (period) {
      case '7d': return now - 7 * 24 * 60 * 60 * 1000
      case '30d': return now - 30 * 24 * 60 * 60 * 1000
      case '12m': return now - 365 * 24 * 60 * 60 * 1000
      default: return 0
    }
  })()

  const clientsById = React.useMemo(() => {
    const map = new Map()
    clients.forEach((c) => map.set(c.id, c))
    return map
  }, [clients])

  const filteredInvoices = React.useMemo(() => {
    const byPeriod = invoices.filter((inv) => {
      const t = inv?.date_creation ? new Date(inv.date_creation).getTime() : 0
      return !periodStart || (t && t >= periodStart)
    })
    if (status === 'all') return byPeriod
    return byPeriod.filter((inv) => (inv?.statut || '—') === status)
  }, [invoices, periodStart, status])

  // ── Calculs KPI ──────────────────────────────────────────────────────────────
  const total        = filteredInvoices.length
  const paid         = filteredInvoices.filter(i => i.statut === 'Payée')
  const pending      = filteredInvoices.filter(i => i.statut === 'En attente')
  const rejected     = filteredInvoices.filter(i => i.statut === 'Rejetée')
  const totalTTC     = filteredInvoices.reduce((s, i) => s + (i.total_ttc || 0), 0)
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
  filteredInvoices.forEach(inv => {
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
  filteredInvoices.forEach(inv => {
    const cli = clientsById.get(inv.client_id)
    const nom = cli?.nom || 'Inconnu'
    if (!clientMap[nom]) clientMap[nom] = 0
    clientMap[nom] += inv.total_ttc || 0
  })
  const topClients = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, ca]) => ({ name, ca }))

  const handleDownloadPdf = (inv) => {
    const cli = clientsById.get(inv.client_id)
    generateInvoicePDF(inv, cli, paramsDb)
  }

  return (
    <Stack spacing={3}>
      {/* ── En-tête ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Tableau de Bord</Typography>
          <Typography variant="body2" color="text.secondary">Vue d'ensemble de vos factures</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, v) => v && setPeriod(v)}
          >
            <ToggleButton value="7d">7j</ToggleButton>
            <ToggleButton value="30d">30j</ToggleButton>
            <ToggleButton value="12m">12m</ToggleButton>
            <ToggleButton value="all">Tout</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={status}
            onChange={(_, v) => v && setStatus(v)}
          >
            <ToggleButton value="all">Tous</ToggleButton>
            <ToggleButton value="En attente">En attente</ToggleButton>
            <ToggleButton value="Payée">Payée</ToggleButton>
            <ToggleButton value="Rejetée">Rejetée</ToggleButton>
          </ToggleButtonGroup>
          <Chip label={`${total} facture${total > 1 ? 's' : ''}`} color="primary" variant="outlined" sx={{ fontWeight: 600, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* ── KPIs ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={4}>
          {loading ? (
            <Card sx={{ height: '100%' }}><CardContent><Skeleton variant="rounded" height={88} /></CardContent></Card>
          ) : (
            <KpiCard label="Total Factures" value={total} subtitle={`${clients.length} clients actifs`}
              icon={InvoiceIcon} color="#4F46E5" trend={tauxPaiement} />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {loading ? (
            <Card sx={{ height: '100%' }}><CardContent><Skeleton variant="rounded" height={88} /></CardContent></Card>
          ) : (
            <KpiCard label="CA Total TTC" value={`${totalTTC.toFixed(2)} MAD`}
              subtitle={`Encaissé : ${encaisse.toFixed(2)} MAD`}
              icon={TrendIcon} color="#10B981" trend={total ? Math.round((encaisse / totalTTC) * 100) : 0} />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {loading ? (
            <Card sx={{ height: '100%' }}><CardContent><Skeleton variant="rounded" height={88} /></CardContent></Card>
          ) : (
            <KpiCard label="Taux de Paiement" value={`${tauxPaiement}%`}
              subtitle={`${paid.length} payée${paid.length > 1 ? 's' : ''} / ${total}`}
              icon={PaidIcon} color="#0EA5E9" trend={tauxPaiement} />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {loading ? (
            <Card sx={{ height: '100%' }}><CardContent><Skeleton variant="rounded" height={88} /></CardContent></Card>
          ) : (
            <KpiCard label="Clients" value={clients.length} subtitle="Clients enregistrés"
              icon={ClientsIcon} color="#8B5CF6" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {loading ? (
            <Card sx={{ height: '100%' }}><CardContent><Skeleton variant="rounded" height={88} /></CardContent></Card>
          ) : (
            <KpiCard label="En Attente" value={pending.length}
              subtitle={`${pending.reduce((s, i) => s + (i.total_ttc || 0), 0).toFixed(0)} MAD à encaisser`}
              icon={PendingIcon} color="#F59E0B" trend={total ? Math.round((pending.length / total) * 100) : 0} />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {loading ? (
            <Card sx={{ height: '100%' }}><CardContent><Skeleton variant="rounded" height={88} /></CardContent></Card>
          ) : (
            <KpiCard label="Rejetées" value={rejected.length}
              subtitle={`${total ? ((rejected.length / total) * 100).toFixed(1) : 0}% du total`}
              icon={RejectedIcon} color="#EF4444" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
                  <KpiCard label="Articles" value={articles.length}
                    subtitle={`${categories.length} catégories`}
                    icon={ArticleIcon} color="#06B6D4" />
        </Grid>
      </Grid>

      {/* ── 4 Graphiques sur une seule ligne ── */}
      <Grid container spacing={2.5}>

        {/* 1. Évolution mensuelle */}
        <Grid item xs={12} sm={6} md={2} lg={2}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Évolution CA</Typography>
              <Box sx={{ height: 200 }}>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
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
        <Grid item xs={12} sm={6} md={2} lg={2}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Répartition Statuts</Typography>
              <Box sx={{ height: 150 }}>
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
              <Stack spacing={0.8} sx={{ mt: 1 }}>
                {pieData.map(d => (
                  <Stack key={d.name} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[d.name] }} />
                      <Typography variant="caption">{d.name}</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>{d.value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Top Clients */}
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Top Clients</Typography>
              <Box sx={{ height: 200 }}>
                {topClients.length > 0 ? (
                  <Stack spacing={1.2} sx={{ height: '100%', justifyContent: 'center' }}>
                    {(() => {
                      const max = Math.max(...topClients.map((c) => c.ca || 0), 1)
                      return topClients.map((c) => {
                        const pct = Math.round(((c.ca || 0) / max) * 100)
                        return (
                          <Box key={c.name}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                              <Typography variant="caption" fontWeight={700} noWrap title={c.name} sx={{ maxWidth: 140 }}>
                                {c.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                                {(c.ca || 0).toFixed(0)} MAD
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{
                                mt: 0.6,
                                height: 6,
                                borderRadius: 999,
                                bgcolor: '#8B5CF620',
                                '& .MuiLinearProgress-bar': { bgcolor: '#8B5CF6' },
                              }}
                            />
                          </Box>
                        )
                      })
                    })()}
                  </Stack>
                ) : (
                  <Stack justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">Aucun client</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Dernières Factures (table) */}
        <Grid item xs={12} md={5} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>Dernières Factures</Typography>
                <Button size="small" href="/factures" sx={{ textTransform: 'none' }}>
                  Voir tout
                </Button>
              </Stack>

              {loading ? (
                <Stack spacing={1}>
                  <Skeleton variant="rounded" height={34} />
                  <Skeleton variant="rounded" height={34} />
                  <Skeleton variant="rounded" height={34} />
                  <Skeleton variant="rounded" height={34} />
                </Stack>
              ) : filteredInvoices.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography fontWeight={700}>Aucune facture</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Créez une première facture pour alimenter le dashboard.
                  </Typography>
                  <Button variant="contained" size="small" sx={{ mt: 2, textTransform: 'none' }} href="/factures/nouvelle">
                    Créer une facture
                  </Button>
                </Box>
              ) : (
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>N°</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Statut</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">PDF</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredInvoices.slice(0, 7).map((inv) => {
                        const cli = clientsById.get(inv.client_id)
                        const statusColor = STATUS_COLORS[inv.statut] || '#6B7280'
                        return (
                          <TableRow key={inv.id} hover>
                            <TableCell sx={{ fontWeight: 700, maxWidth: 260 }}>
                              <Typography variant="body2" noWrap title={inv.numero}>{inv.numero}</Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 280 }}>
                              <Typography variant="body2" noWrap title={cli?.nom || '—'}>{cli?.nom || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {inv.date_creation ? new Date(inv.date_creation).toLocaleDateString('fr-FR') : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={inv.statut || '—'}
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  bgcolor: `${statusColor}20`,
                                  color: statusColor,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              {(inv.total_ttc || 0).toFixed(2)} MAD
                            </TableCell>
                            <TableCell align="center">
                              <MuiTooltip title="Télécharger PDF">
                                <IconButton size="small" color="primary" onClick={() => handleDownloadPdf(inv)}>
                                  <PdfIcon fontSize="small" />
                                </IconButton>
                              </MuiTooltip>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Stack>
  )
}
