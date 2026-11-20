import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { RUTAS } from '../features/auth/rutas'
import type { Rol } from '../features/auth/types'
import { useAuth } from '../features/auth/useAuth'

const NOMBRE_ROL = {
  ADMINISTRADOR: 'Administrador',
  BIBLIOTECARIO: 'Bibliotecario',
} as const

/** Módulos del menú, en el orden de trabajo del mostrador, con los roles que los ven. */
const MENU: Array<{ ruta: string; texto: string; roles: Rol[]; end?: true }> = [
  { ruta: RUTAS.usuarios, texto: 'Usuarios', roles: ['ADMINISTRADOR'] },
  { ruta: RUTAS.catalogo, texto: 'Catálogo', roles: ['BIBLIOTECARIO'] },
  { ruta: RUTAS.lectores, texto: 'Lectores', roles: ['BIBLIOTECARIO'] },
  {
    ruta: RUTAS.prestamos,
    texto: 'Préstamos',
    roles: ['BIBLIOTECARIO', 'ADMINISTRADOR'],
    end: true,
  },
  { ruta: RUTAS.devolucion, texto: 'Devolución', roles: ['BIBLIOTECARIO'] },
  {
    ruta: RUTAS.morosidad,
    texto: 'Morosidad',
    roles: ['BIBLIOTECARIO', 'ADMINISTRADOR'],
  },
]

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
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="encabezado">
        <div className="encabezado-interior">
          <span className="marca">
            <span className="marca-logo" aria-hidden="true">
              CM
            </span>
            <span>
              CompuMundo<small>CEDIS</small>
            </span>
          </span>
          <nav className="navegacion" aria-label="Principal">
            <ul>
              {MENU.filter((m) => m.roles.includes(usuario.rol)).map((m) => (
                <li key={m.ruta}>
                  <NavLink to={m.ruta} end={m.end}>
                    {m.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sesion">
            <span className="avatar" aria-hidden="true">
              {usuario.nombreUsuario.charAt(0)}
            </span>
            <span className="usuario-actual">
              <strong>{usuario.nombreUsuario}</strong>
              <small>{NOMBRE_ROL[usuario.rol]}</small>
            </span>
            <button type="button" className="boton-fantasma" onClick={salir}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <div id="contenido" className="contenido-principal" tabIndex={-1}>
        <Outlet />
      </div>
    </>
  )
}
