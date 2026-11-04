import { Link } from 'react-router-dom'
import { INICIO_POR_ROL, RUTAS } from '../features/auth/rutas'
import { useAuth } from '../features/auth/useAuth'

/** Se muestra al entrar por URL a una ruta de otro rol (HU-001 #3). */
export default function AccesoDenegadoPage() {
  const { sesion } = useAuth()
  const inicio =
    sesion.estado === 'autenticado'
      ? INICIO_POR_ROL[sesion.usuario.rol]
      : RUTAS.login

  return (
    <main className="page">
      <h1>Acceso denegado</h1>
      <p>Su rol no tiene permiso para ver esta página.</p>
      <Link to={inicio}>Ir a mi inicio</Link>
    </main>
  )
}
