import type { SesionResponse, Usuario } from './types'

/**
 * Sesión en memoria (P-17): el access token nunca se guarda en
 * localStorage ni en cookies accesibles desde JS. Al recargar la página se
 * pierde y se recupera con el refresh token (cookie httpOnly).
 */
export type EstadoSesion =
  | { estado: 'cargando' }
  | { estado: 'anonimo' }
  | { estado: 'autenticado'; usuario: Usuario; accessToken: string }

type Listener = () => void

let actual: EstadoSesion = { estado: 'cargando' }
const listeners = new Set<Listener>()

function emitir(nuevo: EstadoSesion) {
  actual = nuevo
  listeners.forEach((l) => l())
}

export const sesionStore = {
  get: (): EstadoSesion => actual,

  accessToken: (): string | null =>
    actual.estado === 'autenticado' ? actual.accessToken : null,

  iniciar: (sesion: SesionResponse) =>
    emitir({
      estado: 'autenticado',
      usuario: sesion.usuario,
      accessToken: sesion.accessToken,
    }),

  cerrar: () => emitir({ estado: 'anonimo' }),

  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** Solo para pruebas. */
  reiniciar: (estado: EstadoSesion = { estado: 'cargando' }) => emitir(estado),
}
