import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '../../usuarios/rol.enum';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard, RequestAutenticado } from './jwt-auth.guard';

class RutasDePrueba {
  @Public()
  publica(this: void) {}

  privada(this: void) {}
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'secreto-de-pruebas' });
  const guard = new JwtAuthGuard(jwt, new Reflector());

  const contexto = (
    authorization?: string,
    handler: keyof RutasDePrueba = 'privada',
  ) => {
    const request = { headers: { authorization } } as RequestAutenticado;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => RutasDePrueba.prototype[handler],
      getClass: () => RutasDePrueba,
    } as unknown as ExecutionContext;
    return { request, context };
  };

  it('deja pasar sin token las rutas marcadas con @Public()', async () => {
    await expect(
      guard.canActivate(contexto(undefined, 'publica').context),
    ).resolves.toBe(true);
  });

  it('acepta un token válido y deja el usuario en request.user', async () => {
    const token = await jwt.signAsync({
      sub: 'u-1',
      nombreUsuario: 'admin',
      rol: Rol.ADMINISTRADOR,
    });
    const { request, context } = contexto(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'u-1',
      nombreUsuario: 'admin',
      rol: Rol.ADMINISTRADOR,
    });
  });

  it.each([
    ['sin header', undefined],
    ['esquema distinto de Bearer', 'Basic abc'],
    ['Bearer sin token', 'Bearer'],
  ])('HU-001 #3: responde 401 %s', async (_caso, header) => {
    await expect(guard.canActivate(contexto(header).context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('HU-001 #3: responde 401 con un token vencido', async () => {
    const token = await jwt.signAsync(
      { sub: 'u-1', nombreUsuario: 'admin', rol: Rol.ADMINISTRADOR },
      { expiresIn: -10 },
    );

    await expect(
      guard.canActivate(contexto(`Bearer ${token}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('responde 401 con un token firmado con otro secreto', async () => {
    const ajeno = await new JwtService({ secret: 'otro' }).signAsync({
      sub: 'x',
    });

    await expect(
      guard.canActivate(contexto(`Bearer ${ajeno}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });
});
