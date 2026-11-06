import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { Lector } from './entities/lector.entity';
import { LectoresController } from './lectores.controller';
import { LectoresService } from './lectores.service';
import { DNI_VALIDATOR } from './validacion/dni-validator.interface';
import { FormatoDniValidator } from './validacion/formato-dni.validator';

/** Lectores: estudiantes, docentes y administrativos (HU-003) */
@Module({
  imports: [TypeOrmModule.forFeature([Lector]), PrestamosModule],
  controllers: [LectoresController],
  providers: [
    LectoresService,
    // Release 1: solo formato. Para RENIEC se cambia únicamente esta línea (RNF-11).
    { provide: DNI_VALIDATOR, useClass: FormatoDniValidator },
  ],
  exports: [TypeOrmModule],
})
export class LectoresModule {}
