import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import {
  ESTADOS_ACTIVOS,
  INDICE_PRESTAMO_ACTIVO_POR_LECTOR,
  Prestamo,
} from './entities/prestamo.entity';

export const MENSAJE_PRESTAMO_ACTIVO = 'El lector ya tiene un préstamo activo';
const UNIQUE_VIOLATION = '23505';

/** Reglas de negocio que se comprueban antes de registrar un préstamo (HU-004). */
@Injectable()
export class ReglasPrestamoService {
  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamos: Repository<Prestamo>,
  ) {}

  /**
   * RN-08: un lector no puede tener más de un préstamo Vigente o Vencido.
   * Si se llama dentro de una transacción, pasar su `manager`.
   */
  async validarSinPrestamoActivo(
    lectorId: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (await this.tienePrestamoActivo(lectorId, manager)) {
      throw new ConflictException(MENSAJE_PRESTAMO_ACTIVO);
    }
  }

  /** ¿Tiene el lector un préstamo Vigente o Vencido? */
  tienePrestamoActivo(
    lectorId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager ? manager.getRepository(Prestamo) : this.prestamos;
    return repo.exists({
      where: ESTADOS_ACTIVOS.map((estado) => ({ lectorId, estado })),
    });
  }

  /**
   * Traduce la violación del índice único de RN-08 (dos registros simultáneos)
   * al mismo 409 que la validación previa; cualquier otro error se relanza.
   */
  traducirErrorDeInsercion(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string; constraint?: string } | undefined)
        ?.code === UNIQUE_VIOLATION &&
      (error.driverError as { constraint?: string }).constraint ===
        INDICE_PRESTAMO_ACTIVO_POR_LECTOR
    ) {
      throw new ConflictException(MENSAJE_PRESTAMO_ACTIVO);
    }
    throw error;
  }
}
