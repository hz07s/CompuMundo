import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import RestaurarSesion from './features/auth/RestaurarSesion'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Envolvemos la app con el proveedor de Google */}
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <RestaurarSesion>
        <RouterProvider router={router} />
      </RestaurarSesion>
    </GoogleOAuthProvider>
  </StrictMode>,
)