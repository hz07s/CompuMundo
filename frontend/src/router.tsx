import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import InicioPorRol from './features/auth/InicioPorRol'
import ProtectedRoute from './features/auth/ProtectedRoute'
import { ROLES_POR_RUTA, RUTAS } from './features/auth/rutas'
import AccesoDenegadoPage from './pages/AccesoDenegadoPage'
import UsuariosPage from './pages/admin/UsuariosPage'
import CatalogoPage from './pages/CatalogoPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

export const rutas: RouteObject[] = [
  { path: RUTAS.login, element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <InicioPorRol /> },
      { path: RUTAS.accesoDenegado, element: <AccesoDenegadoPage /> },
      {
        element: <AppLayout />,
        children: [
          {
            element: <ProtectedRoute roles={ROLES_POR_RUTA[RUTAS.usuarios]} />,
            children: [{ path: RUTAS.usuarios, element: <UsuariosPage /> }],
          },
          {
            element: <ProtectedRoute roles={ROLES_POR_RUTA[RUTAS.catalogo]} />,
            children: [{ path: RUTAS.catalogo, element: <CatalogoPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(rutas)
