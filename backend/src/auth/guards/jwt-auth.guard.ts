import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { SESION_INVALIDA } from '../auth.constants';
import { JwtPayload, UsuarioAutenticado } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export type RequestAutenticado = Request & { user?: UsuarioAutenticado };

/**
 * Guard global: toda ruta exige un access token válido en Authorization: Bearer,
 * salvo las marcadas con @Public(). Sin token, vencido o inválido → 401.
 * HU-021: además consulta la cuenta, de modo que deshabilitarla corta el acceso
 * al instante y el rol vigente es el de la BD, no el que quedó en el token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
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

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException(SESION_INVALIDA);
    }

    const usuario = await this.usuarios.findOne({
      where: { id: payload.sub },
      select: { id: true, nombreUsuario: true, rol: true, activo: true },
    });
    if (!usuario?.activo) throw new UnauthorizedException(SESION_INVALIDA);
    request.user = {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol,
    };
    return true;
  }
}
