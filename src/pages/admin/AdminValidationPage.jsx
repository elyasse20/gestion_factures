import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  CheckCircle as ValidateIcon,
  Cancel as RejectIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material'
import { firebaseService } from '../../services/firebaseService'
import { jsonService } from '../../services/jsonService'
import { generateInvoicePDF } from '../../utils/pdfGenerator'

const STATUS_COLORS = {
  'En attente': 'warning',
  'Payée': 'success',
  'Rejetée': 'error',
}

export default function AdminValidationPage() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [paramsDb, setParamsDb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [invData, cliData, parData] = await Promise.all([
        firebaseService.listFactures(),
        firebaseService.listClients(),
        jsonService.getParams(),
      ])
      invData.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
      setInvoices(invData)
      setClients(cliData)
      setParamsDb(parData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleValidate = async (id) => {
    try {
      await firebaseService.updateFacture(id, {
        validated_by_admin: true,
        statut: 'Payée',
        date_encaissement: new Date().toISOString(),
      })
      fetchData()
    } catch (err) { setError(err.message) }
  }

  const handleReject = async (id) => {
    try {
      await firebaseService.updateFacture(id, {
        validated_by_admin: false,
        statut: 'Rejetée',
      })
      fetchData()
    } catch (err) { setError(err.message) }
  }

  const handleDownloadPdf = (facture) => {
    const client = clients.find((c) => c.id === facture.client_id)
    generateInvoicePDF(facture, client, paramsDb)
  }

  const pending = invoices.filter((i) => !i.validated_by_admin && i.statut !== 'Rejetée')
  const treated = invoices.filter((i) => i.validated_by_admin || i.statut === 'Rejetée')

  const ClientName = ({ inv }) => {
    const c = clients.find((c) => c.id === inv.client_id)
    return c?.nom || '—'
  }

  const InvTable = ({ rows, showActions }) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>N° Facture</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Client</TableCell>
            <TableCell align="right">Total TTC</TableCell>
            <TableCell align="center">Statut</TableCell>
            <TableCell align="center">Validée</TableCell>
            {showActions && <TableCell align="center">Actions</TableCell>}
            <TableCell align="center">PDF</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 8 : 7} align="center">
                <Typography variant="body2" color="text.secondary">Aucune facture</Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{inv.numero}</TableCell>
                <TableCell>{new Date(inv.date_creation).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell><ClientName inv={inv} /></TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {inv.total_ttc?.toFixed(2)} MAD
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={inv.statut || 'En attente'}
                    color={STATUS_COLORS[inv.statut] || 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="center">
                  {inv.validated_by_admin
                    ? <Chip label="✅ Oui" color="success" size="small" />
                    : <Chip label="⏳ Non" color="default" size="small" />}
                </TableCell>
                {showActions && (
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <IconButton
                        size="small"
                        color="success"
                        title="Valider"
                        onClick={() => handleValidate(inv.id)}
                      >
                        <ValidateIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Rejeter"
                        onClick={() => handleReject(inv.id)}
                      >
                        <RejectIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                )}
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={() => handleDownloadPdf(inv)}>
                    <PdfIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Stack spacing={4}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Validation des Factures</Typography>
        <Chip
          label={`${pending.length} en attente de validation`}
          color={pending.length > 0 ? 'warning' : 'default'}
          sx={{ fontWeight: 700, fontSize: '0.9rem' }}
        />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Factures à traiter */}
      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">
            ⏳ À valider ({pending.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ces factures sont en attente de votre validation admin.
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>Chargement...</Box>
        ) : (
          <InvTable rows={pending} showActions={true} />
        )}
      </Card>

      {/* Factures déjà traitées */}
      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">
            ✅ Traitées ({treated.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historique des factures validées ou rejetées.
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>Chargement...</Box>
        ) : (
          <InvTable rows={treated} showActions={false} />
        )}
      </Card>
    </Stack>
  )
}
