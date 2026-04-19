import React from 'react'
import { useFormik } from 'formik'
import * as yup from 'yup'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../contexts/AuthContext.jsx'

const schema = yup.object({
  email: yup.string().email('Email invalide').required('Email requis'),
  password: yup.string().min(4, 'Minimum 4 caractères').required('Mot de passe requis'),
})

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = React.useState(null)

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: schema,
    onSubmit: async (values) => {
      setError(null)
      try {
        await login(values)
        navigate('/dashboard', { replace: true })
      } catch (e) {
        setError(e?.message || 'Erreur de connexion')
      }
    },
  })

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: 'min(520px, 100%)' }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Connexion</Typography>
            <Typography variant="body2" color="text.secondary">
              Astuce: utilisez un email contenant “admin” pour simuler le rôle admin.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email ? formik.errors.email : ''}
                  autoComplete="email"
                  fullWidth
                />
                <TextField
                  label="Mot de passe"
                  name="password"
                  type="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password ? formik.errors.password : ''}
                  autoComplete="current-password"
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large">
                  Se connecter
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

