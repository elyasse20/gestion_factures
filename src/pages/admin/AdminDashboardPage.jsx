import React, { useEffect, useState } from 'react'
import { Card, CardContent, Grid, Stack, Typography, CircularProgress, Alert } from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { firebaseService } from '../../services/firebaseService'

function KpiCard({ label, value, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%', borderTop: `4px solid`, borderColor: color }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, color: '#111827' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await firebaseService.listFactures()
        setInvoices(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <CircularProgress />
  if (error) return <Alert severity="error">{error}</Alert>

  const totalTTC = invoices.reduce((acc, i) => acc + (i.total_ttc || 0), 0)
  const avgTTC = invoices.length ? (totalTTC / invoices.length) : 0
  
  // CA Evolution par mois (sur l'année locale)
  const monthlyDataMap = {}
  invoices.forEach(i => {
    if(!i.date_creation) return
    const d = new Date(i.date_creation)
    const month = d.toLocaleString('default', { month: 'short' })
    if (!monthlyDataMap[month]) monthlyDataMap[month] = { name: month, ca: 0, paye: 0 }
    monthlyDataMap[month].ca += (i.total_ttc || 0)
    if (i.statut === 'Payée') monthlyDataMap[month].paye += (i.total_ttc || 0)
  })
  const monthlyData = Object.values(monthlyDataMap)

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Admin · Vue Globale</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Volume Global TTC" value={`${totalTTC.toFixed(2)} MAD`} color="#6366F1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Montant Moyen" value={`${avgTTC.toFixed(2)} MAD`} color="#8B5CF6" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Taux de Rejet" value={`${(invoices.filter(i => i.statut==='Rejetée').length / (invoices.length || 1) * 100).toFixed(1)}%`} color="#EC4899" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Validations Requises" value={invoices.filter(i => !i.validated_by_admin).length} color="#F59E0B" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Évolution du Chiffre d'Affaires</Typography>
              <div style={{ height: 350 }}>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip 
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                      />
                      <Line type="monotone" dataKey="ca" name="CA Total" stroke="#6366F1" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="paye" name="CA Encaissé" stroke="#10B981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                   ) : (
                    <Typography align="center" sx={{ mt: 10 }} color="text.secondary">Aucune donnée mensuelle</Typography>
                  )}
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Actions Récentes</Typography>
               <Stack spacing={2} sx={{ mt: 3 }}>
                {invoices.slice(0, 5).map(inv => (
                  <Stack key={inv.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={500}>{inv.numero}</Typography>
                    <Typography variant="body2" color="text.secondary">{new Date(inv.date_creation).toLocaleDateString()}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
