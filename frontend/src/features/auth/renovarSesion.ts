import { authApi } from './authApi'
import { sesionStore } from './sesionStore'

let enCurso: Promise<string | null> | null = null

/**
 * Pide un access token nuevo con la cookie del refresh token. Las llamadas
 * simultáneas comparten la misma petición: el backend rota el refresh token
 * en cada uso y trata la reutilización de uno ya rotado como robo.
 */
export function renovarSesion(): Promise<string | null> {
  enCurso ??= authApi
    .refresh()
    .then((sesion) => {
      sesionStore.iniciar(sesion)
      return sesion.accessToken
    })
    .catch(() => {
      sesionStore.cerrar()
      return null
    })
    .finally(() => {
      enCurso = null
    })
  return enCurso
}
