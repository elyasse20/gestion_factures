import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  CircularProgress,
  TablePagination
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { firebaseService } from '../services/firebaseService.js'

const ClientSchema = Yup.object().shape({
  nom: Yup.string().required('Le nom est requis'),
  email: Yup.string().email('Email invalide').required('L\'email est requis'),
  tel: Yup.string().required('Le téléphone est requis'),
  adresse: Yup.string().required('L\'adresse est requise'),
})

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const fetchClients = async () => {
    try {
      setLoading(true)
      const data = await firebaseService.listClients()
      setClients(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const formik = useFormik({
    initialValues: {
      nom: '',
      email: '',
      tel: '',
      adresse: '',
    },
    validationSchema: ClientSchema,
    onSubmit: async (values) => {
      try {
        if (editingId) {
          await firebaseService.updateClient(editingId, values)
        } else {
          await firebaseService.createClient(values)
        }
        setOpen(false)
        fetchClients()
      } catch (err) {
        setError(err.message)
      }
    },
  })

  const handleOpen = (client = null) => {
    if (client) {
      setEditingId(client.id)
      formik.setValues({
        nom: client.nom,
        email: client.email,
        tel: client.tel,
        adresse: client.adresse
      })
    } else {
      setEditingId(null)
      formik.resetForm()
    }
    setOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce client ?')) {
      try {
        await firebaseService.deleteClient(id)
        fetchClients()
      } catch (err) {
        setError(err.message)
      }
    }
  }

  const paginatedClients = clients.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Clients</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Nouveau Client
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Adresse</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">Aucun client trouvé.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{client.nom}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.tel}</TableCell>
                    <TableCell>{client.adresse}</TableCell>
                    <TableCell align="right">
                      <IconButton color="info" onClick={() => handleOpen(client)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(client.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={clients.length}
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                id="nom"
                name="nom"
                label="Nom du client / Société"
                value={formik.values.nom}
                onChange={formik.handleChange}
                error={formik.touched.nom && Boolean(formik.errors.nom)}
                helperText={formik.touched.nom && formik.errors.nom}
              />
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Adresse Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
              <TextField
                fullWidth
                id="tel"
                name="tel"
                label="N° de Téléphone"
                value={formik.values.tel}
                onChange={formik.handleChange}
                error={formik.touched.tel && Boolean(formik.errors.tel)}
                helperText={formik.touched.tel && formik.errors.tel}
              />
              <TextField
                fullWidth
                id="adresse"
                name="adresse"
                label="Adresse complète"
                multiline
                rows={3}
                value={formik.values.adresse}
                onChange={formik.handleChange}
                error={formik.touched.adresse && Boolean(formik.errors.adresse)}
                helperText={formik.touched.adresse && formik.errors.adresse}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  )
}
