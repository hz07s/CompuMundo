import { Rol } from '../usuarios/rol.enum';

/** Contenido del access token. */
export interface JwtPayload {
  sub: string;
  nombreUsuario: string;
  rol: Rol;
}

/** Usuario autenticado que los guards dejan en request.user. */
export interface UsuarioAutenticado {
  id: string;
  nombreUsuario: string;
  rol: Rol;
}

export interface SesionEmitida {
  accessToken: string;
  /** Duración del access token en segundos. */
  expiresIn: number;
  usuario: UsuarioAutenticado;
  /** Valor en claro del refresh token; el controller lo pone en la cookie. */
  refreshToken: string;
  refreshExpiraEn: Date;
}
