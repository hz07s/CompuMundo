import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '../auth.types';
import { RequestAutenticado } from '../guards/jwt-auth.guard';

/** Inyecta el usuario autenticado (request.user) en un handler. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado | undefined =>
    context.switchToHttp().getRequest<RequestAutenticado>().user,
);
