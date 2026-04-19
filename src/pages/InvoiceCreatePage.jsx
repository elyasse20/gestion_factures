import React, { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
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
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon, Save as SaveIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { firebaseService } from '../services/firebaseService'
import { jsonService } from '../services/jsonService'
import { generateInvoicePDF } from '../utils/pdfGenerator'

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [articlesDb, setArticlesDb] = useState([])
  const [categoriesDb, setCategoriesDb] = useState([])
  const [paramsDb, setParamsDb] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [clientId, setClientId] = useState('')
  const [method, setMethod] = useState('SIMPLE') // SIMPLE, REMISE_LIGNE, REMISE_GLOBALE, CATEGORIE
  const [remiseGlobale, setRemiseGlobale] = useState(0)

  const [lines, setLines] = useState([{ id: Date.now(), articleId: '', quantite: 1, remise: 0 }])

  useEffect(() => {
    async function loadData() {
      try {
        const [cls, arts, cats, pars] = await Promise.all([
          firebaseService.listClients(),
          jsonService.listArticles(),
          jsonService.listCategories(),
          jsonService.getParams()
        ])
        setClients(cls)
        setArticlesDb(arts)
        setCategoriesDb(cats)
        setParamsDb(pars)
      } catch (err) {
        setError("Erreur de chargement des données. Vérifiez Firebase et le serveur JSON.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now(), articleId: '', quantite: 1, remise: 0 }])
  }

  const handleRemoveLine = (id) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id))
    }
  }

  const handleLineChange = (id, field, value) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  // Calculate totals based on method
  const calcData = useMemo(() => {
    let ht = 0
    let tvaTotal = 0
    let ttc = 0
    const defaultTva = paramsDb?.facturation?.tva_defaut || 0.2

    const computedLines = lines.map(line => {
      const art = articlesDb.find(a => Number(a.id) === Number(line.articleId))
      if (!art || !line.quantite || line.quantite < 1) return { ...line, totalLigne: 0, tvaLigne: 0, art: null }

      const prixBase = art.prix_unitaire * line.quantite
      let totalLigne = prixBase

      // Remise ligne method
      if (method === 'REMISE_LIGNE' && line.remise > 0) {
        totalLigne = prixBase * (1 - line.remise / 100)
      }

      let lineTvaRate = defaultTva

      // Categorie method
      if (method === 'CATEGORIE') {
        const cat = categoriesDb.find(c => Number(c.id) === Number(art.categorie_id))
        if (cat && cat.tva !== undefined) {
          lineTvaRate = cat.tva
        }
      }

      const tvaLigne = totalLigne * lineTvaRate

      ht += totalLigne
      tvaTotal += tvaLigne

      return { ...line, totalLigne, tvaLigne, art }
    })

    if (method === 'REMISE_GLOBALE' && remiseGlobale > 0) {
      const montantRemise = ht * (remiseGlobale / 100)
      ht = ht - montantRemise
      // Recalculate TVA on discounted HT
      tvaTotal = ht * defaultTva
    }

    ttc = ht + tvaTotal

    return { ht, tvaTotal, ttc, computedLines }
  }, [lines, method, remiseGlobale, articlesDb, categoriesDb, paramsDb])

  const handleSave = async () => {
    if (!clientId) {
      setError("Veuillez sélectionner un client")
      return
    }
    const currentLinesEmpty = lines.some(l => !l.articleId)
    if (currentLinesEmpty) {
      setError("Veuillez remplir correctement toutes les lignes d'articles")
      return
    }

    try {
      const numero = `${paramsDb?.facturation?.prefix_numero || 'FAC'}-${Date.now().toString().slice(-6)}`
      const factureData = {
        numero,
        date_creation: new Date().toISOString(),
        client_id: clientId,
        articles: calcData.computedLines
          .filter(l => l.art !== null)
          .map(l => ({
          article_id: l.articleId,
          designation: l.art.designation,
          prix_unitaire: l.art.prix_unitaire,
          quantite: l.quantite,
          remise: l.remise,
          totalLigne: l.totalLigne
        })),
        methode: method,
        remise_globale: method === 'REMISE_GLOBALE' ? remiseGlobale : 0,
        total_ht: calcData.ht,
        tva: calcData.tvaTotal,
        total_ttc: calcData.ttc,
        statut: 'En attente',
        date_depot: null,
        date_encaissement: null,
        type_virement: null,
        validated_by_admin: false,
      }

      await firebaseService.createFacture(factureData)
      navigate('/factures')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGeneratePDF = () => {
    const client = clients.find(c => c.id === clientId)
    const factureMock = {
      numero: 'A-ENREGISTRER',
      articles: calcData.computedLines.map(l => ({
        designation: l.art?.designation || 'Inconnu',
        quantite: l.quantite,
        prix_unitaire: l.art?.prix_unitaire || 0,
        remise: l.remise,
        totalLigne: l.totalLigne || 0
      })),
      total_ht: calcData.ht,
      remise_globale: method === 'REMISE_GLOBALE' ? remiseGlobale : 0,
      tva: calcData.tvaTotal,
      total_ttc: calcData.ttc
    }
    generateInvoicePDF(factureMock, client, paramsDb)
  }

  if (loading) return <Typography>Chargement...</Typography>

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Nouvelle facture</Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  label="Client"
                >
                  {clients.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Méthode de Calcul</InputLabel>
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  label="Méthode de Calcul"
                >
                  <MenuItem value="SIMPLE">Simple (HT + TVA globale)</MenuItem>
                  <MenuItem value="REMISE_LIGNE">Remise par ligne</MenuItem>
                  <MenuItem value="REMISE_GLOBALE">Remise globale</MenuItem>
                  <MenuItem value="CATEGORIE">TVA par catégorie</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {method === 'REMISE_GLOBALE' && (
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Remise globale (%)"
                  type="number"
                  value={remiseGlobale}
                  onChange={(e) => setRemiseGlobale(Number(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Article</TableCell>
                <TableCell width={150}>Prix Unitaire</TableCell>
                <TableCell width={120}>Quantité</TableCell>
                {method === 'REMISE_LIGNE' && <TableCell width={120}>Remise (%)</TableCell>}
                {method === 'CATEGORIE' && <TableCell width={120}>TVA (%)</TableCell>}
                <TableCell width={150} align="right">Sous-total</TableCell>
                <TableCell width={80} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map(line => {
                const art = articlesDb.find(a => Number(a.id) === Number(line.articleId))
                const computed = calcData.computedLines.find(l => l.id === line.id)
                let tvaRateStr = "-"
                if (method === 'CATEGORIE' && art) {
                    const cat = categoriesDb.find(c => Number(c.id) === Number(art.categorie_id))
                    tvaRateStr = cat ? `${cat.tva * 100}%` : "-"
                }

                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={line.articleId === '' ? '' : Number(line.articleId)}
                          onChange={(e) => handleLineChange(line.id, 'articleId', e.target.value === '' ? '' : Number(e.target.value))}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>Sélectionner...</MenuItem>
                          {articlesDb.map(a => (
                            <MenuItem key={a.id} value={a.id}>{a.designation}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {art ? `${art.prix_unitaire} MAD` : '-'}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 1 }}
                        value={line.quantite}
                        onChange={(e) => handleLineChange(line.id, 'quantite', Number(e.target.value))}
                      />
                    </TableCell>
                    {method === 'REMISE_LIGNE' && (
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0, max: 100 }}
                          value={line.remise}
                          onChange={(e) => handleLineChange(line.id, 'remise', Number(e.target.value))}
                        />
                      </TableCell>
                    )}
                    {method === 'CATEGORIE' && (
                       <TableCell>{tvaRateStr}</TableCell>
                    )}
                    <TableCell align="right">
                      {computed ? `${computed.totalLigne.toFixed(2)} MAD` : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton color="error" onClick={() => handleRemoveLine(line.id)} disabled={lines.length === 1}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <CardContent sx={{ pt: 2, pb: '16px !important' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddLine}>
              Ajouter une ligne
            </Button>
            <Stack textAlign="right" sx={{ minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">Total HT: {calcData.ht.toFixed(2)} MAD</Typography>
              <Typography variant="body2" color="text.secondary">TVA: {calcData.tvaTotal.toFixed(2)} MAD</Typography>
              <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
                Total TTC: {calcData.ttc.toFixed(2)} MAD
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<PdfIcon />}
          onClick={handleGeneratePDF}
          disabled={!clientId || lines.some(l => !l.articleId)}
        >
          Aperçu PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Enregistrer Facture
        </Button>
      </Stack>
    </Stack>
  )
}
