import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SESION_INVALIDA } from '../auth.constants';
import { JwtPayload, UsuarioAutenticado } from '../auth.types';

export type RequestAutenticado = Request & { user?: UsuarioAutenticado };

/** Exige un access token válido en Authorization: Bearer. Vencido o inválido → 401. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestAutenticado>();
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = {
        id: payload.sub,
        nombreUsuario: payload.nombreUsuario,
        rol: payload.rol,
      };
      return true;
    } catch {
      throw new UnauthorizedException(SESION_INVALIDA);
    }
  }
}
