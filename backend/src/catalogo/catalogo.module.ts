import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodigoEjemplarService } from './codigo-ejemplar.service';
import { Ejemplar } from './entities/ejemplar.entity';
import { Obra } from './entities/obra.entity';
import { SecuenciaCodigo } from './entities/secuencia-codigo.entity';
import { EjemplaresController } from './ejemplares.controller';
import { EjemplaresService } from './ejemplares.service';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';

/** Obras y ejemplares (HU-002) */
@Module({
  imports: [TypeOrmModule.forFeature([Obra, Ejemplar, SecuenciaCodigo])],
  controllers: [ObrasController, EjemplaresController],
  providers: [CodigoEjemplarService, ObrasService, EjemplaresService],
  exports: [CodigoEjemplarService],
})
export class CatalogoModule {}
