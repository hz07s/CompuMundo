import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';

/** Personal del sistema: Administradores y Bibliotecarios. */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
