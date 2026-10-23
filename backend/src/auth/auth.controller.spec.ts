import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Rol } from '../usuarios/rol.enum';
import { REFRESH_COOKIE } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SesionEmitida } from './auth.types';

describe('AuthController', () => {
  const sesion: SesionEmitida = {
    accessToken: 'access',
    expiresIn: 28800,
    usuario: { id: 'u-1', nombreUsuario: 'admin', rol: Rol.ADMINISTRADOR },
    refreshToken: 'refresh-claro',
    refreshExpiraEn: new Date('2030-01-01'),
  };
  let auth: { login: jest.Mock; refresh: jest.Mock; logout: jest.Mock };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  const crear = (NODE_ENV = 'development') =>
    new AuthController(
      auth as unknown as AuthService,
      new ConfigService({ NODE_ENV }),
    );

  beforeEach(() => {
    auth = {
      login: jest.fn().mockResolvedValue(sesion),
      refresh: jest.fn().mockResolvedValue(sesion),
      logout: jest.fn(),
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
  });

  it('login pone el refresh token en cookie httpOnly y no en el cuerpo', async () => {
    const body = await crear().login(
      { nombreUsuario: 'admin', password: 'x' },
      res as unknown as Response,
    );

    expect(body).toEqual({
      accessToken: 'access',
      expiresIn: 28800,
      usuario: sesion.usuario,
    });
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'refresh-claro',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth',
      }),
    );
  });

  it('en producción la cookie es Secure y SameSite=None', async () => {
    await crear('production').login(
      { nombreUsuario: 'admin', password: 'x' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'refresh-claro',
      expect.objectContaining({ secure: true, sameSite: 'none' }),
    );
  });

  it('refresh lee el token de la cookie', async () => {
    const req = {
      cookies: { [REFRESH_COOKIE]: 'actual' },
    } as unknown as Request;

    await crear().refresh(req, res as unknown as Response);

    expect(auth.refresh).toHaveBeenCalledWith('actual');
  });

  it('logout revoca el token y borra la cookie', async () => {
    const req = {} as Request;

    await crear().logout(req, res as unknown as Response);

    expect(auth.logout).toHaveBeenCalledWith(undefined);
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.objectContaining({ path: '/auth' }),
    );
  });

  it('me devuelve el usuario autenticado', () => {
    expect(crear().me(sesion.usuario)).toEqual(sesion.usuario);
  });
});
