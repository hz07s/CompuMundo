import type { Rol } from '../auth/types'

/** Cuenta del personal (GET /usuarios, HU-021). */
export interface Cuenta {
  id: string
  nombreUsuario: string
  rol: Rol
  email: string | null
  activo: boolean
  creadoEn: string
}

export interface NuevaCuenta {
  nombreUsuario: string
  password: string
  rol: Rol
  email?: string
}

export type CambiosCuenta = Partial<{
  rol: Rol
  activo: boolean
  password: string
}>

export const ROLES: Rol[] = ['BIBLIOTECARIO', 'ADMINISTRADOR']

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  BIBLIOTECARIO: 'Bibliotecario',
}
