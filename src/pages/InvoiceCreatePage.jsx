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
import { useAuth } from '../contexts/AuthContext'
import { firebaseService } from '../services/firebaseService'
import { jsonService } from '../services/jsonService'
import { generateInvoicePDF } from '../utils/pdfGenerator'

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  // `agent_id` est rempli à partir de l'utilisateur connecté (si présent).
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [articlesDb, setArticlesDb] = useState([])
  const [categoriesDb, setCategoriesDb] = useState([])
  // Paramètres globaux (TVA par défaut, préfixe numéro, infos PDF, etc.).
  const [paramsDb, setParamsDb] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sélection du client + méthode de calcul.
  const [clientId, setClientId] = useState('')
  const [method, setMethod] = useState('SIMPLE') // SIMPLE, REMISE_LIGNE, REMISE_GLOBALE, CATEGORIE
  const [remiseGlobale, setRemiseGlobale] = useState(0)

  // Lignes de facture: chaque ligne référence un article (articleId) + quantité + remise (si applicable).
  const [lines, setLines] = useState([{ id: Date.now(), articleId: '', quantite: 1, remise: 0 }])

  useEffect(() => {
    async function loadData() {
      try {
        // On charge tout ce qui est nécessaire pour construire une facture:
        // - clients (Firebase)
        // - catalogue articles + catégories + paramètres (JSON API)
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
        // Message orienté: la création dépend des 2 backends (Firebase + JSON server).
        setError("Erreur de chargement des données. Vérifiez Firebase et le serveur JSON.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleAddLine = () => {
    // Ajoute une ligne vide avec un id unique local (clé React + lookup).
    setLines([...lines, { id: Date.now(), articleId: '', quantite: 1, remise: 0 }])
  }

  const handleRemoveLine = (id) => {
    // On force au moins 1 ligne pour éviter une facture vide.
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id))
    }
  }

  const handleLineChange = (id, field, value) => {
    // Patch immutable d'une ligne (React state friendly).
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  // Calcule HT / TVA / TTC + lignes enrichies, selon la méthode choisie.
  // `useMemo` évite de recalculer à chaque frappe si rien n'a changé.
  const calcData = useMemo(() => {
    let ht = 0
    let tvaTotal = 0
    let ttc = 0
    // TVA par défaut issue des paramètres (sinon 20%).
    const defaultTva = paramsDb?.facturation?.tva_defaut || 0.2

    const computedLines = lines.map(line => {
      // Lookup article (catalogue JSON) pour récupérer prix + désignation + catégorie.
      const art = articlesDb.find(a => Number(a.id) === Number(line.articleId))
      if (!art || !line.quantite || line.quantite < 1) return { ...line, totalLigne: 0, tvaLigne: 0, art: null }

      const prixBase = art.prix_unitaire * line.quantite
      let totalLigne = prixBase

      // Méthode "remise par ligne": remise (%) appliquée sur le sous-total de la ligne.
      if (method === 'REMISE_LIGNE' && line.remise > 0) {
        totalLigne = prixBase * (1 - line.remise / 100)
      }

      let lineTvaRate = defaultTva

      // Méthode "TVA par catégorie": le taux dépend de la catégorie de l'article.
      if (method === 'CATEGORIE') {
        const cat = categoriesDb.find(c => Number(c.id) === Number(art.categorie_id))
        if (cat && cat.tva !== undefined) {
          lineTvaRate = cat.tva
        }
      }

      // TVA calculée sur le total ligne (après remise ligne).
      const tvaLigne = totalLigne * lineTvaRate

      // Agrégation des totaux.
      ht += totalLigne
      tvaTotal += tvaLigne

      // On renvoie la ligne enrichie, utilisée pour l'UI et pour persister en DB.
      return { ...line, totalLigne, tvaLigne, art }
    })

    if (method === 'REMISE_GLOBALE' && remiseGlobale > 0) {
      // Méthode "remise globale": remise appliquée sur le HT total.
      const montantRemise = ht * (remiseGlobale / 100)
      ht = ht - montantRemise
      // Simplification: on recalcule la TVA sur le HT remisé avec le taux par défaut.
      // (Si on veut une TVA par ligne même en remise globale, il faudrait recalculer ligne par ligne.)
      tvaTotal = ht * defaultTva
    }

    // TTC final.
    ttc = ht + tvaTotal

    return { ht, tvaTotal, ttc, computedLines }
  }, [lines, method, remiseGlobale, articlesDb, categoriesDb, paramsDb])

  const handleSave = async () => {
    // Validations côté UI: on évite d'écrire une facture incohérente.
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
      // Numéro basé sur un préfixe paramétrable + suffixe temporel (simple et unique "en pratique").
      const numero = `${paramsDb?.facturation?.prefix_numero || 'FAC'}-${Date.now().toString().slice(-6)}`
      const factureData = {
        numero,
        date_creation: new Date().toISOString(),
        client_id: clientId,
        // On stocke une version "dénormalisée" des lignes (designation/prix) pour figer l'historique.
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
        // Champs de workflow (suivi/validation) initialisés à la création.
        statut: 'En attente',
        date_depot: null,
        date_encaissement: null,
        type_virement: null,
        validated_by_admin: false,
        // Sert au filtrage "agent" dans Realtime DB (indexé sur agent_id).
        agent_id: user?.uid || null,
      }

      await firebaseService.createFacture(factureData)
      navigate('/factures')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGeneratePDF = () => {
    // Aperçu PDF: on génère un "mock" non persisté à partir des lignes calculées.
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <FormControl fullWidth sx={{ flex: 1 }}>
              <InputLabel id="client-select-label">Client</InputLabel>
              <Select
                labelId="client-select-label"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                label="Client"
              >
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth sx={{ flex: 1 }}>
              <InputLabel id="method-select-label">Méthode de Calcul</InputLabel>
              <Select
                labelId="method-select-label"
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

            {method === 'REMISE_GLOBALE' && (
              <TextField
                fullWidth
                sx={{ flex: 1 }}
                label="Remise globale (%)"
                type="number"
                value={remiseGlobale}
                onChange={(e) => setRemiseGlobale(Number(e.target.value))}
                inputProps={{ min: 0, max: 100 }}
              />
            )}
          </Stack>
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
