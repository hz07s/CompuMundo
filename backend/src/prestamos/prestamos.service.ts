import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { Ejemplar, EstadoEjemplar } from '../catalogo/entities/ejemplar.entity';
import { Obra } from '../catalogo/entities/obra.entity';
import { enmascararDni } from '../common/utils/dni';
import { Lector } from '../lectores/entities/lector.entity';
import { DiasHabilesService, hoyEnLima } from './dias-habiles.service';
import { CrearPrestamoDto, PrestamoResponseDto } from './dto/prestamo.dto';
import { EstadoPrestamo, Prestamo } from './entities/prestamo.entity';
import {
  EstadoMorosidad,
  MorosidadService,
  MENSAJE_BLOQUEO,
} from './morosidad.service';
import { ReglasPrestamoService } from './reglas-prestamo.service';

export const MENSAJE_EJEMPLAR_NO_DISPONIBLE = 'El ejemplar no está disponible';
export const MENSAJE_LECTOR_NO_REGISTRADO =
  'El lector no está registrado. Debe registrarlo primero';

@Injectable()
export class PrestamosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reglas: ReglasPrestamoService,
    private readonly morosidad: MorosidadService,
    private readonly diasHabiles: DiasHabilesService,
  ) {}

  /**
   * HU-004 · Registra un préstamo en una sola transacción: ejemplar disponible
   * (A1), lector registrado (A2), RN-08, RN-02 y fecha de devolución RN-01.
   * Deja el ejemplar como prestado y guarda el usuario responsable.
   */
  async registrar(
    dto: CrearPrestamoDto,
    usuario: UsuarioAutenticado,
    ahora: Date = new Date(),
  ): Promise<PrestamoResponseDto> {
    try {
      return await this.dataSource.transaction((manager) =>
        this.registrarEn(manager, dto, usuario, ahora),
      );
    } catch (error) {
      // Dos registros simultáneos del mismo lector: decide el índice único de RN-08.
      return this.reglas.traducirErrorDeInsercion(error);
    }
  }

  private async registrarEn(
    manager: EntityManager,
    dto: CrearPrestamoDto,
    usuario: UsuarioAutenticado,
    ahora: Date,
  ): Promise<PrestamoResponseDto> {
    // El ejemplar se bloquea hasta el final: dos préstamos del mismo ejemplar se serializan.
    const ejemplar = await manager.findOne(Ejemplar, {
      where: { codigo: dto.codigoEjemplar.toUpperCase(), activo: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ejemplar) throw new NotFoundException('Ejemplar no encontrado');
    if (ejemplar.estado !== EstadoEjemplar.DISPONIBLE) {
      throw new ConflictException(MENSAJE_EJEMPLAR_NO_DISPONIBLE);
    }

    const lector = await manager.findOneBy(Lector, {
      id: dto.lectorId,
      activo: true,
    });
    if (!lector) throw new NotFoundException(MENSAJE_LECTOR_NO_REGISTRADO);

    // P-22: RN-08 se evalúa primero; después RN-02 sobre el historial de tardías.
    await this.reglas.validarSinPrestamoActivo(lector.id, manager);
    const justificacion = await this.justificacionRequerida(
      manager,
      lector.id,
      dto.justificacion,
    );

    const fechaPrestamo = hoyEnLima(ahora);
    const prestamo = await manager.save(
      manager.create(Prestamo, {
        lectorId: lector.id,
        ejemplarId: ejemplar.id,
        fechaPrestamo,
        fechaDevolucion: this.diasHabiles.sumar(fechaPrestamo),
        estado: EstadoPrestamo.VIGENTE,
        justificacion,
        creadoPor: usuario.id,
        actualizadoPor: usuario.id,
      }),
    );
    await manager.update(Ejemplar, ejemplar.id, {
      estado: EstadoEjemplar.PRESTADO,
      actualizadoPor: usuario.id,
    });
    const obra = await manager.findOneByOrFail(Obra, { id: ejemplar.obraId });

    return {
      id: prestamo.id,
      estado: prestamo.estado,
      fechaPrestamo: prestamo.fechaPrestamo,
      fechaDevolucion: prestamo.fechaDevolucion,
      justificacion: prestamo.justificacion,
      ejemplar: { codigo: ejemplar.codigo, titulo: obra.titulo },
      lector: {
        nombres: lector.nombres,
        apellidos: lector.apellidos,
        dni: enmascararDni(lector.dni),
      },
      creadoEn: prestamo.creadoEn,
    };
  }

  /** RN-02: bloquea, o exige la justificación escrita si hay advertencia; si no, no guarda ninguna. */
  private async justificacionRequerida(
    manager: EntityManager,
    lectorId: string,
    justificacion?: string,
  ): Promise<string | null> {
    const { estado } = await this.morosidad.evaluar(lectorId, manager);
    if (estado === EstadoMorosidad.BLOQUEADO) {
      throw new ConflictException(MENSAJE_BLOQUEO);
    }
    if (estado === EstadoMorosidad.ADVERTENCIA) {
      if (!justificacion) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Datos inválidos',
          errors: {
            justificacion: [
              'La justificación escrita es obligatoria: el lector devolvió tarde su último préstamo',
            ],
          },
        });
      }
      return justificacion;
    }
    return null;
  }
}
