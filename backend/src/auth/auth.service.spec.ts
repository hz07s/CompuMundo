import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/rol.enum';
import { CREDENCIALES_INVALIDAS } from './auth.constants';
import { AuthService } from './auth.service';
import { JwtPayload } from './auth.types';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const jwt = new JwtService({ secret: 'secreto-de-pruebas' });
  const usuario = {
    id: 'u-1',
    nombreUsuario: 'biblio',
    rol: Rol.BIBLIOTECARIO,
    activo: true,
    passwordHash: 'hash',
  } as Usuario;

  let usuarios: { findOne: jest.Mock };
  let refreshTokens: {
    findOne: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let passwords: { compare: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usuarios = { findOne: jest.fn() };
    refreshTokens = {
      findOne: jest.fn(),
      insert: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    passwords = { compare: jest.fn() };
    service = new AuthService(
      usuarios as unknown as Repository<Usuario>,
      refreshTokens as unknown as Repository<RefreshToken>,
      passwords as unknown as PasswordService,
      jwt,
      new ConfigService({
        JWT_ACCESS_EXPIRES_IN: '8h',
        JWT_REFRESH_EXPIRES_IN: '7d',
      }),
    );
  });

  describe('login', () => {
    it('con credenciales válidas emite un access token con id y rol', async () => {
      usuarios.findOne.mockResolvedValue(usuario);
      passwords.compare.mockResolvedValue(true);

      const sesion = await service.login('biblio', 'clave');

      const payload = await jwt.verifyAsync<JwtPayload>(sesion.accessToken);
      expect(payload).toMatchObject({ sub: 'u-1', rol: Rol.BIBLIOTECARIO });
      expect(sesion.expiresIn).toBe(8 * 3600);
      expect(sesion.usuario).toEqual({
        id: 'u-1',
        nombreUsuario: 'biblio',
        rol: Rol.BIBLIOTECARIO,
      });
      expect(sesion.usuario).not.toHaveProperty('passwordHash');
    });

    it('guarda solo el hash del refresh token, con vencimiento a 7 días', async () => {
      usuarios.findOne.mockResolvedValue(usuario);
      passwords.compare.mockResolvedValue(true);

      const sesion = await service.login('biblio', 'clave');

      const [[guardado]] = refreshTokens.insert.mock.calls as [[RefreshToken]];
      expect(guardado.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(guardado.tokenHash).not.toBe(sesion.refreshToken);
      const dias = (guardado.expiraEn.getTime() - Date.now()) / 86_400_000;
      expect(dias).toBeCloseTo(7, 1);
    });

    it('con contraseña incorrecta responde 401 genérico', async () => {
      usuarios.findOne.mockResolvedValue(usuario);
      passwords.compare.mockResolvedValue(false);

      await expect(service.login('biblio', 'mala')).rejects.toThrow(
        new UnauthorizedException(CREDENCIALES_INVALIDAS),
      );
      expect(refreshTokens.insert).not.toHaveBeenCalled();
    });

    it('con usuario inexistente responde el mismo 401 y aun así compara un hash', async () => {
      usuarios.findOne.mockResolvedValue(null);
      passwords.compare.mockResolvedValue(false);

      await expect(service.login('nadie', 'clave')).rejects.toThrow(
        new UnauthorizedException(CREDENCIALES_INVALIDAS),
      );
      expect(passwords.compare).toHaveBeenCalledWith(
        'clave',
        expect.stringMatching(/^\$2b\$/),
      );
    });

    it('un usuario inactivo no puede entrar', async () => {
      usuarios.findOne.mockResolvedValue({ ...usuario, activo: false });
      passwords.compare.mockResolvedValue(true);

      await expect(service.login('biblio', 'clave')).rejects.toThrow(
        new UnauthorizedException(CREDENCIALES_INVALIDAS),
      );
    });
  });

  describe('refresh', () => {
    const tokenGuardado = (cambios: Partial<RefreshToken> = {}) => ({
      id: 'rt-1',
      usuarioId: 'u-1',
      usuario,
      expiraEn: new Date(Date.now() + 60_000),
      revocadoEn: null,
      ...cambios,
    });

    it('rota el token: revoca el actual y emite uno nuevo', async () => {
      refreshTokens.findOne.mockResolvedValue(tokenGuardado());

      const sesion = await service.refresh('token-actual');

      expect(refreshTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rt-1' }),
        { revocadoEn: expect.any(Date) as Date },
      );
      expect(refreshTokens.insert).toHaveBeenCalledTimes(1);
      expect(sesion.refreshToken).not.toBe('token-actual');
    });

    it.each([
      ['sin cookie', undefined, null],
      ['token desconocido', 'x', null],
      ['token vencido', 'x', { expiraEn: new Date(Date.now() - 1) }],
      ['usuario dado de baja', 'x', { usuario: { ...usuario, activo: false } }],
    ])('responde 401 con %s', async (_caso, token, cambios) => {
      refreshTokens.findOne.mockResolvedValue(
        cambios === null ? null : tokenGuardado(cambios),
      );

      await expect(service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshTokens.insert).not.toHaveBeenCalled();
    });

    it('si se reutiliza un token revocado, revoca todas las sesiones del usuario', async () => {
      refreshTokens.findOne.mockResolvedValue(
        tokenGuardado({ revocadoEn: new Date() }),
      );

      await expect(service.refresh('robado')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 'u-1' }),
        { revocadoEn: expect.any(Date) as Date },
      );
    });

    it('si otro refresh simultáneo ya lo rotó, responde 401', async () => {
      refreshTokens.findOne.mockResolvedValue(tokenGuardado());
      refreshTokens.update.mockResolvedValue({ affected: 0 });

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshTokens.insert).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revoca el refresh token recibido', async () => {
      await service.logout('token');

      expect(refreshTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
        }),
        { revocadoEn: expect.any(Date) as Date },
      );
    });

    it('sin cookie no hace nada', async () => {
      await service.logout(undefined);

      expect(refreshTokens.update).not.toHaveBeenCalled();
    });
  });
});
