import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { enmascararDni } from '../common/utils/dni';
import { CrearLectorDto } from './dto/crear-lector.dto';
import { LectorResponseDto } from './dto/lector-response.dto';
import { LectorVerificacionDto } from './dto/verificar-lector.dto';
import { esFechaFutura, esMenorDeEdad } from './edad';
import { Lector } from './entities/lector.entity';
import { DNI_VALIDATOR } from './validacion/dni-validator.interface';
import type { IDniValidator } from './validacion/dni-validator.interface';

const MENSAJE_FORMATO_DNI = 'El DNI debe tener exactamente 8 dígitos numéricos';
const UNIQUE_VIOLATION = '23505';

type ErroresCampo = Record<string, string[]>;

@Injectable()
export class LectoresService {
  constructor(
    @InjectRepository(Lector) private readonly lectores: Repository<Lector>,
    // Solo la interfaz: la validación puede reemplazarse sin tocar el servicio (RNF-11).
    @Inject(DNI_VALIDATOR) private readonly dniValidator: IDniValidator,
  ) {}

  /** HU-003: alta de lector con validación de DNI y reglas de menores (RN-03, RN-09). */
  async crear(
    dto: CrearLectorDto,
    usuario: UsuarioAutenticado,
    hoy: Date = new Date(),
  ): Promise<LectorResponseDto> {
    const menor = esMenorDeEdad(dto.fechaNacimiento, hoy);
    const errores = await this.validar(dto, menor, hoy);
    if (Object.keys(errores).length) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Datos inválidos',
        errors: errores,
      });
    }

    if (await this.lectores.existsBy({ dni: dto.dni })) {
      throw new ConflictException('El DNI ya está registrado');
    }

    try {
      const lector = await this.lectores.save(
        this.lectores.create({
          dni: dto.dni,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          categoria: dto.categoria,
          fechaNacimiento: dto.fechaNacimiento,
          apoderadoDni: menor ? (dto.apoderadoDni ?? null) : null,
          apoderadoNombre: menor ? (dto.apoderadoNombre ?? null) : null,
          consentimientoApoderado: menor
            ? dto.consentimientoApoderado === true
            : false,
          creadoPor: usuario.id,
          actualizadoPor: usuario.id,
        }),
      );
      return this.aRespuesta(lector, menor);
    } catch (error) {
      // Carrera entre dos altas con el mismo DNI: la restricción UNIQUE decide.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string } | undefined)?.code ===
          UNIQUE_VIOLATION
      ) {
        throw new ConflictException('El DNI ya está registrado');
      }
      throw error;
    }
  }

  /**
   * Pantalla de verificación presencial del préstamo (HU-007 #2, #3): el único
   * contexto que devuelve el DNI del lector completo. El del apoderado va enmascarado.
   */
  async verificar(
    dni: string,
    hoy: Date = new Date(),
  ): Promise<LectorVerificacionDto> {
    if (!(await this.dniValidator.validar(dni))) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Datos inválidos',
        errors: { dni: [MENSAJE_FORMATO_DNI] },
      });
    }
    const lector = await this.lectores.findOneBy({ dni, activo: true });
    if (!lector) {
      throw new NotFoundException(
        'El lector no está registrado. Debe registrarlo primero',
      );
    }
    return {
      id: lector.id,
      dni: lector.dni,
      nombres: lector.nombres,
      apellidos: lector.apellidos,
      categoria: lector.categoria,
      esMenor: esMenorDeEdad(lector.fechaNacimiento, hoy),
      apoderadoNombre: lector.apoderadoNombre,
      apoderadoDni: lector.apoderadoDni
        ? enmascararDni(lector.apoderadoDni)
        : null,
      activo: lector.activo,
    };
  }

  private async validar(
    dto: CrearLectorDto,
    menor: boolean,
    hoy: Date,
  ): Promise<ErroresCampo> {
    const errores: ErroresCampo = {};
    const agregar = (campo: string, mensaje: string) => {
      (errores[campo] ??= []).push(mensaje);
    };

    if (!(await this.dniValidator.validar(dto.dni))) {
      agregar('dni', MENSAJE_FORMATO_DNI);
    }
    if (esFechaFutura(dto.fechaNacimiento, hoy)) {
      agregar(
        'fechaNacimiento',
        'La fecha de nacimiento no puede ser posterior a hoy',
      );
    }

    if (menor) {
      // RN-09: sin apoderado y consentimiento no se completa el alta.
      if (!dto.apoderadoDni) {
        agregar('apoderadoDni', 'El DNI del apoderado es obligatorio');
      } else if (!(await this.dniValidator.validar(dto.apoderadoDni))) {
        agregar('apoderadoDni', MENSAJE_FORMATO_DNI);
      }
      if (!dto.apoderadoNombre) {
        agregar('apoderadoNombre', 'El nombre del apoderado es obligatorio');
      }
      if (dto.consentimientoApoderado !== true) {
        agregar(
          'consentimientoApoderado',
          'El consentimiento firmado del apoderado es obligatorio',
        );
      }
    }
    return errores;
  }

  private aRespuesta(lector: Lector, esMenor: boolean): LectorResponseDto {
    return {
      id: lector.id,
      dni: enmascararDni(lector.dni),
      nombres: lector.nombres,
      apellidos: lector.apellidos,
      categoria: lector.categoria,
      fechaNacimiento: lector.fechaNacimiento,
      esMenor,
      apoderadoNombre: lector.apoderadoNombre,
      apoderadoDni: lector.apoderadoDni
        ? enmascararDni(lector.apoderadoDni)
        : null,
      consentimientoApoderado: lector.consentimientoApoderado,
      activo: lector.activo,
      creadoEn: lector.creadoEn,
    };
  }
}
