import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lector } from '../lectores/entities/lector.entity';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';
import { DesbloqueosController } from './desbloqueos.controller';
import { DiasHabilesService } from './dias-habiles.service';
import { DesbloqueoLector } from './entities/desbloqueo-lector.entity';
import { Prestamo } from './entities/prestamo.entity';
import { MorosidadService } from './morosidad.service';
import { ReglasPrestamoService } from './reglas-prestamo.service';

/** Préstamos y devoluciones (HU-004, HU-005, HU-008) */
@Module({
  imports: [TypeOrmModule.forFeature([Prestamo, DesbloqueoLector, Lector])],
  controllers: [PrestamosController, DesbloqueosController],
  providers: [
    PrestamosService,
    DiasHabilesService,
    ReglasPrestamoService,
    MorosidadService,
  ],
  exports: [
    TypeOrmModule,
    DiasHabilesService,
    ReglasPrestamoService,
    MorosidadService,
  ],
})
export class PrestamosModule {}
