import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { googleClientId } from './config'
import RestaurarSesion from './features/auth/RestaurarSesion'
import './index.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId()}>
      <RestaurarSesion>
        <RouterProvider router={router} />
      </RestaurarSesion>
    </GoogleOAuthProvider>
  </StrictMode>,
)
