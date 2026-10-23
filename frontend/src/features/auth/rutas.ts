import type { Rol } from './types'

export const RUTAS = {
  login: '/login',
  accesoDenegado: '/acceso-denegado',
  usuarios: '/admin/usuarios',
  catalogo: '/catalogo',
} as const

/** Módulo al que llega cada rol después de iniciar sesión (HU-001 #1). */
export const INICIO_POR_ROL: Record<Rol, string> = {
  ADMINISTRADOR: RUTAS.usuarios,
  BIBLIOTECARIO: RUTAS.catalogo,
}

/** Roles permitidos por módulo. La tabla de rutas y el login usan la misma fuente. */
export const ROLES_POR_RUTA: Record<string, Rol[]> = {
  [RUTAS.usuarios]: ['ADMINISTRADOR'],
  [RUTAS.catalogo]: ['BIBLIOTECARIO'],
}

export function puedeEntrar(pathname: string, rol: Rol): boolean {
  const modulo = Object.keys(ROLES_POR_RUTA).find(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  )
  return !modulo || ROLES_POR_RUTA[modulo].includes(rol)
}

/**
 * Destino tras el login: la ruta que se pidió si el rol puede verla (no la
 * de otro usuario que intentó entrar antes en esta pestaña), o su módulo.
 */
export function destinoTrasLogin(rol: Rol, pedida?: string): string {
  const util = pedida && pedida !== RUTAS.login && pedida !== '/'
  return util && puedeEntrar(pedida, rol) ? pedida : INICIO_POR_ROL[rol]
}
