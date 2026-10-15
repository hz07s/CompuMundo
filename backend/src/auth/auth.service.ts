import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import ms, { StringValue } from 'ms';
import { IsNull, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CREDENCIALES_INVALIDAS, SESION_INVALIDA } from './auth.constants';
import { JwtPayload, SesionEmitida } from './auth.types';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordService } from './password.service';

// Hash Bcrypt de una clave cualquiera: se compara contra él cuando el usuario
// no existe para que el tiempo de respuesta no revele si existe o no.
const HASH_SENUELO =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Qp6JqQX1fz6iM1bW5L8bS5fJ6r2e';

@Injectable()
export class AuthService {
  private readonly accessTtl: StringValue;
  private readonly refreshTtlMs: number;

  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get<StringValue>('JWT_ACCESS_EXPIRES_IN', '8h');
    this.refreshTtlMs = ms(
      config.get<StringValue>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
  }

  /** HU-001 #1 y #2: credenciales válidas emiten sesión; cualquier fallo es un 401 genérico. */
  async login(nombreUsuario: string, password: string): Promise<SesionEmitida> {
    const usuario = await this.usuarios.findOne({
      where: { nombreUsuario },
      select: {
        id: true,
        nombreUsuario: true,
        rol: true,
        activo: true,
        passwordHash: true,
      },
    });

    const valida = await this.passwords.compare(
      password,
      usuario?.passwordHash ?? HASH_SENUELO,
    );
    if (!usuario || !valida || !usuario.activo) {
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }
    return this.emitirSesion(usuario);
  }

  /** Rota el refresh token: el recibido queda revocado y se emite uno nuevo. */
  async refresh(refreshToken: string | undefined): Promise<SesionEmitida> {
    if (!refreshToken) throw new UnauthorizedException(SESION_INVALIDA);

    const guardado = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(refreshToken) },
      relations: { usuario: true },
    });
    if (!guardado) throw new UnauthorizedException(SESION_INVALIDA);

    if (guardado.revocadoEn) {
      // Reutilización de un token ya rotado: posible robo, se cierran todas sus sesiones.
      await this.revocarTodos(guardado.usuarioId);
      throw new UnauthorizedException(SESION_INVALIDA);
    }
    if (guardado.expiraEn <= new Date() || !guardado.usuario?.activo) {
      throw new UnauthorizedException(SESION_INVALIDA);
    }

    // El UPDATE condicionado evita que dos refresh simultáneos roten el mismo token.
    const { affected } = await this.refreshTokens.update(
      { id: guardado.id, revocadoEn: IsNull() },
      { revocadoEn: new Date() },
    );
    if (!affected) throw new UnauthorizedException(SESION_INVALIDA);

    return this.emitirSesion(guardado.usuario);
  }

  /** Revoca el refresh token. Es idempotente: sin token o ya revocado, no hace nada. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.refreshTokens.update(
      { tokenHash: this.hashToken(refreshToken), revocadoEn: IsNull() },
      { revocadoEn: new Date() },
    );
  }

  private async emitirSesion(usuario: Usuario): Promise<SesionEmitida> {
    const payload: JwtPayload = {
      sub: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessTtl,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiraEn = new Date(Date.now() + this.refreshTtlMs);
    await this.refreshTokens.insert({
      usuarioId: usuario.id,
      tokenHash: this.hashToken(refreshToken),
      expiraEn: refreshExpiraEn,
      revocadoEn: null,
    });

    return {
      accessToken,
      expiresIn: Math.floor(ms(this.accessTtl) / 1000),
      usuario: {
        id: usuario.id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol,
      },
      refreshToken,
      refreshExpiraEn,
    };
  }

  private async revocarTodos(usuarioId: string): Promise<void> {
    await this.refreshTokens.update(
      { usuarioId, revocadoEn: IsNull() },
      { revocadoEn: new Date() },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
