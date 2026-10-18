import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { RUTAS } from './rutas'
import type { Rol } from './types'
import { useAuth } from './useAuth'

interface Props {
  /** Si se indica, solo esos roles pueden entrar; el resto ve acceso denegado. */
  roles?: Rol[]
}

/** Sin sesión → login (recordando a dónde iba). Rol no permitido → acceso denegado. */
export default function ProtectedRoute({ roles }: Props) {
  const { sesion } = useAuth()
  const location = useLocation()

  if (sesion.estado === 'cargando') {
    return (
      <p className="estado-carga" role="status">
        Cargando sesión…
      </p>
    )
  }
  if (sesion.estado === 'anonimo') {
    return <Navigate to={RUTAS.login} replace state={{ desde: location }} />
  }
  if (roles && !roles.includes(sesion.usuario.rol)) {
    return <Navigate to={RUTAS.accesoDenegado} replace />
  }
  return <Outlet />
}
