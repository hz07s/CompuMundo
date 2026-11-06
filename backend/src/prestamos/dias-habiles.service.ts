import { Injectable } from '@nestjs/common';
import Holidays from 'date-holidays';

/** Plazo de devolución en días hábiles (RN-01). */
export const PLAZO_DIAS_HABILES = 3;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cálculo de días hábiles (RN-01, ADR-008): lunes a viernes que no son feriados
 * nacionales del Perú. Los feriados salen de una librería estándar, sin tabla
 * propia en la base de datos. Trabaja con fechas AAAA-MM-DD (día calendario de Lima).
 */
@Injectable()
export class DiasHabilesService {
  private readonly feriados = new Holidays('PE');

  /** Fecha resultante de sumar `dias` días hábiles a `desde` (el día de partida no cuenta). */
  sumar(desde: string, dias: number = PLAZO_DIAS_HABILES): string {
    if (!FORMATO_FECHA.test(desde)) {
      throw new RangeError(`Fecha inválida: ${desde}`);
    }
    if (!Number.isInteger(dias) || dias < 0) {
      throw new RangeError('Los días hábiles deben ser un entero ≥ 0');
    }

    const [anio, mes, dia] = desde.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.toISOString().slice(0, 10) !== desde) {
      throw new RangeError(`Fecha inválida: ${desde}`);
    }

    let restantes = dias;
    while (restantes > 0) {
      fecha.setUTCDate(fecha.getUTCDate() + 1);
      if (this.esHabil(fecha)) restantes -= 1;
    }
    return fecha.toISOString().slice(0, 10);
  }

  /** Lunes a viernes que no sea feriado nacional. */
  esHabil(fecha: Date): boolean {
    const diaSemana = fecha.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) return false;
    return !this.esFeriado(fecha.toISOString().slice(0, 10));
  }

  private esFeriado(fecha: string): boolean {
    // Mediodía de Lima (UTC-5) para que ninguna conversión de zona cambie el día.
    const resultado = this.feriados.isHoliday(
      new Date(`${fecha}T12:00:00-05:00`),
    );
    return (
      Array.isArray(resultado) && resultado.some((f) => f.type === 'public')
    );
  }
}

/** Fecha de hoy en Lima (AAAA-MM-DD), el día calendario del CEDIS. */
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}
