import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { renderConRutas } from '../../test/renderConRutas'
import { authApi } from './authApi'
import { sesionStore } from './sesionStore'
import type { Rol } from './types'

vi.mock('./authApi')
vi.mock('../../services/healthService', () => ({
  getHealth: () => Promise.resolve({ status: 'ok' }),
}))
vi.mock('../../services/api', () => ({
  api: { get: () => Promise.resolve({ data: [] }) },
}))

const autenticar = (rol: Rol) =>
  sesionStore.reiniciar({
    estado: 'autenticado',
    accessToken: 't',
    usuario: { id: 'u', nombreUsuario: 'maria', rol },
  })

describe('Rutas protegidas', () => {
  it('sin sesión, cualquier ruta protegida redirige al login', async () => {
    sesionStore.reiniciar({ estado: 'anonimo' })

    const { rutaActual } = renderConRutas('/admin/usuarios')

    await waitFor(() => expect(rutaActual()).toBe('/login'))
  })

  it('mientras se restaura la sesión muestra un estado de carga', () => {
    sesionStore.reiniciar({ estado: 'cargando' })

    renderConRutas('/catalogo')

    expect(screen.getByRole('status')).toHaveTextContent('Cargando sesión')
  })

  it('HU-001 #3: un Bibliotecario que entra por URL al módulo del Administrador ve acceso denegado', async () => {
    autenticar('BIBLIOTECARIO')

    const { rutaActual } = renderConRutas('/admin/usuarios')

    await waitFor(() => expect(rutaActual()).toBe('/acceso-denegado'))
    expect(screen.getByRole('heading')).toHaveTextContent('Acceso denegado')
  })

  it('el rol permitido entra a su módulo', async () => {
    autenticar('BIBLIOTECARIO')

    renderConRutas('/catalogo')

    expect(
      await screen.findByRole('heading', { name: 'Catálogo' }),
    ).toBeInTheDocument()
  })

  it('"/" lleva al módulo del rol', async () => {
    autenticar('ADMINISTRADOR')

    const { rutaActual } = renderConRutas('/')

    await waitFor(() => expect(rutaActual()).toBe('/admin/usuarios'))
  })

  it('cerrar sesión revoca el refresh token y vuelve al login', async () => {
    autenticar('BIBLIOTECARIO')
    vi.mocked(authApi.logout).mockResolvedValue()
    const { rutaActual } = renderConRutas('/catalogo')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    )

    await waitFor(() => expect(rutaActual()).toBe('/login'))
    expect(authApi.logout).toHaveBeenCalled()
    expect(sesionStore.get().estado).toBe('anonimo')
  })
})
