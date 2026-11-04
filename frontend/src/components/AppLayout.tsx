import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { RUTAS } from '../features/auth/rutas'
import { useAuth } from '../features/auth/useAuth'

const NOMBRE_ROL = {
  ADMINISTRADOR: 'Administrador',
  BIBLIOTECARIO: 'Bibliotecario',
} as const

/** Marco de las páginas con sesión: encabezado, navegación por rol y cierre de sesión. */
export default function AppLayout() {
  const { sesion, logout } = useAuth()
  const navigate = useNavigate()
  if (sesion.estado !== 'autenticado') return null
  const { usuario } = sesion

  async function salir() {
    await logout()
    navigate(RUTAS.login, { replace: true })
  }

  return (
    <>
      <header className="encabezado">
        <strong>CompuMundo CEDIS</strong>
        <nav>
          {usuario.rol === 'ADMINISTRADOR' && (
            <NavLink to={RUTAS.usuarios}>Usuarios</NavLink>
          )}
          {usuario.rol === 'BIBLIOTECARIO' && (
            <NavLink to={RUTAS.catalogo}>Catálogo</NavLink>
          )}
        </nav>
        <span className="usuario-actual">
          {usuario.nombreUsuario} · {NOMBRE_ROL[usuario.rol]}
        </span>
        <button type="button" className="boton-secundario" onClick={salir}>
          Cerrar sesión
        </button>
      </header>
      <Outlet />
    </>
  )
}
