import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme.js'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Thème global MUI (palette, typographie, overrides composants). */}
    <ThemeProvider theme={theme}>
      {/* Normalisation CSS cross-browser + styles MUI de base. */}
      <CssBaseline />
      {/* Router HTML5: gère les URL côté client. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)

