import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext';
// 1. Importamos el BrowserRouter
import { BrowserRouter } from 'react-router-dom';
import './index.css'; // <-- ESTO FALTABA PARA ACTIVAR TODO EL DISEÑO

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      {/* 2. Envolvemos a App con el BrowserRouter */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
