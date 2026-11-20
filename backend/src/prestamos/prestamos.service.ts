import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { Ejemplar, EstadoEjemplar } from '../catalogo/entities/ejemplar.entity';
import { Obra } from '../catalogo/entities/obra.entity';
import { enmascararDni } from '../common/utils/dni';
import { Lector } from '../lectores/entities/lector.entity';
import { DiasHabilesService, hoyEnLima } from './dias-habiles.service';
import {
  CrearPrestamoDto,
  DevolucionResponseDto,
  PrestamoActivoDto,
  PrestamoResponseDto,
} from './dto/prestamo.dto';
import {
  ESTADOS_ACTIVOS,
  EstadoPrestamo,
  Prestamo,
} from './entities/prestamo.entity';
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

  /**
   * HU-005 · Busca el préstamo activo (Vigente o Vencido) de un ejemplar por su
   * código, que es lo que el Bibliotecario escanea al recibirlo.
   */
  async buscarActivoPorEjemplar(
    codigoEjemplar: string,
  ): Promise<PrestamoActivoDto> {
    const codigo = codigoEjemplar.trim().toUpperCase();
    const prestamo = await this.dataSource.getRepository(Prestamo).findOne({
      where: { ejemplar: { codigo }, estado: In(ESTADOS_ACTIVOS) },
      relations: { ejemplar: { obra: true }, lector: true },
    });
    if (!prestamo?.ejemplar?.obra || !prestamo.lector) {
      throw new NotFoundException(
        'No hay un préstamo activo para ese ejemplar',
      );
    }
    return {
      id: prestamo.id,
      estado: prestamo.estado,
      fechaPrestamo: prestamo.fechaPrestamo,
      fechaDevolucion: prestamo.fechaDevolucion,
      ejemplar: {
        codigo: prestamo.ejemplar.codigo,
        titulo: prestamo.ejemplar.obra.titulo,
      },
      lector: {
        nombres: prestamo.lector.nombres,
        apellidos: prestamo.lector.apellidos,
        dni: enmascararDni(prestamo.lector.dni),
      },
    };
  }

  /**
   * HU-005 · Registra la devolución en una transacción: el préstamo debe estar
   * activo (409 si ya fue devuelto), pasa a Devuelto con la fecha de hoy en Lima
   * y el ejemplar vuelve a estar disponible. Al salir de Vigente/Vencido se
   * libera solo el índice de RN-08. La disponibilidad de la obra se calcula
   * desde los ejemplares, así que aumenta en 1 sin contador aparte.
   */
  async registrarDevolucion(
    id: string,
    usuario: UsuarioAutenticado,
    ahora: Date = new Date(),
  ): Promise<DevolucionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const prestamo = await manager.findOne(Prestamo, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
      if (!ESTADOS_ACTIVOS.includes(prestamo.estado)) {
        throw new ConflictException('El préstamo ya fue devuelto');
      }

      const fechaDevuelto = hoyEnLima(ahora);
      await manager.update(Prestamo, prestamo.id, {
        estado: EstadoPrestamo.DEVUELTO,
        fechaDevuelto,
        actualizadoPor: usuario.id,
      });
      await manager.update(Ejemplar, prestamo.ejemplarId, {
        estado: EstadoEjemplar.DISPONIBLE,
        actualizadoPor: usuario.id,
      });
      const ejemplar = await manager.findOneByOrFail(Ejemplar, {
        id: prestamo.ejemplarId,
      });
      const obra = await manager.findOneByOrFail(Obra, { id: ejemplar.obraId });

      return {
        id: prestamo.id,
        estado: EstadoPrestamo.DEVUELTO,
        fechaDevuelto,
        // RN-02: tardía si se devuelve después de la fecha pactada.
        conAtraso: fechaDevuelto > prestamo.fechaDevolucion,
        ejemplar: { codigo: ejemplar.codigo, titulo: obra.titulo },
      };
    });
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
