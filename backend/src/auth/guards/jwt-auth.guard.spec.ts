import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
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
  // Estado actual de las cuentas en la BD (HU-021).
  let cuentas: Record<string, Partial<Usuario>>;
  const repo = {
    findOne: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(cuentas[where.id] ?? null),
    ),
  };
  const guard = new JwtAuthGuard(
    jwt,
    new Reflector(),
    repo as unknown as Repository<Usuario>,
  );

  beforeEach(() => {
    cuentas = {
      'u-1': {
        id: 'u-1',
        nombreUsuario: 'admin',
        rol: Rol.ADMINISTRADOR,
        activo: true,
      },
    };
  });

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

  it('HU-021 #3: una cuenta deshabilitada o inexistente → 401 aunque el token sea válido', async () => {
    const token = await jwt.signAsync({
      sub: 'u-1',
      nombreUsuario: 'admin',
      rol: Rol.ADMINISTRADOR,
    });
    cuentas['u-1'].activo = false;
    await expect(
      guard.canActivate(contexto(`Bearer ${token}`).context),
    ).rejects.toThrow(UnauthorizedException);

    delete cuentas['u-1'];
    await expect(
      guard.canActivate(contexto(`Bearer ${token}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('HU-021 #4: el rol vigente es el de la BD, no el que quedó en el token', async () => {
    const token = await jwt.signAsync({
      sub: 'u-1',
      nombreUsuario: 'admin',
      rol: Rol.ADMINISTRADOR,
    });
    cuentas['u-1'].rol = Rol.BIBLIOTECARIO;
    const { request, context } = contexto(`Bearer ${token}`);

    await guard.canActivate(context);

    expect(request.user?.rol).toBe(Rol.BIBLIOTECARIO);
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
