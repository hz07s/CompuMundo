import { vi } from 'vitest'
import { authApi } from './authApi'
import { renovarSesion } from './renovarSesion'
import { sesionStore } from './sesionStore'

vi.mock('./authApi')

describe('renovarSesion', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockReset()
    sesionStore.reiniciar()
  })

  it('las llamadas simultáneas comparten un solo refresh', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: 'nuevo',
      expiresIn: 1,
      usuario: { id: 'u', nombreUsuario: 'maria', rol: 'BIBLIOTECARIO' },
    })

    const tokens = await Promise.all([renovarSesion(), renovarSesion()])

    expect(tokens).toEqual(['nuevo', 'nuevo'])
    expect(authApi.refresh).toHaveBeenCalledTimes(1)
    expect(sesionStore.accessToken()).toBe('nuevo')
  })

  it('si el refresh falla, la sesión queda anónima', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('401'))

    await expect(renovarSesion()).resolves.toBeNull()
    expect(sesionStore.get().estado).toBe('anonimo')
  })
})
