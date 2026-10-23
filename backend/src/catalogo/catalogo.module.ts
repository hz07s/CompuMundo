import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodigoEjemplarService } from './codigo-ejemplar.service';
import { Ejemplar } from './entities/ejemplar.entity';
import { Obra } from './entities/obra.entity';
import { SecuenciaCodigo } from './entities/secuencia-codigo.entity';

/** Obras y ejemplares (HU-002) */
@Module({
  imports: [TypeOrmModule.forFeature([Obra, Ejemplar, SecuenciaCodigo])],
  providers: [CodigoEjemplarService],
  exports: [CodigoEjemplarService],
})
export class CatalogoModule {}
