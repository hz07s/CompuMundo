import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { hoyEnLima } from './dias-habiles.service';
import { EstadoPrestamo, Prestamo } from './entities/prestamo.entity';

/** RN-06: el marcado diario corre a las 00:05, hora de Lima. */
export const CRON_MARCADO_VENCIDOS = '5 0 * * *';

/**
 * Marcado de préstamos vencidos (HU-005, RN-06): pasa a Vencido todo préstamo
 * Vigente cuya fecha de devolución es anterior a hoy en Lima. Un préstamo que
 * vence hoy no se marca. Es idempotente: una segunda ejecución no cambia nada.
 */
@Injectable()
export class VencidosService {
  private readonly logger = new Logger(VencidosService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Un solo UPDATE; devuelve cuántos préstamos pasaron a Vencido. */
  async marcar(ahora: Date = new Date()): Promise<number> {
    const resultado = await this.dataSource
      .createQueryBuilder()
      .update(Prestamo)
      .set({ estado: EstadoPrestamo.VENCIDO })
      .where('estado = :vigente', { vigente: EstadoPrestamo.VIGENTE })
      .andWhere('fecha_devolucion < :hoy', { hoy: hoyEnLima(ahora) })
      .execute();
    return resultado.affected ?? 0;
  }

  @Cron(CRON_MARCADO_VENCIDOS, { timeZone: 'America/Lima' })
  async marcarDiario(): Promise<void> {
    try {
      const marcados = await this.marcar();
      this.logger.log(`Marcado diario de vencidos: ${marcados} préstamo(s)`);
    } catch (error) {
      this.logger.error('Falló el marcado diario de vencidos', String(error));
    }
  }
}
