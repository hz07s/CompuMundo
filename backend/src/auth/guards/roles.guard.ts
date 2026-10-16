import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../usuarios/rol.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestAutenticado } from './jwt-auth.guard';

/**
 * Corre después de JwtAuthGuard. Si la ruta declara @Roles, el rol del
 * usuario debe estar entre ellos; si no declara roles, basta con estar autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permitidos?.length) return true;

    const { user } = context.switchToHttp().getRequest<RequestAutenticado>();
    if (!user || !permitidos.includes(user.rol)) {
      throw new ForbiddenException('No tiene permisos para esta acción');
    }
    return true;
  }
}
