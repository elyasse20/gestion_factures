import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  TablePagination
} from '@mui/material'
import { Add as AddIcon, PictureAsPdf as PdfIcon, Visibility as ViewIcon } from '@mui/icons-material'
import { firebaseService } from '../services/firebaseService'
import { jsonService } from '../services/jsonService'
import { generateInvoicePDF } from '../utils/pdfGenerator'

const STATUS_COLORS = {
  'En attente': 'warning',
  'Payée': 'success',
  'Rejetée': 'error',
}

const VIREMENT_TYPES = ['Virement bancaire', 'Chèque', 'Espèces', 'Carte bancaire', 'Autre']

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [paramsDb, setParamsDb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Suivi dialog
  const [suiviOpen, setSuiviOpen] = useState(false)
  const [selectedInv, setSelectedInv] = useState(null)
  const [suiviForm, setSuiviForm] = useState({
    statut: 'En attente',
    date_depot: '',
    date_encaissement: '',
    type_virement: '',
  })

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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

  const handleOpenSuivi = (inv) => {
    setSelectedInv(inv)
    setSuiviForm({
      statut: inv.statut || 'En attente',
      date_depot: inv.date_depot ? inv.date_depot.substring(0, 10) : '',
      date_encaissement: inv.date_encaissement ? inv.date_encaissement.substring(0, 10) : '',
      type_virement: inv.type_virement || '',
    })
    setSuiviOpen(true)
  }

  const handleSaveSuivi = async () => {
    try {
      const updates = {
        statut: suiviForm.statut,
        type_virement: suiviForm.type_virement || null,
        date_depot: suiviForm.date_depot ? new Date(suiviForm.date_depot).toISOString() : null,
        date_encaissement: suiviForm.date_encaissement
          ? new Date(suiviForm.date_encaissement).toISOString()
          : null,
      }
      await firebaseService.updateFacture(selectedInv.id, updates)
      setSuiviOpen(false)
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDownloadPdf = (facture) => {
    const client = clients.find((c) => c.id === facture.client_id)
    generateInvoicePDF(facture, client, paramsDb)
  }

  const client = (inv) => clients.find((c) => c.id === inv.client_id)

  const paginatedInvoices = invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Mes Factures</Typography>
        <Button
          component={RouterLink}
          to="/factures/nouvelle"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Nouvelle facture
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>N° Facture</TableCell>
                <TableCell>Date création</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Date dépôt</TableCell>
                <TableCell>Date encaissement</TableCell>
                <TableCell>Type virement</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">Chargement...</TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">Aucune facture. Créez votre première facture !</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{inv.numero}</TableCell>
                    <TableCell>{new Date(inv.date_creation).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{client(inv)?.nom || '—'}</TableCell>
                    <TableCell>
                      {inv.date_depot
                        ? new Date(inv.date_depot).toLocaleDateString('fr-FR')
                        : <Typography variant="caption" color="text.disabled">Non défini</Typography>}
                    </TableCell>
                    <TableCell>
                      {inv.date_encaissement
                        ? new Date(inv.date_encaissement).toLocaleDateString('fr-FR')
                        : <Typography variant="caption" color="text.disabled">Non défini</Typography>}
                    </TableCell>
                    <TableCell>
                      {inv.type_virement || <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={inv.statut || 'En attente'}
                        color={STATUS_COLORS[inv.statut] || 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="info"
                          title="Suivi"
                          onClick={() => handleOpenSuivi(inv)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Télécharger PDF"
                          onClick={() => handleDownloadPdf(inv)}
                        >
                          <PdfIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={invoices.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage="Lignes par page :"
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Dialog Suivi facture */}
      <Dialog open={suiviOpen} onClose={() => setSuiviOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack>
            <Typography variant="h6">Suivi de la facture</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedInv?.numero} — {client(selectedInv || {})?.nom}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Résumé</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Total TTC :</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {selectedInv?.total_ttc?.toFixed(2)} MAD
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Divider>Informations de suivi</Divider>

              <InputLabel>Statut</InputLabel>
              
            <FormControl fullWidth>
              <Select
                value={suiviForm.statut}
                label="Statut"
                onChange={(e) => setSuiviForm({ ...suiviForm, statut: e.target.value })}
              >
                <MenuItem value="En attente">⏳ En attente</MenuItem>
                <MenuItem value="Payée">✅ Payée</MenuItem>
                <MenuItem value="Rejetée">❌ Rejetée</MenuItem>
              </Select>
            </FormControl>

            <InputLabel>Date de dépôt</InputLabel>
            <TextField
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={suiviForm.date_depot}
              onChange={(e) => setSuiviForm({ ...suiviForm, date_depot: e.target.value })}
            />

            <InputLabel>Date d'encaissement</InputLabel>
            <TextField
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={suiviForm.date_encaissement}
              onChange={(e) => setSuiviForm({ ...suiviForm, date_encaissement: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Type de virement</InputLabel>
              <Select
                value={suiviForm.type_virement}
                label="Type de virement"
                onChange={(e) => setSuiviForm({ ...suiviForm, type_virement: e.target.value })}
              >
                {VIREMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setSuiviOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveSuivi}>
            Enregistrer le suivi
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
