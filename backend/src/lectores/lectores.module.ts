import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lector } from './entities/lector.entity';

/** Lectores: estudiantes, docentes y administrativos (HU-003) */
@Module({
  imports: [TypeOrmModule.forFeature([Lector])],
  exports: [TypeOrmModule],
})
export class LectoresModule {}
