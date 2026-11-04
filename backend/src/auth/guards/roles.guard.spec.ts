import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../usuarios/rol.enum';
import { UsuarioAutenticado } from '../auth.types';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

@Roles(Rol.BIBLIOTECARIO)
class ControllerDePrueba {
  @Roles(Rol.ADMINISTRADOR)
  soloAdmin() {}

  heredaDelController() {}
}

class SinRoles {
  libre() {}
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  const contexto = (
    clase: { prototype: object },
    handler: string,
    rol?: Rol,
  ): ExecutionContext => {
    const user: UsuarioAutenticado | undefined = rol
      ? { id: 'u', nombreUsuario: 'u', rol }
      : undefined;
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => (clase.prototype as Record<string, unknown>)[handler],
      getClass: () => clase,
    } as unknown as ExecutionContext;
  };

  it('permite el acceso si el rol está entre los permitidos', () => {
    expect(
      guard.canActivate(
        contexto(ControllerDePrueba, 'soloAdmin', Rol.ADMINISTRADOR),
      ),
    ).toBe(true);
  });

  it('HU-001 #3: un Bibliotecario en una función exclusiva del Administrador recibe 403', () => {
    expect(() =>
      guard.canActivate(
        contexto(ControllerDePrueba, 'soloAdmin', Rol.BIBLIOTECARIO),
      ),
    ).toThrow(ForbiddenException);
  });

  it('el @Roles del método tiene prioridad sobre el del controller', () => {
    expect(
      guard.canActivate(
        contexto(ControllerDePrueba, 'heredaDelController', Rol.BIBLIOTECARIO),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        contexto(ControllerDePrueba, 'heredaDelController', Rol.ADMINISTRADOR),
      ),
    ).toThrow(ForbiddenException);
  });

  it('sin @Roles basta con estar autenticado', () => {
    expect(
      guard.canActivate(contexto(SinRoles, 'libre', Rol.BIBLIOTECARIO)),
    ).toBe(true);
  });

  it('sin usuario en la request responde 403 si la ruta exige rol', () => {
    expect(() =>
      guard.canActivate(contexto(ControllerDePrueba, 'soloAdmin')),
    ).toThrow(ForbiddenException);
  });
});
