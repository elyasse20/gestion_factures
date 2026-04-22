import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
  TablePagination
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material'
import { jsonService } from '../../services/jsonService'

export default function AdminParamsPage() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [params, setParams] = useState(null)
  const [error, setError] = useState(null)

  // Dialogs
  const [openArticle, setOpenArticle] = useState(false)
  const [openCategory, setOpenCategory] = useState(false)
  
  // Pagination states
  const [catPage, setCatPage] = useState(0)
  const [catRowsPerPage, setCatRowsPerPage] = useState(5)
  const [artPage, setArtPage] = useState(0)
  const [artRowsPerPage, setArtRowsPerPage] = useState(5)

  // Forms states
  const [articleForm, setArticleForm] = useState({ id: null, designation: '', prix_unitaire: 0, categorie_id: '' })
  const [categoryForm, setCategoryForm] = useState({ id: null, nom: '', tva: 0 })
  const [companyForm, setCompanyForm] = useState({ nom: '', adresse: '', email: '', tel: '' })

  const loadData = async () => {
    try {
      const [art, cat, par] = await Promise.all([
        jsonService.listArticles(),
        jsonService.listCategories(),
        jsonService.getParams()
      ])
      setArticles(art)
      setCategories(cat)
      setParams(par)
      setCompanyForm(par?.societe || { nom: '', adresse: '', email: '', tel: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Categories CRUD
  const handleSaveCategory = async () => {
    try {
      if (categoryForm.id) await jsonService.updateCategory(categoryForm.id, categoryForm)
      else await jsonService.createCategory({ nom: categoryForm.nom, tva: categoryForm.tva })
      setOpenCategory(false)
      loadData()
    } catch(err) { setError(err.message) }
  }
  const handleDeleteCategory = async (id) => {
    if(window.confirm('Supprimer cette catégorie ?')) {
      try { await jsonService.deleteCategory(id); loadData() } catch(err) { setError(err.message) }
    }
  }

  // Articles CRUD
  const handleSaveArticle = async () => {
    try {
      if (articleForm.id) await jsonService.updateArticle(articleForm.id, articleForm)
      else await jsonService.createArticle({ designation: articleForm.designation, prix_unitaire: articleForm.prix_unitaire, categorie_id: articleForm.categorie_id })
      setOpenArticle(false)
      loadData()
    } catch(err) { setError(err.message) }
  }
  const handleDeleteArticle = async (id) => {
    if(window.confirm('Supprimer cet article ?')) {
      try { await jsonService.deleteArticle(id); loadData() } catch(err) { setError(err.message) }
    }
  }

  // Company Settings
  const handleSaveParams = async () => {
    try {
      await jsonService.updateParams({ ...params, societe: companyForm })
      alert('Paramètres enregistrés !')
    } catch(err) { setError(err.message) }
  }

  const paginatedCategories = categories.slice(catPage * catRowsPerPage, catPage * catRowsPerPage + catRowsPerPage)
  const paginatedArticles = articles.slice(artPage * artRowsPerPage, artPage * artRowsPerPage + artRowsPerPage)

  return (
    <Stack spacing={4}>
      <Typography variant="h4">Administration · Paramètres</Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Informations de la Société</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField label="Nom Société" size="small" value={companyForm.nom} onChange={(e) => setCompanyForm({...companyForm, nom: e.target.value})} />
                <TextField label="Adresse" size="small" multiline rows={2} value={companyForm.adresse} onChange={(e) => setCompanyForm({...companyForm, adresse: e.target.value})} />
                <TextField label="Email" size="small" value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} />
                <TextField label="Téléphone" size="small" value={companyForm.tel} onChange={(e) => setCompanyForm({...companyForm, tel: e.target.value})} />
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveParams}>Enregistrer infos</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={4}>
            <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
            <Card sx={{ width: '100%' }}>
              <CardContent sx={{ width: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Gestion des Catégories</Typography>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={() => { setCategoryForm({ id: null, nom: '', tva: 0 }); setOpenCategory(true)}}>
                    Nouvelle Catégorie
                  </Button>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Nom</TableCell>
                        <TableCell>TVA</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCategories.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.id}</TableCell>
                          <TableCell>{c.nom}</TableCell>
                          <TableCell>{c.tva * 100}%</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => { setCategoryForm(c); setOpenCategory(true) }}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCategory(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={categories.length}
                  page={catPage}
                  onPageChange={(e, newPage) => setCatPage(newPage)}
                  rowsPerPage={catRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setCatRowsPerPage(parseInt(e.target.value, 10))
                    setCatPage(0)
                  }}
                  labelRowsPerPage="Lignes par page :"
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </CardContent>
            </Card>
            </Grid>

            <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
            <Card sx={{ width: '100%' }}>
              <CardContent sx={{ width: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Gestion des Articles</Typography>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={() => { setArticleForm({ id: null, designation: '', prix_unitaire: 0, categorie_id: '' }); setOpenArticle(true)}}>
                    Nouvel Article
                  </Button>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Désignation</TableCell>
                        <TableCell>Prix U.</TableCell>
                        <TableCell>Categorie ID</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedArticles.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{a.designation}</TableCell>
                          <TableCell>{a.prix_unitaire} MAD</TableCell>
                          <TableCell>{a.categorie_id}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => { setArticleForm(a); setOpenArticle(true) }}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteArticle(a.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={articles.length}
                  page={artPage}
                  onPageChange={(e, newPage) => setArtPage(newPage)}
                  rowsPerPage={artRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setArtRowsPerPage(parseInt(e.target.value, 10))
                    setArtPage(0)
                  }}
                  labelRowsPerPage="Lignes par page :"
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </CardContent>
            </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Dialog Category */}
      <Dialog open={openCategory} onClose={() => setOpenCategory(false)}>
        <DialogTitle>{categoryForm.id ? 'Modifier' : 'Ajouter'} Catégorie</DialogTitle>
        <DialogContent>
           <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
              <TextField label="Nom" value={categoryForm.nom} onChange={e => setCategoryForm({...categoryForm, nom: e.target.value})} />
              <TextField label="TVA (ex: 0.2)" type="number" inputProps={{ step: 0.01 }} value={categoryForm.tva} onChange={e => setCategoryForm({...categoryForm, tva: Number(e.target.value)})} />
           </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCategory(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveCategory}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Article */}
      <Dialog open={openArticle} onClose={() => setOpenArticle(false)}>
        <DialogTitle>{articleForm.id ? 'Modifier' : 'Ajouter'} Article</DialogTitle>
        <DialogContent>
           <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
              <TextField label="Désignation" value={articleForm.designation} onChange={e => setArticleForm({...articleForm, designation: e.target.value})} />
              <TextField label="Prix Unitaire" type="number" value={articleForm.prix_unitaire} onChange={e => setArticleForm({...articleForm, prix_unitaire: Number(e.target.value)})} />
              <TextField label="ID Categorie" type="number" value={articleForm.categorie_id} onChange={e => setArticleForm({...articleForm, categorie_id: Number(e.target.value)})} />
           </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenArticle(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveArticle}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

    </Stack>
  )
}
