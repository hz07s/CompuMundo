import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiasHabilesService } from './dias-habiles.service';
import { Prestamo } from './entities/prestamo.entity';
import { ReglasPrestamoService } from './reglas-prestamo.service';

/** Préstamos y devoluciones (HU-004, HU-005, HU-008) */
@Module({
  imports: [TypeOrmModule.forFeature([Prestamo])],
  providers: [DiasHabilesService, ReglasPrestamoService],
  exports: [TypeOrmModule, DiasHabilesService, ReglasPrestamoService],
})
export class PrestamosModule {}
