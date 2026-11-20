import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { enmascararDni } from '../common/utils/dni';
import { hoyEnLima } from '../prestamos/dias-habiles.service';
import {
  EstadoPrestamo,
  Prestamo,
} from '../prestamos/entities/prestamo.entity';
import { VencidosService } from '../prestamos/vencidos.service';
import { MorosidadResponseDto } from './dto/morosidad.dto';

const MS_POR_DIA = 86_400_000;

/** Días calendario entre dos fechas AAAA-MM-DD (hasta − desde). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) /
      MS_POR_DIA,
  );
}

/** Reportes del CEDIS (HU-006). */
@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamos: Repository<Prestamo>,
    private readonly vencidos: VencidosService,
  ) {}

  /**
   * P-18 / RN-06b: marca los vencidos antes de consultar para no mostrar datos
   * desactualizados. El DNI sale siempre enmascarado (DoD-8); orden: más
   * atraso primero y, a igual atraso, por código del ejemplar.
   */
  async morosidad(ahora: Date = new Date()): Promise<MorosidadResponseDto> {
    await this.vencidos.marcar(ahora);
    const hoy = hoyEnLima(ahora);
    const registros = await this.prestamos.find({
      where: { estado: EstadoPrestamo.VENCIDO },
      relations: { lector: true, ejemplar: { obra: true }, creador: true },
    });
    const filas = registros
      .map((p) => ({
        codigoEjemplar: p.ejemplar?.codigo ?? '',
        titulo: p.ejemplar?.obra?.titulo ?? '',
        lector:
          `${p.lector?.nombres ?? ''} ${p.lector?.apellidos ?? ''}`.trim(),
        dni: enmascararDni(p.lector?.dni ?? ''),
        fechaPrestamo: p.fechaPrestamo,
        fechaDevolucion: p.fechaDevolucion,
        diasAtraso: diasEntre(p.fechaDevolucion, hoy),
        registradoPor: p.creador?.nombreUsuario ?? null,
      }))
      // Desempate estable por código (D-05): pantalla, Excel y PDF en el mismo orden.
      .sort(
        (a, b) =>
          b.diasAtraso - a.diasAtraso ||
          a.codigoEjemplar.localeCompare(b.codigoEjemplar),
      );
    return { generadoEn: ahora.toISOString(), total: filas.length, filas };
  }
}
