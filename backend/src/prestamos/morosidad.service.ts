import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { Lector } from '../lectores/entities/lector.entity';
import { DesbloqueoLector } from './entities/desbloqueo-lector.entity';
import { EstadoPrestamo, Prestamo } from './entities/prestamo.entity';

/** Resultado de aplicar RN-02 a un lector. */
export enum EstadoMorosidad {
  /** Sin devoluciones tardías pendientes de regularizar. */
  LIBRE = 'LIBRE',
  /** Primera vez: advertencia y justificación escrita del Bibliotecario. */
  ADVERTENCIA = 'ADVERTENCIA',
  /** Segunda vez sin regularizar: solo un Administrador puede desbloquear. */
  BLOQUEADO = 'BLOQUEADO',
}

export interface ResultadoMorosidad {
  estado: EstadoMorosidad;
  /** Devoluciones tardías consecutivas desde la última devolución a tiempo o desbloqueo. */
  devolucionesTardias: number;
  mensaje: string | null;
}

export const MENSAJE_ADVERTENCIA =
  'El lector devolvió tarde su último préstamo. Se requiere una justificación escrita para continuar';
export const MENSAJE_BLOQUEO =
  'El lector devolvió tarde sus dos últimos préstamos sin regularizar. Solo un Administrador puede desbloquearlo';

/** Devoluciones tardías consecutivas a partir de las cuales se bloquea (RN-02). */
const TARDIAS_PARA_BLOQUEAR = 2;

/**
 * RN-02 · Morosidad (interpretación P-22: RN-08 se evalúa primero y RN-02 se
 * evalúa sobre el historial de devoluciones tardías).
 *
 * «Vez» = devolución tardía (fecha devuelto > fecha de devolución). «Sin
 * regularizar» = devoluciones tardías consecutivas, sin una devolución a tiempo
 * en medio y sin un desbloqueo posterior del Administrador.
 */
@Injectable()
export class MorosidadService {
  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamos: Repository<Prestamo>,
    @InjectRepository(DesbloqueoLector)
    private readonly desbloqueos: Repository<DesbloqueoLector>,
    @InjectRepository(Lector) private readonly lectores: Repository<Lector>,
  ) {}

  /** Estado de morosidad del lector. Dentro de una transacción, pasar su `manager`. */
  async evaluar(
    lectorId: string,
    manager?: EntityManager,
  ): Promise<ResultadoMorosidad> {
    const prestamos = manager
      ? manager.getRepository(Prestamo)
      : this.prestamos;
    const desbloqueos = manager
      ? manager.getRepository(DesbloqueoLector)
      : this.desbloqueos;

    const ultimoDesbloqueo = await desbloqueos.findOne({
      where: { lectorId },
      order: { creadoEn: 'DESC' },
    });
    // Solo cuentan las devoluciones posteriores al último desbloqueo.
    const recientes = await prestamos.find({
      where: {
        lectorId,
        estado: EstadoPrestamo.DEVUELTO,
        ...(ultimoDesbloqueo && {
          actualizadoEn: MoreThan(ultimoDesbloqueo.creadoEn),
        }),
      },
      order: { fechaDevuelto: 'DESC', actualizadoEn: 'DESC' },
      take: TARDIAS_PARA_BLOQUEAR,
    });

    let tardias = 0;
    for (const p of recientes) {
      if (!p.fechaDevuelto || p.fechaDevuelto <= p.fechaDevolucion) break;
      tardias += 1;
    }

    if (tardias >= TARDIAS_PARA_BLOQUEAR) {
      return {
        estado: EstadoMorosidad.BLOQUEADO,
        devolucionesTardias: tardias,
        mensaje: MENSAJE_BLOQUEO,
      };
    }
    if (tardias === 1) {
      return {
        estado: EstadoMorosidad.ADVERTENCIA,
        devolucionesTardias: tardias,
        mensaje: MENSAJE_ADVERTENCIA,
      };
    }
    return {
      estado: EstadoMorosidad.LIBRE,
      devolucionesTardias: 0,
      mensaje: null,
    };
  }

  /** Desbloqueo por un Administrador (RN-02); queda en auditoría con usuario y marca temporal. */
  async desbloquear(
    lectorId: string,
    motivo: string,
    administrador: UsuarioAutenticado,
  ): Promise<DesbloqueoLector> {
    if (!(await this.lectores.existsBy({ id: lectorId, activo: true }))) {
      throw new NotFoundException('Lector no encontrado');
    }
    const { estado } = await this.evaluar(lectorId);
    if (estado !== EstadoMorosidad.BLOQUEADO) {
      throw new ConflictException('El lector no está bloqueado');
    }
    return this.desbloqueos.save(
      this.desbloqueos.create({
        lectorId,
        motivo,
        desbloqueadoPor: administrador.id,
      }),
    );
  }
}
