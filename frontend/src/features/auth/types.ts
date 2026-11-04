export type Rol = 'ADMINISTRADOR' | 'BIBLIOTECARIO'

export interface Usuario {
  id: string
  nombreUsuario: string
  rol: Rol
}

/** Respuesta de POST /auth/login y /auth/refresh. */
export interface SesionResponse {
  accessToken: string
  expiresIn: number
  usuario: Usuario
}
