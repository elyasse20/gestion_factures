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
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { firebaseService } from '../services/firebaseService'

const COLORS = ['#10B981', '#F59E0B', '#EF4444']

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

export default function DashboardPage() {
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

  const totalFactures = invoices.length
  const totalEncaissse = invoices.filter(i => i.statut === 'Payée').reduce((acc, i) => acc + (i.total_ttc || 0), 0)
  const enAttenteCount = invoices.filter(i => i.statut === 'En attente').length
  const rejeteesCount = invoices.filter(i => i.statut === 'Rejetée').length

  const pieData = [
    { name: 'Payée', value: invoices.filter(i => i.statut === 'Payée').length },
    { name: 'En attente', value: enAttenteCount },
    { name: 'Rejetée', value: rejeteesCount },
  ].filter(d => d.value > 0)

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Tableau de Bord</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Total Factures" value={totalFactures} color="#4F46E5" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Total Encaissé" value={`${totalEncaissse.toFixed(2)} MAD`} color="#10B981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="En attente" value={enAttenteCount} color="#F59E0B" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Rejetées" value={rejeteesCount} color="#EF4444" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Répartition par Statut</Typography>
              <div style={{ height: 300 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography align="center" sx={{ mt: 10 }} color="text.secondary">Aucune donnée</Typography>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
