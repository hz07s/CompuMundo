import { Navigate } from 'react-router-dom'
import { INICIO_POR_ROL, RUTAS } from './rutas'
import { useAuth } from './useAuth'

/** "/" lleva al módulo del rol de la sesión. */
export default function InicioPorRol() {
  const { sesion } = useAuth()
  if (sesion.estado !== 'autenticado')
    return <Navigate to={RUTAS.login} replace />
  return <Navigate to={INICIO_POR_ROL[sesion.usuario.rol]} replace />
}
