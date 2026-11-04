import { useEffect, type ReactNode } from 'react'
import { renovarSesion } from './renovarSesion'
import { sesionStore } from './sesionStore'

/** Al abrir la app intenta recuperar la sesión con la cookie del refresh token. */
export default function RestaurarSesion({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (sesionStore.get().estado === 'cargando') void renovarSesion()
  }, [])

  return children
}
