import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { UsuarioAutenticado } from '../auth/auth.types';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { PasswordService } from '../auth/password.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './rol.enum';

const UNIQUE_VIOLATION = '23505';
export const NOMBRE_DUPLICADO = 'El nombre de usuario ya está registrado';
export const CORREO_DUPLICADO = 'El correo ya está asociado a otra cuenta';
export const ULTIMO_ADMINISTRADOR =
  'Debe quedar al menos un Administrador activo';
export const SIN_AUTOBLOQUEO =
  'No puede deshabilitar su propia cuenta ni quitarse el rol de Administrador';

/** Cuentas del personal (HU-021, RF-19). Solo las usa el Administrador. */
@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly passwords: PasswordService,
  ) {}

  /** Lista el personal sin exponer nunca el hash de contraseña. */
  async listar(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuarios.find({
      order: { nombreUsuario: 'ASC' },
    });
    return usuarios.map((u) => this.aRespuesta(u));
  }

  /** HU-021 #1: alta con contraseña hasheada (RNF-01) y auditoría (DoD-7). */
  async crear(
    dto: CrearUsuarioDto,
    admin: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {
    if (await this.usuarios.existsBy({ nombreUsuario: dto.nombreUsuario })) {
      throw new ConflictException(NOMBRE_DUPLICADO);
    }
    if (dto.email && (await this.usuarios.existsBy({ email: dto.email }))) {
      throw new ConflictException(CORREO_DUPLICADO);
    }
    try {
      const usuario = await this.usuarios.save(
        this.usuarios.create({
          nombreUsuario: dto.nombreUsuario,
          passwordHash: await this.passwords.hash(dto.password),
          rol: dto.rol,
          email: dto.email ?? null,
          activo: true,
          creadoPor: admin.id,
          actualizadoPor: admin.id,
        }),
      );
      return this.aRespuesta(usuario);
    } catch (error) {
      // Carrera entre dos altas iguales: la restricción UNIQUE decide.
      const driver = (error instanceof QueryFailedError &&
        error.driverError) as { code?: string; detail?: string } | false;
      if (driver && driver.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          driver.detail?.includes('(email)')
            ? CORREO_DUPLICADO
            : NOMBRE_DUPLICADO,
        );
      }
      throw error;
    }
  }

  /**
   * HU-021 #3/#4: cambia rol, estado o contraseña. Cualquier cambio de estado,
   * rol o contraseña revoca sus refresh tokens; el guard JWT ya lee el estado
   * y el rol de la BD en cada petición, así que el corte es inmediato.
   */
  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
    admin: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {
    const quitaAdministrador =
      dto.activo === false ||
      (dto.rol !== undefined && dto.rol !== Rol.ADMINISTRADOR);
    if (id === admin.id && quitaAdministrador) {
      throw new ConflictException(SIN_AUTOBLOQUEO);
    }
    const passwordHash =
      dto.password === undefined
        ? undefined
        : await this.passwords.hash(dto.password);

    return this.usuarios.manager.transaction(async (m) => {
      const usuario = await m.findOne(Usuario, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      // HU-021 #5: nunca queda el sistema sin un Administrador activo. Se
      // bloquean todos los administradores activos para que dos bajas cruzadas
      // simultáneas no pasen ambas la verificación.
      if (
        quitaAdministrador &&
        usuario.activo &&
        usuario.rol === Rol.ADMINISTRADOR
      ) {
        const activos = await m.find(Usuario, {
          where: { rol: Rol.ADMINISTRADOR, activo: true },
          order: { id: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        });
        if (!activos.some((a) => a.id !== id)) {
          throw new ConflictException(ULTIMO_ADMINISTRADOR);
        }
      }

      const cambios: Partial<Usuario> = { actualizadoPor: admin.id };
      if (dto.rol !== undefined) cambios.rol = dto.rol;
      if (dto.activo !== undefined) cambios.activo = dto.activo;
      if (passwordHash !== undefined) cambios.passwordHash = passwordHash;
      await m.update(Usuario, id, cambios);

      const cambiaRol = dto.rol !== undefined && dto.rol !== usuario.rol;
      if (dto.activo === false || passwordHash !== undefined || cambiaRol) {
        await m.update(
          RefreshToken,
          { usuarioId: id, revocadoEn: IsNull() },
          { revocadoEn: new Date() },
        );
      }
      return this.aRespuesta({ ...usuario, ...cambios });
    });
  }

  private aRespuesta(u: Usuario): UsuarioResponseDto {
    return {
      id: u.id,
      nombreUsuario: u.nombreUsuario,
      rol: u.rol,
      email: u.email ?? null,
      activo: u.activo,
      creadoEn: u.creadoEn,
    };
  }
}
