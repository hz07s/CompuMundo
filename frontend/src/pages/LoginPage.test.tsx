import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { vi } from 'vitest'
import { authApi } from '../features/auth/authApi'
import { sesionStore } from '../features/auth/sesionStore'
import { getHealth } from '../services/healthService'
import { renderConRutas } from '../test/renderConRutas'

vi.mock('../features/auth/authApi')
vi.mock('../services/healthService')

const error401 = () =>
  new AxiosError('401', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: 401, message: 'Usuario o contraseña incorrectos' },
  })

const sesion = (rol: 'ADMINISTRADOR' | 'BIBLIOTECARIO') => ({
  accessToken: 'token',
  expiresIn: 28800,
  usuario: { id: 'u-1', nombreUsuario: 'maria', rol },
})

describe('LoginPage', () => {
  beforeEach(() => {
    sesionStore.reiniciar({ estado: 'anonimo' })
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok' })
  })

  async function ingresar(usuario: string, password: string) {
    const user = userEvent.setup()
    if (usuario) await user.type(screen.getByLabelText('Usuario'), usuario)
    if (password) await user.type(screen.getByLabelText('Contraseña'), password)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
  }

  it('valida en el cliente que usuario y contraseña no estén vacíos', async () => {
    renderConRutas('/login')

    await ingresar('', '')

    expect(screen.getByText('Ingrese su usuario')).toBeInTheDocument()
    expect(screen.getByText('Ingrese su contraseña')).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('HU-001 #2: con credenciales incorrectas muestra el mensaje genérico y no guarda sesión', async () => {
    vi.mocked(authApi.login).mockRejectedValue(error401())
    renderConRutas('/login')

    await ingresar('maria', 'mala')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario o contraseña incorrectos',
    )
    expect(sesionStore.get().estado).toBe('anonimo')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  })

  it('muestra un aviso si no hay conexión con el servidor', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new AxiosError('Network Error', 'ERR_NETWORK'),
    )
    renderConRutas('/login')

    await ingresar('maria', 'clave')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
  })

  it.each([
    ['BIBLIOTECARIO', '/catalogo'],
    ['ADMINISTRADOR', '/admin/usuarios'],
  ] as const)(
    'HU-001 #1: un %s llega a su módulo (%s)',
    async (rol, destino) => {
      vi.mocked(authApi.login).mockResolvedValue(sesion(rol))
      const { rutaActual } = renderConRutas('/login')

      await ingresar('maria', 'clave')

      await waitFor(() => expect(rutaActual()).toBe(destino))
      expect(sesionStore.accessToken()).toBe('token')
    },
  )

  it('después del login vuelve a la ruta que se pidió', async () => {
    vi.mocked(authApi.login).mockResolvedValue(sesion('BIBLIOTECARIO'))
    const { rutaActual } = renderConRutas('/catalogo')
    await waitFor(() => expect(rutaActual()).toBe('/login'))

    await ingresar('maria', 'clave')

    await waitFor(() => expect(rutaActual()).toBe('/catalogo'))
  })
})
