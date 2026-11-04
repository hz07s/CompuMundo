import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SESION_INVALIDA } from '../auth.constants';
import { JwtPayload, UsuarioAutenticado } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export type RequestAutenticado = Request & { user?: UsuarioAutenticado };

/**
 * Guard global: toda ruta exige un access token válido en Authorization: Bearer,
 * salvo las marcadas con @Public(). Sin token, vencido o inválido → 401.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (esPublica) return true;

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
