import { useCallback, useSyncExternalStore } from 'react'
import { authApi } from './authApi'
import { sesionStore } from './sesionStore'

/** Estado de la sesión y acciones de login/logout. */
export function useAuth() {
  const sesion = useSyncExternalStore(sesionStore.subscribe, sesionStore.get)

  const login = useCallback(async (nombreUsuario: string, password: string) => {
    const respuesta = await authApi.login(nombreUsuario, password)
    sesionStore.iniciar(respuesta)
    return respuesta.usuario
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Aunque falle la red, la sesión local se cierra.
      sesionStore.cerrar()
    }
  }, [])

  return { sesion, login, logout }
}
