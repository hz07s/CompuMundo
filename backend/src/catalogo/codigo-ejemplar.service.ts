import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export const PREFIJO_CODIGO = 'CEDIS';
export const MAX_SECUENCIAL = 999_999;
/** El año del código es el de alta en hora de Perú, no el del servidor (UTC en Railway). */
export const ZONA_HORARIA = 'America/Lima';

export function anioDeAlta(fecha: Date): number {
  return Number(
    new Intl.DateTimeFormat('en', {
      timeZone: ZONA_HORARIA,
      year: 'numeric',
    }).format(fecha),
  );
}

export function formatearCodigo(anio: number, secuencial: number): string {
  return `${PREFIJO_CODIGO}-${anio}-${String(secuencial).padStart(6, '0')}`;
}

/**
 * Genera códigos CEDIS-{AÑO}-{SECUENCIAL} (P-24) sin repetir aunque haya
 * altas simultáneas: un único UPSERT reserva el rango y bloquea la fila del
 * año hasta que la transacción termina. Si la transacción se revierte, el
 * rango también, así que no quedan huecos.
 */
@Injectable()
export class CodigoEjemplarService {
  /** Reserva `cantidad` códigos consecutivos. Usar el manager de la transacción del alta. */
  async reservar(
    manager: EntityManager,
    cantidad: number,
    fecha = new Date(),
  ): Promise<string[]> {
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new RangeError(
        'La cantidad de códigos debe ser un entero positivo',
      );
    }
    const anio = anioDeAlta(fecha);

    const filas: Array<{ ultimo: number }> = await manager.query(
      `INSERT INTO secuencias_codigo (anio, ultimo) VALUES ($1, $2)
       ON CONFLICT (anio) DO UPDATE SET ultimo = secuencias_codigo.ultimo + EXCLUDED.ultimo
       RETURNING ultimo`,
      [anio, cantidad],
    );
    const ultimo = Number(filas[0].ultimo);
    if (ultimo > MAX_SECUENCIAL) {
      throw new RangeError(
        `Se agotaron los códigos de ${anio} (máximo ${MAX_SECUENCIAL})`,
      );
    }

    const primero = ultimo - cantidad + 1;
    return Array.from({ length: cantidad }, (_, i) =>
      formatearCodigo(anio, primero + i),
    );
  }
}
