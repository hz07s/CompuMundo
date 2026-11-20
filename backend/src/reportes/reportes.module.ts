import { Module } from '@nestjs/common';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

/** Reportes del CEDIS (HU-006). Reutiliza TypeOrmModule y VencidosService de Préstamos. */
@Module({
  imports: [PrestamosModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
