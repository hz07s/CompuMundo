import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import RestaurarSesion from './features/auth/RestaurarSesion'
import './index.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RestaurarSesion>
      <RouterProvider router={router} />
    </RestaurarSesion>
  </StrictMode>,
)
