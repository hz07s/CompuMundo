import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { vi } from 'vitest'
import { renovarSesion } from '../features/auth/renovarSesion'
import { sesionStore } from '../features/auth/sesionStore'
import { api } from './api'

vi.mock('../features/auth/renovarSesion')

/** Adaptador falso: responde 401 salvo que el header traiga el token indicado. */
function adaptadorQueAcepta(tokenValido: string) {
  return vi.fn((config: InternalAxiosRequestConfig) => {
    const auth = config.headers.Authorization
    if (auth === `Bearer ${tokenValido}`) {
      return Promise.resolve({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse)
    }
    return Promise.reject(
      new AxiosError('401', 'ERR_BAD_REQUEST', config, undefined, {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    )
  })
}

describe('api (interceptores)', () => {
  beforeEach(() => {
    vi.mocked(renovarSesion).mockReset()
    sesionStore.reiniciar({
      estado: 'autenticado',
      accessToken: 'vencido',
      usuario: { id: 'u', nombreUsuario: 'maria', rol: 'BIBLIOTECARIO' },
    })
  })

  it('agrega el access token en Authorization', async () => {
    const adapter = adaptadorQueAcepta('vencido')

    await api.get('/x', { adapter })

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe(
      'Bearer vencido',
    )
  })

  it('ante un 401 renueva la sesión y reintenta la petición una vez', async () => {
    vi.mocked(renovarSesion).mockResolvedValue('nuevo')
    const adapter = adaptadorQueAcepta('nuevo')

    const res = await api.get('/x', { adapter })

    expect(res.data).toEqual({ ok: true })
    expect(renovarSesion).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('si la renovación falla, propaga el 401 sin reintentar', async () => {
    vi.mocked(renovarSesion).mockResolvedValue(null)
    const adapter = adaptadorQueAcepta('nunca')

    await expect(api.get('/x', { adapter })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('no entra en bucle si el token renovado también es rechazado', async () => {
    vi.mocked(renovarSesion).mockResolvedValue('tambien-invalido')
    const adapter = adaptadorQueAcepta('nunca')

    await expect(api.get('/x', { adapter })).rejects.toBeInstanceOf(AxiosError)
    expect(renovarSesion).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(2)
  })
})
