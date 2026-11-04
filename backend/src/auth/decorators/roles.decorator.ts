import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { Rol } from '../../usuarios/rol.enum';

export const ROLES_KEY = 'roles';

/** Restringe una ruta (o un controller entero) a los roles indicados. Otro rol → 403. */
export const Roles = (...roles: Rol[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiForbiddenResponse({
      description: `Solo para: ${roles.join(', ')}`,
    }),
  );
